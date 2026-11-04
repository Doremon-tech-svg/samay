import { readFileSync } from 'node:fs';

const seeded = JSON.parse(readFileSync(new URL('../../data/demoUsers.json', import.meta.url)));
const baseDate = '2026-11-03';
const dayMs = 86_400_000;
const shiftDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);

const departmentRows = [
  ['demo-dept-gujarat-revenue', 'Gujarat Revenue Services', 'GJ', 'Ahmedabad'],
  ['demo-dept-gujarat-citizen', 'Gujarat Citizen Services', 'GJ', 'Surat'],
  ['demo-dept-tamil-revenue', 'Tamil Nadu Revenue Services', 'TN', 'Chennai'],
  ['demo-dept-tamil-welfare', 'Tamil Nadu Social Welfare Services', 'TN', 'Coimbatore'],
  ['demo-dept-maharashtra-revenue', 'Maharashtra Revenue Services', 'MH', 'Pune'],
  ['demo-dept-maharashtra-rural', 'Maharashtra Rural Services', 'MH', 'Nagpur'],
  ['demo-dept-up-revenue', 'Uttar Pradesh Revenue Services', 'UP', 'Lucknow'],
  ['demo-dept-up-welfare', 'Uttar Pradesh Social Welfare Services', 'UP', 'Varanasi'],
  ['demo-dept-karnataka-citizen', 'Karnataka Citizen Services', 'KA', 'Bengaluru'],
  ['demo-dept-odisha-rural', 'Odisha Rural Services', 'OD', 'Bhubaneswar'],
  ['demo-dept-kerala-local', 'Kerala Local Services', 'KL', 'Kochi'],
  ['demo-dept-assam-revenue', 'Assam Revenue Services', 'AS', 'Guwahati'],
];

export const departments = departmentRows.map(([id, name, stateCode, district]) => ({
  id, name, stateCode, district, synthetic: true, demo: true,
}));

