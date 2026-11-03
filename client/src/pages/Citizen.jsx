import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { ocrImage, prepareVisionImage } from '../ocr.js';
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

const DEMO_SLIP_LIBRARY = [
  { key: 'gj-income-true', label: 'Gujarat · Income Certificate', short: 'Gujarat', valid: true },
  { key: 'tn-community-true', label: 'Tamil Nadu · Community Certificate', short: 'Tamil Nadu · start here', valid: true },
  { key: 'mh-caste-true', label: 'Maharashtra · Caste Certificate', short: 'Maharashtra', valid: true },
  { key: 'up-income-false', label: 'UP · invalid specimen', short: 'Invalid example', valid: false }
];

export default function Citizen({ today, lang, online }) {
  const queue = useMemo(() => createQueue(), []);
  const [offices, setOffices] = useState([]);
  const [services, setServices] = useState([]);
  const [slipText, setSlipText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [form, setForm] = useState({ serviceId: '', ackNo: '', receivedOn: today, officeId: '' });
  const [list, setList] = useState([]);
  const [queued, setQueued] = useState(queue.all());
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [appeal, setAppeal] = useState(null);
  const [audit, setAudit] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [listening, setListening] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [photoReader, setPhotoReader] = useState('');
  const [readingStage, setReadingStage] = useState('');
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [activeDemoKey, setActiveDemoKey] = useState('tn-community-true');

  const L = (k) => t(lang, k);
  const citizenIdentity = (() => {
    try { return JSON.parse(localStorage.getItem('samay.user') || 'null'); }
    catch { return null; }
  })();
  const applicantAlias = citizenIdentity?.phone || citizenIdentity?.name || 'demo-citizen';

  const refresh = async (id = sel) => {
    setList(await api.list(applicantAlias));
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
      setForm((f) => ({ ...f, officeId: citizenIdentity?.officeId || o[0]?.id || '' }));
      await refresh();
      await sync();
    })().catch((e) => setErr(e.message));
  }, []); // eslint-disable-line

  useEffect(() => { if (online) sync().catch(() => { }); }, [online]); // eslint-disable-line

  const run = (fn) => async (...a) => {
    try { setErr(''); await fn(...a); }
    catch (e) { setErr(e.message); }
  };

  const svc = services.find((x) => x.id === form.serviceId);
  const officeChoices = offices.filter((o) => !svc || o.state_code === svc.state_code);
  const clock = detail?.clock;
  const officeForService = (serviceId) => {
    const service = services.find((item) => item.id === serviceId);
    return citizenIdentity?.officeId && offices.some((office) => office.id === citizenIdentity.officeId && (!service || office.state_code === service.state_code))
      ? citizenIdentity.officeId
      : offices.find((office) => !service || office.state_code === service.state_code)?.id || '';
  };

  const readSlip = run(async (text) => {
    const r = await api.parseSlip(text);
    setParsed(r);
    setDetailsConfirmed(false);
    setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(r.fields).filter(([, v]) => v)) }));
  });

  const loadDemoSlip = run(async (key) => {
    const slip = DEMO_SLIP_LIBRARY.find((item) => item.key === key);
    if (!slip) return;
    setActiveDemoKey(key);
    setErr('');
    setReadingStage('Checking the demo specimen…');
    const ai = await api.verifySlipPhoto({ demoSlipKey: key, fileName: `${key}.jpg`, mimeType: 'image/jpeg' });
    if (String(ai.verificationStatus || '').startsWith('REJECTED_DEMO') || ai.valid === false) {
      setParsed({ fields: ai.fields ?? {}, missing: ['verification'] });
      setPhotoReader(ai.provider || 'demo-proxy');
      setReadingStage('Rejected by mock verification proxy');
      setErr('Demo proxy rejected this specimen. The acknowledgement number is intentionally not accepted for the SAMAY walkthrough.');
      setDetailsConfirmed(false);
      return;
    }
    if (ai.documentType === 'ACKNOWLEDGEMENT_SLIP') {
      const fields = ai.fields ?? {};
      setParsed({ fields, missing: [] });
      setForm((current) => ({
        ...current,
        ackNo: fields.ackNo ?? '',
        receivedOn: fields.receivedOn ?? today,
        serviceId: fields.serviceId ?? '',
        officeId: officeForService(fields.serviceId)
      }));
      setSlipText([
        `Application No: ${fields.ackNo ?? '[not read]'}`,
        `Application Date: ${fields.receivedOn ?? '[not read]'}`,
        `Service: ${fields.serviceName ?? '[not read]'}`,
        `Department: ${fields.issuingDepartment ?? '[not read]'}`,
        `Jurisdiction: ${fields.issuingJurisdiction ?? '[not read]'}`
      ].join('\n'));
      setPhotoReader(ai.provider || 'demo-proxy');
      setReadingStage(slip.valid ? 'Demo verification passed' : 'Demo verification rejected');
      setErr(slip.valid ? '' : 'This mock slip was intentionally created as a false acknowledgement for demo verification.');
      setDetailsConfirmed(false);
      return;
    }
    setErr('This demo slip was rejected by the verification proxy.');
    setPhotoReader('demo-proxy');
    setReadingStage('Rejected by demo verification');
  });

  const onPhoto = run(async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setOcrProgress(0);
    setOcrConfidence(null);
    setPhotoReader('');
    setReadingStage('Preparing photo…');
    setParsed(null);
    setDetailsConfirmed(false);
    setForm((current) => ({ ...current, serviceId: '', ackNo: '', receivedOn: today }));
    setBusy(true);
    let geminiError = '';
    try {
      try {
        setReadingStage('Sending photo to AI reader…');
        const image = await prepareVisionImage(f);
        setReadingStage('Extracting slip fields…');
        const ai = await api.verifySlipPhoto(image);
        if (String(ai.verificationStatus || '').startsWith('REJECTED_DEMO') || ai.valid === false) {
          setParsed({ fields: ai.fields ?? {}, missing: ['verification'] });
          setPhotoReader(ai.provider || 'demo-proxy');
          setReadingStage('Rejected by mock verification proxy');
          setErr('This uploaded specimen was rejected by the demo verification proxy. No deadline clock was started.');
          return;
        }
        if (ai.documentType === 'ACKNOWLEDGEMENT_SLIP') {
          const fields = ai.fields ?? {};
          const missing = [...(ai.missingFields ?? [])];
          if (!fields.serviceId && !missing.includes('serviceId')) missing.push('serviceId');
          setParsed({ fields, missing });
          setForm((current) => ({
            ...current,
            ackNo: fields.ackNo ?? '',
            receivedOn: fields.receivedOn ?? today,
            serviceId: fields.serviceId ?? '',
            officeId: officeForService(fields.serviceId)
          }));
          setSlipText([
            `Application No: ${fields.ackNo ?? '[not read]'}`,
            `Application Date: ${fields.receivedOn ?? '[not read]'}`,
            `Service: ${fields.serviceName ?? '[not read]'}`,
            `Department: ${fields.issuingDepartment ?? '[not read]'}`,
            `Jurisdiction: ${fields.issuingJurisdiction ?? '[not read]'}`
          ].join('\n'));
          setPhotoReader(ai.provider || 'gemini');
          setReadingStage('AI extraction complete');
          setOcrConfidence(null);
          setErr('');
          return;
        }
        if (ai.provider === 'unavailable' || ai.documentType === 'UNCLEAR') {
          setPhotoReader(ai.provider || 'unavailable');
          setReadingStage('AI unavailable; switching to local OCR…');
        } else {
          setSlipText('');
          setParsed({ missing: ['acknowledgement slip not confirmed'] });
          setPhotoReader('gemini');
          setErr(ai.documentType === 'NOT_ACKNOWLEDGEMENT_SLIP'
            ? 'Gemini did not identify this as an acknowledgement slip. Use a demo acknowledgement image or enter details manually.'
            : 'Gemini could not tell whether this is an acknowledgement slip. Try a clearer demo image or enter details manually.');
          return;
        }
      } catch (error) {
        geminiError = error.message || 'AI request failed.';
        setReadingStage('AI unavailable; switching to local OCR…');
      }
      const result = await ocrImage(f, { onProgress: setOcrProgress });
      setReadingStage('Parsing the recognized text…');
      setSlipText(result.text);
      setOcrConfidence(result.confidence);
      setPhotoReader('local');
      await readSlip(result.text);
      setErr(`Gemini is unavailable; local OCR was used instead. (${geminiError}) Please verify every field against the slip.`);
    } catch {
      setErr(lang === 'hi'
        ? 'फोटो पढ़ी नहीं जा सकी। कृपया साफ़ फोटो लें या विवरण नीचे लिखें।'
        : 'Could not read this photo. Try a clearer, closer photo or type the slip details below.');
    } finally {
      setBusy(false);
      setOcrProgress(0);
      setReadingStage('');
      e.target.value = '';
    }
  });

  const dictate = () => {
    if (!canListen()) return setErr(L('noMic'));
    setListening(true);
    listen(lang, (tx) => {
      setListening(false);
      const merged = `${slipText}\n${tx}`.trim();
      setSlipText(merged);
      setDetailsConfirmed(false);
      readSlip(merged);
    }, (e) => {
      setListening(false);
      setErr(`${lang === 'hi' ? 'वाणी पहचान' : 'Speech recognition'}: ${e}`);
    });
  };

  const start = run(async () => {
    if (!detailsConfirmed) throw new Error(lang === 'hi'
      ? 'शुरू करने से पहले पर्ची से सेवा, आवेदन संख्या, तारीख और कार्यालय की पुष्टि करें।'
      : 'Before starting, confirm the service, acknowledgement number, date, and office against the slip.');
    const payload = { ...form, citizenConfirmed: true, channel: 'paper', language: lang, applicantAlias };
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
  const citizenStats = {
    tracked: list.length + queued.length,
    atRisk: list.filter((item) => item.clock?.state === 'AT_RISK').length,
    breached: list.filter((item) => item.clock?.state === 'BREACHED').length
  };

  const printAppeal = () => {
    if (!appeal) return;
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if (!win) { setErr(lang === 'hi' ? 'प्रिंट विंडो ब्लॉक है। ब्राउज़र में पॉप-अप की अनुमति दें।' : 'Print window was blocked. Allow pop-ups for this site.'); return; }
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(L('appealLetter'))}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#172b3a;font:12px/1.5 Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #17324d;padding-bottom:10px;margin-bottom:18px}h1{font-size:18px;margin:0 0 4px}small{color:#657681}pre{font:12px/1.55 Arial,sans-serif;white-space:pre-wrap;word-break:break-word;margin:0}footer{margin-top:20px;border-top:1px solid #d8e1e4;padding-top:8px;color:#657681;font-size:10px}</style></head><body><header><div><h1>${escapeHtml(L('appealLetter'))}</h1><small>${escapeHtml(appeal.addressedTo)} · ${escapeHtml(L('level'))} ${escapeHtml(appeal.level)}</small></div><small>${escapeHtml(L('statutoryFormat'))}</small></header><pre>${escapeHtml(appeal.body)}</pre><footer>${escapeHtml(L('disclaimer'))}</footer></body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };
  const copyAppeal = async () => {
    if (!appeal) return;
    try {
      await navigator.clipboard.writeText(appeal.body);
      setNote('Appeal draft copied to clipboard.');
    } catch {
      setErr('Clipboard access is unavailable. Use Print to save the appeal as PDF.');
    }
  };

  return (
    <div className="citizen-workspace">
      <section className="citizen-hero" aria-labelledby="citizen-workspace-title">
        <div className="citizen-hero-copy">
          <div className="citizen-eyebrow"><IconShield size={14} /> SAMAY CITIZEN DEMO · MOCK VERIFICATION</div>
          <h2 id="citizen-workspace-title">A paper receipt becomes an enforceable service clock.</h2>
          <p>Show how a citizen moves from an acknowledgement slip to a verified deadline, then to a clear next step if the service is late. The verification response is a deterministic demo proxy—not a live government or DigiLocker check.</p>
          <div className="citizen-stat-row" aria-label="Application summary">
            <span><strong>{citizenStats.tracked}</strong> tracked</span>
            <span className={citizenStats.atRisk ? 'warn' : ''}><strong>{citizenStats.atRisk}</strong> at risk</span>
            <span className={citizenStats.breached ? 'danger' : ''}><strong>{citizenStats.breached}</strong> breached</span>
          </div>
        </div>
        <div className="citizen-hero-guide">
          <div className="citizen-guide-title">Your 90-second judge walkthrough</div>
          <div className="citizen-guide-step"><span>01</span><div><strong>Read the receipt</strong><small>Choose a demo slip or upload one</small></div></div>
          <div className="citizen-guide-step"><span>02</span><div><strong>Check the facts</strong><small>Review the extracted fields yourself</small></div></div>
          <div className="citizen-guide-step"><span>03</span><div><strong>Start the legal clock</strong><small>Use the service rule and due date</small></div></div>
          <div className="citizen-guide-step"><span>04</span><div><strong>See the remedy</strong><small>Simulate a delay and draft an appeal</small></div></div>
          <div className="citizen-demo-controls" aria-label="Choose a demo acknowledgement slip">
            <div className="citizen-demo-controls-title">Start with a verified demo specimen</div>
            <div className="citizen-demo-buttons">
              {DEMO_SLIP_LIBRARY.map((slip) => (
                <button
                  key={slip.key}
                  type="button"
                  className={`${slip.valid ? 'valid' : 'invalid'} ${activeDemoKey === slip.key ? 'chosen' : ''}`}
                  onClick={() => loadDemoSlip(slip.key)}
                  aria-pressed={activeDemoKey === slip.key}
                >
                  <span aria-hidden="true">{slip.valid ? '✓' : '!'}</span>{slip.short}
                </button>
              ))}
            </div>
            <small>One negative example shows how an unverified slip is stopped before a clock begins.</small>
          </div>
        </div>
      </section>

      <section className="citizen-demo-story" aria-label="What the demo demonstrates">
        <div className="citizen-demo-story-head">
          <span className="citizen-demo-live-dot" />
          <div><strong>The story to tell</strong><small>Every step is visible and citizen-controlled</small></div>
        </div>
        <div className="citizen-demo-story-track">
          <span><b>1</b> Slip submitted</span><i aria-hidden="true" />
          <span><b>2</b> Fields extracted</span><i aria-hidden="true" />
          <span><b>3</b> Deadline explained</span><i aria-hidden="true" />
          <span><b>4</b> Appeal prepared</span>
        </div>
        <div className="citizen-demo-explain"><strong>Explain it this way:</strong> “SAMAY does not replace the application portal. It makes the service promise legible, keeps the clock visible, and helps a citizen prepare the next lawful step.”</div>
      </section>

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
              <span>{listening ? (lang === 'hi' ? 'सुन रहे हैं…' : 'Listening…') : L('dictate')}</span>
            </button>
          </div>

          {busy && (
            <p className="note-box" style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
              <Spinner dark size={14} /> <span>{readingStage || L('reading')} {ocrProgress > 0 ? `${ocrProgress}%` : ''}</span>
            </p>
          )}

          <label htmlFor="slip-textarea">{L('paste')}</label>
          <textarea
            id="slip-textarea"
            rows="3"
            placeholder={L('slipPlaceholder')}
            value={slipText}
            onChange={(e) => { setSlipText(e.target.value); setOcrConfidence(null); setPhotoReader(''); setDetailsConfirmed(false); }}
          />

          <div className="citizen-manual-actions">
            <p>Prefer your own receipt? Upload a photo above or paste its printed text here. You’ll review every value before starting the clock.</p>
            <button
              type="button"
              className="secondary-teal"
              style={{ fontSize: 12, padding: '7px 13px' }}
              onClick={() => readSlip(slipText)}
              disabled={!slipText}
            >
              <IconFileText size={14} /> {L('readSlip')}
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

          {ocrConfidence !== null && (
            <div
              className="note-box"
              role="status"
              style={{
                background: ocrConfidence < 65 ? '#fffbeb' : '#eff6ff',
                borderColor: ocrConfidence < 65 ? '#fcd34d' : '#bfdbfe',
                color: ocrConfidence < 65 ? '#92400e' : '#1e40af',
                marginTop: -6
              }}
            >
              {lang === 'hi'
                ? `फोटो पढ़ने का भरोसा: ${ocrConfidence}%. आवेदन संख्या, तारीख और सेवा का नाम पर्ची से मिलाकर जाँचें; शुरू करने से पहले नीचे के विवरण सुधारें।`
                : `Photo-reading confidence: ${ocrConfidence}%. Please compare the application number, date, and service with your slip and correct the fields below before starting.`}
            </div>
          )}

          {photoReader && (
            <div className="note-box" role="status" style={{ background: '#f1f5f9', borderColor: '#cbd5e1', color: '#334155', marginTop: 8 }}>
              {photoReader === 'gemini'
                ? 'Gemini Vision processed this synthetic hackathon demo image. Verify the extracted fields before continuing.'
                : 'Local OCR and the rule-based parser processed this image; Gemini did not return a result.'}
            </div>
          )}

        </div>

        <div style={{ height: 1, background: '#e2e8f0', margin: '16px 0 20px' }} />

        {/* Confirmation Form */}
        <form onSubmit={(e) => { e.preventDefault(); start(); }} aria-label={L('registerApplication')}>
          <label htmlFor="service-select">{L('service')}</label>
          <select
            id="service-select"
            value={form.serviceId}
            onChange={(e) => {
              const sv = services.find((x) => x.id === e.target.value);
              const first = offices.find((o) => !sv || o.state_code === sv.state_code);
              setDetailsConfirmed(false);
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
                onChange={(e) => { setDetailsConfirmed(false); setForm({ ...form, ackNo: e.target.value }); }}
                placeholder={L('ackPlaceholder')}
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
                onChange={(e) => { setDetailsConfirmed(false); setForm({ ...form, receivedOn: e.target.value }); }}
                required
              />
            </div>
          </div>

          <label htmlFor="office-select">{L('office')}</label>
          <select
            id="office-select"
            value={form.officeId}
            onChange={(e) => { setDetailsConfirmed(false); setForm({ ...form, officeId: e.target.value }); }}
          >
            {officeChoices.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.district})</option>)}
          </select>

          <label htmlFor="confirm-slip-details" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '12px 0 4px', fontSize: 12.5, lineHeight: 1.45, textTransform: 'none', color: '#334155' }}>
            <input
              id="confirm-slip-details"
              type="checkbox"
              checked={detailsConfirmed}
              onChange={(e) => setDetailsConfirmed(e.target.checked)}
              required
              style={{ width: 'auto', margin: '2px 0 0' }}
            />
            <span>{lang === 'hi'
              ? 'मैंने पर्ची से सेवा, आवेदन संख्या, आवेदन की तारीख और कार्यालय मिलाकर जाँच लिया है।'
              : 'I checked the service, acknowledgement number, application date, and office against the slip.'}</span>
          </label>

          <button
            type="submit"
            className="primary"
            disabled={!form.serviceId || !form.ackNo || !detailsConfirmed}
            style={{ width: '100%', marginTop: 8 }}
          >
            <IconShield size={16} />
            <span>{L('start')}</span>
          </button>
        </form>

        {err && <div className="err-box" role="alert"><IconAlert size={16} /> <span>{err}</span></div>}
        {note && <div className="note-box" role="status"><IconCheck size={16} /> <span>{note}</span></div>}

        {/* List of Applications */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
              {L('myApps')}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {list.length + queued.length} {L('total')}
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
                  {L('offlineBuffered')}
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
                {L('noActive')} {L('registerAbove')}
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
              {L('selectPromptSub')}
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
                {L('statutoryChain')}
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
                    <strong>{detail.service.appellate_1 || (lang === 'hi' ? 'अपील अधिकारी' : 'Appellate Officer')}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{L('level')} 1</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    3
                  </span>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{L('appeal2')}: </span>
                    <strong>{detail.service.appellate_2 || (lang === 'hi' ? 'पुनरीक्षण अधिकारी' : 'Revision Officer')}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{L('level')} 2</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    4
                  </span>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>{L('final')}: </span>
                    <strong>{detail.service.appeal_final || (lang === 'hi' ? 'राज्य आयोग' : 'State Commission')}</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{L('finalOversight')}</span>
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
                <span className="info-val">{detail.service.verified_by || L('statutoryRegistry')}</span>
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
                  <span>{L('appealUnlocked')}</span>
                </div>
                <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 14px' }}>
                  {L('breachMessage')} {clock.daysLate} {L('dayWord')}
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
              <div className="appeal-preview" role="region" aria-label={`${L('appealLetter')} ${L('level')} ${appeal.level}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                      {L('level')} {appeal.level} {L('appealLetter')}
                    </span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 14 }}>To: {appeal.addressedTo}</strong>
                      <span style={{ display: 'block', marginTop: 3, fontSize: 11.5, color: '#64748b' }}>Generated from the approved rule record and deterministic clock</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{L('statutoryFormat')}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {['Application number locked', 'Due date included', 'Addressee checked', 'Human review required'].map((item) => (
                    <span key={item} style={{ background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 999, padding: '4px 8px', fontSize: 10.5, fontWeight: 700 }}>✓ {item}</span>
                  ))}
                </div>

                <pre>{appeal.body}</pre>

                <div className="row" style={{ marginTop: 14 }}>
                  <button onClick={copyAppeal} style={{ flex: 1 }}>
                    <IconFileText size={15} /> Copy draft
                  </button>
                  <button onClick={printAppeal} style={{ flex: 1 }}>
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
                  <span>{L('preDrafted')} ({L('level')} 2)</span>
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
                  <span>{L('cryptographicBlocks')}: {audit.verification.length} {L('events')}</span>
                  <button
                    type="button"
                    style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: 'none', color: '#0d9488', cursor: 'pointer' }}
                    onClick={() => setShowAuditLogs(!showAuditLogs)}
                  >
                    {showAuditLogs ? L('hideAudit') : L('inspectHash')}
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
    </div>
  );
}
