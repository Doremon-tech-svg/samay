import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { ocrImage } from '../ocr.js';
import { Badge, Ring, Spinner } from '../ui.jsx';
import { t, clockSummary } from '../i18n.js';
import { speak, listen, canSpeak, canListen } from '../voice.js';
import { createQueue, isNetworkError } from '../offlineQueue.js';

const SAMPLE = 'Aaple Sarkar Seva Kendra\nService: Income Certificate\nApplication No: MH20261234567\nDate: 05/10/2026';

export default function Citizen({ today, lang, online }) {
  const queue = useMemo(() => createQueue(), []);
  const [offices, setOffices]   = useState([]);
  const [services, setServices] = useState([]);
  const [slipText, setSlipText] = useState('');
  const [parsed, setParsed]     = useState(null);
  const [form, setForm]         = useState({ serviceId: '', ackNo: '', receivedOn: today, officeId: '' });
  const [list, setList]         = useState([]);
  const [queued, setQueued]     = useState(queue.all());
  const [sel, setSel]           = useState(null);
  const [detail, setDetail]     = useState(null);
  const [appeal, setAppeal]     = useState(null);
  const [audit, setAudit]       = useState(null);
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [note, setNote]         = useState('');
  const L = (k) => t(lang, k);

  const refresh = async (id = sel) => {
    setList(await api.list());
    if (id) { setDetail(await api.get(id)); setAudit(await api.audit(id)); }
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
      setServices(await api.services());
      const o = await api.offices();
      setOffices(o);
      setForm((f) => ({ ...f, officeId: o[0]?.id ?? '' }));
      await refresh();
      await sync();
    })().catch((e) => setErr(e.message));
  }, []); // eslint-disable-line

  useEffect(() => { if (online) sync().catch(() => {}); }, [online]); // eslint-disable-line

  const run = (fn) => async (...a) => { try { setErr(''); await fn(...a); } catch (e) { setErr(e.message); } };

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
    try { const tx = await ocrImage(f); setSlipText(tx); await readSlip(tx); }
    catch { setErr('Photo OCR unavailable. Paste or type the slip text instead.'); }
    finally { setBusy(false); }
  });

  const dictate = () => {
    if (!canListen()) return setErr(L('noMic'));
    listen(lang, (tx) => {
      const merged = `${slipText}\n${tx}`.trim();
      setSlipText(merged);
      readSlip(merged);
    }, (e) => setErr(`Speech input: ${e}`));
  };

  const start = run(async () => {
    const payload = { ...form, channel: 'paper', language: lang };
    try {
      const { id } = await api.create(payload);
      setSel(id); setAppeal(null); setParsed(null);
      await refresh(id);
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      queue.add(payload);
      setQueued(queue.all());
      setNote(L('queued'));
    }
  });

  const open = run(async (id) => { setSel(id); setAppeal(null); await refresh(id); });

  const readAloud = () => {
    if (!detail) return; setErr('');
    const text = clockSummary(lang, { serviceName: detail.service.name, clock, nextAppealTo: detail.nextAppeal?.to });
    if (!canSpeak() || !speak(text, lang)) setErr(L('noVoice'));
  };

  const svcName = (id) => services.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="grid2">
      {/* ── Left panel: submit ── */}
      <section className="card" aria-labelledby="submit-heading">
        <div className="step-label">
          <span className="step-num" aria-hidden="true">1</span>
          <span className="step-text" id="submit-heading">{L('step1')}</span>
        </div>

        {/* Slip capture */}
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 12px' }}>
          <legend className="muted small" style={{ marginBottom: 8 }}>
            Scan your acknowledgement slip or type its details below
          </legend>
          <div className="row">
            <label className="btn-file" aria-label="Upload a photo of your slip">
              <span aria-hidden="true">📷</span> {L('photo')}
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
            </label>
            <button onClick={dictate} aria-label={L('dictate')}>
              <span aria-hidden="true">🎤</span> {L('dictate')}
            </button>
          </div>

          {busy && <p className="muted" role="status" aria-live="polite"><Spinner dark /> {L('reading')}</p>}

          <label htmlFor="slip-textarea">{L('paste')}</label>
          <textarea
            id="slip-textarea"
            rows="4"
            placeholder={L('paste')}
            value={slipText}
            onChange={(e) => setSlipText(e.target.value)}
            aria-describedby="slip-hint"
          />
          <p id="slip-hint" className="muted small" style={{ marginTop: 4 }}>
            Paste text from the slip, or use voice / photo above.
          </p>

          <div className="row">
            <button onClick={() => { setSlipText(SAMPLE); readSlip(SAMPLE); }}>
              <span aria-hidden="true">📄</span> {L('sample')}
            </button>
            <button className="primary" onClick={() => readSlip(slipText)} disabled={!slipText}>
              {L('readSlip')}
            </button>
          </div>

          {parsed && (
            <p className="muted" role="status" aria-live="polite">
              {parsed.missing.length
                ? `${L('fillHint')}${parsed.missing.join(', ')}.`
                : L('confirmHint')}
            </p>
          )}
        </fieldset>

        <hr />

        {/* Service form */}
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
              <option key={s.id} value={s.id}>[{s.state_code}] {s.name} ({s.days}d)</option>
            ))}
          </select>

          <label htmlFor="ack-no">{L('ackNo')}</label>
          <input
            id="ack-no"
            value={form.ackNo}
            onChange={(e) => setForm({ ...form, ackNo: e.target.value })}
            placeholder="e.g. MH20261234567"
            required
            aria-required="true"
          />

          <label htmlFor="received-on">{L('receivedOn')}</label>
          <input
            id="received-on"
            type="date"
            value={form.receivedOn}
            onChange={(e) => setForm({ ...form, receivedOn: e.target.value })}
            required
          />

          <label htmlFor="office-select">{L('office')}</label>
          <select
            id="office-select"
            value={form.officeId}
            onChange={(e) => setForm({ ...form, officeId: e.target.value })}
          >
            {officeChoices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>

          <div className="row" style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="primary"
              disabled={!form.serviceId || !form.ackNo}
              style={{ flex: 1 }}
            >
              <span aria-hidden="true">▶</span> {L('start')}
            </button>
          </div>
        </form>

        {err  && <div className="err"  role="alert" aria-live="assertive"><span aria-hidden="true">⚠</span> {err}</div>}
        {note && <div className="note" role="status" aria-live="polite"><span aria-hidden="true">ℹ</span> {note}</div>}

        {/* Application list */}
        <h3 className="section-title" id="my-apps-heading">{L('myApps')}</h3>
        <ul className="list" aria-labelledby="my-apps-heading" role="list">
          {queued.map((q) => (
            <li key={q.localId} className="queued" role="listitem" aria-label={`Queued offline: ${svcName(q.payload.serviceId)}`}>
              <div className="list-meta">
                <span className="list-title">{svcName(q.payload.serviceId)}</span>
                <span className="list-ack">{q.payload.ackNo}</span>
              </div>
              <span className="badge" style={{ background: '#b45309' }}>
                <span aria-hidden="true">📶</span> {L('offline')}: {L('queued')}
              </span>
            </li>
          ))}
          {list.map((a) => (
            <li
              key={a.id}
              className={a.id === sel ? 'on' : ''}
              onClick={() => open(a.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(a.id)}
              tabIndex={0}
              role="button"
              aria-pressed={a.id === sel}
              aria-label={`${a.service} – ${a.ackNo} – ${t(lang, `state_${a.clock.state}`)}`}
            >
              <div className="list-meta">
                <span className="list-title">{a.service}</span>
                <span className="list-ack">{a.ackNo}</span>
              </div>
              <Badge state={a.clock.state} lang={lang} />
            </li>
          ))}
          {list.length === 0 && queued.length === 0 && (
            <li style={{ cursor: 'default', color: 'var(--text-muted)', fontSize: 13 }} role="listitem">
              No applications yet. Submit one above ↑
            </li>
          )}
        </ul>
      </section>

      {/* ── Right panel: detail ── */}
      <section className="card" aria-labelledby="detail-heading">
        <div className="step-label">
          <span className="step-num" aria-hidden="true">2</span>
          <span className="step-text" id="detail-heading">{L('step2')}</span>
        </div>

        {!detail ? (
          <p className="muted" role="status">{L('selectPrompt')}</p>
        ) : (
          <>
            {/* Clock ring + status */}
            <div className="row center" style={{ gap: 20, flexWrap: 'wrap' }}>
              <Ring clock={clock} lang={lang} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <Badge state={clock.state} lang={lang} />
                <p style={{ marginTop: 8 }}>
                  <strong>{detail.service.name}</strong>
                  <br />
                  <span className="muted">{L('due')} <strong>{clock.dueDate}</strong></span>
                </p>
                <button
                  onClick={readAloud}
                  aria-label={`Read status aloud in ${lang === 'hi' ? 'Hindi' : 'English'}`}
                  style={{ marginTop: 6 }}
                >
                  <span aria-hidden="true">🔊</span> {L('listen')}
                </button>
              </div>
            </div>

            {/* Service details */}
            <div className="info-block" role="region" aria-label="Service details">
              <div className="info-row">
                <span className="info-key">Legal basis</span>
                <span className="info-val">{detail.service.act_name}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Day type</span>
                <span className="info-val">{detail.service.day_type}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Decides</span>
                <span className="info-val">{detail.service.designated_officer}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Appeal 1</span>
                <span className="info-val">{detail.service.appellate_1 || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Appeal 2</span>
                <span className="info-val">{detail.service.appellate_2 || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Final appeal</span>
                <span className="info-val">{detail.service.appeal_final || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Source</span>
                <span className="info-val small muted">{detail.service.source_doc}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Verified by</span>
                <span className="info-val">{detail.service.verified_by || '—'}</span>
              </div>
            </div>

            {/* Pause / Resume */}
            <div className="row">
              {detail.pauses.some((p) => !p.end)
                ? <button onClick={run(async () => { await api.resume(sel); await refresh(); })} aria-label="Resume clock">
                    <span aria-hidden="true">▶</span> {L('resume')}
                  </button>
                : <button onClick={run(async () => { await api.pause(sel); await refresh(); })} aria-label="Pause clock">
                    <span aria-hidden="true">⏸</span> {L('pause')}
                  </button>}
            </div>

            {/* Appeal */}
            {clock.state === 'BREACHED' && !appeal && (
              <button
                className="danger"
                onClick={run(async () => { setAppeal(await api.draftAppeal(sel, lang)); await refresh(); })}
                aria-label={`Draft appeal to ${detail.nextAppeal?.to ?? 'next authority'}`}
              >
                <span aria-hidden="true">📝</span> {L('draftAppeal')} {detail.nextAppeal?.to ?? '—'}
              </button>
            )}

            {appeal && (
              <div className="appeal" role="region" aria-label={`Appeal letter – Level ${appeal.level}`}>
                <h3 style={{ marginBottom: 8, fontSize: 14 }}>
                  <span className="badge" style={{ background: 'var(--navy)', marginRight: 8 }}>Level {appeal.level}</span>
                  {appeal.addressedTo}
                </h3>
                <pre aria-label="Appeal letter body">{appeal.body}</pre>
                <div className="row">
                  <button onClick={() => window.print()} aria-label="Print this appeal letter">
                    <span aria-hidden="true">🖨</span> {L('print')}
                  </button>
                  <button
                    className="primary"
                    onClick={run(async () => { await api.sendAppeal(appeal.id); await refresh(); })}
                    aria-label="Send this appeal"
                  >
                    <span aria-hidden="true">📤</span> {L('send')}
                  </button>
                </div>
              </div>
            )}

            {detail.appeals.length > 0 && (
              <p className="muted small" style={{ marginTop: 8 }}>
                <strong>{L('appealsOnFile')}:</strong> {detail.appeals.map((a) => `L${a.level} ${a.status}`).join(', ')}
              </p>
            )}

            {/* Audit */}
            {audit && (
              <p className="small" style={{ marginTop: 8 }}>
                <span aria-hidden="true">🔒</span> {L('tamperLog')}:{' '}
                <span className={audit.verification.valid ? 'audit-valid' : 'audit-invalid'}>
                  {audit.verification.valid ? `✓ ${L('logValid')}` : `✕ ${L('logBroken')}`}
                </span>
                {' '}({audit.verification.length} {L('events')})
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
