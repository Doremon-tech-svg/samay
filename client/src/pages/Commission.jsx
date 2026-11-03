import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { IconMap, IconDownload, IconShield, IconBuilding, IconAlert, IconArrowRight, IconCheck } from '../Icons.jsx';

const REASONS = {
  OFFICER_VACANCY: { label: 'Officer vacancy / capacity gap', action: 'Review vacancy coverage, temporary charge arrangements, and workload distribution for this service desk.' },
  AWAITING_VERIFICATION: { label: 'Field verification pending', action: 'Check whether field visits can be batched, assign a due date for the verification report, and surface missing instructions early.' },
  FILE_MOVEMENT: { label: 'Inter-department file movement', action: 'Map the hand-off points, set a named receiving desk, and use a shared movement register with escalation after each missed hand-off.' },
  APPLICANT_DOCUMENTS: { label: 'Applicant documents pending', action: 'Send one clear, consolidated document request with a response deadline and record the applicant-facing notice.' }
};
const reasonLabel = (code) => REASONS[code]?.label || String(code || 'Reason not recorded').replaceAll('_', ' ').toLowerCase();
const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;
const safe = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

export default function Commission({ lang = 'en' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('tiles');
  const [departmentFilter, setDepartmentFilter] = useState('All departments');
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [aiReply, setAiReply] = useState('');
  const [aiProvider, setAiProvider] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [contact, setContact] = useState(null);
  const [contactCopied, setContactCopied] = useState(false);
  const [search, setSearch] = useState('');

  const refresh = async () => {
    setLoading(true); setError('');
    try { setRows(await api.commission()); }
    catch (e) { setError(e.message || 'Could not load Commission overview.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const visibleRows = rows.filter((r) => !r.suppressed);
  const departmentStats = useMemo(() => {
    const result = new Map();
    visibleRows.forEach((office) => Object.entries(office.departments || { [office.primaryDepartment || 'Public services']: { total: office.total, late: office.late, atRisk: office.atRisk, open: office.open } }).forEach(([name, stats]) => {
      const d = result.get(name) || { name, total: 0, late: 0, atRisk: 0, open: 0, offices: 0, reasons: {} };
      d.total += stats.total || 0; d.late += stats.late || 0; d.atRisk += stats.atRisk || 0; d.open += stats.open || 0; d.offices++;
      Object.entries(stats.reasons || {}).forEach(([code, count]) => { d.reasons[code] = (d.reasons[code] || 0) + count; });
      result.set(name, d);
    }));
    return [...result.values()].sort((a, b) => b.late - a.late || b.total - a.total);
  }, [visibleRows]);
  const topLate = [...visibleRows].sort((a, b) => b.lateRate - a.lateRate)[0];
  const totalApps = visibleRows.reduce((sum, r) => sum + r.total, 0);
  const totalLate = visibleRows.reduce((sum, r) => sum + r.late, 0);
  const totalRisk = visibleRows.reduce((sum, r) => sum + r.atRisk, 0);
  const lateRatePct = totalApps ? ((totalLate / totalApps) * 100).toFixed(1) : '0.0';
  const bottleneckCounts = {};
  visibleRows.forEach((r) => Object.entries(r.reasons || {}).forEach(([key, count]) => { bottleneckCounts[key] = (bottleneckCounts[key] || 0) + count; }));
  const totalBottlenecks = Math.max(1, Object.values(bottleneckCounts).reduce((a, b) => a + b, 0));
  const filteredRows = visibleRows.filter((row) => (departmentFilter === 'All departments' || Object.hasOwn(row.departments || {}, departmentFilter) || row.primaryDepartment === departmentFilter)
    && `${row.office} ${row.district} ${row.primaryDepartment || ''}`.toLowerCase().includes(search.toLowerCase()));

  const openOffice = async (office) => {
    setSelectedOffice(office); setDetail(null); setAiReply(''); setAiProvider(''); setContact(null); setError(''); setDetailBusy(true);
    try { setDetail(await api.commissionOffice(office.officeId)); }
    catch (e) { setError(e.message || 'Office drill-down is unavailable.'); }
    finally { setDetailBusy(false); }
  };

  const askAI = async () => {
    if (!detail || aiBusy) return;
    setAiBusy(true); setAiReply('');
    const reasonSummary = Object.entries(detail.reasonCounts || {}).map(([code, count]) => `${reasonLabel(code)} (${count}; ${code})`).join('; ') || 'No coded bottleneck is present in this office cohort.';
    const delayedSummary = (detail.delayedApplications || []).slice(0, 10).map((item) => `${item.reference} ${item.service} ${item.status} due ${item.dueDate}; reason ${item.reasonCode || 'not recorded'}`).join(' | ') || 'No delayed or at-risk files were returned.';
    const message = `Commission improvement review for ${detail.office.name}, ${detail.office.district}, ${detail.office.stateCode}. Aggregate only: ${detail.privacy.cohortSize} applications, ${selectedOffice.late} late decisions, ${selectedOffice.atRisk} at risk. Bottlenecks: ${reasonSummary}. Masked delayed case sample: ${delayedSummary}. Give a balanced, evidence-based 3-step improvement plan. Do not blame an individual, infer citizen identities, invent facts, or recommend punishment without investigation.`;
    try {
      const result = await api.copilot({ role: 'commission', message, history: [], language: lang });
      setAiReply(result.answer); setAiProvider(result.provider || 'demo-fallback');
    } catch (e) { setAiReply(e.message || 'AI recommendations are unavailable. Use the reason-based actions shown below.'); setAiProvider('unavailable'); }
    finally { setAiBusy(false); }
  };

  const prepareContact = (item) => {
    const officer = item.officer || {};
    const body = `To: ${safe(officer.name)} — ${safe(officer.designation)}\nSubject: Commission follow-up on ${safe(item.reference)}\n\nPlease provide a factual status update for the ${safe(item.service)} application (reference ${safe(item.reference)}), received ${safe(item.receivedOn)}, due ${safe(item.dueDate)}. The current SAMAY demo record shows ${safe(item.status)}${item.reasonCode ? ` with the recorded reason “${reasonLabel(item.reasonCode)}”` : ' with no coded delay reason'}.\n\nPlease confirm the current processing stage, any outstanding dependency, the next responsible desk, and the expected completion date. If the recorded reason is inaccurate, please provide the correction and supporting record.\n\nThis is a demo-only draft for review; it has not been sent.`;
    setContact({ officer, item, body }); setContactCopied(false);
  };
  const copyContact = async () => {
    if (!contact) return;
    try { await navigator.clipboard.writeText(contact.body); setContactCopied(true); }
    catch { setError('Clipboard access is unavailable. Select and copy the demo draft manually.'); }
  };

  const exportCsv = () => {
    const headers = ['Office', 'District', 'Department', 'Total Applications', 'Late Decisions', 'Late Rate %', 'At Risk', 'Open Applications'];
    const csvRows = [headers.join(',')];
    for (const r of rows) csvRows.push(r.suppressed
      ? `"${r.office}","${r.district}","—","<5 (suppressed)","—","—","—","—"`
      : `"${r.office}","${r.district}","${r.primaryDepartment || ''}",${r.total},${r.late},${pct(r.lateRate)},${r.atRisk},${r.open}`);
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    link.download = `SAMAY_Commission_Compliance_${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };

  const suggestions = detail ? Object.entries(detail.reasonCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];

  return (
    <section className="commission-console" aria-labelledby="commission-heading">
      <header className="commission-hero">
        <div className="commission-hero-topline"><span className="commission-live-dot" /> COMMISSION OVERSIGHT · SYNTHETIC DEMO DATA</div>
        <div className="commission-hero-main">
          <div>
            <h2 id="commission-heading"><IconMap size={22} /> Accountability & service recovery</h2>
            <p>Move from a statewide signal to the responsible department, delayed cases, recorded bottlenecks, and a practical recovery plan.</p>
          </div>
          <button className="commission-export" onClick={exportCsv} disabled={loading || rows.length === 0}><IconDownload size={15} /> Export report</button>
        </div>
        <div className="commission-hero-note"><IconShield size={15} /> Case references are masked. Small cohorts stay hidden. Officer identities and contact drafts shown here are demo-only; no messages are sent.</div>
      </header>

      {error && <div className="commission-error" role="alert"><IconAlert size={16} /> {error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

      <div className="commission-kpis">
        <article><span className="commission-kpi-label">Applications monitored</span><strong>{loading ? '—' : totalApps}</strong><small>Across offices meeting privacy threshold</small></article>
        <article className="delay"><span className="commission-kpi-label">Late decisions</span><strong>{loading ? '—' : totalLate}</strong><small>Completed beyond the service deadline</small></article>
        <article className="risk"><span className="commission-kpi-label">At-risk right now</span><strong>{loading ? '—' : totalRisk}</strong><small>Approaching or crossing the legal clock</small></article>
        <article className="rate"><span className="commission-kpi-label">Visible late rate</span><strong>{loading ? '—' : `${lateRatePct}%`}</strong><small>{topLate ? `Highest visible: ${topLate.district}` : 'No visible late decisions'}</small></article>
      </div>

      <section className="commission-section" aria-labelledby="department-heading">
        <div className="commission-section-title"><div><span className="commission-section-kicker">01 · FIND THE PATTERN</span><h3 id="department-heading">Choose a department</h3></div><span className="commission-section-help">Departments are clickable filters; choose one to narrow the office list.</span></div>
        <div className="commission-department-list">
          <button className={`commission-department-card ${departmentFilter === 'All departments' ? 'selected' : ''}`} onClick={() => setDepartmentFilter('All departments')}>
            <span className="commission-department-name">All departments</span><strong>{totalApps}</strong><small>{totalLate} late · {departmentStats.length} service groups</small>
          </button>
          {departmentStats.map((department) => <button key={department.name} className={`commission-department-card ${departmentFilter === department.name ? 'selected' : ''}`} onClick={() => setDepartmentFilter(department.name)}>
            <span className="commission-department-name">{department.name}</span><strong>{department.total}</strong><small>{department.late} late · {department.offices} visible offices</small>
            <span className="commission-department-bar"><i style={{ width: `${department.total ? Math.max(2, department.late / department.total * 100) : 0}%` }} /></span>
          </button>)}
        </div>
      </section>

      <section className="commission-section" aria-labelledby="office-heading">
        <div className="commission-section-title"><div><span className="commission-section-kicker">02 · SELECT A UNIT</span><h3 id="office-heading">Office performance</h3></div>
          <div className="commission-office-tools"><input aria-label="Search offices" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search district or office" />
            <div className="commission-view-toggle"><button className={viewMode === 'tiles' ? 'active' : ''} onClick={() => setViewMode('tiles')}>Cards</button><button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button></div>
            <button className="commission-refresh" onClick={refresh} disabled={loading}>Refresh</button>
          </div>
        </div>
        <p className="commission-caption"><IconShield size={13} /> Offices with fewer than 5 demo records are shown as privacy-protected and cannot be opened.</p>
        {loading ? <div className="commission-loading">Preparing anonymized service-performance view…</div> : viewMode === 'tiles' ? (
          <div className="commission-office-grid">
            {filteredRows.map((office) => {
              const heat = office.lateRate >= .35 ? 'high' : office.lateRate >= .15 ? 'medium' : 'low';
              return <button key={office.officeId} className={`commission-office-card ${heat} ${selectedOffice?.officeId === office.officeId ? 'selected' : ''}`} onClick={() => openOffice(office)}>
                <span className="commission-office-head"><span><b>{office.office}</b><small>{office.district} · {office.primaryDepartment}</small></span><strong>{pct(office.lateRate)} late</strong></span>
                <span className="commission-office-track"><i style={{ width: `${Math.min(100, Math.max(1, office.lateRate * 100))}%` }} /></span>
                <span className="commission-office-stats"><span>{office.total} tracked</span><span>{office.late} late</span><span>{office.atRisk} at risk</span></span>
                <span className="commission-open-label">Open accountability details <IconArrowRight size={14} /></span>
              </button>;
            })}
            {rows.filter((r) => r.suppressed && (departmentFilter === 'All departments' || r.primaryDepartment === departmentFilter) && `${r.office} ${r.district}`.toLowerCase().includes(search.toLowerCase())).map((office) => <article key={office.officeId} className="commission-office-card suppressed"><span><b>{office.office}</b><small>{office.district}</small></span><span className="commission-privacy-pill"><IconShield size={12} /> Protected · k ≥ 5</span><small>Case-level details hidden to protect small cohorts.</small></article>)}
            {!filteredRows.length && !rows.some((r) => r.suppressed) && <p className="commission-empty">No offices match this filter.</p>}
          </div>
        ) : (
          <div className="commission-table-wrap"><table><thead><tr><th>Office</th><th>District</th><th>Department</th><th>Cases</th><th>Late</th><th>Late rate</th><th>At risk</th><th /></tr></thead><tbody>
            {filteredRows.map((office) => <tr key={office.officeId}><td><button className="commission-table-link" onClick={() => openOffice(office)}>{office.office}</button></td><td>{office.district}</td><td>{office.primaryDepartment}</td><td>{office.total}</td><td>{office.late}</td><td>{pct(office.lateRate)}</td><td>{office.atRisk}</td><td><button className="commission-small-action" onClick={() => openOffice(office)}>Inspect</button></td></tr>)}
            {rows.filter((r) => r.suppressed).map((office) => <tr key={office.officeId}><td>{office.office}</td><td>{office.district}</td><td colSpan="6">Protected by privacy threshold ({office.note})</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="commission-section commission-reasons" aria-labelledby="reason-heading">
        <div className="commission-section-title"><div><span className="commission-section-kicker">03 · ADDRESS THE CAUSE</span><h3 id="reason-heading">Recorded delay reasons</h3></div><span className="commission-section-help">Reasons are reported codes, not independent findings of fault.</span></div>
        <div className="commission-reason-list">{Object.entries(REASONS).map(([code, reason]) => {
          const count = bottleneckCounts[code] || 0; const share = count / totalBottlenecks * 100;
          return <article key={code} className="commission-reason-row"><div className="commission-reason-head"><span>{reason.label}</span><strong>{count} records <small>{Math.round(share)}%</small></strong></div><div className="commission-reason-track"><i style={{ width: `${share}%` }} /></div><p>{reason.action}</p></article>;
        })}</div>
      </section>

      {selectedOffice && <section className="commission-detail" aria-labelledby="detail-heading">
        <div className="commission-detail-header"><div><span className="commission-section-kicker">04 · OFFICE DRILL-DOWN</span><h3 id="detail-heading">{selectedOffice.office}</h3><p>{selectedOffice.district} · {selectedOffice.primaryDepartment} · {detail?.asOf ? `As of ${detail.asOf}` : 'Loading case evidence'}</p></div><button className="commission-close" onClick={() => { setSelectedOffice(null); setDetail(null); setContact(null); }}>Close details</button></div>
        {detailBusy ? <div className="commission-loading">Loading masked case evidence and demo officer mapping…</div> : detail && <>
          <div className="commission-detail-banner"><IconShield size={15} /> {detail.privacy.cohortSize} records meet k ≥ {detail.privacy.k}. Citizen names and full references are excluded from this view.</div>
          <div className="commission-detail-metrics">{Object.entries(detail.departments || {}).map(([name, stats]) => <div key={name}><small>{name}</small><strong>{stats.delayed} delayed</strong><span>{stats.atRisk} at risk · {stats.applications} total</span></div>)}</div>
          <div className="commission-detail-columns">
            <div className="commission-cases"><div className="commission-subhead"><div><h4>Delayed & at-risk applications</h4><p>Sorted by days late; only masked reference numbers are shown.</p></div><span>{detail.delayedApplications.length} cases</span></div>
              {!detail.delayedApplications.length ? <div className="commission-empty">No delayed or at-risk applications in this office on the selected demo date.</div> : detail.delayedApplications.map((item) => <article className="commission-case" key={item.id}>
                <div className="commission-case-main"><span className={`commission-case-status ${item.status === 'AT_RISK' ? 'risk' : 'late'}`}>{item.status === 'AT_RISK' ? 'AT RISK' : item.status.replace('COMPLETED_', 'COMPLETED · ')}</span><strong>{item.reference}</strong><span>{item.service} · {item.department}</span></div>
                <div className="commission-case-meta"><span>Received <b>{item.receivedOn}</b></span><span>Due <b>{item.dueDate}</b></span><span>{item.status === 'AT_RISK' ? `${item.daysLeft ?? 0} days left` : `${item.daysLate} days late`}</span></div>
                <div className="commission-case-reason"><span><b>Recorded reason:</b> {reasonLabel(item.reasonCode)}</span><span><b>Responsible role:</b> {item.officer.designation}</span></div>
                <div className="commission-officer-line"><span className="commission-avatar">{item.officer.name.split(' ').slice(-1)[0]?.[0] || 'D'}</span><span><b>{item.officer.name}</b><small>{item.officer.officerId || 'No named demo profile'} · synthetic profile</small></span><button onClick={() => prepareContact(item)}>Prepare follow-up</button></div>
              </article>)}
            </div>
            <aside className="commission-ai-panel"><div className="commission-ai-heading"><span>✦</span><div><h4>Improvement co-pilot</h4><p>Evidence-led suggestions, not automated findings</p></div></div>
              <div className="commission-ai-reason-suggestions">{suggestions.length ? suggestions.map(([code, count]) => <div key={code}><b>{reasonLabel(code)}</b><p>{REASONS[code]?.action || 'Review the record, validate the cause, and set a measurable follow-up.'}</p><small>{count} matching record(s)</small></div>) : <div><b>No dominant coded reason</b><p>Ask the co-pilot to suggest a review plan based on the aggregate office signal.</p></div>}</div>
              {aiReply && <div className="commission-ai-answer"><div className="commission-ai-answer-label">{aiProvider === 'demo-fallback' ? 'DEMO SUGGESTION' : 'AI SUGGESTION'}</div><p>{aiReply}</p><small>Provider: {aiProvider}. Validate every recommendation against official records.</small></div>}
              <button className="commission-ai-button" onClick={askAI} disabled={aiBusy}>{aiBusy ? 'Preparing suggestions…' : 'Ask AI for an improvement plan'} <IconArrowRight size={15} /></button>
              <small className="commission-ai-disclaimer">AI suggestions are decision support. They do not determine liability or replace an inquiry.</small>
            </aside>
          </div>
          {contact && <section className="commission-contact-draft"><div className="commission-contact-heading"><div><span className="commission-section-kicker">DEMO CONTACT DRAFT · NOT SENT</span><h4>Follow-up for {contact.officer.name}</h4></div><button onClick={() => setContact(null)}>Close</button></div><div className="commission-contact-warning"><IconAlert size={15} /> Synthetic demo officer. No actual email, phone, WhatsApp or government directory is connected.</div><textarea aria-label="Editable contact draft" rows="7" value={contact.body} onChange={(e) => { setContact({ ...contact, body: e.target.value }); setContactCopied(false); }} /><div className="commission-contact-actions"><button onClick={copyContact}><IconCheck size={14} /> {contactCopied ? 'Copied' : 'Copy draft'}</button><span>The draft is editable and stays in this browser until you leave this view.</span></div></section>}
        </>}
      </section>}

      <footer className="commission-footnote">Demo data is synthetic and is not a performance assessment of any real department or officer. The Commission view is designed for triage and review; validate source records before taking action.</footer>
    </section>
  );
}
