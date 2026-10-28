import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Badge, StatCard } from '../ui.jsx';
import { IconRadar, IconAlert, IconCheck, IconRefresh, IconBuilding } from '../Icons.jsx';

const REASONS = ['', 'AWAITING_VERIFICATION', 'OFFICER_VACANCY', 'FILE_MOVEMENT', 'APPLICANT_DOCUMENTS'];
const REASON_LABELS = {
  '': '— Select Reason —',
  AWAITING_VERIFICATION: 'Awaiting Field Verification',
  OFFICER_VACANCY:       'Designated Officer Vacancy',
  FILE_MOVEMENT:         'Inter-Department File Movement',
  APPLICANT_DOCUMENTS:   'Pending Applicant Documents',
};

export default function Officer() {
  const [rows, setRows]       = useState([]);
  const [offices, setOffices] = useState([]);
  const [office, setOffice]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [acting, setActing]   = useState(null);

  const load = async (o = office) => {
    setLoading(true);
    try { setRows(await api.radar(o)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.offices().then(setOffices);
    load('');
  }, []); // eslint-disable-line

  const setReason = async (id, reasonCode) => {
    try {
      await api.setReason(id, reasonCode || null);
      await load(office);
    } catch (e) {
      alert(`Error setting bottleneck reason: ${e.message}`);
    }
  };

  const markDisposed = async (id) => {
    if (!confirm('Mark this application as disposed/resolved?')) return;
    setActing(id);
    try {
      await api.dispose(id);
      await load(office);
    } catch (e) {
      alert(`Error disposing application: ${e.message}`);
    } finally {
      setActing(null);
    }
  };

  const breachedCount = rows.filter((r) => r.clock.state === 'BREACHED').length;
  const atRiskCount   = rows.filter((r) => r.clock.state === 'AT_RISK').length;
  const onTimeCount   = rows.filter((r) => r.clock.state === 'ON_TIME').length;

  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.service?.toLowerCase().includes(q) ||
      r.ackNo?.toLowerCase().includes(q) ||
      r.office?.toLowerCase().includes(q)
    );
  });

  return (
    <section className="card" aria-labelledby="radar-heading">
      <div className="card-header">
        <div>
          <h2 id="radar-heading">
            <IconRadar size={22} color="var(--navy)" />
            <span>Officer Deadline Radar</span>
          </h2>
          <p className="subtitle">
            Executive oversight of all open statutory applications ranked strictly by legal risk. Surface systemic bottlenecks without assigning blame.
          </p>
        </div>

        <button onClick={() => load(office)} disabled={loading} style={{ fontSize: 13 }}>
          <IconRefresh size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Overview Tiles */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard
          label="Active Docket"
          value={rows.length}
          subtext="Under active statutory countdown"
          color="var(--navy)"
        />
        <StatCard
          label="Imminent Risk"
          value={atRiskCount}
          subtext="In final third of statutory window"
          color="#d97706"
          badge={<span style={{ fontSize: 11, background: '#fffbeb', color: '#b45309', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Amber Alert</span>}
        />
        <StatCard
          label="Statutory Breaches"
          value={breachedCount}
          subtext="Liable for immediate appellate escalation"
          color="#dc2626"
          badge={<span style={{ fontSize: 11, background: '#fef2f2', color: '#991b1b', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Breached</span>}
        />
        <StatCard
          label="On-Track Rate"
          value={rows.length ? `${Math.round((onTimeCount / rows.length) * 100)}%` : '100%'}
          subtext={`${onTimeCount} applications on track`}
          color="#059669"
        />
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 18,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px' }}>
          <label htmlFor="office-filter" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: 12 }}>
            Office:
          </label>
          <select
            id="office-filter"
            value={office}
            onChange={(e) => { setOffice(e.target.value); load(e.target.value); }}
            style={{ margin: 0, padding: '7px 10px', fontSize: 13 }}
          >
            <option value="">All Offices (Statewide)</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.district})</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search by Ack No, Service, or Office…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ margin: 0, padding: '7px 12px', fontSize: 13 }}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
          Loading radar telemetry…
        </div>
      )}

      {/* Data Table */}
      <div className="table-wrap" role="region" aria-label="Officer deadline radar table">
        <table>
          <thead>
            <tr>
              <th scope="col">Legal Status</th>
              <th scope="col">Service Name</th>
              <th scope="col">Application No.</th>
              <th scope="col">Office</th>
              <th scope="col">Due Date</th>
              <th scope="col">Urgency Meter</th>
              <th scope="col">Systemic Bottleneck Reason</th>
              <th scope="col">Nudge</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, 60).map((r) => {
              const isBreach = r.clock.state === 'BREACHED';
              return (
                <tr key={r.id}>
                  <td>
                    <Badge state={r.clock.state} size="sm" />
                  </td>

                  <td>
                    <strong style={{ fontSize: 13.5, color: 'var(--navy)' }}>{r.service}</strong>
                  </td>

                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>
                      {r.ackNo}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontSize: 12.5 }}>{r.office}</div>
                  </td>

                  <td>
                    <span style={{ fontSize: 12.5, fontWeight: isBreach ? 700 : 500, color: isBreach ? '#dc2626' : '#1e293b' }}>
                      {r.clock.dueDate}
                    </span>
                  </td>

                  <td>
                    {isBreach ? (
                      <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>
                        +{r.clock.daysLate}d Overdue
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, color: r.clock.state === 'AT_RISK' ? '#d97706' : '#059669' }}>
                          {r.clock.remaining}d left
                        </span>
                        <div style={{ width: 44, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, Math.round((r.clock.elapsed / (r.clock.totalDays || 1)) * 100))}%`,
                            height: '100%',
                            background: r.clock.state === 'AT_RISK' ? '#d97706' : '#059669'
                          }} />
                        </div>
                      </div>
                    )}
                  </td>

                  <td>
                    <select
                      value={r.reasonCode || ''}
                      onChange={(e) => setReason(r.id, e.target.value)}
                      style={{ margin: 0, padding: '4px 8px', fontSize: 12, borderColor: r.reasonCode ? '#cbd5e1' : '#e2e8f0' }}
                      aria-label={`Tag systemic delay reason for ${r.ackNo}`}
                    >
                      {REASONS.map((k) => (
                        <option key={k} value={k}>{REASON_LABELS[k]}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    {r.nudgeSent ? (
                      <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Sent (Day 10)
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      style={{ fontSize: 11.5, padding: '4px 9px' }}
                      onClick={() => markDisposed(r.id)}
                      disabled={acting === r.id}
                      aria-label={`Mark application ${r.ackNo} as disposed`}
                    >
                      <IconCheck size={12} /> {acting === r.id ? '…' : 'Mark Done'}
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && !loading && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: 28, color: '#64748b' }}>
                  No open applications match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
