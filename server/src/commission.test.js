import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { createApp } from './app.js';
import { loadSchema, seedRegistry, seedSynthetic, seedDemoApplications } from '../db/seedData.js';

async function startDemo() {
  const { Pool } = newDb().adapters.createPg();
  const pool = new Pool();
  await loadSchema(pool);
  await seedRegistry(pool);
  await seedSynthetic(pool);
  await seedDemoApplications(pool);
  const server = createApp({ pool, demoMode: true }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { pool, server, base, close: async () => { await new Promise((resolve) => server.close(resolve)); await pool.end(); } };
}

test('Commission office summaries include department-level totals while preserving small-cohort suppression', async (t) => {
  const app = await startDemo(); t.after(app.close);
  const response = await fetch(`${app.base}/api/commission/offices`, { headers: { 'x-demo-date': '2026-11-03' } });
  assert.equal(response.status, 200);
  const rows = await response.json();
  const large = rows.find((row) => row.officeId === 'GJ-ahmedabad-jsk-main');
  const small = rows.find((row) => row.officeId === 'MH-pune-aaple-main');
  assert.ok(large);
  assert.ok(large.departments['Revenue Department']);
  assert.ok(large.departments['Revenue Department'].total >= 5);
  assert.equal(small.suppressed, true);
  assert.equal(Object.hasOwn(small, 'departments'), false);
});

test('Commission case drill-down masks references and returns synthetic accountability metadata', async (t) => {
  const app = await startDemo(); t.after(app.close);
  const response = await fetch(`${app.base}/api/commission/offices/GJ-ahmedabad-jsk-main`, { headers: { 'x-demo-date': '2026-11-03' } });
  assert.equal(response.status, 200);
  const detail = await response.json();
  assert.equal(detail.synthetic, true);
  assert.equal(detail.privacy.referencesMasked, true);
  assert.equal(detail.privacy.citizenNamesExcluded, true);
  assert.ok(detail.delayedApplications.length > 0);
  const first = detail.delayedApplications[0];
  assert.match(first.reference, /^••••\d{4}$/);
  assert.ok(first.officer.synthetic);
  assert.equal(Object.hasOwn(first.officer, 'phone'), false);
  assert.equal(detail.contact.sent, false);
  assert.match(detail.contact.mode, /DEMO/);
});

test('Commission refuses case-level drill-down when an office is below k-anonymity threshold', async (t) => {
  const app = await startDemo(); t.after(app.close);
  const response = await fetch(`${app.base}/api/commission/offices/MH-pune-aaple-main`);
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /k-anonymity/i);
});
