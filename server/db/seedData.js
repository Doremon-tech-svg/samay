import { readFileSync } from 'node:fs';
import { appendAudit } from '../src/services/auditChain.js';
import { departments, officers, citizens, services, applications } from '../src/services/commissionFixture.js';
const reg = JSON.parse(readFileSync(new URL('../data/registry.json', import.meta.url)));
const demoUsers = JSON.parse(readFileSync(new URL('../data/demoUsers.json', import.meta.url)));

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

// Retained as a compatibility hook for older startup scripts. The former aggregate-only
// cohort used real-looking registry offices and is intentionally no longer generated.
export async function seedSynthetic() { /* replaced by the explicitly synthetic Commission cohort below */ }

// Small named demo set used by the Citizen quick-login. These are synthetic records
// on fictional offices so the demo feels coherent without presenting real people.
async function seedCommissionPortfolio(pool) {
  // Remove only known legacy generator rows and obsolete sample accounts. Keep the
  // three uploaded-slip specimens, user-created applications and all other audit rows.
  const obsolete = (await pool.query(`SELECT id FROM applications WHERE ack_no LIKE 'SYN%'
    OR applicant_alias LIKE 'syn-%' OR id LIKE 'legacy-synthetic-%' OR id LIKE 'demo-gj-main-%'
    OR id LIKE 'demo-aarav-%' OR id LIKE 'demo-meera-%' OR id LIKE 'demo-sneha-%'
    OR id LIKE 'demo-ravi-%' OR id LIKE 'demo-kavita-%' OR id LIKE 'demo-naresh-%'
    OR id LIKE 'demo-priya-%' OR id LIKE 'demo-ashok-%' OR id LIKE 'demo-sarita-%'
    OR id LIKE 'demo-manoj-%' OR id LIKE 'demo-vidya-%' OR id LIKE 'demo-amol-%'
    OR id LIKE 'demo-puja-%'`)).rows.map((row) => row.id);
  for (const id of obsolete) {
    await pool.query('DELETE FROM appeals WHERE application_id = $1', [id]);
    await pool.query('DELETE FROM clock_pauses WHERE application_id = $1', [id]);
    await pool.query('DELETE FROM audit_log WHERE application_id = $1', [id]);
    await pool.query('DELETE FROM applications WHERE id = $1', [id]);
  }

  for (const d of departments) {
    await pool.query(`INSERT INTO synthetic_departments (id,name,state_code,district,synthetic,demo_only)
      VALUES ($1,$2,$3,$4,true,true) ON CONFLICT (id) DO NOTHING`, [d.id,d.name,d.stateCode,d.district]);
    await pool.query(`INSERT INTO offices (id,state_code,district,name,level)
      VALUES ($1,$2,$3,$4,'demo') ON CONFLICT (id) DO NOTHING`, [d.id,d.stateCode,d.district,d.name]);
  }
  for (const c of citizens) {
    await pool.query(`INSERT INTO synthetic_citizens (id,name,state_code,district,synthetic,demo_only)
      VALUES ($1,$2,$3,$4,true,true) ON CONFLICT (id) DO NOTHING`, [c.id,c.name,c.state,c.district]);
  }
  for (const o of officers) {
    await pool.query(`INSERT INTO synthetic_officers (id,department_id,name,synthetic,demo_only)
      VALUES ($1,$2,$3,true,true) ON CONFLICT (id) DO NOTHING`, [o.officerId,o.departmentId,o.name]);
  }
  for (const s of services) {
    const department = departments.find((d) => d.id === s.departmentId);
    await pool.query(`INSERT INTO services (id,state_code,service_key,name,department,days,day_type,status,
      designated_officer,source_doc,demo_only,synthetic) VALUES ($1,$2,$3,$4,$5,$6,'calendar','demo',
      'Synthetic demo roster','Illustrative fixture only',true,true) ON CONFLICT (id) DO NOTHING`,
    [s.id,department?.stateCode || 'MH',s.id,s.name,s.department,s.days]);
  }
  for (const a of applications) {
    const citizen = citizens.find((c) => c.id === a.citizenId);
    const savedAccount = demoUsers.citizens.find((c) => c.name === citizen?.name);
    const applicantAlias = savedAccount?.phone || a.applicantName;
    const inserted = await pool.query(`INSERT INTO applications (id,ack_no,service_id,office_id,received_on,
      channel,applicant_alias,language,status,disposed_on,reason_code,created_at,assigned_officer_id,
      demo_only,synthetic,demo_citizen_id) VALUES ($1,$2,$3,$4,$5,'demo',$6,'en',$7,$8,$9,$10,$11,true,true,$12)
      ON CONFLICT (id) DO NOTHING`,
    [a.id,a.reference,a.serviceId,a.officeId,a.receivedOn,applicantAlias,a.disposedOn ? 'DISPOSED' : 'PENDING',
      a.disposedOn,a.reasonCode,`${a.receivedOn}T09:00:00Z`,a.assigned_officer_id,a.citizenId]);
    if (inserted.rowCount) await appendAudit(pool,a.id,'APPLICATION_CREATED',{
      synthetic:true,demo:true,serviceId:a.serviceId,departmentId:a.departmentId,
      assignedOfficerId:a.assigned_officer_id,demoCitizenId:a.citizenId,ackNo:a.reference
    },`${a.receivedOn}T09:00:00Z`);
  }
}

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
  await seedCommissionPortfolio(pool);
}
