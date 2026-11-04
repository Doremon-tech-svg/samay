export const DEMO_SLIP_BANK = {
  'gj-income-true': {
    key: 'gj-income-true', label: 'Gujarat Income Certificate — accepted', documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: { acknowledgementNumber: 'GJ20263412098', applicationDate: '2026-06-15', serviceName: 'Income Certificate', issuingDepartment: 'Revenue Department', issuingJurisdiction: 'Gujarat', applicantName: 'Patel Rajeshbhai', officeName: 'Ahmedabad Jan Seva Kendra' },
    warnings: ['Demo proxy matched the uploaded specimen to the Gujarat Digital Seva Setu fixture.'], valid: true
  },
  'tn-community-true': {
    key: 'tn-community-true', label: 'Tamil Nadu Community Certificate — accepted', documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: { acknowledgementNumber: 'TN20264589201', applicationDate: '2026-11-02', serviceName: 'Community Certificate', issuingDepartment: 'Revenue Department', issuingJurisdiction: 'Tamil Nadu', applicantName: 'Arun Prakash', officeName: 'Chennai e-Sevai Revenue Centre' },
    warnings: ['Demo proxy matched the uploaded specimen to the Tamil Nadu e-Sevai fixture.'], valid: true
  },
  'mh-caste-true': {
    key: 'mh-caste-true', label: 'Maharashtra Caste Certificate — accepted', documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: { acknowledgementNumber: 'MH202610843905', applicationDate: '2026-05-13', serviceName: 'Caste Certificate', issuingDepartment: 'Revenue Department', issuingJurisdiction: 'Maharashtra', applicantName: 'Chaudhari Amit Manoj', officeName: 'Pune Aaple Sarkar Seva Kendra' },
    warnings: ['Demo proxy matched the uploaded specimen to the Maharashtra Aaple Sarkar fixture.'], valid: true
  },
  'up-income-false': {
    key: 'up-income-false', label: 'Uttar Pradesh Income Certificate — rejected specimen', documentType: 'ACKNOWLEDGEMENT_SLIP',
    fields: { acknowledgementNumber: 'UPD202600784512', applicationDate: '2026-11-02', serviceName: 'Income Certificate', issuingDepartment: 'Revenue Department', issuingJurisdiction: 'Uttar Pradesh', applicantName: 'Rahul Kumar', officeName: 'Lucknow e-Sathi Revenue Desk' },
    warnings: ['Demo proxy rejected this acknowledgement number: the printed 15-day expectation conflicts with the official 20-day eDistrict service rule.', 'This is an intentional negative specimen for the judge walkthrough.'], valid: false
  }
};

export const DEMO_SLIP_LIBRARY = Object.values(DEMO_SLIP_BANK).map((slip) => ({ key: slip.key, label: slip.label, valid: slip.valid, summary: slip.valid ? 'Accepted by mock verification proxy' : 'Rejected by mock verification proxy' }));

export function detectDemoSlipKey(value = '') {
  const text = String(value || '').toLowerCase();
  if (!text) return null;
  if (text.includes('screenshotfrom2026-11-0214-40-20') || text.includes('upd202600784512') || text.includes('up-income')) return 'up-income-false';
  if (text.includes('whatsappimage2026-11-02at15.24.32') || text.includes('gj20263412098') || text.includes('gj-income')) return 'gj-income-true';
  if (text.includes('whatsappimage2026-11-02at15.22.23') || text.includes('tn20264589201') || text.includes('tn-community')) return 'tn-community-true';
  if (text.includes('whatsappimage2026-11-02at15.11.23') || text.includes('mh202610843905') || text.includes('mh-caste')) return 'mh-caste-true';
  if (text.includes('fake') || text.includes('mismatch') || text.includes('reject')) return 'up-income-false';
  return null;
}

export function getDemoSlipResult(key) {
  const slip = DEMO_SLIP_BANK[key];
  if (!slip) return null;
  return {
    documentType: slip.documentType,
    verificationStatus: slip.valid ? 'ACCEPTED_DEMO_MATCH' : 'REJECTED_DEMO_MISMATCH',
    fields: { ...slip.fields, ackNo: slip.fields.acknowledgementNumber, receivedOn: slip.fields.applicationDate, serviceId: null },
    missingFields: [], warnings: slip.warnings ?? [], provider: 'demo-proxy', valid: slip.valid, fixtureKey: slip.key
  };
}
