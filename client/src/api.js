// All calls go through here. demoDate is sent as x-demo-date so the team can "time travel" in the demo (server DEMO_MODE=1).
let demoDate = null;
export const setDemoDate = (d) => { demoDate = d; };
async function req(method, path, body) {
  const headers = { 'content-type': 'application/json' };
  if (demoDate) headers['x-demo-date'] = demoDate;
  const r = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(json.error || `HTTP ${r.status}`); e.duplicate = !!json.duplicate; e.status = r.status; throw e; }
  return json;
}
export const api = {
  services: () => req('GET', '/registry/services?status=approved'),
  drafts: () => req('GET', '/registry/services?status=draft'),
  compilerRun: (b) => req('POST', '/compiler/run', b),
  editService: (id, b) => req('PATCH', `/registry/services/${id}`, b),
  rejectService: (id) => req('DELETE', `/registry/services/${id}`),
  approveService: (id, b) => req('POST', `/registry/services/${id}/approve`, b),
  offices: () => req('GET', '/registry/offices'),
  parseSlip: (text) => req('POST', '/ocr/slip', { text }),
  create: (b) => req('POST', '/applications', b),
  list: () => req('GET', '/applications'),
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
