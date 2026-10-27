// Extraction providers. Each returns RAW rows: [{ name, days, day_type?, designated_officer, appellate_1, appellate_2, appeal_final?, penalty_note?, source_snippet? }]
// Providers only EXTRACT. Trust is decided by validate.js (code) and a human approval, never by the provider.

const norm = (s) => (s ?? '').trim();
const intOrNull = (s) => (/^\d{1,3}$/.test(norm(s)) ? Number(s) : null);

/** Heuristic provider: no LLM, no network. Reads pipe tables. Offline fallback and test baseline.
 *  Columns by header names (service, days, designated/officer, first appellate, second appellate). */
export async function heuristicExtract(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.includes('|'));
  if (lines.length < 2) return [];
  const header = lines[0].split('|').map((c) => c.trim().toLowerCase());
  const col = (re) => header.findIndex((h) => re.test(h));
  const idx = { name: col(/service|name/), days: col(/day/), officer: col(/designated|officer/), a1: col(/first/), a2: col(/second/), fin: col(/final|third|commission/), pen: col(/penalt/) };
  if (idx.name < 0 || idx.days < 0) return [];
  return lines.slice(1).map((l) => {
    const c = l.split('|').map(norm);
    return { name: c[idx.name], days: intOrNull(c[idx.days]), designated_officer: c[idx.officer] || null, appellate_1: c[idx.a1] || null,
      appellate_2: c[idx.a2] || null, appeal_final: idx.fin >= 0 ? c[idx.fin] || null : null, penalty_note: idx.pen >= 0 ? c[idx.pen] || null : null, source_snippet: l };
  }).filter((r) => r.name);
}

export const SYSTEM_PROMPT = `You extract public-service guarantee rules from the text of a government notified-service list.
Rules:
- Extract ONLY what is written in the text. Never guess or infer. If a field is absent, use null.
- days: integer number of days written in the text (convert number words like "thirty" to 30); null if absent.
- day_type: "working" only if the text says working days; otherwise "calendar".
- Copy authority names exactly as written.
- source_snippet: copy the exact source line(s) the row came from, verbatim.
Return ONLY a JSON array, no prose. Each item keys: name, days, day_type, designated_officer, appellate_1, appellate_2, appeal_final, penalty_note, source_snippet.`;

export function parseJsonArray(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('['), end = t.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('provider did not return a JSON array');
  const arr = JSON.parse(t.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error('provider JSON is not an array');
  return arr;
}

/** Google Gemini provider — free via generativelanguage.googleapis.com REST API.
 *  Set GEMINI_API_KEY in server/.env. Free tier: 15 RPM, 1M TPM (gemini-2.0-flash). */
export async function geminiExtract(text, { apiKey = process.env.GEMINI_API_KEY, model = process.env.GEMINI_MODEL || 'gemini-2.0-flash', fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set — add it to server/.env');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: `Notified-service list text:\n\n${text}` }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const out = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  return parseJsonArray(out);
}

/** Groq provider — free inference for open-weights models (llama-3.3-70b-versatile, mixtral, etc.).
 *  Set GROQ_API_KEY in server/.env. Free tier: generous daily tokens. */
export async function groqExtract(text, { apiKey = process.env.GROQ_API_KEY, model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is not set — add it to server/.env');
  const res = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Notified-service list text:\n\n${text}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const out = data.choices?.[0]?.message?.content ?? '';
  return parseJsonArray(out);
}

export const PROVIDERS = {
  heuristic: (text) => heuristicExtract(text),
  gemini: (text, opts) => geminiExtract(text, opts),
  groq: (text, opts) => groqExtract(text, opts),
};
