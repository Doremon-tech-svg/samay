import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDueDate, clockStatus } from './clockEngine.js';

// 2026-10-05 is a Monday.
test('calendar days: 15 days from Mon 5 Oct is Tue 20 Oct', () => {
  assert.equal(computeDueDate('2026-10-05', 15, { dayType: 'calendar' }), '2026-10-20');
});
test('working days skip weekends: 5 working days from Fri 2 Oct is Fri 9 Oct', () => {
  assert.equal(computeDueDate('2026-10-02', 5, { dayType: 'working' }), '2026-10-09');
});
test('working days skip holidays', () => {
  // Fri 2 Oct receipt; Mon 5 Oct is a holiday -> 1 working day lands on Tue 6 Oct
  assert.equal(computeDueDate('2026-10-02', 1, { dayType: 'working', holidays: ['2026-10-05'] }), '2026-10-06');
});
test('a legal pause stops the clock', () => {
  // 7 calendar days from 1 Oct is 8 Oct; a 3-day pause (2..4 Oct) pushes it to 11 Oct
  const pauses = [{ start: '2026-10-02', end: '2026-10-04' }];
  assert.equal(computeDueDate('2026-10-01', 7, { dayType: 'calendar', pauses }), '2026-10-11');
});
test('zero-day rule is due on receipt date', () => {
  assert.equal(computeDueDate('2026-10-05', 0, {}), '2026-10-05');
});
const rule = { days: 15, dayType: 'calendar' };
test('traffic light: on time, at risk in final third, breached after due date', () => {
  const app = { receivedOn: '2026-10-05' };
  assert.equal(clockStatus(app, rule, { asOf: '2026-10-05' }).state, 'ON_TIME');
  assert.equal(clockStatus(app, rule, { asOf: '2026-10-14' }).state, 'ON_TIME');   // elapsed 9, remaining 6 > 5
  assert.equal(clockStatus(app, rule, { asOf: '2026-10-15' }).state, 'AT_RISK');   // elapsed 10, remaining 5
  assert.equal(clockStatus(app, rule, { asOf: '2026-10-20' }).state, 'AT_RISK');   // due day itself is still in time
  const b = clockStatus(app, rule, { asOf: '2026-10-21' });
  assert.equal(b.state, 'BREACHED'); assert.equal(b.daysLate, 1);
});
test('completed on time vs late', () => {
  assert.equal(clockStatus({ receivedOn: '2026-10-05', disposedOn: '2026-10-20' }, rule, { asOf: '2026-11-01' }).state, 'COMPLETED_ON_TIME');
  const l = clockStatus({ receivedOn: '2026-10-05', disposedOn: '2026-10-25' }, rule, { asOf: '2026-11-01' });
  assert.equal(l.state, 'COMPLETED_LATE'); assert.equal(l.daysLate, 5);
});
test('an open pause stops the clock, so the application is not breached', () => {
  const s = clockStatus({ receivedOn: '2026-10-05' }, rule, { asOf: '2026-10-25', pauses: [{ start: '2026-10-10', end: null }] });
  assert.notEqual(s.state, 'BREACHED');
});
test('asOf is mandatory', () => {
  assert.throws(() => clockStatus({ receivedOn: '2026-10-05' }, rule, {}));
});
