export const DEMO_SLIP_BANK = {
  'mh-income-true': {
    key: 'mh-income-true',
    label: 'MH Income Certificate (genuine)',
    documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: {
      acknowledgementNumber: 'MH202610843905',
      applicationDate: '2026-05-13',
      serviceName: 'Income Certificate',
      issuingDepartment: 'Revenue Department',
      issuingJurisdiction: 'Maharashtra',
      applicantName: 'Amit Manoj Chaudhari',
      officeName: 'Tehsildar Office, Pune'
    },
    warnings: [],
    valid: true
  },
  'tn-community-true': {
    key: 'tn-community-true',
    label: 'TN Community Certificate (genuine)',
    documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: {
      acknowledgementNumber: 'TN20264589201',
      applicationDate: '2026-11-02',
      serviceName: 'Community Certificate',
      issuingDepartment: 'Revenue Department',
      issuingJurisdiction: 'Tamil Nadu',
      applicantName: 'Arun Prakash',
      officeName: 'Taluk Office, Chennai'
    },
    warnings: [],
    valid: true
  },
  'gj-income-true': {
    key: 'gj-income-true',
    label: 'GJ Income Certificate (genuine)',
    documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: {
      acknowledgementNumber: 'GJ20263412098',
      applicationDate: '2026-06-15',
      serviceName: 'Income Certificate',
      issuingDepartment: 'Revenue Department',
      issuingJurisdiction: 'Gujarat',
      applicantName: 'Patel Rajeshbhai',
      officeName: 'District Office, Ahmedabad'
    },
    warnings: [],
    valid: true
  },
  'fake-mismatch': {
    key: 'fake-mismatch',
    label: 'Fake or mismatched specimen',
    documentType: 'UNCLEAR',
    fields: {
      acknowledgementNumber: null,
      applicationDate: null,
      serviceName: null,
      issuingDepartment: null,
      issuingJurisdiction: null,
      applicantName: null,
      officeName: null
    },
    warnings: ['Mock verification failed: this number does not match any official registry or verified service office.', 'This was deliberately created as a false slip for demo verification.'],
    valid: false
  }
};

export const DEMO_SLIP_LIBRARY = Object.values(DEMO_SLIP_BANK).map((slip) => ({
  key: slip.key,
  label: slip.label,
  valid: slip.valid,
  summary: slip.valid ? 'Verified against the demo registry' : 'Rejected by the demo verification proxy'
}));

export function detectDemoSlipKey(value = '') {
  const text = String(value || '').toLowerCase();
  if (!text) return null;
  if (text.includes('fake') || text.includes('mismatch') || text.includes('reject')) return 'fake-mismatch';
  if (text.includes('mh') && text.includes('income')) return 'mh-income-true';
  if (text.includes('tn') && (text.includes('community') || text.includes('caste'))) return 'tn-community-true';
  if (text.includes('gj') && text.includes('income')) return 'gj-income-true';
  return null;
}

export function getDemoSlipResult(key) {
  const slip = DEMO_SLIP_BANK[key];
  if (!slip) return null;
  return {
    documentType: slip.documentType,
    fields: {
      acknowledgementNumber: slip.fields.acknowledgementNumber,
      applicationDate: slip.fields.applicationDate,
      serviceName: slip.fields.serviceName,
      issuingDepartment: slip.fields.issuingDepartment,
      issuingJurisdiction: slip.fields.issuingJurisdiction,
      applicantName: slip.fields.applicantName,
      officeName: slip.fields.officeName,
      ackNo: slip.fields.acknowledgementNumber,
      receivedOn: slip.fields.applicationDate,
      serviceId: null
    },
    missingFields: slip.documentType === 'ACKNOWLEDGEMENT_SLIP'
      ? []
      : ['acknowledgementNumber', 'applicationDate', 'serviceName'],
    warnings: slip.warnings ?? [],
    provider: 'demo-proxy',
    valid: slip.valid
  };
}
