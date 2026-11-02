import test from 'node:test';
import assert from 'node:assert/strict';
import { STR, clockSummary, t } from './i18n.js';
import { createQueue } from './offlineQueue.js';

test('every English key has a Hindi translation and vice versa', () => {
  const en = Object.keys(STR.en).sort(), hi = Object.keys(STR.hi).sort();
  assert.deepEqual(hi, en);
  for (const k of en) assert.ok(STR.hi[k].trim().length > 0, `empty Hindi string: ${k}`);
});
test('t() falls back to English then to the key', () => { assert.equal(t('hi', 'nonexistent'), 'nonexistent'); assert.equal(t('xx', 'service'), 'Service'); });
const base = { serviceName: 'Income Certificate', nextAppealTo: 'Tahsildar' };
test('clock summary, English', () => {
  assert.equal(clockSummary('en', { ...base, clock: { state: 'AT_RISK', remaining: 5, dueDate: '2026-10-20' } }), 'Income Certificate: At risk. 5 days left. Due date 20 October 2026.');
  assert.match(clockSummary('en', { ...base, clock: { state: 'BREACHED', daysLate: 3, dueDate: '2026-10-20' } }), /missed by 3 days.*Tahsildar/);
});
test('clock summary, Hindi carries the numbers', () => {
  const s = clockSummary('hi', { ...base, clock: { state: 'ON_TIME', remaining: 9, dueDate: '2026-10-20' } });
  assert.ok(s.includes('9') && s.includes('2026'));
  assert.match(clockSummary('hi', { ...base, clock: { state: 'BREACHED', daysLate: 3, dueDate: '2026-10-20' } }), /3 दिन.*Tahsildar/);
});
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
test('offline queue keeps failures, drops synced and duplicates', async () => {
  const q = createQueue(mem()); q.add({ ackNo: 'A' }); q.add({ ackNo: 'B' }); q.add({ ackNo: 'C' });
  const res = await q.flush(async (p) => { if (p.ackNo === 'B') throw new Error('network'); if (p.ackNo === 'C') throw { duplicate: true }; });
  assert.deepEqual(res, { synced: 2, remaining: 1 }); assert.equal(q.all()[0].payload.ackNo, 'B');
  const res2 = await q.flush(async () => {}); assert.deepEqual(res2, { synced: 1, remaining: 0 });
});
