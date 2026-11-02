// Citizen-facing strings in English and Hindi. Officer, Commission and Compiler screens stay English (staff-facing).
// NOTE: Hindi text was written by an AI assistant. Have a native speaker review every string before the demo.
export const STR = {
  en: {
    navCitizen: 'Citizen', navOfficer: 'Officer', navCommission: 'Commission', navCompiler: 'Compiler', signIn: 'Sign in', signOut: 'Sign out', simLab: 'Demo controls', date: 'Date', today: 'Today', howItWorks: 'How it works', features: 'Features', calculator: 'SLA calculator', services: 'Services', getStarted: 'Get started', brandTagline: 'Public service deadline tracker', compliance: 'Source-backed rules · synthetic demo data', slipPlaceholder: 'Service: Income Certificate\nApplication no: MH20261234567\nDate received: 05/10/2026', ackPlaceholder: 'e.g. MH20261234567', registerApplication: 'Register application', readStatusEnglish: 'Read status aloud in English', readStatusHindi: 'Read status aloud in Hindi', appealLetter: 'Appeal letter',
    step1: 'Start clock from slip', photo: 'Photo of slip', reading: 'reading…', paste: 'Paste the slip text',
    sample: 'Load sample slip', readSlip: 'Read slip text', confirmHint: 'Extracted from slip. Please review below.', fillHint: 'Please fill: ',
    service: 'Service', choose: 'Choose…', ackNo: 'Application no.', receivedOn: 'Date received', office: 'Office', language: 'Language',
    start: 'Confirm & start legal clock', myApps: 'My applications', step2: 'Clock and legal rights', selectPrompt: 'Select or register an application to track its legal deadline.',
    due: 'Due date', legalBasis: 'Legal basis', decides: 'Deciding officer', appeal1: 'First appeal', appeal2: 'Second appeal', final: 'State Commission',
    ruleSource: 'Gazette source', dayType: 'Day counting', verifiedBy: 'Verified by',
    pause: 'Office query (pause clock)', resume: 'Query answered (resume clock)',
    draftAppeal: 'One tap: draft appeal to', print: 'Print / save as PDF', send: 'Dispatch appeal (mock)', appealsOnFile: 'Appeals on file',
    logValid: 'Chain valid', logBroken: 'Chain broken', events: 'events recorded', tamperLog: 'Tamper-evident ledger',
    listen: 'Read aloud', dictate: 'Speak slip text', noVoice: 'No voice for this language on this device.', noMic: 'Speech input not supported in this browser.',
    daysLeft: 'DAYS LEFT', daysLate: 'DAYS LATE', online: 'Cloud Sync Live', offline: 'Offline (Buffered)', queued: 'Saved on device, will sync when online', synced: 'synced',
    state_ON_TIME: 'On time', state_AT_RISK: 'At risk', state_BREACHED: 'Deadline missed', state_COMPLETED_ON_TIME: 'Done on time', state_COMPLETED_LATE: 'Done late',
    disclaimer: 'Drafting aid, not legal advice. Rules show their source. Demo data is synthetic.',
    total: 'total', offlineBuffered: 'Saved offline', noActive: 'No tracked applications yet.', registerAbove: 'Add an application above to start tracking.', selectPromptSub: 'Choose an application from the list to see its deadline and rights.', statutoryChain: 'Authority chain', level: 'Level', finalOversight: 'Final oversight', statutoryRegistry: 'Statutory registry', appealUnlocked: 'Deadline missed — appeal available', breachMessage: 'The deadline was missed by', dayWord: 'day(s). You can file an appeal.', statutoryFormat: 'Official format', preDrafted: 'Second appeal prepared in advance', auditProof: 'Tamper-evident record', cryptographicBlocks: 'Audit events', hideAudit: 'Hide audit log', inspectHash: 'Inspect record',
  },
  hi: {
    navCitizen: 'नागरिक', navOfficer: 'अधिकारी', navCommission: 'आयोग', navCompiler: 'नियम सहायक', signIn: 'साइन इन', signOut: 'बाहर निकलें', simLab: 'डेमो नियंत्रण', date: 'तारीख', today: 'आज', howItWorks: 'कैसे काम करता है', features: 'सुविधाएँ', calculator: 'समय-सीमा गणक', services: 'सेवाएँ', getStarted: 'शुरू करें', brandTagline: 'सरकारी सेवा समय-सीमा ट्रैकर', compliance: 'स्रोत सहित नियम · डेमो डेटा', slipPlaceholder: 'सेवा: आय प्रमाण पत्र\nआवेदन क्रमांक: MH20261234567\nप्राप्ति तिथि: 05/10/2026', ackPlaceholder: 'जैसे MH20261234567', registerApplication: 'आवेदन दर्ज करें', readStatusEnglish: 'स्थिति अंग्रेज़ी में सुनें', readStatusHindi: 'स्थिति हिंदी में सुनें', appealLetter: 'अपील पत्र',
    step1: 'पर्ची से समय-सीमा शुरू करें', photo: 'पर्ची की फ़ोटो', reading: 'पढ़ रहे हैं…', paste: 'पर्ची का पाठ यहाँ चिपकाएँ',
    sample: 'नमूना पर्ची लोड करें', readSlip: 'पर्ची पढ़ें', confirmHint: 'पर्ची से पढ़ा गया। कृपया नीचे जाँचें।', fillHint: 'कृपया भरें: ',
    service: 'सेवा', choose: 'चुनें…', ackNo: 'आवेदन क्रमांक', receivedOn: 'आवेदन की तारीख', office: 'कार्यालय', language: 'भाषा',
    start: 'पुष्टि करें और कानूनी घड़ी शुरू करें', myApps: 'मेरे आवेदन', step2: 'घड़ी और कानूनी अधिकार', selectPrompt: 'समय-सीमा देखने के लिए कोई आवेदन चुनें या नया शुरू करें।',
    due: 'देय तिथि', legalBasis: 'कानूनी आधार', decides: 'निर्णय लेने वाले अधिकारी', appeal1: 'पहली अपील', appeal2: 'दूसरी अपील', final: 'राज्य सेवा आयोग',
    ruleSource: 'राजपत्र स्रोत', dayType: 'दिन गणना प्रकार', verifiedBy: 'सत्यापित करने वाले',
    pause: 'कार्यालय ने प्रश्न पूछा (घड़ी रोकें)', resume: 'प्रश्न का उत्तर दिया (घड़ी चालू करें)',
    draftAppeal: 'एक टैप: अपील का मसौदा बनाएँ, प्रति:', print: 'प्रिंट / PDF सहेजें', send: 'अपील भेजें (डेमो)', appealsOnFile: 'दर्ज अपीलें',
    logValid: 'श्रृंखला सत्यापित', logBroken: 'श्रृंखला खंडित', events: 'घटनाएँ दर्ज', tamperLog: 'छेड़छाड़-प्रमाणित बहीखाता',
    listen: 'आवाज़ में सुनें', dictate: 'बोलकर पर्ची लिखें', noVoice: 'इस उपकरण पर इस भाषा की आवाज़ उपलब्ध नहीं है।', noMic: 'इस ब्राउज़र में बोलकर लिखना उपलब्ध नहीं है।',
    daysLeft: 'दिन शेष', daysLate: 'दिन देरी', online: 'क्लाउड सिंक सक्रिय', offline: 'ऑफ़लाइन (सहेजा गया)', queued: 'उपकरण में सुरक्षित, ऑनलाइन होने पर सिंक होगा', synced: 'सिंक हो गया',
    state_ON_TIME: 'समय पर', state_AT_RISK: 'जोखिम में', state_BREACHED: 'समय-सीमा पार', state_COMPLETED_ON_TIME: 'समय पर पूर्ण', state_COMPLETED_LATE: 'देरी से पूर्ण',
    disclaimer: 'यह मसौदा सहायता है, विधिक सलाह नहीं। नियमों का स्रोत दिखाया गया है। डेटा डेमो के लिए है।',
    total: 'कुल', offlineBuffered: 'ऑफ़लाइन सुरक्षित', noActive: 'अभी कोई आवेदन ट्रैक नहीं हो रहा।', registerAbove: 'ट्रैकिंग शुरू करने के लिए ऊपर आवेदन जोड़ें।', selectPromptSub: 'समय-सीमा और अधिकार देखने के लिए सूची से आवेदन चुनें।', statutoryChain: 'अधिकारी क्रम', level: 'स्तर', finalOversight: 'अंतिम निगरानी', statutoryRegistry: 'कानूनी रजिस्ट्री', appealUnlocked: 'समय-सीमा पार — अपील उपलब्ध', breachMessage: 'समय-सीमा पार हुई', dayWord: 'दिन। आप अपील कर सकते हैं।', statutoryFormat: 'आधिकारिक प्रारूप', preDrafted: 'दूसरी अपील पहले से तैयार', auditProof: 'छेड़छाड़-सुरक्षित रिकॉर्ड', cryptographicBlocks: 'ऑडिट घटनाएँ', hideAudit: 'ऑडिट छिपाएँ', inspectHash: 'रिकॉर्ड देखें',
  },
};
export const LANGUAGES = [
  ['en', 'English'], ['hi', 'हिन्दी'], ['as', 'অসমীয়া'], ['bn', 'বাংলা'], ['brx', 'बड़ो'], ['doi', 'डोगरी'],
  ['gu', 'ગુજરાતી'], ['kn', 'ಕನ್ನಡ'], ['ks', 'कॉशुर'], ['kok', 'कोंकणी'], ['mai', 'मैथिली'], ['ml', 'മലയാളം'],
  ['mni', 'মৈতৈলোন্'], ['mr', 'मराठी'], ['ne', 'नेपाली'], ['od', 'ଓଡ଼ିଆ'], ['pa', 'ਪੰਜਾਬੀ'], ['sa', 'संस्कृतम्'],
  ['sat', 'संताली'], ['sd', 'सिन्धी'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['ur', 'اردو']
];
export const t = (lang, key) => STR[lang]?.[key] ?? STR.en[key] ?? key;

export const SERVICE_NAMES_HI = {
  'Income Certificate': 'आय प्रमाण पत्र (Income Certificate)',
  'Agriculturist Certificate': 'किसान प्रमाण पत्र (Agriculturist Certificate)',
  'Landless Labour Certificate': 'भूमिहीन मजदूर प्रमाण पत्र (Landless Labour Certificate)',
  'Caste Certificate': 'जाति प्रमाण पत्र (Caste Certificate)',
  'Residence Certificate': 'निवास प्रमाण पत्र (Residence Certificate)'
};

export function localizedServiceName(name, lang) {
  if (lang === 'hi' && SERVICE_NAMES_HI[name]) {
    return SERVICE_NAMES_HI[name];
  }
  return name;
}

const fmtDate = (iso, lang) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
/** One spoken/readable sentence set describing the clock. Pure function, unit-tested. */
export function clockSummary(lang, { serviceName, clock, nextAppealTo }) {
  const d = fmtDate(clock.dueDate, lang);
  if (lang === 'hi') {
    if (clock.state === 'BREACHED') return `${serviceName}: समय-सीमा ${clock.daysLate} दिन पहले पार हो चुकी है। आप ${nextAppealTo ?? 'संबंधित अधिकारी'} को अपील कर सकते हैं।`;
    if (clock.state === 'COMPLETED_ON_TIME') return `${serviceName}: आवेदन समय पर पूरा हुआ।`;
    if (clock.state === 'COMPLETED_LATE') return `${serviceName}: आवेदन ${clock.daysLate} दिन देरी से पूरा हुआ।`;
    return `${serviceName}: ${t('hi', 'state_' + clock.state)}। ${clock.remaining} दिन बचे हैं। देय तिथि ${d}।`;
  }
  if (clock.state === 'BREACHED') return `${serviceName}: the deadline was missed by ${clock.daysLate} days. You can file an appeal to ${nextAppealTo ?? 'the next officer'}.`;
  if (clock.state === 'COMPLETED_ON_TIME') return `${serviceName}: the application was completed on time.`;
  if (clock.state === 'COMPLETED_LATE') return `${serviceName}: the application was completed ${clock.daysLate} days late.`;
  return `${serviceName}: ${t('en', 'state_' + clock.state)}. ${clock.remaining} days left. Due date ${d}.`;
}
