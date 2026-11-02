// npm run eval:compiler            (heuristic, offline)
// LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=... npm run eval:compiler
import { readFileSync } from 'node:fs';
import { compile } from './compile.js';
import { evaluate, pct } from './eval.js';
const text = readFileSync(new URL('../../data/fixtures/lists.fixture.txt', import.meta.url), 'utf8');
const gold = JSON.parse(readFileSync(new URL('../../data/fixtures/lists.gold.json', import.meta.url))).rows;
const provider = process.env.LLM_PROVIDER || 'heuristic';
const { rows, rejected } = await compile(text, 'MH', provider);
const rep = evaluate(rows, gold);
console.log(`provider: ${provider}  rows: ${rows.length}  rejected: ${rejected.length}  gold: ${rep.rowsGold}`);
console.table(Object.fromEntries(Object.entries(rep.fields).map(([f, v]) => [f, { precision: pct(v.precision), recall: pct(v.recall), correct: v.correct, predicted: v.predicted, gold: v.gold }])));
console.log('rows flagged for human review:', rows.filter((r) => r.flags.length).map((r) => `${r.name} [${r.flags.join(', ')}]`));
