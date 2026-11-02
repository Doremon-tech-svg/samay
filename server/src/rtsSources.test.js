import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp } from './app.js';

const catalog = JSON.parse(readFileSync(new URL('../data/rtsSources.json', import.meta.url)));

test('RTS source catalog has one source record per Indian state and union territory', () => {
  assert.equal(catalog.jurisdiction_count, 36);
  assert.equal(catalog.jurisdictions.length, 36);
  assert.equal(new Set(catalog.jurisdictions.map((entry) => entry.jurisdiction)).size, 36);
  assert.ok(catalog.jurisdictions.every((entry) => Array.isArray(entry.sources) && entry.sources.length > 0));
  assert.ok(catalog.jurisdictions.every((entry) => entry.service_rows.length === 0));
});

test('GET /api/rts/sources serves the evidence catalog without accessing the database', async (t) => {
  const server = createApp({ pool: null }).listen(0);
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/rts/sources`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.jurisdiction_count, 36);
  assert.equal(body.jurisdictions[0].jurisdiction, 'Andhra Pradesh');
  assert.deepEqual(body.jurisdictions[0].service_rows, []);
});
