import { readFileSync } from 'node:fs';
import { PROVIDERS } from './providers.js';
import { validateRows } from './validate.js';
const states = JSON.parse(readFileSync(new URL('../../data/states.json', import.meta.url)));
const vocabAll = JSON.parse(readFileSync(new URL('../../data/vocab.json', import.meta.url)));

/** compile(text, state, provider) -> { rows, rejected, provider }. Never writes to the DB. */
export async function compile(text, state, provider = 'heuristic', opts = {}) {
  if (!PROVIDERS[provider]) throw new Error(`unknown provider: ${provider}`);
  const raw = await PROVIDERS[provider](text, opts);
  const out = validateRows(raw, text, { state, vocab: vocabAll[state] ?? [], states });
  return { ...out, provider };
}
