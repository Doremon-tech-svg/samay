import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Commission() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.commission()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const topLate   = rows.filter((r) => !r.suppressed).sort((a, b) => b.lateRate - a.lateRate)[0];
  const totalApps = rows.filter((r) => !r.suppressed).reduce((s, r) => s + r.total, 0);
  const totalLate = rows.filter((r) => !r.suppressed).reduce((s, r) => s + r.late, 0);

  return (
    <section className="card" aria-labelledby="commission-heading">
      <div className="card-header">
        <div>
          <h2 id="commission-heading">📊 Accountability Map</h2>
          <p className="subtitle">
            Offices ranked by late rate. Offices with fewer than 5 applications are hidden for privacy.
          </p>
        </div>
      </div>

      {/* Summary row */}
      {!loading && rows.length > 0 && (
        <div className="row" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="info-block" style={{ flex: '1 1 140px', margin: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)' }}>{totalApps}</div>
            <div className="muted small">Total applications</div>
          </div>
          <div className="info-block" style={{ flex: '1 1 140px', margin: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--red)' }}>{totalLate}</div>
            <div className="muted small">Late decisions</div>
          </div>
          <div className="info-block" style={{ flex: '1 1 140px', margin: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: totalApps ? (totalLate / totalApps > 0.3 ? 'var(--red)' : 'var(--teal)') : 'var(--navy)' }}>
              {totalApps ? `${(totalLate / totalApps * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="muted small">Overall late rate</div>
          </div>
          <div className="info-block" style={{ flex: '1 1 140px', margin: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>{topLate?.office ?? '—'}</div>
            <div className="muted small">Highest late rate</div>
          </div>
        </div>
      )}

      {loading && <p className="muted" role="status" aria-live="polite">Loading…</p>}

      <div className="table-wrap" role="region" aria-label="Commission accountability table">
        <table aria-label="Offices ranked by late rate">
          <thead>
            <tr>
              <th scope="col">Office</th>
              <th scope="col">District</th>
              <th scope="col">Applications</th>
              <th scope="col">Late</th>
              <th scope="col">Late rate</th>
              <th scope="col">At risk</th>
              <th scope="col">Open</th>
              <th scope="col">Bottlenecks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) =>
              o.suppressed ? (
                <tr key={o.officeId}>
                  <td><strong>{o.office}</strong></td>
                  <td colSpan="7" className="muted">{o.note}</td>
                </tr>
              ) : (
                <tr key={o.officeId}>
                  <td><strong>{o.office}</strong></td>
                  <td>{o.district}</td>
                  <td>{o.total}</td>
                  <td>{o.late}</td>
                  <td>
                    <div className="late-rate-bar">
                      <div className="late-rate-track" role="presentation">
                        <div
                          className="late-rate-fill"
                          style={{ width: `${Math.min(100, o.lateRate * 100 * 2)}%` }}
                        />
                      </div>
                      <span style={{ fontWeight: o.lateRate > 0.3 ? 600 : 400, color: o.lateRate > 0.3 ? 'var(--red)' : 'inherit' }}>
                        {(o.lateRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {o.atRisk > 0
                      ? <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{o.atRisk}</span>
                      : <span className="muted">0</span>}
                  </td>
                  <td>{o.open}</td>
                  <td className="small muted">
                    {Object.entries(o.reasons).map(([k, v]) =>
                      `${k.replace(/_/g, ' ').toLowerCase()} (${v})`
                    ).join(', ') || '—'}
                  </td>
                </tr>
              )
            )}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan="8" className="muted" style={{ textAlign: 'center', padding: 24 }}>
                  No data yet — submit some applications first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
