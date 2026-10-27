import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { appendAudit } from '../src/services/auditChain.js';
const reg = JSON.parse(readFileSync(new URL('../data/registry.json', import.meta.url)));

export async function loadSchema(pool) { await pool.query(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); }

export async function seedRegistry(pool) {
  for (const s of reg.services) {
    await pool.query(`INSERT INTO services (id,state_code,service_key,name,department,act_name,days,day_type,status,designated_officer,appellate_1,appellate_2,appeal_final,penalty_note,source_doc,source_note,verified_by,verified_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [s.id, s.state_code, s.service_key, s.name, s.department, s.act_name, s.days, s.day_type, s.status, s.designated_officer, s.appellate_1, s.appellate_2, s.appeal_final, s.penalty_note, s.source_doc, s.source_note, s.verified_by, s.verified_by ? '2026-10-25' : null]);
  }
  for (const o of reg.offices) await pool.query('INSERT INTO offices (id,state_code,district,name,level) VALUES ($1,$2,$3,$4,$5)', [o.id, o.state_code, o.district, o.name, o.level]);
}

// SYNTHETIC applications on FICTIONAL offices. Never attach synthetic poor performance to real office names.
// Late rates are illustrative (low, medium, high) to make the map readable; they are not measurements of anything.
export async function seedSynthetic(pool, { count = 120, seed = 7 } = {}) {
  let x = seed; const rnd = () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const lateRate = { 'MH-demo-tahsil-a': 0.06, 'MH-demo-tahsil-b': 0.22, 'MH-demo-tahsil-c': 0.55 };
  const services = reg.services.filter((s) => s.status === 'approved');
  const offices = reg.offices.filter((o) => lateRate[o.id] !== undefined);
  const base = new Date(Date.UTC(2026, 8, 8)); // 8 Sep; 45-day window so many applications are still open on 23 Oct
  for (let i = 0; i < count; i++) {
    const s = services[Math.floor(rnd() * services.length)], o = offices[i % offices.length];
    const recv = new Date(base.getTime() + Math.floor(rnd() * 45) * 86400000).toISOString().slice(0, 10);
    const late = rnd() < lateRate[o.id];
    const id = randomUUID(); const ack = `SYN${String(100000 + i)}`;
    const disposeAfter = late ? s.days + 1 + Math.floor(rnd() * 12) : Math.max(1, s.days - Math.floor(rnd() * Math.min(s.days, 6)));
    const disposed = new Date(Date.parse(recv) + disposeAfter * 86400000).toISOString().slice(0, 10);
    const isOpen = disposed > '2026-10-23';
    await pool.query(`INSERT INTO applications (id,ack_no,service_id,office_id,received_on,channel,applicant_alias,language,status,disposed_on,reason_code,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, ack, s.id, o.id, recv, rnd() < 0.8 ? 'paper' : 'online', `syn-${i}`, 'en', isOpen ? 'PENDING' : 'DISPOSED', isOpen ? null : disposed,
        late && isOpen ? ['AWAITING_VERIFICATION', 'OFFICER_VACANCY', 'FILE_MOVEMENT'][Math.floor(rnd() * 3)] : null, `${recv}T09:00:00Z`]);
    await appendAudit(pool, id, 'APPLICATION_CREATED', { synthetic: true, serviceId: s.id, officeId: o.id }, `${recv}T09:00:00Z`);
  }
}
