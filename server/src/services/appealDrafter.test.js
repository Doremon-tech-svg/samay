import test from 'node:test';
import assert from 'node:assert/strict';
import { draftAppeal, nextAppealTarget, assertFacts } from './appealDrafter.js';
const service = { name: 'Income Certificate', act_name: 'Maharashtra Right to Public Services Act, 2015', days: 15, appellate_1: 'Tahsildar', appellate_2: 'Sub Divisional Officer', appeal_final: 'State Commission' };
const app = { ack_no: 'MH123456', received_on: '2026-10-05', officeName: 'Demo Tahsil Office A', applicant_alias: 'ref-77' };
const status = { dueDate: '2026-10-20', daysLate: 3 };
test('appeal escalates through the notified chain', () => {
  assert.equal(nextAppealTarget(service, 0).to, 'Tahsildar');
  assert.equal(nextAppealTarget(service, 1).to, 'Sub Divisional Officer');
  assert.equal(nextAppealTarget(service, 2).to, 'State Commission');
  assert.equal(nextAppealTarget(service, 3), null);
});
test('English and Hindi drafts carry the facts from the rule and clock', () => {
  for (const lang of ['en', 'hi']) {
    const t = draftAppeal({ app, service, status, level: 1, to: 'Tahsildar', lang, today: '2026-10-23' });
    assert.ok(t.includes('MH123456') && t.includes('2026-10-20') && t.includes('15'));
  }
});
test('guard rejects text missing a required fact (e.g. an LLM rewrite that dropped the due date)', () => {
  assert.throws(() => assertFacts('Please decide my application MH123456 in 15 days', { app, service, status, to: 'Tahsildar' }));
});
