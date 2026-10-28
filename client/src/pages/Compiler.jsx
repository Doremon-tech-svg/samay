import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { IconCpu, IconShield, IconCheck, IconAlert } from '../Icons.jsx';

const SAMPLE_MH = `FIXTURE notified-service list (Maharashtra Revenue Department).
Service | Days | Designated Officer | First Appellate | Second Appellate
Income Certificate | 15 | Nayab Tahsildar | Tahsildar | Sub Divisional Officer
Agriculturist Certificate | 7 | Tahsildar | Sub Divisional Officer | Additional Collector
Landless Labour Certificate | 15 | Tahsildar | Sub Divisional Officer | Additional Collector`;

const SAMPLE_KA = `Karnataka Sakala Compendium Notification (Department of Revenue).
Service | Days | Designated Officer | First Appellate | Second Appellate
Caste Certificate | 21 | Tahsildar | Assistant Commissioner | Deputy Commissioner
Residence Certificate | 7 | Tahsildar | Assistant Commissioner | Deputy Commissioner
Income and Caste Certificate | 21 | Tahsildar | Assistant Commissioner | Deputy Commissioner`;

const FIELDS = [
  ['days',               'Statutory Days'],
  ['day_type',           'Day Counting Type'],
  ['designated_officer', 'Deciding Officer'],
  ['appellate_1',        'First Appellate'],
  ['appellate_2',        'Second Appellate'],
  ['appeal_final',       'State Commission / Final'],
];

