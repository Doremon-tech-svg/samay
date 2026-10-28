import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { ocrImage } from '../ocr.js';
import { Badge, Ring, Spinner, NotificationBubble } from '../ui.jsx';
import { t, clockSummary, localizedServiceName } from '../i18n.js';
import { speak, listen, canSpeak, canListen } from '../voice.js';
import { createQueue, isNetworkError } from '../offlineQueue.js';
import { 
  IconCamera, IconMic, IconFileText, IconSpeaker, 
  IconPrinter, IconSend, IconShield, IconClock, 
  IconAlert, IconCheck, IconBuilding, IconArrowRight,
  IconLock
} from '../Icons.jsx';

const SAMPLE = 'Aaple Sarkar Seva Kendra\nService: Income Certificate\nApplication No: MH20261234567\nDate: 05/10/2026';

export default function Citizen({ today, lang, online }) {
  const queue = useMemo(() => createQueue(), []);
  const [offices, setOffices]     = useState([]);
  const [services, setServices]   = useState([]);
  const [slipText, setSlipText]   = useState('');
  const [parsed, setParsed]       = useState(null);
  const [form, setForm]           = useState({ serviceId: '', ackNo: '', receivedOn: today, officeId: '' });
  const [list, setList]           = useState([]);
  const [queued, setQueued]       = useState(queue.all());
  const [sel, setSel]             = useState(null);
  const [detail, setDetail]       = useState(null);
  const [appeal, setAppeal]       = useState(null);
  const [audit, setAudit]         = useState(null);
  const [err, setErr]             = useState('');
  const [busy, setBusy]           = useState(false);
  const [note, setNote]           = useState('');
  const [listening, setListening] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const L = (k) => t(lang, k);

  const refresh = async (id = sel) => {
    setList(await api.list());
    if (id) {
      setDetail(await api.get(id));
      setAudit(await api.audit(id));
    }
  };

  const sync = async () => {
    if (!queue.all().length) return;
    const res = await queue.flush(async (p) => {
      try { await api.create(p); }
      catch (e) { if (e.duplicate) throw { duplicate: true }; throw e; }
    });
    setQueued(queue.all());
    if (res.synced) { setNote(`${res.synced} ${L('synced')}`); await refresh(); }
  };

  useEffect(() => {
    (async () => {
      const svcs = await api.services();
      setServices(svcs);
      const o = await api.offices();
      setOffices(o);
      setForm((f) => ({ ...f, officeId: o[0]?.id ?? '' }));
      await refresh();
      await sync();
    })().catch((e) => setErr(e.message));
  }, []); // eslint-disable-line

  useEffect(() => { if (online) sync().catch(() => {}); }, [online]); // eslint-disable-line

  const run = (fn) => async (...a) => {
    try { setErr(''); await fn(...a); }
    catch (e) { setErr(e.message); }
  };

  const svc = services.find((x) => x.id === form.serviceId);
  const officeChoices = offices.filter((o) => !svc || o.state_code === svc.state_code);
  const clock = detail?.clock;

  const readSlip = run(async (text) => {
    const r = await api.parseSlip(text);
    setParsed(r);
    setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(r.fields).filter(([, v]) => v)) }));
  });

  const onPhoto = run(async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const tx = await ocrImage(f);
      setSlipText(tx);
      await readSlip(tx);
    } catch {
      setErr('Photo OCR module unavailable offline. Please paste slip text below.');
    } finally {
      setBusy(false);
    }
  });

  const dictate = () => {
    if (!canListen()) return setErr(L('noMic'));
    setListening(true);
    listen(lang, (tx) => {
      setListening(false);
      const merged = `${slipText}\n${tx}`.trim();
      setSlipText(merged);
      readSlip(merged);
    }, (e) => {
      setListening(false);
      setErr(`Speech recognition: ${e}`);
    });
  };

  const start = run(async () => {
    const payload = { ...form, channel: 'paper', language: lang };
    try {
      const { id } = await api.create(payload);
      setSel(id);
      setAppeal(null);
      setParsed(null);
      setSlipText('');
      await refresh(id);
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      queue.add(payload);
      setQueued(queue.all());
      setNote(L('queued'));
    }
  });

  const open = run(async (id) => {
    setSel(id);
    setAppeal(null);
    await refresh(id);
  });

  const readAloud = () => {
    if (!detail) return;
    setErr('');
    const text = clockSummary(lang, { serviceName: detail.service.name, clock, nextAppealTo: detail.nextAppeal?.to });
    if (!canSpeak() || !speak(text, lang)) setErr(L('noVoice'));
  };

  const getSvcDisplayName = (s) => localizedServiceName(s.name, lang);

  return (
    <div className="grid2">
      {/* ── Left Column: Slip Ingestion & Applications ── */}
      <section className="card" aria-labelledby="submit-heading">
        <div className="step-header">
          <span className="step-num" aria-hidden="true">1</span>
          <span className="step-title" id="submit-heading">{L('step1')}</span>
        </div>

        {/* Input Methods: OCR & Voice */}
        <div style={{ marginBottom: 16 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <label className="btn-file" style={{ flex: 1, margin: 0 }}>
              <IconCamera size={16} />
              <span>{L('photo')}</span>
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
            </label>

            <button
              onClick={dictate}
              style={{
                flex: 1,
                borderColor: listening ? '#ea580c' : undefined,
                background: listening ? '#fff7ed' : undefined
              }}
              aria-label={L('dictate')}
            >
              <IconMic size={16} color={listening ? '#ea580c' : 'currentColor'} />
              <span>{listening ? 'Listening…' : L('dictate')}</span>
            </button>
          </div>

          {busy && (
            <p className="note-box" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
              <Spinner dark size={14} /> <span>{L('reading')}</span>
            </p>
          )}

          <label htmlFor="slip-textarea">{L('paste')}</label>
          <textarea
            id="slip-textarea"
            rows="3"
            placeholder="e.g. Service: Income Certificate&#10;Application No: MH20261234567&#10;Date: 05/10/2026"
            value={slipText}
            onChange={(e) => setSlipText(e.target.value)}
          />

          <div className="row" style={{ marginTop: -6, marginBottom: 14 }}>
            <button
              type="button"
              style={{ fontSize: 12, padding: '5px 11px' }}
              onClick={() => { setSlipText(SAMPLE); readSlip(SAMPLE); }}
            >
              <IconFileText size={14} /> {L('sample')}
            </button>
            <button
              type="button"
              className="secondary-teal"
              style={{ fontSize: 12, padding: '5px 13px', marginLeft: 'auto' }}
              onClick={() => readSlip(slipText)}
              disabled={!slipText}
            >
              {L('readSlip')}
            </button>
          </div>

          {parsed && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 12.5,
              color: '#334155',
              marginBottom: 14
            }}>
              {parsed.missing.length
                ? `${L('fillHint')} ${parsed.missing.join(', ')}`
                : L('confirmHint')}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: '#e2e8f0', margin: '16px 0 20px' }} />

        {/* Confirmation Form */}
        <form onSubmit={(e) => { e.preventDefault(); start(); }} aria-label="Register application">
          <label htmlFor="service-select">{L('service')}</label>
          <select
            id="service-select"
            value={form.serviceId}
            onChange={(e) => {
              const sv = services.find((x) => x.id === e.target.value);
              const first = offices.find((o) => !sv || o.state_code === sv.state_code);
              setForm({ ...form, serviceId: e.target.value, officeId: first?.id ?? '' });
            }}
            required
          >
            <option value="">{L('choose')}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.state_code}] {getSvcDisplayName(s)} ({s.days} {s.day_type || 'days'})
              </option>
            ))}
          </select>

          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="ack-no">{L('ackNo')}</label>
              <input
                id="ack-no"
                value={form.ackNo}
                onChange={(e) => setForm({ ...form, ackNo: e.target.value })}
                placeholder="e.g. MH20261234567"
                required
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="received-on">{L('receivedOn')}</label>
              <input
                id="received-on"
                type="date"
                value={form.receivedOn}
                onChange={(e) => setForm({ ...form, receivedOn: e.target.value })}
                required
              />
            </div>
          </div>

          <label htmlFor="office-select">{L('office')}</label>
          <select
            id="office-select"
            value={form.officeId}
            onChange={(e) => setForm({ ...form, officeId: e.target.value })}
          >
            {officeChoices.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.district})</option>)}
          </select>

          <button
            type="submit"
            className="primary"
            disabled={!form.serviceId || !form.ackNo}
            style={{ width: '100%', marginTop: 8 }}
          >
            <IconShield size={16} />
            <span>{L('start')}</span>
          </button>
        </form>

        {err  && <div className="err-box" role="alert"><IconAlert size={16} /> <span>{err}</span></div>}
        {note && <div className="note-box" role="status"><IconCheck size={16} /> <span>{note}</span></div>}

        {/* List of Applications */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
              {L('myApps')}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {list.length + queued.length} total
            </span>
          </div>

          <ul className="app-list">
            {queued.map((q) => (
              <li key={q.localId} className="app-list-item" style={{ borderLeft: '3px solid #f59e0b' }}>
                <div className="app-list-meta">
                  <span className="app-list-service">
                    {services.find((s) => s.id === q.payload.serviceId)?.name ?? q.payload.serviceId}
                  </span>
                  <span className="app-list-ack">{q.payload.ackNo}</span>
                </div>
                <span className="status-pill pill-sm" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                  Offline Buffered
                </span>
              </li>
            ))}

            {list.map((a) => (
              <li
                key={a.id}
                className={`app-list-item ${a.id === sel ? 'selected' : ''}`}
                onClick={() => open(a.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(a.id)}
                tabIndex={0}
                role="button"
                aria-pressed={a.id === sel}
              >
                <div className="app-list-meta">
                  <span className="app-list-service">{localizedServiceName(a.service, lang)}</span>
                  <span className="app-list-ack">{a.ackNo} · {a.office}</span>
                </div>
                <Badge state={a.clock.state} lang={lang} size="sm" />
              </li>
            ))}

            {list.length === 0 && queued.length === 0 && (
              <li style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13, background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                No active service guarantees. Register one above.
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ── Right Column: Clock & Statutory Rights Docket ── */}
      <section className="card" aria-labelledby="detail-heading">
        <div className="step-header">
          <span className="step-num" aria-hidden="true">2</span>
          <span className="step-title" id="detail-heading">{L('step2')}</span>
        </div>

        {!detail ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <IconClock size={44} color="#cbd5e1" />
            <h3 style={{ marginTop: 14, color: '#475569', fontSize: 16 }}>{L('selectPrompt')}</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 360, margin: '6px auto 0' }}>
              Select an application from the left panel or scan an acknowledgement slip to track statutory countdowns and legal remedies.
            </p>
          </div>
        ) : (
          <>
            {/* Top Chronometer Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <Ring clock={clock} lang={lang} />

              <div style={{ flex: '1 1 200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Badge state={clock.state} lang={lang} />
                  <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {detail.application.ack_no}
                  </span>
                </div>

                <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 4 }}>
                  {localizedServiceName(detail.service.name, lang)}
                </h2>

                <div style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{L('due')}:</span>
                  <strong style={{ color: clock.state === 'BREACHED' ? '#dc2626' : 'var(--navy)' }}>
                    {clock.dueDate}
                  </strong>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={readAloud}
                    style={{ fontSize: 12, padding: '5px 10px' }}
                    aria-label={`Read legal status aloud in ${lang === 'hi' ? 'Hindi' : 'English'}`}
                  >
                    <IconSpeaker size={14} /> {L('listen')}
                  </button>

                  {detail.pauses.some((p) => !p.end) ? (
                    <button
                      onClick={run(async () => { await api.resume(sel); await refresh(); })}
                      style={{ fontSize: 12, padding: '5px 10px' }}
                    >
                      ▶ {L('resume')}
                    </button>
                  ) : (
                    <button
                      onClick={run(async () => { await api.pause(sel); await refresh(); })}
                      style={{ fontSize: 12, padding: '5px 10px' }}
                    >
                      ⏸ {L('pause')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Outbox (P1-1: Calm update & Breach alerts) */}
            {detail.notifications && detail.notifications.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                    Official Dispatch Alerts ({detail.notifications.length})
                  </span>
                </div>
                {detail.notifications.map((n) => (
                  <NotificationBubble key={n.id} notif={n} lang={lang} />
                ))}
              </div>
            )}

            {/* Statutory Accountability Stepper */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              marginBottom: 20
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em', marginBottom: 12 }}>
                Statutory Authority Chain (Right to Public Services Act)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#059669', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    1
                  </span>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{L('decides')}: </span>
                    <strong>{detail.service.designated_officer}</strong>
                  </div>
                  <span style={{ fontSize: 11, background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    {detail.service.days} {detail.service.day_type}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    2
                  </span>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{L('appeal1')}: </span>
                    <strong>{detail.service.appellate_1 || 'Appellate Officer'}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Level 1</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    3
                  </span>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{L('appeal2')}: </span>
                    <strong>{detail.service.appellate_2 || 'Revision Officer'}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Level 2</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    4
                  </span>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{L('final')}: </span>
                    <strong>{detail.service.appeal_final || 'State Commission'}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Final Oversight</span>
                </div>
              </div>
            </div>

            {/* Legal Basis & Source Document */}
            <div className="info-block" style={{ margin: '0 0 20px' }}>
              <div className="info-row">
                <span className="info-key">{L('legalBasis')}</span>
                <span className="info-val">{detail.service.act_name}</span>
              </div>
              <div className="info-row">
                <span className="info-key">{L('ruleSource')}</span>
                <span className="info-val small" style={{ color: '#64748b' }}>{detail.service.source_doc}</span>
              </div>
              <div className="info-row">
                <span className="info-key">{L('verifiedBy')}</span>
                <span className="info-val">{detail.service.verified_by || 'Statutory Registry'}</span>
              </div>
            </div>

            {/* One-Tap Appeal Action */}
            {clock.state === 'BREACHED' && !appeal && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991b1b', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                  <IconAlert size={18} color="#dc2626" />
                  <span>Statutory Remedy Unlocked: File Appeal</span>
                </div>
                <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 14px' }}>
                  The statutory processing guarantee was breached by {clock.daysLate} day(s). You are legally entitled under Section 8 of the Act to file an appeal.
                </p>
                <button
                  className="danger"
                  style={{ width: '100%' }}
                  onClick={run(async () => { setAppeal(await api.draftAppeal(sel, lang)); await refresh(); })}
                >
                  <IconSend size={15} />
                  <span>{L('draftAppeal')} {detail.nextAppeal?.to ?? 'Appellate Authority'}</span>
                </button>
              </div>
            )}

            {/* Generated Appeal Letter */}
            {appeal && (
              <div className="appeal-preview" role="region" aria-label={`Appeal Letter Level ${appeal.level}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                      Level {appeal.level} Appeal Notice
                    </span>
                    <strong style={{ fontSize: 14 }}>To: {appeal.addressedTo}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Statutory Format</span>
                </div>

                <pre>{appeal.body}</pre>

                <div className="row" style={{ marginTop: 14 }}>
                  <button onClick={() => window.print()} style={{ flex: 1 }}>
                    <IconPrinter size={15} /> {L('print')}
                  </button>
                  <button
                    className="primary"
                    style={{ flex: 1 }}
                    onClick={run(async () => { await api.sendAppeal(appeal.id); await refresh(); })}
                  >
                    <IconSend size={15} /> {L('send')}
                  </button>
                </div>
              </div>
            )}

            {/* Pre-Drafted Level 2 Appeal (P1-2) */}
            {detail.preDraftedAppeal && (
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0369a1', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  <IconShield size={16} color="#0284c7" />
                  <span>Second Appeal Pre-Drafted in Advance (Level 2)</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#0c4a6e', margin: '0 0 10px' }}>
                  {detail.preDraftedAppeal.note} Addressed to: <strong>{detail.preDraftedAppeal.addressedTo}</strong>
                </p>
                <div style={{ background: '#ffffff', border: '1px solid #e0f2fe', borderRadius: 6, padding: '8px 12px', fontSize: 11.5, fontFamily: 'var(--font-mono)', color: '#334155', maxHeight: 80, overflowY: 'auto' }}>
                  {detail.preDraftedAppeal.body.slice(0, 220)}…
                </div>
              </div>
            )}

            {/* Tamper-Evident SHA-256 Hash Chain Proof */}
            {audit && (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 18px',
                marginTop: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconLock size={16} color={audit.verification.valid ? '#059669' : '#dc2626'} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                      {L('tamperLog')}
                    </span>
                  </div>

                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: audit.verification.valid ? '#059669' : '#dc2626',
                    background: audit.verification.valid ? '#ecfdf5' : '#fef2f2',
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {audit.verification.valid ? `✓ ${L('logValid')}` : `✕ ${L('logBroken')}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: '#64748b' }}>
                  <span>Cryptographic Blocks: {audit.verification.length} {L('events')}</span>
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: 'none', color: '#0d9488', cursor: 'pointer' }}
                    onClick={() => setShowAuditLogs(!showAuditLogs)}
                  >
                    {showAuditLogs ? 'Hide Audit Log' : 'Inspect Hash Chain'}
                  </button>
                </div>

                {showAuditLogs && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                    {audit.events.map((ev, i) => (
                      <div key={ev.id || i} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                        <span style={{ color: '#0f766e', fontWeight: 600 }}>{ev.event_type}</span>
                        <span style={{ color: '#94a3b8', margin: '0 6px' }}>|</span>
                        <span style={{ color: '#64748b' }}>{ev.created_at}</span>
                        <div style={{ color: '#94a3b8', fontSize: 10, wordBreak: 'break-all' }}>hash: {ev.hash}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
