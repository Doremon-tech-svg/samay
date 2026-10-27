// End-to-end API smoke test on an in-memory Postgres emulator (pg-mem). Run: npm run smoke
import { newDb } from 'pg-mem';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { loadSchema, seedRegistry, seedSynthetic } from './seedData.js';

const mem = newDb(); const { Pool } = mem.adapters.createPg(); const pool = new Pool();
await loadSchema(pool); await seedRegistry(pool); await seedSynthetic(pool);
const server = createApp({ pool, demoMode: true }).listen(0); const base = `http://127.0.0.1:${server.address().port}`;
const call = async (method, path, body, date = '2026-10-05') => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-demo-date': date }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json() };
};
const step = (m) => console.log('ok -', m);

// 1. slip -> structured fields
let r = await call('POST', '/api/ocr/slip', { text: 'Service: Income Certificate\nApplication No: MH20261234567\nDate: 05/10/2026' });
assert.equal(r.json.fields.serviceId, 'MH-income-certificate'); step('slip parsed');
// 2. start the clock
r = await call('POST', '/api/applications', { serviceId: r.json.fields.serviceId, officeId: 'MH-demo-tahsil-a', ackNo: r.json.fields.ackNo, receivedOn: r.json.fields.receivedOn, channel: 'paper', applicantAlias: 'ref-demo' });
assert.equal(r.status, 201); const id = r.json.id; step('application created');
// 2b. duplicate (offline replay) is idempotent
r = await call('POST', '/api/applications', { serviceId: 'MH-income-certificate', officeId: 'MH-demo-tahsil-a', ackNo: 'MH20261234567', receivedOn: '2026-10-05' }); assert.equal(r.status, 409); assert.equal(r.json.duplicate, true); assert.equal(r.json.id, id); step('duplicate create returns 409 with existing id');
// 3. draft rules are refused
r = await call('POST', '/api/applications', { serviceId: 'KA-DRAFT-example', officeId: 'MH-demo-tahsil-a', ackNo: 'X123456' });
assert.equal(r.status, 422); step('unapproved rule refused');
// 4. clock states over time
r = await call('GET', `/api/applications/${id}`, null, '2026-10-05'); assert.equal(r.json.clock.state, 'ON_TIME');
r = await call('GET', `/api/applications/${id}`, null, '2026-10-15'); assert.equal(r.json.clock.state, 'AT_RISK');
r = await call('GET', `/api/applications/${id}`, null, '2026-10-20'); assert.equal(r.json.clock.dueDate, '2026-10-20'); assert.equal(r.json.clock.state, 'AT_RISK');
r = await call('GET', `/api/applications/${id}`, null, '2026-10-23'); assert.equal(r.json.clock.state, 'BREACHED'); assert.equal(r.json.clock.daysLate, 3); step('clock: on time -> at risk -> breached');
// 5. no appeal before breach
r = await call('POST', `/api/applications/${id}/appeals`, {}, '2026-10-10'); assert.equal(r.status, 409); step('appeal blocked before breach');
// 6. appeal chain
r = await call('POST', `/api/applications/${id}/appeals`, { lang: 'hi' }, '2026-10-23'); assert.equal(r.status, 201); assert.equal(r.json.addressedTo, 'Tahsildar'); assert.ok(r.json.body.includes('MH20261234567'));
const a1 = r.json.id; step('level 1 appeal drafted (Hindi) to Tahsildar');
await call('POST', `/api/appeals/${a1}/send`, {}, '2026-10-23');
r = await call('POST', `/api/applications/${id}/appeals`, {}, '2026-10-30'); assert.equal(r.json.addressedTo, 'Sub Divisional Officer'); step('level 2 escalates to SDO');
// 7. radar sorted by risk
r = await call('GET', '/api/radar', null, '2026-10-23'); assert.ok(r.json.length > 0);
const order = { BREACHED: 0, AT_RISK: 1, ON_TIME: 2 }; for (let i = 1; i < r.json.length; i++) assert.ok(order[r.json[i - 1].clock.state] <= order[r.json[i].clock.state]); step(`radar sorted (${r.json.length} open)`);
// 8. commission map with suppression and ranking
r = await call('GET', '/api/commission/offices', null, '2026-10-23'); assert.ok(r.json.every((o) => o.suppressed || typeof o.lateRate === 'number')); step(`commission map: ${r.json.map((o) => `${o.office} ${o.lateRate}`).join(' | ')}`);
// 9. audit chain verifies, and detects tampering
r = await call('GET', `/api/audit/${id}`); assert.equal(r.json.verification.valid, true); step(`audit chain valid (${r.json.verification.length} events)`);
await pool.query("UPDATE audit_log SET payload = '{\"tampered\":true}' WHERE application_id = $1 AND event_type = 'APPLICATION_CREATED'", [id]);
r = await call('GET', `/api/audit/${id}`); assert.equal(r.json.verification.valid, false); step('tampering detected');

// 10. Rights Compiler: paste KA list -> drafts -> gate -> approve -> second-state clock
import { readFileSync } from 'node:fs';
const fixture = readFileSync(new URL('../data/fixtures/lists.fixture.txt', import.meta.url), 'utf8');
r = await call('POST', '/api/compiler/run', { text: fixture, state: 'KA', provider: 'heuristic' });
assert.equal(r.status, 200); assert.equal(r.json.created.length, 6); step(`compiler: ${r.json.created.length} KA drafts created`);
r = await call('POST', '/api/applications', { serviceId: 'KA-income-certificate', officeId: 'KA-demo-taluk-a', ackNo: 'KA123456' }); assert.equal(r.status, 422); step('draft KA rule cannot start a clock');
r = await call('POST', '/api/registry/services/KA-income-certificate/approve', { verifiedBy: 'tester' }); assert.equal(r.status, 422); assert.ok(r.json.flags.length > 0); step('approval blocked until flags acknowledged');
r = await call('PATCH', '/api/registry/services/KA-income-certificate', { appeal_final: 'Karnataka Appellate Authority (test value)', day_type: 'calendar' }); assert.equal(r.status, 200);
r = await call('POST', '/api/registry/services/KA-income-certificate/approve', { verifiedBy: 'tester', acknowledgeFlags: true }); assert.equal(r.status, 200); step('flagged rule approved after human acknowledgement');
r = await call('POST', '/api/registry/services/KA-demo-service-b/approve', { verifiedBy: 'tester', acknowledgeFlags: true }); assert.equal(r.status, 422); assert.ok(r.json.missing.includes('days')); step('rule with no days cannot be approved even if acknowledged');
r = await call('POST', '/api/applications', { serviceId: 'KA-income-certificate', officeId: 'KA-demo-taluk-a', ackNo: 'KA123456', receivedOn: '2026-10-05' }); assert.equal(r.status, 201); const kid = r.json.id;
r = await call('GET', `/api/applications/${kid}`, null, '2026-10-23'); assert.equal(r.json.clock.state, 'BREACHED'); step('second state clock runs on the same engine');
r = await call('POST', `/api/compiler/run`, { text: fixture, state: 'KA' }); assert.ok(r.json.skipped.some((x) => x.id === 'KA-income-certificate')); step('re-run does not overwrite an approved rule');

server.close(); console.log('\nALL SMOKE CHECKS PASSED');
