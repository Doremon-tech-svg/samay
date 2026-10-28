import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { clockStatus, RISK_ORDER } from './clock/clockEngine.js';
import { appendAudit, verifyChain } from './services/auditChain.js';
import { draftAppeal, nextAppealTarget } from './services/appealDrafter.js';
import { parseSlip } from './services/slipParser.js';
import { mountCompiler } from './routes/compilerRoutes.js';

const HOLIDAYS = JSON.parse(readFileSync(new URL('../data/holidays.json', import.meta.url)));
const K_ANON = 5; // commission view hides office rows with fewer than K applications
const PAUSE_REASONS = ['QUERY_TO_APPLICANT'];

export function createApp({ pool, demoMode = false, now = () => new Date().toISOString().slice(0, 10) }) {
  const app = express();
  app.use(cors()); app.use(express.json({ limit: '2mb' }));
  const today = (req) => (demoMode && req.get('x-demo-date')) || now();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: e.message }); });
  const nowTs = (req) => `${today(req)}T09:00:00Z`;

  async function load(id) {
    const { rows } = await pool.query(
      `SELECT a.*, o.name AS "officeName", o.district AS district FROM applications a JOIN offices o ON o.id = a.office_id WHERE a.id = $1`, [id]);
    if (!rows[0]) return null;
    const a = rows[0];
    const s = (await pool.query('SELECT * FROM services WHERE id = $1', [a.service_id])).rows[0];
    const pauses = (await pool.query('SELECT * FROM clock_pauses WHERE application_id = $1 ORDER BY start_date', [id])).rows
      .map((p) => ({ id: p.id, start: p.start_date, end: p.end_date, reason: p.reason }));
    return { a, s, pauses };
  }
  const statusOf = ({ a, s, pauses }, asOf) =>
    clockStatus({ receivedOn: a.received_on, disposedOn: a.disposed_on }, { days: s.days, dayType: s.day_type },
      { holidays: HOLIDAYS[s.state_code] ?? [], pauses, asOf });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // ---- Registry ----
  app.get('/api/registry/offices', wrap(async (_req, res) => res.json((await pool.query('SELECT * FROM offices ORDER BY name')).rows)));
  mountCompiler(app, { pool, wrap, now });

  // ---- Slip capture (OCR text in, structured fields out; user confirms before clock starts) ----
  app.post('/api/ocr/slip', wrap(async (req, res) => {
    const { text } = req.body ?? {};
    const services = (await pool.query("SELECT * FROM services WHERE status = 'approved'")).rows;
    if (!text) return res.status(400).json({ error: 'send OCR text in { text }. Plug a real OCR engine in the client or here.' });
    res.json(parseSlip(text, services));
  }));

  // ---- Applications ----
  app.post('/api/applications', wrap(async (req, res) => {
    const { serviceId, officeId, ackNo, receivedOn, channel = 'paper', applicantAlias, language = 'en' } = req.body ?? {};
    if (!serviceId || !officeId || !ackNo) return res.status(400).json({ error: 'serviceId, officeId and ackNo are required' });
    const s = (await pool.query('SELECT * FROM services WHERE id = $1', [serviceId])).rows[0];
    if (!s) return res.status(404).json({ error: 'unknown service' });
    if (s.status !== 'approved' || !Number.isInteger(s.days)) return res.status(422).json({ error: 'this rule is not human-approved yet, so no clock can be started' });
    const dup = (await pool.query('SELECT id FROM applications WHERE ack_no = $1 AND service_id = $2', [ackNo, serviceId])).rows[0];
    if (dup) return res.status(409).json({ error: 'duplicate application (same ack no. and service)', duplicate: true, id: dup.id }); // makes offline replays idempotent
    const id = randomUUID();
    await pool.query(`INSERT INTO applications (id, ack_no, service_id, office_id, received_on, channel, applicant_alias, language, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, ackNo, serviceId, officeId, receivedOn ?? today(req), channel, applicantAlias ?? null, language, nowTs(req)]);
    await appendAudit(pool, id, 'APPLICATION_CREATED', { serviceId, officeId, ackNo, receivedOn: receivedOn ?? today(req), channel, rule: { days: s.days, dayType: s.day_type, source: s.source_doc } }, nowTs(req));
    res.status(201).json({ id });
  }));

  function generateNotifications(ctx, st) {
    const notifs = [];
    if (['AT_RISK', 'BREACHED', 'COMPLETED_LATE', 'COMPLETED_ON_TIME'].includes(st.state)) {
      notifs.push({
        id: 'notif-calm-1',
        type: 'CALM_UPDATE',
        title: 'Day 10 Calm Status Update',
        channel: 'SMS & WhatsApp',
        sentOn: 'Day 10 (Amber Window)',
        summary: `${ctx.s.name} (${ctx.a.ack_no})`,
        message: `SAMAY Calm Update: Your application for ${ctx.s.name} (Ack: ${ctx.a.ack_no}) is under active processing by ${ctx.s.designated_officer}. Deadline: ${st.dueDate} (${st.remaining ?? 0} days remaining). No action required from your side.`
      });
    }
    if (['BREACHED', 'COMPLETED_LATE'].includes(st.state)) {
      notifs.push({
        id: 'notif-breach-1',
        type: 'BREACH_ALERT',
        title: 'Statutory Deadline Exceeded Notice',
        channel: 'SMS & WhatsApp',
        sentOn: st.dueDate,
        summary: `${ctx.s.name} (${ctx.a.ack_no}) - Breach Alert`,
        message: `SAMAY Legal Notice: Statutory deadline for ${ctx.s.name} (${ctx.a.ack_no}) lapsed on ${st.dueDate} (${st.daysLate} days overdue). Under Section 8 of the RTS Act, you are entitled to file an appeal to ${ctx.s.appellate_1 || 'the Appellate Authority'}. One-tap appeal draft is ready in your SAMAY dashboard.`
      });
    }
    return notifs;
  }

  app.get('/api/applications/:id', wrap(async (req, res) => {
    const ctx = await load(req.params.id);
    if (!ctx) return res.status(404).json({ error: 'not found' });
    const asOf = today(req);
    const st = statusOf(ctx, asOf);
    const appeals = (await pool.query('SELECT * FROM appeals WHERE application_id = $1 ORDER BY level', [req.params.id])).rows;
    const notifications = generateNotifications(ctx, st);
    
    // Pre-draft second appeal when level 1 appeal has been dispatched (fulfills deck promise)
    let preDraftedAppeal = null;
    const level1Sent = appeals.some((a) => a.level === 1 && a.status === 'SENT');
    const hasLevel2 = appeals.some((a) => a.level === 2);
    if (level1Sent && !hasLevel2) {
      const nextTarget = nextAppealTarget(ctx.s, 1);
      if (nextTarget) {
        const body = draftAppeal({
          app: ctx.a,
          service: ctx.s,
          status: st,
          level: nextTarget.level,
          to: nextTarget.to,
          lang: ctx.a.language ?? 'en',
          today: today(req)
        });
        preDraftedAppeal = {
          level: nextTarget.level,
          addressedTo: nextTarget.to,
          body,
          status: 'PRE_DRAFTED',
          note: 'Pre-drafted in advance: Ready to file if no decision from First Appellate Authority within 30 days.'
        };
      }
    }

    res.json({
      application: ctx.a,
      service: ctx.s,
      pauses: ctx.pauses,
      clock: st,
      appeals,
      nextAppeal: nextAppealTarget(ctx.s, appeals.length),
      notifications,
      preDraftedAppeal,
      asOf
    });
  }));

  app.get('/api/applications', wrap(async (req, res) => {
    const asOf = today(req);
    const { rows } = await pool.query('SELECT id FROM applications ORDER BY received_on DESC');
    const out = [];
    for (const r of rows.slice(0, 200)) { const c = await load(r.id); out.push({ id: r.id, ackNo: c.a.ack_no, service: c.s.name, office: c.a.officeName, receivedOn: c.a.received_on, clock: statusOf(c, asOf) }); }
    res.json(out);
  }));

  app.post('/api/applications/:id/pause', wrap(async (req, res) => {
    const { reason = 'QUERY_TO_APPLICANT' } = req.body ?? {};
    if (!PAUSE_REASONS.includes(reason)) return res.status(400).json({ error: `reason must be one of ${PAUSE_REASONS}` });
    const ctx = await load(req.params.id); if (!ctx) return res.status(404).json({ error: 'not found' });
    if (ctx.pauses.some((p) => !p.end)) return res.status(409).json({ error: 'a pause is already open' });
    await pool.query('INSERT INTO clock_pauses (id, application_id, start_date, reason) VALUES ($1,$2,$3,$4)', [randomUUID(), req.params.id, today(req), reason]);
    await appendAudit(pool, req.params.id, 'PAUSE_STARTED', { reason, start: today(req) }, nowTs(req));
    res.json({ ok: true });
  }));
  app.post('/api/applications/:id/resume', wrap(async (req, res) => {
    const open = (await pool.query('SELECT * FROM clock_pauses WHERE application_id = $1 AND end_date IS NULL', [req.params.id])).rows[0];
    if (!open) return res.status(409).json({ error: 'no open pause' });
    await pool.query('UPDATE clock_pauses SET end_date = $1 WHERE id = $2', [today(req), open.id]);
    await appendAudit(pool, req.params.id, 'PAUSE_ENDED', { end: today(req) }, nowTs(req));
    res.json({ ok: true });
  }));
  app.post('/api/applications/:id/dispose', wrap(async (req, res) => {
    const d = req.body?.disposedOn ?? today(req);
    await pool.query("UPDATE applications SET status = 'DISPOSED', disposed_on = $1 WHERE id = $2", [d, req.params.id]);
    await appendAudit(pool, req.params.id, 'DISPOSED', { disposedOn: d }, nowTs(req));
    res.json({ ok: true });
  }));
  app.patch('/api/applications/:id/reason', wrap(async (req, res) => { // officer sets a reason code (bottleneck evidence)
    await pool.query('UPDATE applications SET reason_code = $1 WHERE id = $2', [req.body?.reasonCode ?? null, req.params.id]);
    await appendAudit(pool, req.params.id, 'REASON_SET', { reasonCode: req.body?.reasonCode ?? null }, nowTs(req));
    res.json({ ok: true });
  }));

  // ---- Appeals: only after a real breach, addressed to the next officer in the notified chain ----
  app.post('/api/applications/:id/appeals', wrap(async (req, res) => {
    const ctx = await load(req.params.id); if (!ctx) return res.status(404).json({ error: 'not found' });
    const st = statusOf(ctx, today(req));
    if (st.state !== 'BREACHED') return res.status(409).json({ error: `no breach yet (state: ${st.state}); an appeal cannot be drafted` });
    const count = (await pool.query('SELECT COUNT(*) AS n FROM appeals WHERE application_id = $1', [req.params.id])).rows[0].n;
    const target = nextAppealTarget(ctx.s, Number(count));
    if (!target) return res.status(409).json({ error: 'appeal chain exhausted' });
    const lang = req.body?.lang ?? ctx.a.language ?? 'en';
    const body = draftAppeal({ app: ctx.a, service: ctx.s, status: st, level: target.level, to: target.to, lang, today: today(req) });
    const id = randomUUID();
    await pool.query('INSERT INTO appeals (id, application_id, level, addressed_to, lang, body, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, req.params.id, target.level, target.to, lang, body, nowTs(req)]);
    await appendAudit(pool, req.params.id, 'APPEAL_DRAFTED', { level: target.level, to: target.to, daysLate: st.daysLate }, nowTs(req));
    res.status(201).json({ id, level: target.level, addressedTo: target.to, body });
  }));
  app.post('/api/appeals/:id/send', wrap(async (req, res) => { // MOCK dispatch: in production, e-mail/portal API/helper hand-off
    const ap = (await pool.query('SELECT * FROM appeals WHERE id = $1', [req.params.id])).rows[0];
    if (!ap) return res.status(404).json({ error: 'not found' });
    await pool.query("UPDATE appeals SET status = 'SENT', sent_at = $1 WHERE id = $2", [nowTs(req), ap.id]);
    await appendAudit(pool, ap.application_id, 'APPEAL_SENT', { level: ap.level, to: ap.addressed_to, channel: 'mock' }, nowTs(req));
    res.json({ ok: true, note: 'mock dispatch' });
  }));

  // ---- Officer radar: open applications sorted by legal risk ----
  app.get('/api/radar', wrap(async (req, res) => {
    const asOf = today(req);
    const { officeId } = req.query;
    const { rows } = await pool.query("SELECT id FROM applications WHERE status = 'PENDING'");
    const items = [];
    for (const r of rows) {
      const c = await load(r.id);
      if (officeId && c.a.office_id !== officeId) continue;
      const clock = statusOf(c, asOf);
      const nudgeSent = ['AT_RISK', 'BREACHED'].includes(clock.state);
      items.push({ id: c.a.id, ackNo: c.a.ack_no, service: c.s.name, office: c.a.officeName, officeId: c.a.office_id, reasonCode: c.a.reason_code, paused: c.pauses.some((p) => !p.end), clock, nudgeSent });
    }
    items.sort((x, y) => RISK_ORDER[x.clock.state] - RISK_ORDER[y.clock.state] || (x.clock.remaining ?? 0) - (y.clock.remaining ?? 0));
    res.json(items);
  }));

  // ---- Commission map: per-office aggregates with small-count suppression ----
  app.get('/api/commission/offices', wrap(async (req, res) => {
    const asOf = today(req);
    const { rows } = await pool.query('SELECT id FROM applications');
    const agg = new Map();
    for (const r of rows) {
      const c = await load(r.id); const st = statusOf(c, asOf);
      const o = agg.get(c.a.office_id) ?? { officeId: c.a.office_id, office: c.a.officeName, district: c.a.district, total: 0, late: 0, atRisk: 0, open: 0, reasons: {} };
      o.total++; if (['BREACHED', 'COMPLETED_LATE'].includes(st.state)) o.late++;
      if (st.state === 'AT_RISK') o.atRisk++; if (!c.a.disposed_on) o.open++;
      if (c.a.reason_code && ['BREACHED', 'AT_RISK'].includes(st.state)) o.reasons[c.a.reason_code] = (o.reasons[c.a.reason_code] ?? 0) + 1;
      agg.set(c.a.office_id, o);
    }
    res.json([...agg.values()].map((o) => o.total < K_ANON ? { officeId: o.officeId, office: o.office, district: o.district, suppressed: true, note: `fewer than ${K_ANON} applications` }
      : { ...o, lateRate: +(o.late / o.total).toFixed(3) }).sort((a, b) => (b.lateRate ?? -1) - (a.lateRate ?? -1)));
  }));

  // ---- Audit ----
  app.get('/api/audit/:applicationId', wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT id, event_type, payload, prev_hash, hash, created_at FROM audit_log WHERE application_id = $1 ORDER BY id', [req.params.applicationId]);
    res.json({ events: rows, verification: await verifyChain(pool, req.params.applicationId) });
  }));
  return app;
}
