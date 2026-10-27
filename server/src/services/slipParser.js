// Turns raw OCR text from an acknowledgement slip into structured fields. Works on text from any OCR engine.
// The user always confirms the extraction on screen before the clock starts.
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
export function parseDate(text) {
  let m = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return m[0];
  m = text.match(/\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  return null;
}
export function parseAckNo(text) {
  const m = text.match(/(?:application|ack(?:nowledg(?:e)?ment)?|receipt|token|ref(?:erence)?)\s*(?:no\.?|number|id|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-]{5,24})/i);
  if (m) return m[1].toUpperCase();
  const m2 = text.match(/\b([A-Z]{2,6}[\/\-]?\d{6,14})\b/);
  return m2 ? m2[1] : null;
}
export function matchService(text, services) {
  const t = text.toLowerCase();
  const hits = services.filter((s) => t.includes(s.name.toLowerCase()) || t.includes(s.service_key.replace(/-/g, ' ')));
  return hits.length === 1 ? hits[0] : null; // ambiguous or none: ask the user to choose
}
export function parseSlip(text, services) {
  const service = matchService(text, services);
  const fields = { ackNo: parseAckNo(text), receivedOn: parseDate(text), serviceId: service?.id ?? null };
  const missing = Object.entries(fields).filter(([, v]) => !v).map(([k]) => k);
  return { fields, missing, needsConfirmation: true };
}
