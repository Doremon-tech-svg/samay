import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { appendAudit } from '../src/services/auditChain.js';
const reg = JSON.parse(readFileSync(new URL('../data/registry.json', import.meta.url)));

export async function loadSchema(pool) { await pool.query(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); }

export async function seedRegistry(pool) {
  for (const s of reg.services) {
    await pool.query(`INSERT INTO services (id,state_code,service_key,name,department,act_name,days,day_type,status,designated_officer,appellate_1,appellate_2,appeal_final,penalty_note,source_doc,source_note,verified_by,verified_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO NOTHING`,
      [s.id, s.state_code, s.service_key, s.name, s.department, s.act_name, s.days, s.day_type, s.status, s.designated_officer, s.appellate_1, s.appellate_2, s.appeal_final, s.penalty_note, s.source_doc, s.source_note, s.verified_by, s.verified_by ? '2026-10-25' : null]);
  }
  for (const o of reg.offices) await pool.query('INSERT INTO offices (id,state_code,district,name,level) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [o.id, o.state_code, o.district, o.name, o.level]);
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

// Small named demo set used by the Citizen quick-login. These are synthetic records
// on fictional offices so the demo feels coherent without presenting real people.
export async function seedDemoApplications(pool) {
  const rows = [
    ['demo-aarav-income', 'DEMO-AARAV-01', 'MH-income-certificate', 'MH-demo-tahsil-a', '2026-10-15', '9820011223', 'PENDING', null, null],
    ['demo-aarav-agri', 'DEMO-AARAV-02', 'MH-agriculturist-certificate', 'MH-demo-tahsil-b', '2026-10-20', '9820011223', 'PENDING', null, 'AWAITING_VERIFICATION'],
    ['demo-aarav-landless', 'DEMO-AARAV-03', 'MH-landless-labour-certificate', 'MH-demo-tahsil-c', '2026-10-01', '9820011223', 'PENDING', null, 'OFFICER_VACANCY'],
    ['demo-meera-income', 'DEMO-MEERA-01', 'MH-income-certificate', 'MH-demo-tahsil-b', '2026-10-18', '9000000001', 'PENDING', null, 'FILE_MOVEMENT'],
    ['demo-sneha-income', 'DEMO-SNEHA-01', 'MH-income-certificate', 'MH-demo-tahsil-a', '2026-10-12', '9000000002', 'PENDING', null, null],
    ['demo-ravi-agr', 'DEMO-RAVI-01', 'MH-agriculturist-certificate', 'MH-demo-tahsil-a', '2026-10-14', '9000000003', 'PENDING', null, null],
    ['demo-kavita-land', 'DEMO-KAVITA-01', 'MH-landless-labour-certificate', 'MH-demo-tahsil-a', '2026-10-11', '9000000004', 'PENDING', null, 'AWAITING_VERIFICATION'],
    ['demo-naresh-income', 'DEMO-NARESH-01', 'MH-income-certificate', 'MH-demo-tahsil-b', '2026-10-17', '9000000005', 'PENDING', null, 'FILE_MOVEMENT'],
    ['demo-priya-income', 'DEMO-PRIYA-01', 'MH-income-certificate', 'MH-demo-tahsil-c', '2026-10-08', '9000000006', 'PENDING', null, null],
    ['demo-ashok-agri', 'DEMO-ASHOK-01', 'MH-agriculturist-certificate', 'MH-demo-tahsil-c', '2026-10-03', '9000000007', 'PENDING', null, 'OFFICER_VACANCY'],
    ['demo-sarita-land', 'DEMO-SARITA-01', 'MH-landless-labour-certificate', 'MH-demo-tahsil-c', '2026-09-30', '9000000008', 'PENDING', null, 'AWAITING_VERIFICATION'],
    ['demo-manoj-income', 'DEMO-MANOJ-01', 'MH-income-certificate', 'MH-demo-tahsil-a', '2026-10-09', '9000000009', 'PENDING', null, null],
    ['demo-vidya-agri', 'DEMO-VIDYA-01', 'MH-agriculturist-certificate', 'MH-demo-tahsil-a', '2026-10-22', '9000000010', 'PENDING', null, null],
    ['demo-amol-income', 'DEMO-AMOL-01', 'MH-income-certificate', 'MH-demo-tahsil-b', '2026-10-05', '9000000011', 'PENDING', null, 'AWAITING_VERIFICATION'],
    ['demo-puja-land', 'DEMO-PUJA-01', 'MH-landless-labour-certificate', 'MH-demo-tahsil-b', '2026-10-07', '9000000012', 'PENDING', null, 'FILE_MOVEMENT']
  ];
  for (const [id, ack, serviceId, officeId, receivedOn, alias, status, disposedOn, reasonCode] of rows) {
    const inserted = await pool.query(`INSERT INTO applications (id, ack_no, service_id, office_id, received_on, channel, applicant_alias, language, status, disposed_on, reason_code, created_at)
      VALUES ($1,$2,$3,$4,$5,'paper',$6,'en',$7,$8,$9,$5 || 'T09:00:00Z') ON CONFLICT (id) DO NOTHING`,
      [id, ack, serviceId, officeId, receivedOn, alias, status, disposedOn, reasonCode]);
    if (inserted.rowCount) await appendAudit(pool, id, 'APPLICATION_CREATED', { synthetic: true, demo: true, serviceId, officeId, ackNo: ack }, `${receivedOn}T09:00:00Z`);
  }

  // Uploaded-slip fixtures and a deliberately dense Gujarat main-office docket for the judge walkthrough.
  const slipRows = [
    ['demo-slip-gj', 'GJ20263412098', 'GJ-income-certificate', 'GJ-ahmedabad-jsk-main', '2026-06-15', '9876500001', 'PENDING', null, 'AWAITING_VERIFICATION'],
    ['demo-slip-tn', 'TN20264589201', 'TN-community-certificate', 'TN-chennai-eservice-main', '2026-11-02', '9876500002', 'PENDING', null, null],
    ['demo-slip-mh', 'MH202610843905', 'MH-caste-certificate', 'MH-pune-aaple-main', '2026-05-13', '9876500003', 'PENDING', null, 'FILE_MOVEMENT']
  ];
  for (const [id, ack, serviceId, officeId, receivedOn, alias, status, disposedOn, reasonCode] of slipRows) {
    const inserted = await pool.query(`INSERT INTO applications (id, ack_no, service_id, office_id, received_on, channel, applicant_alias, language, status, disposed_on, reason_code, created_at)
      VALUES ($1,$2,$3,$4,$5,'paper',$6,'en',$7,$8,$9,$5 || '09:00:00Z') ON CONFLICT (id) DO NOTHING`,
      [id, ack, serviceId, officeId, receivedOn, alias, status, disposedOn, reasonCode]);
    if (inserted.rowCount) await appendAudit(pool, id, 'APPLICATION_CREATED', { synthetic: true, demo: true, uploadedSlip: true, serviceId, officeId, ackNo: ack }, `${receivedOn}T09:00:00Z`);
  }

  const mainOfficeRows = Array.from({ length: 15 }, (_, i) => {
    const id = `demo-gj-main-${String(i + 1).padStart(2, '0')}`;
    const ack = `GJ-DEMO-${String(7001 + i)}`;
    const receivedOn = `2026-06-${String(8 + (i % 9)).padStart(2, '0')}`;
    const alias = i === 0 ? '9876500001' : `gj-main-${i + 1}`;
    const reasonCode = ['AWAITING_VERIFICATION', 'FILE_MOVEMENT', 'OFFICER_VACANCY', null][i % 4];
    return [id, ack, 'GJ-income-certificate', 'GJ-ahmedabad-jsk-main', receivedOn, alias, 'PENDING', null, reasonCode];
  });
  for (const [id, ack, serviceId, officeId, receivedOn, alias, status, disposedOn, reasonCode] of mainOfficeRows) {
    const inserted = await pool.query(`INSERT INTO applications (id, ack_no, service_id, office_id, received_on, channel, applicant_alias, language, status, disposed_on, reason_code, created_at)
      VALUES ($1,$2,$3,$4,$5,'paper',$6,'en',$7,$8,$9,$5 || '09:00:00Z') ON CONFLICT (id) DO NOTHING`,
      [id, ack, serviceId, officeId, receivedOn, alias, status, disposedOn, reasonCode]);
    if (inserted.rowCount) await appendAudit(pool, id, 'APPLICATION_CREATED', { synthetic: true, demo: true, mainOfficeDocket: true, serviceId, officeId, ackNo: ack }, `${receivedOn}T09:00:00Z`);
  }
}
