import { createHash } from 'node:crypto';
// Tamper-evident log: each record's hash covers the previous hash plus the event. It proves later edits, not that the facts were true.
const GENESIS = '0'.repeat(64);
const canonical = (o) => JSON.stringify(o, Object.keys(o ?? {}).sort());
export const hashEvent = (prev, type, payload, at) =>
  createHash('sha256').update(`${prev}|${type}|${at}|${JSON.stringify(sortDeep(payload))}`).digest('hex');
function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]));
  return v;
}
export async function appendAudit(pool, applicationId, type, payload, at) {
  const last = await pool.query('SELECT hash FROM audit_log WHERE application_id = $1 ORDER BY id DESC LIMIT 1', [applicationId]);
  const prev = last.rows[0]?.hash ?? GENESIS;
  const hash = hashEvent(prev, type, payload, at);
  await pool.query('INSERT INTO audit_log (application_id, event_type, payload, prev_hash, hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [applicationId, type, JSON.stringify(payload ?? {}), prev, hash, at]);
  return hash;
}
export async function verifyChain(pool, applicationId) {
  const { rows } = await pool.query('SELECT * FROM audit_log WHERE application_id = $1 ORDER BY id ASC', [applicationId]);
  let prev = GENESIS;
  for (const r of rows) {
    const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
    if (r.prev_hash !== prev || hashEvent(prev, r.event_type, payload, r.created_at) !== r.hash) return { valid: false, brokenAtId: r.id, length: rows.length };
    prev = r.hash;
  }
  return { valid: true, length: rows.length, head: prev };
}
