import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Badge } from '../ui.jsx';

const REASONS = ['', 'AWAITING_VERIFICATION', 'OFFICER_VACANCY', 'FILE_MOVEMENT', 'APPLICANT_DOCUMENTS'];
const REASON_LABELS = {
  '': '— No reason —',
  AWAITING_VERIFICATION: 'Awaiting verification',
  OFFICER_VACANCY:       'Officer vacancy',
  FILE_MOVEMENT:         'File movement',
  APPLICANT_DOCUMENTS:   'Awaiting applicant docs',
};

const STATE_ORDER = { BREACHED: 0, AT_RISK: 1, ON_TIME: 2, COMPLETED_LATE: 3, COMPLETED_ON_TIME: 4 };

export default function Officer() {
  const [rows, setRows]       = useState([]);
  const [offices, setOffices] = useState([]);
  const [office, setOffice]   = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (o = office) => {
    setLoading(true);
    try { setRows(await api.radar(o)); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.offices().then(setOffices); load(''); }, []); // eslint-disable-line

  const breachedCount = rows.filter((r) => r.clock.state === 'BREACHED').length;
  const atRiskCount   = rows.filter((r) => r.clock.state === 'AT_RISK').length;

  return (
    <section className="card" aria-labelledby="radar-heading">
      <div className="card-header">
        <div>
          <h2 id="radar-heading">📋 Deadline Radar</h2>
          <p className="subtitle">
            Open applications sorted by legal risk. Reason codes surface systemic bottlenecks (not just blame).
          </p>
        </div>
        {/* Summary pills */}
        <div className="row" style={{ gap: 8, margin: 0 }}>
          {breachedCount > 0 && (
            <span className="badge" style={{ background: '#dc2626' }} role="status" aria-live="polite">
              ✕ {breachedCount} Breached
            </span>
          )}
          {atRiskCount > 0 && (
            <span className="badge" style={{ background: '#d97706' }} role="status">
              ⚠ {atRiskCount} At risk
            </span>
          )}
        </div>
      </div>

      <div className="radar-filters">
        <label htmlFor="office-filter">
          Filter by office
          <select
            id="office-filter"
            value={office}
            onChange={(e) => { setOffice(e.target.value); load(e.target.value); }}
            aria-label="Filter applications by office"
          >
            <option value="">All offices</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <button onClick={() => load(office)} aria-label="Refresh the radar list">
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </div>

      {loading && <p className="muted" role="status" aria-live="polite">Loading…</p>}

      <div className="table-wrap" role="region" aria-label="Application deadline radar table">
        <table aria-label="Applications sorted by legal risk">
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Service</th>
              <th scope="col">Application</th>
              <th scope="col">Office</th>
              <th scope="col">Due date</th>
              <th scope="col">Days left / late</th>
              <th scope="col">Bottleneck reason</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map((r) => (
              <tr key={r.id}>
                <td><Badge state={r.clock.state} /></td>
                <td><strong>{r.service}</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.ackNo}</td>
                <td>{r.office}</td>
                <td>{r.clock.dueDate}</td>
                <td>
                  {r.clock.state === 'BREACHED'
                    ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{r.clock.daysLate}d late</span>
                    : r.paused
                      ? <span className="muted">⏸ paused</span>
                      : <span>{r.clock.remaining}d left</span>}
                </td>
                <td>
                  <label htmlFor={`reason-${r.id}`} style={{ display: 'none' }}>
                    Bottleneck reason for {r.ackNo}
                  </label>
                  <select
                    id={`reason-${r.id}`}
                    value={r.reasonCode ?? ''}
                    onChange={async (e) => { await api.reason(r.id, e.target.value || null); load(); }}
                    style={{ width: 'auto', minWidth: 160 }}
                    aria-label={`Set bottleneck reason for ${r.ackNo}`}
                  >
                    {REASONS.map((x) => <option key={x} value={x}>{REASON_LABELS[x]}</option>)}
                  </select>
                </td>
                <td>
                  <button
                    onClick={async () => { await api.dispose(r.id); load(); }}
                    aria-label={`Mark ${r.ackNo} as decided`}
                  >
                    ✓ Mark decided
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan="8" className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  No open applications for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
