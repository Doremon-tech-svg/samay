import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const SAMPLE = `FIXTURE notified-service list (pipe table). Rows 1-3 mirror the Maharashtra district list. Rows 4-6 are FICTIONAL test rows.
Service | Days | Designated Officer | First Appellate | Second Appellate
Income Certificate | 15 | Nayab Tahsildar | Tahsildar | Sub Divisional Officer
Agriculturist Certificate | 7 | Tahsildar | Sub Divisional Officer | Additional Collector
Landless Labour Certificate | 15 | Tahsildar | Sub Divisional Officer | Additional Collector
Demo Service A (fixture) | 21 | Block Development Officer | Sub Divisional Officer | Collector
Demo Service B (fixture) | thirty | Tahsildar | Sub Divisional Officer | Collector
Demo Service C (fixture) | 10 | Section Officer | Under Secretary | Joint Secretary`;

const FIELDS = [
  ['days',               'Days'],
  ['day_type',           'Day type'],
  ['designated_officer', 'Deciding officer'],
  ['appellate_1',        'First appellate'],
  ['appellate_2',        'Second appellate'],
  ['appeal_final',       'Final / commission'],
];

function Draft({ d, reviewer, onChange }) {
  const [vals, setVals] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, d[k] ?? ''])));
  const [ack, setAck]   = useState(false);
  const [msg, setMsg]   = useState('');
  const [busy, setBusy] = useState('');

  const act = (label, fn) => async () => {
    try { setMsg(''); setBusy(label); await fn(); await onChange(); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(''); }
  };

  const hasFlags = d.flags.length > 0;

  return (
    <div className={`draft ${hasFlags ? 'flagged' : 'clean'}`} role="article" aria-label={`Draft rule: ${d.name}`}>
      {/* Header */}
      <div className="row center" style={{ marginBottom: 12 }}>
        <strong style={{ flex: 1 }}>[{d.state_code}] {d.name}</strong>
        {!hasFlags
          ? <span className="flag-ok">✓ No flags</span>
          : <span className="flag">{d.flags.length} flag{d.flags.length > 1 ? 's' : ''}</span>}
      </div>

      <div className="grid2s">
        {/* Source snippet */}
        <div>
          <p className="muted small" style={{ margin: '0 0 4px' }}>Source line (what the rule was read from)</p>
          <pre className="src" aria-label="Source snippet from the notified list">{d.source_snippet}</pre>
          <div className="flags" role="list" aria-label="Validation flags">
            {d.flags.map((f) => <span key={f} className="flag" role="listitem">{f}</span>)}
          </div>
        </div>

        {/* Editable fields */}
        <div role="form" aria-label={`Edit fields for ${d.name}`}>
          {FIELDS.map(([k, label]) => (
            <label key={k} className="inl" htmlFor={`field-${d.id}-${k}`}>
              <span style={{ minWidth: 130, fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
              <input
                id={`field-${d.id}-${k}`}
                value={vals[k]}
                onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                aria-label={`${label} for ${d.name}`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="row" style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <button
          onClick={act('save', () => api.editService(d.id, { ...vals, days: vals.days === '' ? null : Number(vals.days) }))}
          disabled={!!busy}
          aria-label="Save edits and re-run validation"
        >
          {busy === 'save' ? '…' : '💾'} Save edits
        </button>

        {hasFlags && (
          <label className="inl" htmlFor={`ack-${d.id}`} style={{ flex: 1, fontSize: 13 }}>
            <input
              id={`ack-${d.id}`}
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              style={{ width: 'auto' }}
              aria-label="I have checked every flag against the source document"
            />
            I checked every flag against the source
          </label>
        )}

        <button
          className="primary"
          disabled={!reviewer || !!busy}
          onClick={act('approve', () => api.approveService(d.id, { verifiedBy: reviewer, acknowledgeFlags: ack }))}
          aria-label={`Approve rule for ${d.name}`}
          aria-disabled={!reviewer}
        >
          {busy === 'approve' ? '…' : '✓'} Approve rule
        </button>

        <button
          onClick={act('reject', () => api.rejectService(d.id))}
          disabled={!!busy}
          aria-label={`Reject rule for ${d.name}`}
          style={{ color: 'var(--red)', borderColor: '#fecaca' }}
        >
          {busy === 'reject' ? '…' : '✕'} Reject
        </button>
      </div>

      {!reviewer && (
        <p className="muted small" role="status" style={{ marginTop: 6 }}>
          ↑ Enter your reviewer name above to enable approval.
        </p>
      )}
      {msg && <div className="err" role="alert"><span aria-hidden="true">⚠</span> {msg}</div>}
    </div>
  );
}

export default function Compiler() {
  const [text, setText]       = useState('');
  const [state, setState]     = useState('KA');
  const [provider, setProvider] = useState('heuristic');
  const [reviewer, setReviewer] = useState('');
  const [drafts, setDrafts]   = useState([]);
  const [result, setResult]   = useState(null);
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  const load = async () => setDrafts(await api.drafts());

  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const run = async () => {
    setErr(''); setBusy(true);
    try { setResult(await api.compilerRun({ text, state, provider })); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="card" aria-labelledby="compiler-heading">
      <h2 id="compiler-heading">⚙️ Rights Compiler</h2>
      <p className="subtitle">
        Paste the text of a public notified-service list. The compiler extracts draft rules; code validates them;{' '}
        <strong>a human approves every rule</strong> before any clock can use it. The LLM never decides a deadline.
      </p>

      {/* Config row */}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label htmlFor="state-select" style={{ minWidth: 120, flex: '0 0 auto' }}>
          State
          <select
            id="state-select"
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option>KA</option>
            <option>MH</option>
          </select>
        </label>

        <label htmlFor="provider-select" style={{ flex: 1, minWidth: 200 }}>
          Extraction engine
          <select
            id="provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            aria-describedby="provider-hint"
          >
            <option value="heuristic">Heuristic (offline, pipe tables)</option>
            <option value="gemini">Gemini 2.0 Flash (free — needs GEMINI_API_KEY)</option>
            <option value="groq">Groq / Llama-3.3-70B (free — needs GROQ_API_KEY)</option>
          </select>
          <span id="provider-hint" className="muted small" style={{ marginTop: 4, display: 'block' }}>
            {provider === 'gemini' && '🔑 Set GEMINI_API_KEY in server/.env (free at aistudio.google.com)'}
            {provider === 'groq'   && '🔑 Set GROQ_API_KEY in server/.env (free at console.groq.com)'}
            {provider === 'heuristic' && 'No API key needed — works fully offline for pipe-table formatted lists.'}
          </span>
        </label>

        <label htmlFor="reviewer-name" style={{ flex: 1, minWidth: 200 }}>
          Reviewer name
          <input
            id="reviewer-name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Who is reviewing & approving?"
            aria-required="true"
            aria-describedby="reviewer-hint"
          />
          <span id="reviewer-hint" className="muted small" style={{ marginTop: 4, display: 'block' }}>
            Required to approve any draft rule.
          </span>
        </label>
      </div>

      {/* Text input */}
      <label htmlFor="notified-list-text" style={{ marginTop: 12 }}>
        Notified-service list text
      </label>
      <textarea
        id="notified-list-text"
        rows="8"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the notified-service list text here (pipe table or prose)…"
        aria-label="Notified-service list input text"
      />

      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={() => setText(SAMPLE)} aria-label="Load a sample notified-service list">
          📄 Load sample list
        </button>
        <button
          className="primary"
          disabled={!text || busy}
          onClick={run}
          aria-label={busy ? 'Compiling in progress' : 'Compile text to draft rules'}
          aria-busy={busy}
        >
          {busy ? (
            <><span className="spinner" aria-hidden="true" /> Compiling…</>
          ) : (
            <>⚙️ Compile to draft rules</>
          )}
        </button>
      </div>

      {err && (
        <div className="err" role="alert" aria-live="assertive">
          <span aria-hidden="true">⚠</span> {err}
        </div>
      )}

      {result && (
        <div className="success" role="status" aria-live="polite">
          ✓ Created <strong>{result.created.length}</strong>, updated <strong>{result.updated.length}</strong>,
          skipped {result.skipped.length}, rejected {result.rejected.length}
          {result.rejected.length > 0 && (
            <> ({result.rejected.map((r) => `${r.name}: ${r.reason}`).join('; ')})</>
          )}.
        </div>
      )}

      {/* Draft rules */}
      <h3 className="section-title" id="drafts-heading" style={{ marginTop: 24 }}>
        Draft rules awaiting review
        <span className="badge" style={{ background: drafts.length ? 'var(--amber)' : 'var(--slate)', marginLeft: 10, verticalAlign: 'middle' }}>
          {drafts.length}
        </span>
      </h3>

      <div role="feed" aria-labelledby="drafts-heading" aria-busy={busy}>
        {drafts.length === 0 && <p className="muted">No drafts yet — compile a notified-service list above.</p>}
        {drafts.map((d) => (
          <Draft key={d.id + JSON.stringify(d.flags)} d={d} reviewer={reviewer} onChange={load} />
        ))}
      </div>
    </section>
  );
}