// Keep the first 15 existing officer IDs/names stable; their seeded office jurisdictions
// determine these explicit portfolio assignments. All additional profiles are synthetic.
const savedOfficerDepartments = [0, 0, 0, 2, 2, 2, 4, 4, 4, 6, 6, 6, 1, 3, 5];
export const officers = seeded.officers.map((officer, index) => {
  const department = departments[savedOfficerDepartments[index]];
  return {
    id: officer.officerId,
    officerId: officer.officerId,
    name: officer.name,
    departmentId: department.id,
    department: department.name,
    stateCode: officer.state,
    district: officer.district,
    designation: 'Demo service officer',
    synthetic: true,
    demo: true,
    workload: 0,
  };
});
for (const department of departments) {
  const roster = officers.filter((officer) => officer.departmentId === department.id);
  for (let index = roster.length; index < 10; index += 1) {
    const id = `SYN-${String(departments.indexOf(department) + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
    officers.push({
      id, officerId: id, name: `Demo Officer ${departments.indexOf(department) + 1}-${index + 1}`,
      departmentId: department.id, department: department.name, stateCode: department.stateCode,
      district: department.district, designation: 'Demo service officer', synthetic: true, demo: true, workload: 0,
    });
  }
}

export const citizens = seeded.citizens.map((citizen, index) => ({
  id: `demo-citizen-${String(index + 1).padStart(3, '0')}`,
  name: citizen.name, role: 'citizen', tab: 'citizen', state: citizen.state,
  district: citizen.district, officeId: citizen.officeId, slipKey: citizen.slipKey,
  synthetic: true, demo: true,
}));
const addedCitizenNames = [
  'Aarav Shah', 'Meera Iyer', 'Sneha Desai', 'Ravi Kumar', 'Kavita Joshi', 'Naresh Patel',
  'Priya Nair', 'Ashok Verma', 'Sarita Rao', 'Manoj Das', 'Vidya Menon', 'Amol Kulkarni',
  'Puja Singh', 'Ishita Bose', 'Kabir Khan', 'Ananya Roy', 'Dev Malhotra', 'Tara Reddy',
  'Nikhil Sen', 'Leela Thomas', 'Arjun Bhat', 'Maya Sethi', 'Farhan Ali', 'Ritu Sharma',
  'Gopal Mishra', 'Neha Pillai', 'Kiran Ghosh', 'Suman Jha', 'Aditi Rao', 'Vikram Das',
  'Rekha Jain', 'Imran Sheikh', 'Pallavi Patil', 'Sanjay Nair', 'Roshni Dutta', 'Harish Yadav',
  'Nandini Bose', 'Mohan Lal', 'Shalini Roy', 'Prakash Menon', 'Deepa Shah', 'Rohan Gupta',
  'Geeta Devi', 'Jatin Mehta', 'Anita Paul', 'Bharat Joshi', 'Chitra Rao', 'Dinesh Kumar',
  'Esha Nanda', 'Faisal Khan', 'Gauri Iyer', 'Hemant Soni',
];
for (let index = 4; index < 56; index += 1) {
  const department = departments[index % departments.length];
  citizens.push({
    id: `demo-citizen-${String(index + 1).padStart(3, '0')}`,
    name: addedCitizenNames[index - 4], role: 'citizen', tab: 'citizen',
    state: department.stateCode, district: department.district, synthetic: true, demo: true,
  });
}

const serviceNames = [
  'Income Certificate', 'Community Certificate', 'Domicile Certificate', 'Land Record Extract',
  'Agricultural Benefit Registration', 'Pension Eligibility Review', 'Scholarship Benefit Application',
  'Civil Registration Extract', 'Local Trade Permit', 'Public Distribution Card Update',
  'Water Connection Request', 'Disability Assistance Certificate',
];
export const services = departments.map((department, index) => ({
  id: `demo-service-${String(index + 1).padStart(2, '0')}`,
  name: serviceNames[index], departmentId: department.id, department: department.name,
  days: [7, 10, 15, 20][index % 4], status: 'demo', demo_only: true, synthetic: true,
}));

const reasonCodes = ['AWAITING_VERIFICATION', 'OFFICER_VACANCY', 'FILE_MOVEMENT', 'DOCUMENT_REVIEW', 'SYSTEM_BACKLOG', 'FIELD_INSPECTION', null];
export const applications = [];
for (let citizenIndex = 0; citizenIndex < citizens.length; citizenIndex += 1) {
  const caseCount = citizenIndex < 3 ? 3 : 3 + (citizenIndex % 2);
  for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
    const department = departments[(citizenIndex * 3 + caseIndex * 5) % departments.length];
    const service = services[departments.indexOf(department)];
    const roster = officers.filter((officer) => officer.departmentId === department.id);
    const officer = roster[(citizenIndex + caseIndex) % roster.length];
    const disposition = (citizenIndex * 3 + caseIndex * 5) % 10;

    // The demo date is fixed so judges can reproduce each status. Open cases are
    // intentionally spread across on-time, due-soon, and overdue states; closed
    // examples distinguish on-time from late completion.
    let receivedOn;
    if (disposition <= 3) {
      const daysLeft = Math.min(service.days - 1, [5, 8, 10, 12][disposition]);
      receivedOn = shiftDate(baseDate, -(service.days - daysLeft));
    } else if (disposition === 4) receivedOn = shiftDate(baseDate, -(service.days - 2));
    else if (disposition === 5 || disposition === 6) receivedOn = shiftDate(baseDate, -(service.days + (disposition === 5 ? 5 : 9)));
    else receivedOn = `2026-${String(8 + ((citizenIndex + caseIndex) % 3)).padStart(2, '0')}-${String(1 + ((citizenIndex * 7 + caseIndex * 9) % 27)).padStart(2, '0')}`;

    const completed = disposition >= 7;
    const lateCompletion = disposition === 9;
    const dueDate = shiftDate(receivedOn, service.days);
    const disposedOn = completed ? shiftDate(dueDate, lateCompletion ? 3 : -2) : null;
    const applicantAlias = citizens[citizenIndex].name;
    applications.push({
      id: `demo-case-${String(citizenIndex + 1).padStart(3, '0')}-${caseIndex + 1}`,
      reference: `SAMAY-DEMO-${String(citizenIndex + 1).padStart(3, '0')}-${caseIndex + 1}`,
      citizenId: citizens[citizenIndex].id, applicantAlias, applicantName: citizens[citizenIndex].name,
      departmentId: department.id, department: department.name, officeId: department.id,
      office: department.name, district: department.district, serviceId: service.id, service: service.name,
      receivedOn, dueDate, disposedOn, assigned_officer_id: officer.officerId,
      reasonCode: reasonCodes[(citizenIndex + caseIndex) % reasonCodes.length], synthetic: true, demo: true,
    });
    officer.workload += 1;
  }
}

export function getClock(application, asOf = baseDate) {
  if (application.disposedOn) {
    const late = application.disposedOn > application.dueDate;
    return { state: late ? 'COMPLETED_LATE' : 'COMPLETED_ON_TIME', daysLate: late ? 3 : 0 };
  }
  if (asOf > application.dueDate) {
    return { state: 'BREACHED', daysLate: Math.ceil((Date.parse(asOf) - Date.parse(application.dueDate)) / dayMs) };
  }
  const daysLeft = Math.ceil((Date.parse(application.dueDate) - Date.parse(asOf)) / dayMs);
  return { state: daysLeft <= 3 ? 'AT_RISK' : 'ON_TIME', daysLeft, daysLate: 0 };
}
