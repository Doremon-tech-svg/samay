import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { StatCard } from '../ui.jsx';
import { IconMap, IconDownload, IconShield, IconBuilding, IconAlert } from '../Icons.jsx';

export default function Commission() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('tiles'); // 'tiles' | 'table'

  useEffect(() => {
    api.commission()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const visibleRows = rows.filter((r) => !r.suppressed);
  const topLate     = [...visibleRows].sort((a, b) => b.lateRate - a.lateRate)[0];
  const totalApps   = visibleRows.reduce((s, r) => s + r.total, 0);
  const totalLate   = visibleRows.reduce((s, r) => s + r.late, 0);
  const lateRatePct = totalApps ? ((totalLate / totalApps) * 100).toFixed(1) : '0.0';

  // Systemic bottleneck aggregation
  const bottleneckCounts = {};
  for (const r of visibleRows) {
    if (r.reasons) {
      for (const [k, count] of Object.entries(r.reasons)) {
        bottleneckCounts[k] = (bottleneckCounts[k] || 0) + count;
      }
    }
  }
  const totalBottlenecks = Object.values(bottleneckCounts).reduce((a, b) => a + b, 0) || 1;

  const BOTTLENECK_NAMES = {
    OFFICER_VACANCY:       'Designated Officer Vacancy',
    AWAITING_VERIFICATION: 'Awaiting Field Verification',
    FILE_MOVEMENT:         'Inter-Department File Movement',
    APPLICANT_DOCUMENTS:   'Pending Applicant Documents'
  };

  const exportCsv = () => {
    const headers = ['Office', 'District', 'Total Applications', 'Late Disposals', 'Late Rate %', 'At Risk', 'Open Applications'];
    const csvRows = [headers.join(',')];

    for (const r of rows) {
      if (r.suppressed) {
        csvRows.push(`"${r.office}","${r.district}","<5 (Suppressed for Privacy)","—","—","—","—"`);
      } else {
        csvRows.push(`"${r.office}","${r.district}",${r.total},${r.late},${(r.lateRate * 100).toFixed(1)}%,${r.atRisk},${r.open}`);
      }
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SAMAY_Commission_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="card" aria-labelledby="commission-heading">
      <div className="card-header">
        <div>
          <h2 id="commission-heading">
            <IconMap size={22} color="var(--navy)" />
            <span>State Commission Accountability Map</span>
          </h2>
          <p className="subtitle">
            Macro-level compliance surveillance for State Right to Public Services Commissions. Automated detection of systemic delays and enforcement tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: 3,
            borderRadius: 8,
            border: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('tiles')}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                border: 'none',
                background: viewMode === 'tiles' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'tiles' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: viewMode === 'tiles' ? 'var(--navy)' : '#64748b'
              }}
            >
              Heat Tiles
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                color: viewMode === 'table' ? 'var(--navy)' : '#64748b'
              }}
            >
              Data Grid
            </button>
          </div>

          <button onClick={exportCsv} disabled={loading || rows.length === 0} style={{ fontSize: 12.5 }}>
            <IconDownload size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Overview StatCards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard
          label="Total Applications"
          value={totalApps}
          subtext="Processed across monitored offices"
          color="var(--navy)"
        />
        <StatCard
          label="Statutory Late Decisions"
          value={totalLate}
          subtext="Disposed after statutory deadline"
          color="#dc2626"
        />
        <StatCard
          label="Statewide Late Rate"
          value={`${lateRatePct}%`}
          subtext={Number(lateRatePct) > 25 ? 'High statutory delay detected' : 'Acceptable compliance tier'}
          color={Number(lateRatePct) > 25 ? '#dc2626' : '#059669'}
          badge={
            <span style={{
              fontSize: 11,
              background: Number(lateRatePct) > 25 ? '#fef2f2' : '#ecfdf5',
              color: Number(lateRatePct) > 25 ? '#991b1b' : '#047857',
              padding: '2px 6px',
              borderRadius: 4,
              fontWeight: 700
            }}>
              CAG Audit Benchmark
            </span>
          }
        />
        <StatCard
          label="Highest Delay Office"
          value={topLate ? `${(topLate.lateRate * 100).toFixed(0)}%` : '—'}
          subtext={topLate?.office ?? 'No delay'}
          color="#d97706"
        />
      </div>

      {/* Systemic Bottleneck Breakdown Chart (P1-6) */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
            Systemic Delay Attribution (Root Cause Breakdown)
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b' }}>
            Reported by Designated Officers in field
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(BOTTLENECK_NAMES).map(([key, label]) => {
            const count = bottleneckCounts[key] || 0;
            const pct = Math.round((count / totalBottlenecks) * 100);
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: '#334155', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>{count} cases ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: key === 'OFFICER_VACANCY' ? '#dc2626' : (key === 'AWAITING_VERIFICATION' ? '#d97706' : '#0284c7')
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
          Aggregating state commission telemetry…
        </div>
      )}

      {/* Visual Heat Tiles View (P1-6) */}
      {viewMode === 'tiles' && !loading && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
              Office Compliance Heat Grid
            </span>
            <span style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconShield size={13} color="#059669" />
              k-anonymity (k ≥ 5) active for privacy protection
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16
          }}>
            {rows.map((o) => {
              if (o.suppressed) {
                return (
                  <div key={o.officeId} style={{
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 12,
                    padding: 16,
                    color: '#64748b'
                  }}>
                    <strong style={{ fontSize: 14, color: '#475569', display: 'block', marginBottom: 4 }}>
                      {o.office}
                    </strong>
                    <span style={{ fontSize: 12 }}>{o.district}</span>
                    <div style={{ fontSize: 11, background: '#e2e8f0', color: '#475569', padding: '3px 8px', borderRadius: 4, marginTop: 8, display: 'inline-block' }}>
                      Privacy Protected ({o.note})
                    </div>
                  </div>
                );
              }

              const isHighLate = o.lateRate > 0.3;
              const isMedLate  = o.lateRate > 0.15;
              const borderColor = isHighLate ? '#fca5a5' : (isMedLate ? '#fde68a' : '#a7f3d0');
              const barColor   = isHighLate ? '#dc2626' : (isMedLate ? '#d97706' : '#059669');

              return (
                <div key={o.officeId} style={{
                  background: '#ffffff',
                  border: `1px solid ${borderColor}`,
                  borderTop: `4px solid ${barColor}`,
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <strong style={{ fontSize: 15, color: 'var(--navy)', display: 'block' }}>
                        {o.office}
                      </strong>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{o.district}</span>
                    </div>

                    <span style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: barColor,
                      background: isHighLate ? '#fef2f2' : (isMedLate ? '#fffbeb' : '#ecfdf5'),
                      padding: '3px 8px',
                      borderRadius: 6
                    }}>
                      {(o.lateRate * 100).toFixed(1)}% late
                    </span>
                  </div>

                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, o.lateRate * 100)}%`, height: '100%', background: barColor }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                    <span>Total: <strong>{o.total}</strong></span>
                    <span>Late: <strong style={{ color: o.late > 0 ? '#dc2626' : 'inherit' }}>{o.late}</strong></span>
                    <span>Open: <strong>{o.open}</strong></span>
                    <span>At Risk: <strong style={{ color: o.atRisk > 0 ? '#d97706' : 'inherit' }}>{o.atRisk}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Accountability Data Table */}
      {viewMode === 'table' && !loading && (
        <div className="table-wrap" role="region" aria-label="Commission accountability table">
          <table>
            <thead>
              <tr>
                <th scope="col">Office Name</th>
                <th scope="col">District</th>
                <th scope="col">Total Apps</th>
                <th scope="col">Statutory Late</th>
                <th scope="col">Late Rate %</th>
                <th scope="col">At Risk</th>
                <th scope="col">Open Pending</th>
                <th scope="col">Primary Bottlenecks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) =>
                o.suppressed ? (
                  <tr key={o.officeId}>
                    <td><strong>{o.office}</strong></td>
                    <td>{o.district}</td>
                    <td colSpan="6" style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12.5 }}>
                      Protected by k-anonymity privacy shield ({o.note})
                    </td>
                  </tr>
                ) : (
                  <tr key={o.officeId}>
                    <td><strong style={{ color: 'var(--navy)' }}>{o.office}</strong></td>
                    <td>{o.district}</td>
                    <td>{o.total}</td>
                    <td>
                      <span style={{ fontWeight: o.late > 0 ? 700 : 400, color: o.late > 0 ? '#dc2626' : 'inherit' }}>
                        {o.late}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, color: o.lateRate > 0.25 ? '#dc2626' : '#059669', fontSize: 13 }}>
                          {(o.lateRate * 100).toFixed(1)}%
                        </span>
                        <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, o.lateRate * 100)}%`,
                            height: '100%',
                            background: o.lateRate > 0.25 ? '#dc2626' : '#059669'
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      {o.atRisk > 0 ? (
                        <span style={{ color: '#d97706', fontWeight: 700 }}>{o.atRisk}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>0</span>
                      )}
                    </td>
                    <td>{o.open}</td>
                    <td>
                      <span style={{ fontSize: 12, color: '#475569' }}>
                        {o.reasons && Object.keys(o.reasons).length > 0
                          ? Object.entries(o.reasons).map(([k, v]) => `${k.replace('_', ' ')} (${v})`).join(', ')
                          : '—'}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
