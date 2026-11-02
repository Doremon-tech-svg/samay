// SAMAY clock engine. Pure functions, no I/O, no AI. The deadline is computed here, never by an LLM.
// Dates are ISO strings "YYYY-MM-DD" handled in UTC to avoid timezone bugs.

const DAY_MS = 86400000;
export const toDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const toIso = (dt) => dt.toISOString().slice(0, 10);
const addCal = (iso, n) => toIso(new Date(toDate(iso).getTime() + n * DAY_MS));

/** opts: { dayType: 'calendar'|'working', holidays: array of ISO, weekend: [0,6], pauses: [{start,end|null}] } */
function makeCounter({ dayType = 'calendar', holidays = [], weekend = [0, 6], pauses = [] }, asOf) {
  const hol = new Set(holidays);
  return function counts(iso) {
    if (dayType === 'working') {
      if (weekend.includes(toDate(iso).getUTCDay())) return false;
      if (hol.has(iso)) return false;
    }
    for (const p of pauses) {
      const end = p.end ?? asOf ?? '9999-12-31';
      if (iso >= p.start && iso <= end) return false; // clock stopped while a legal pause is open
    }
    return true;
  };
}

/** Due date: the date of the Nth counting day after receipt. Day 0 = receipt date. */
export function computeDueDate(receivedOn, days, opts = {}, asOf = null) {
  if (!Number.isInteger(days) || days < 0) throw new Error('days must be a non-negative integer');
  const counts = makeCounter(opts, asOf);
  let cursor = receivedOn, counted = 0, guard = 0;
  while (counted < days) {
    cursor = addCal(cursor, 1);
    if (counts(cursor)) counted++;
    if (++guard > 3650) throw new Error('clock did not converge');
  }
  return cursor;
}

/** Counting days elapsed from receipt up to and including `upTo`. */
export function elapsedCountingDays(receivedOn, upTo, opts = {}) {
  const counts = makeCounter(opts, upTo);
  let n = 0, cursor = receivedOn;
  while (cursor < upTo) { cursor = addCal(cursor, 1); if (counts(cursor)) n++; }
  return n;
}

const lateBy = (due, to) => Math.round((toDate(to) - toDate(due)) / DAY_MS);

/** Full clock status. app: { receivedOn, disposedOn? }, rule: { days, dayType }, ctx: { holidays, pauses, asOf } */
export function clockStatus(app, rule, ctx = {}) {
  const asOf = ctx.asOf;
  if (!asOf) throw new Error('asOf is required (pass the current date explicitly for testability)');
  const opts = { dayType: rule.dayType, holidays: ctx.holidays ?? [], weekend: ctx.weekend ?? [0, 6], pauses: ctx.pauses ?? [] };
  const due = computeDueDate(app.receivedOn, rule.days, opts, app.disposedOn ?? asOf);
  if (app.disposedOn) {
    const late = app.disposedOn > due;
    return { state: late ? 'COMPLETED_LATE' : 'COMPLETED_ON_TIME', dueDate: due, daysLate: late ? lateBy(due, app.disposedOn) : 0, totalDays: rule.days };
  }
  const elapsed = elapsedCountingDays(app.receivedOn, asOf, opts);
  const remaining = rule.days - elapsed;
  const riskFraction = ctx.riskFraction ?? 1 / 3; // amber in the final third of the window
  let state = 'ON_TIME';
  if (asOf > due) state = 'BREACHED';
  else if (remaining <= Math.ceil(rule.days * riskFraction)) state = 'AT_RISK';
  return { state, dueDate: due, elapsed, remaining: Math.max(remaining, 0), daysLate: state === 'BREACHED' ? lateBy(due, asOf) : 0, totalDays: rule.days };
}

export const RISK_ORDER = { BREACHED: 0, AT_RISK: 1, ON_TIME: 2, COMPLETED_LATE: 3, COMPLETED_ON_TIME: 4 };
