// Validation in CODE, not LLM. Turns raw provider rows into draft registry rows with flags.
// Hard rejects: no findable source line. Everything else becomes a flag the human must acknowledge.
export const slug = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clean = (s) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function findSourceLine(name, sourceText) {
  const n = clean(name);
  return sourceText.split(/\r?\n/).find((l) => clean(l).includes(n)) ?? null;
}
const hasToken = (line, value) => new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(line);

export function validateRows(rawRows, sourceText, { state, vocab = [], states = {} }) {
  const rows = [], rejected = [], seen = new Set();
  const cfg = states[state] ?? {};
  for (const r of rawRows) {
    const name = (r.name ?? '').trim();
    if (!name) { rejected.push({ name: '(blank)', reason: 'EMPTY_NAME' }); continue; }
    const line = findSourceLine(name, sourceText);
    if (!line) { rejected.push({ name, reason: 'NOT_FOUND_IN_SOURCE' }); continue; }
    const flags = [];
    let days = r.days;
    if (days === null || days === undefined) { days = null; flags.push('DAYS_MISSING'); }
    else if (!Number.isInteger(days) || days < 1 || days > 365) { flags.push(`DAYS_INVALID(${days})`); days = null; }
    else if (!hasToken(line, days)) flags.push('DAYS_NOT_IN_SOURCE_AS_DIGITS');
    const day_type = r.day_type === 'working' ? 'working' : 'calendar';
    if (!/calendar|working/i.test(line)) flags.push('DAY_TYPE_ASSUMED_VERIFY');
    const auth = {};
    for (const k of ['designated_officer', 'appellate_1', 'appellate_2', 'appeal_final']) {
      const v = (r[k] ?? null) && String(r[k]).trim();
      auth[k] = v || null;
      if (v) {
        if (!clean(line).includes(clean(v))) flags.push(`${k.toUpperCase()}_NOT_IN_SOURCE`);
        if (vocab.length && !vocab.some((x) => clean(x) === clean(v))) flags.push(`UNKNOWN_AUTHORITY(${v})`);
      }
    }
    if (!auth.appeal_final) auth.appeal_final = cfg.appeal_final ?? null; // state default, human-verified in states.json
    if (!auth.appeal_final) flags.push('APPEAL_FINAL_MISSING');
    const id = `${state}-${slug(name)}`;
    if (seen.has(id)) flags.push('DUPLICATE_IN_BATCH');
    seen.add(id);
    rows.push({ id, state_code: state, service_key: slug(name), name, department: null, act_name: cfg.act_name ?? null, days, day_type,
      status: 'draft', ...auth, penalty_note: r.penalty_note ?? null, source_doc: 'Pasted notified-service list (record the document name and date)',
      source_note: 'Compiled by Rights Compiler; pending human approval', source_snippet: line.trim(), flags });
  }
  return { rows, rejected };
}
