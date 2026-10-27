import { compile } from '../compiler/compile.js';
import { validateRows } from '../compiler/validate.js';
import { readFileSync } from 'node:fs';

const states = JSON.parse(readFileSync(new URL('../../data/states.json', import.meta.url)));
const vocab = JSON.parse(readFileSync(new URL('../../data/vocab.json', import.meta.url)));
const EDITABLE = ['days', 'day_type', 'designated_officer', 'appellate_1', 'appellate_2', 'appeal_final', 'penalty_note', 'source_doc'];
const parseFlags = (s) => { try { return JSON.parse(s ?? '[]'); } catch { return []; } };
const COLS = ['id','state_code','service_key','name','department','act_name','days','day_type','status','designated_officer','appellate_1','appellate_2','appeal_final','penalty_note','source_doc','source_note','source_snippet','flags'];

export function mountCompiler(app, { pool, wrap, now }) {
  // Registry list (flags parsed)
  app.get('/api/registry/services', wrap(async (req, res) => {
    const { state, status } = req.query;
    const rows = (await pool.query('SELECT * FROM services ORDER BY state_code, name')).rows
      .filter((s) => (!state || s.state_code === state) && (!status || s.status === status))
      .map((s) => ({ ...s, flags: parseFlags(s.flags) }));
    res.json(rows);
  }));

  // Run the compiler on pasted text. Writes DRAFT rows only. Approved rows are never overwritten.
  app.post('/api/compiler/run', wrap(async (req, res) => {
    const { text, state, provider = process.env.LLM_PROVIDER || 'heuristic' } = req.body ?? {};
    if (!text || !state) return res.status(400).json({ error: 'text and state are required' });
    if (!states[state]) return res.status(400).json({ error: `unknown state ${state}` });
    let out;
    try { out = await compile(text, state, provider); } catch (e) { return res.status(502).json({ error: `compiler (${provider}) failed: ${e.message}` }); }
    const created = [], updated = [], skipped = [];
    for (const r of out.rows) {
      const ex = (await pool.query('SELECT id, status FROM services WHERE id = $1', [r.id])).rows[0];
      const vals = { ...r, flags: JSON.stringify(r.flags) };
      if (ex?.status === 'approved') { skipped.push({ id: r.id, reason: 'already approved: not overwritten' }); continue; }
      if (ex) {
        await pool.query(`UPDATE services SET ${COLS.slice(1).map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [r.id, ...COLS.slice(1).map((c) => vals[c] ?? null)]);
        updated.push(r.id);
      } else {
        await pool.query(`INSERT INTO services (${COLS.join(',')}) VALUES (${COLS.map((_, i) => `$${i + 1}`).join(',')})`, COLS.map((c) => vals[c] ?? null));
        created.push(r.id);
      }
    }
    res.json({ provider: out.provider, created, updated, skipped, rejected: out.rejected });
  }));

  // Human edit of a DRAFT row. Flags are recomputed against the stored source line.
  app.patch('/api/registry/services/:id', wrap(async (req, res) => {
    const s = (await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id])).rows[0];
    if (!s) return res.status(404).json({ error: 'not found' });
    if (s.status !== 'draft') return res.status(409).json({ error: 'only draft rules can be edited' });
    const merged = { ...s };
    for (const k of EDITABLE) if (k in (req.body ?? {})) merged[k] = req.body[k] === '' ? null : req.body[k];
    if (merged.days !== null && merged.days !== undefined) merged.days = Number(merged.days);
    const { rows } = validateRows([merged], s.source_snippet ?? s.name, { state: s.state_code, vocab: vocab[s.state_code] ?? [], states });
    const flags = rows[0]?.flags ?? ['EDIT_NOT_VALIDATED'];
    const sets = EDITABLE.concat(['flags']); const vals = { ...merged, flags: JSON.stringify(flags) };
    await pool.query(`UPDATE services SET ${sets.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [s.id, ...sets.map((c) => vals[c] ?? null)]);
    res.json({ ok: true, flags });
  }));

  app.delete('/api/registry/services/:id', wrap(async (req, res) => {
    const s = (await pool.query('SELECT status FROM services WHERE id = $1', [req.params.id])).rows[0];
    if (!s) return res.status(404).json({ error: 'not found' });
    if (s.status !== 'draft') return res.status(409).json({ error: 'only draft rules can be rejected' });
    await pool.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  }));

  // THE human gate. Flagged rows need explicit acknowledgement; a clock-capable rule needs days, officer and first appeal authority.
  app.post('/api/registry/services/:id/approve', wrap(async (req, res) => {
    const { verifiedBy, acknowledgeFlags = false } = req.body ?? {};
    if (!verifiedBy) return res.status(400).json({ error: 'verifiedBy is required' });
    const s = (await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id])).rows[0];
    if (!s) return res.status(404).json({ error: 'not found' });
    const missing = [];
    if (!Number.isInteger(s.days)) missing.push('days');
    if (!s.designated_officer) missing.push('designated_officer');
    if (!s.appellate_1) missing.push('appellate_1');
    if (!s.source_doc) missing.push('source_doc');
    if (missing.length) return res.status(422).json({ error: `rule incomplete: ${missing.join(', ')}`, missing });
    const flags = parseFlags(s.flags);
    if (flags.length && !acknowledgeFlags) return res.status(422).json({ error: 'rule has validator flags; review and approve with acknowledgeFlags=true', flags });
    await pool.query('UPDATE services SET status = $1, verified_by = $2, verified_at = $3 WHERE id = $4', ['approved', verifiedBy, now(), s.id]);
    res.json({ ok: true, acknowledgedFlags: flags });
  }));
}