function DraftCard({ d, reviewer, onChange }) {
  const [vals, setVals] = useState(() => Object.fromEntries(FIELDS.map(([k]) => [k, d[k] ?? ''])));
  const [ack, setAck]   = useState(false);
  const [msg, setMsg]   = useState('');
  const [busy, setBusy] = useState('');

  const act = (label, fn) => async () => {
    try { setMsg(''); setBusy(label); await fn(); await onChange(); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(''); }
  };

  const hasFlags = d.flags && d.flags.length > 0;

  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${hasFlags ? '#fde68a' : '#cbd5e1'}`,
      borderLeft: `4px solid ${hasFlags ? '#f59e0b' : '#059669'}`,
      borderRadius: 12,
      padding: '18px 20px',
      marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }} role="article" aria-label={`Draft rule: ${d.name}`}>
      {/* Draft Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: 'var(--navy)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4
          }}>
            {d.state_code}
          </span>
          <strong style={{ fontSize: 16, color: 'var(--navy)' }}>{d.name}</strong>
        </div>

        {!hasFlags ? (
          <span style={{ background: '#ecfdf5', color: '#047857', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
            ✓ Verified Clean
          </span>
        ) : (
          <span style={{ background: '#fffbeb', color: '#b45309', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
            ⚠ {d.flags.length} Flag{d.flags.length > 1 ? 's' : ''} Require Review
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 1.2fr', gap: 20 }}>
        {/* Source Gazette Snippet */}
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
            Verbatim Gazette Source Line
          </span>
          <pre style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: '#334155',
            margin: 0
          }}>{d.source_snippet}</pre>

          {hasFlags && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {d.flags.map((f) => (
                <span key={f} style={{
                  fontSize: 11,
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600
                }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Editable Structured Attributes */}
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
            Compiled Statutory Attributes
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FIELDS.map(([k, label]) => (
              <div key={k}>
                <label htmlFor={`field-${d.id}-${k}`} style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                  {label}
                </label>
                <input
                  id={`field-${d.id}-${k}`}
                  value={vals[k]}
                  onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
                  style={{ margin: 0, padding: '6px 10px', fontSize: 12.5 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
          {msg}
        </div>
      )}

      {/* Reviewer Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
        paddingTop: 12,
        borderTop: '1px solid #f1f5f9',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <button
          type="button"
          onClick={act('save', () => api.editService(d.id, { ...vals, days: vals.days === '' ? null : Number(vals.days) }))}
          disabled={!!busy}
          style={{ fontSize: 12.5, padding: '5px 12px' }}
        >
          {busy === 'save' ? 'Saving…' : 'Save Attributes'}
        </button>

        {hasFlags && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 12, cursor: 'pointer', textTransform: 'none', color: '#1e293b' }}>
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <span>I have verified flags against official gazette text</span>
          </label>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="primary"
            disabled={!reviewer || !!busy}
            onClick={act('approve', () => api.approveService(d.id, { verifiedBy: reviewer, acknowledgeFlags: ack }))}
            style={{ fontSize: 12.5, padding: '5px 16px' }}
          >
            {busy === 'approve' ? 'Approving…' : 'Approve & Unlock Clock'}
          </button>

          <button
            type="button"
            className="danger"
            disabled={!!busy}
            onClick={act('reject', () => api.rejectService(d.id))}
            style={{ fontSize: 12.5, padding: '5px 12px' }}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Compiler() {
  const [state, setState]         = useState('KA');
  const [text, setText]           = useState(SAMPLE_KA);
  const [provider, setProvider]   = useState('heuristic');
  const [reviewer, setReviewer]   = useState('Legal Reviewer 1');
  const [drafts, setDrafts]       = useState([]);
  const [approved, setApproved]   = useState([]);
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState('');
  const [summary, setSummary]     = useState(null);

  const reload = async () => {
    const list = await api.services();
    setDrafts(list.filter((s) => s.status === 'draft'));
    setApproved(list.filter((s) => s.status === 'approved'));
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line

  const runCompile = async () => {
    setBusy(true);
    setErr('');
    setSummary(null);
    try {
      const res = await api.compile({ text, state, provider });
      setSummary(res);
      await reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="compiler-heading">
      <div className="card-header">
        <div>
          <h2 id="compiler-heading">
            <IconCpu size={22} color="var(--navy)" />
            <span>Rights Compiler AI Studio</span>
          </h2>
          <p className="subtitle">
            Neuro-symbolic legal rule ingestion. Ingest raw government gazette notifications into deterministic state guarantee rules with strict hallucination guards and human sign-off.
          </p>
        </div>
      </div>

      {/* Compiler Workbench Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 460px) 1fr', gap: 24, marginBottom: 32 }}>
        {/* Input Text & Options */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
              1. Ingest Statutory Gazette Notification
            </span>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => { setState('MH'); setText(SAMPLE_MH); }}
              >
                Load MH List
              </button>
              <button
                type="button"
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => { setState('KA'); setText(SAMPLE_KA); }}
              >
                Load KA List
              </button>
            </div>
          </div>

          <label htmlFor="gazette-text">Gazette Text (PDF / Compendium Extract):</label>
          <textarea
            id="gazette-text"
            rows="8"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label htmlFor="state-select">State Code:</label>
              <select
                id="state-select"
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={{ margin: 0 }}
              >
                <option value="KA">Karnataka (Sakala)</option>
                <option value="MH">Maharashtra (RTS)</option>
              </select>
            </div>

            <div>
              <label htmlFor="provider-select">Extraction Engine:</label>
              <select
                id="provider-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{ margin: 0 }}
              >
                <option value="heuristic">Heuristic Parser (Baseline)</option>
                <option value="gemini">Gemini 2.0 Flash (LLM)</option>
                <option value="groq">Groq Llama 3.3 70B (LLM)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="primary"
            style={{ width: '100%' }}
            onClick={runCompile}
            disabled={busy || !text}
          >
            <IconCpu size={15} />
            <span>{busy ? 'Compiling Rules…' : 'Compile Rules (Run AI Guard)'}</span>
          </button>

          {err && <div className="err-box" style={{ marginTop: 12 }}>{err}</div>}

          {summary && (
            <div style={{ marginTop: 14, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 12, fontSize: 12.5, color: '#065f46' }}>
              <strong>Compilation Succeeded:</strong>
              <div>• {summary.created?.length || 0} Draft Rules Generated</div>
              {summary.skipped?.length > 0 && <div>• {summary.skipped.length} Approved Rules Kept Intact</div>}
            </div>
          )}
        </div>

        {/* Human Verification Gate */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', display: 'block' }}>
                2. Human Verification Gate ({drafts.length} Pending Review)
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Unapproved drafts can never start a legal clock. Verification protects citizens against hallucinations.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label htmlFor="reviewer-name" style={{ margin: 0, fontSize: 12, whiteSpace: 'nowrap' }}>
                Reviewer:
              </label>
              <input
                id="reviewer-name"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="Your Name"
                style={{ margin: 0, width: 140, padding: '5px 8px', fontSize: 12 }}
              />
            </div>
          </div>

          {drafts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
              <IconShield size={32} color="#94a3b8" />
              <div style={{ marginTop: 8, fontWeight: 600 }}>All Drafts Approved or None Generated</div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                Compile a gazette list from the left panel to review new draft statutory services.
              </p>
            </div>
          ) : (
            <div>
              {drafts.map((d) => (
                <DraftCard key={d.id} d={d} reviewer={reviewer} onChange={reload} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approved Registry Inventory */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginBottom: 12 }}>
          Approved State Rules in Active Registry ({approved.length})
        </h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Service Name</th>
                <th>Statutory Days</th>
                <th>Deciding Officer</th>
                <th>First Appellate</th>
                <th>Second Appellate</th>
                <th>State Commission</th>
                <th>Verified By</th>
              </tr>
            </thead>
            <tbody>
              {approved.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                      {s.state_code}
                    </span>
                  </td>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.days} {s.day_type}</td>
                  <td>{s.designated_officer}</td>
                  <td>{s.appellate_1 || '—'}</td>
                  <td>{s.appellate_2 || '—'}</td>
                  <td>{s.appeal_final || '—'}</td>
                  <td><span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ {s.verified_by}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
