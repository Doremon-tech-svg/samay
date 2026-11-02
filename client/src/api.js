// All calls go through here. demoDate is sent as x-demo-date so the team can "time travel" in the demo (server DEMO_MODE=1).
let demoDate = null;
export const setDemoDate = (d) => { demoDate = d; };
async function req(method, path, body, timeoutMs = 0) {
  const headers = { 'content-type': 'application/json' };
  if (demoDate) headers['x-demo-date'] = demoDate;
  const controller = timeoutMs ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let r;
  try {
    r = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller?.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`AI request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(json.error || `HTTP ${r.status}`); e.duplicate = !!json.duplicate; e.status = r.status; throw e; }
  return json;
}
export const api = {
  rtsSources: () => req('GET', '/rts/sources'),
  services: () => req('GET', '/registry/services?status=approved'),
  drafts: () => req('GET', '/registry/services?status=draft'),
  compilerRun: (b) => req('POST', '/compiler/run', b),
  editService: (id, b) => req('PATCH', `/registry/services/${id}`, b),
  rejectService: (id) => req('DELETE', `/registry/services/${id}`),
  approveService: (id, b) => req('POST', `/registry/services/${id}/approve`, b),
  offices: () => req('GET', '/registry/offices'),
  parseSlip: (text) => req('POST', '/ocr/slip', { text }),
  verifySlipPhoto: (image) => req('POST', '/ocr/slip/verify', image, 60_000),
  translate: (text, sourceLanguage, targetLanguage) => req('POST', '/translate', { text, sourceLanguage, targetLanguage }),
  translateBatch: (items) => req('POST', '/translate/batch', { items }),
  create: (b) => req('POST', '/applications', b),
  list: (applicantAlias = '') => req('GET', `/applications${applicantAlias ? `?applicantAlias=${encodeURIComponent(applicantAlias)}` : '?applicantAlias=__none__'}`),
  get: (id) => req('GET', `/applications/${id}`),
  pause: (id) => req('POST', `/applications/${id}/pause`, {}),
  resume: (id) => req('POST', `/applications/${id}/resume`, {}),
  dispose: (id) => req('POST', `/applications/${id}/dispose`, {}),
  reason: (id, reasonCode) => req('PATCH', `/applications/${id}/reason`, { reasonCode }),
  draftAppeal: (id, lang) => req('POST', `/applications/${id}/appeals`, { lang }),
  sendAppeal: (id) => req('POST', `/appeals/${id}/send`, {}),
  radar: (officeId) => req('GET', `/radar${officeId ? `?officeId=${officeId}` : ''}`),
  commission: () => req('GET', '/commission/offices'),
  audit: (id) => req('GET', `/audit/${id}`),
};
