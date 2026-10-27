import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { validateRows } from './validate.js';
import { evaluate } from './eval.js';
import { geminiExtract, groqExtract, parseJsonArray } from './providers.js';

const text = readFileSync(new URL('../../data/fixtures/lists.fixture.txt', import.meta.url), 'utf8');
const gold = JSON.parse(readFileSync(new URL('../../data/fixtures/lists.gold.json', import.meta.url))).rows;

test('heuristic provider reads the pipe table and validator builds draft rows', async () => {
  const { rows, rejected } = await compile(text, 'MH');
  assert.equal(rows.length, 6); assert.equal(rejected.length, 0);
  const inc = rows.find((r) => r.name === 'Income Certificate');
  assert.equal(inc.days, 15); assert.equal(inc.status, 'draft'); assert.equal(inc.appeal_final, 'Maharashtra State Commission for Right to Public Services');
  assert.equal(inc.act_name, 'Maharashtra Right to Public Services Act, 2015');
  assert.ok(inc.source_snippet.includes('Income Certificate'));
  assert.ok(inc.flags.includes('DAY_TYPE_ASSUMED_VERIFY'), 'day type must be flagged unless the source says it');
});
test('unknown authorities and word-numbers are flagged, not trusted', async () => {
  const { rows } = await compile(text, 'MH');
  const c = rows.find((r) => r.name.includes('Service C'));
  assert.ok(c.flags.some((f) => f.startsWith('UNKNOWN_AUTHORITY')));
  const b = rows.find((r) => r.name.includes('Service B'));
  assert.equal(b.days, null); assert.ok(b.flags.includes('DAYS_MISSING'));
});
test('validator rejects rows with no findable source line (hallucination guard)', () => {
  const { rows, rejected } = validateRows([{ name: 'Invented Service', days: 5 }], text, { state: 'MH' });
  assert.equal(rows.length, 0); assert.equal(rejected[0].reason, 'NOT_FOUND_IN_SOURCE');
});
test('validator flags a day count that is not in the source line (LLM guessed)', () => {
  const { rows } = validateRows([{ name: 'Income Certificate', days: 30, designated_officer: 'Nayab Tahsildar' }], text, { state: 'MH' });
  assert.ok(rows[0].flags.includes('DAYS_NOT_IN_SOURCE_AS_DIGITS'));
});
test('validator flags an authority not present in the source line', () => {
  const { rows } = validateRows([{ name: 'Income Certificate', days: 15, designated_officer: 'Collector' }], text, { state: 'MH' });
  assert.ok(rows[0].flags.includes('DESIGNATED_OFFICER_NOT_IN_SOURCE'));
});
test('out-of-range days are nulled and flagged', () => {
  const { rows } = validateRows([{ name: 'Income Certificate', days: 9999 }], text, { state: 'MH' });
  assert.equal(rows[0].days, null); assert.ok(rows[0].flags.some((f) => f.startsWith('DAYS_INVALID')));
});
test('KA has no default final authority: flagged until a human fills it', async () => {
  const { rows } = await compile(text, 'KA');
  assert.ok(rows[0].flags.includes('APPEAL_FINAL_MISSING'));
});
test('eval: heuristic baseline misses the word-number row (recall < 100%), precision stays 100%', async () => {
  const { rows } = await compile(text, 'MH');
  const rep = evaluate(rows, gold);
  assert.equal(rep.fields.days.precision, 1); assert.equal(rep.fields.days.correct, 5); assert.equal(rep.fields.days.gold, 6);
  assert.ok(rep.fields.days.recall < 1);
  assert.equal(rep.fields.designated_officer.recall, 1);
});
test('parseJsonArray strips code fences', () => {
  assert.deepEqual(parseJsonArray('```json\n[{"name":"x"}]\n```'), [{ name: 'x' }]);
  assert.throws(() => parseJsonArray('no json here'));
});
test('gemini provider plumbing works with an injected fetch (no network)', async () => {
  const fake = async (url, init) => {
    const body = JSON.parse(init.body);
    assert.ok(url.includes('generativelanguage.googleapis.com') && body.system_instruction.parts[0].text.includes('ONLY what is written'));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"name":"Demo Service B (fixture)","days":30}]' }] } }] }) };
  };
  const raw = await geminiExtract(text, { apiKey: 'k', fetchImpl: fake });
  const { rows } = validateRows(raw, text, { state: 'MH' });
  assert.equal(rows[0].days, 30); assert.ok(rows[0].flags.includes('DAYS_NOT_IN_SOURCE_AS_DIGITS'));
});
test('groq provider plumbing works with an injected fetch (no network)', async () => {
  const fake = async (url, init) => {
    const body = JSON.parse(init.body);
    assert.ok(url.includes('api.groq.com') && init.headers['Authorization'] === 'Bearer k' && body.messages[0].role === 'system');
    return { ok: true, json: async () => ({ choices: [{ message: { content: '[{"name":"Demo Service B (fixture)","days":30}]' } }] }) };
  };
  const raw = await groqExtract(text, { apiKey: 'k', fetchImpl: fake });
  const { rows } = validateRows(raw, text, { state: 'MH' });
  assert.equal(rows[0].days, 30); assert.ok(rows[0].flags.includes('DAYS_NOT_IN_SOURCE_AS_DIGITS'));
});
test('missing API keys fail loudly', async () => {
  await assert.rejects(() => geminiExtract('x', { apiKey: '' }), /GEMINI_API_KEY/);
  await assert.rejects(() => groqExtract('x', { apiKey: '' }), /GROQ_API_KEY/);
});
