// Field-level accuracy of a compiler run against a hand-labelled gold set. This is the number you report to the jury.
const FIELDS = ['days', 'designated_officer', 'appellate_1', 'appellate_2'];
const key = (s) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const same = (a, b) => (typeof a === 'number' || typeof b === 'number' ? a === b : key(a) === key(b));

export function evaluate(predRows, goldRows) {
  const pred = new Map(predRows.map((r) => [key(r.name), r]));
  const report = {};
  for (const f of FIELDS) {
    let predicted = 0, correct = 0, goldCount = 0;
    for (const g of goldRows) {
      const p = pred.get(key(g.name));
      const gv = g[f] ?? null, pv = p ? p[f] ?? null : null;
      if (gv !== null) goldCount++;
      if (pv !== null) { predicted++; if (gv !== null && same(pv, gv)) correct++; }
    }
    report[f] = { precision: predicted ? correct / predicted : null, recall: goldCount ? correct / goldCount : null, correct, predicted, gold: goldCount };
  }
  const rowsMatched = goldRows.filter((g) => pred.has(key(g.name))).length;
  return { fields: report, rowsGold: goldRows.length, rowsMatched };
}
export const pct = (x) => (x === null ? 'n/a' : `${(x * 100).toFixed(0)}%`);
