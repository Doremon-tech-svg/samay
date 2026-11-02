import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSlip, parseDate, parseAckNo } from './slipParser.js';
const services = [{ id: 'MH-income-certificate', name: 'Income Certificate', service_key: 'income-certificate' }, { id: 'MH-agri', name: 'Agriculturist Certificate', service_key: 'agriculturist-certificate' }];
test('parses date formats', () => {
  assert.equal(parseDate('Date: 05/10/2026'), '2026-10-05');
  assert.equal(parseDate('Received 5 Oct 2026'), '2026-10-05');
  assert.equal(parseDate('2026-10-05'), '2026-10-05');
  assert.equal(parseDate('no date here'), null);
});
test('parses acknowledgement numbers', () => {
  assert.equal(parseAckNo('Application No: MH20261234567'), 'MH20261234567');
  assert.equal(parseAckNo('Receipt MHRTS/2026/00045'), 'MHRTS/2026/00045');
});
test('full slip with a unique service match', () => {
  const r = parseSlip('Aaple Sarkar Seva Kendra\nService: Income Certificate\nApplication No: MH20261234567\nDate: 05/10/2026', services);
  assert.deepEqual(r.fields, { ackNo: 'MH20261234567', receivedOn: '2026-10-05', serviceId: 'MH-income-certificate' });
  assert.equal(r.missing.length, 0);
});
test('missing fields are reported so the UI can ask the user', () => {
  const r = parseSlip('Some blurry text', services);
  assert.ok(r.missing.includes('serviceId'));
});
