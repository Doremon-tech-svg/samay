// Citizen-facing strings in English and Hindi. Officer, Commission and Compiler screens stay English (staff-facing).
// NOTE: Hindi text was written by an AI assistant. Have a native speaker review every string before the demo.
export const STR = {
  en: {
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
    disclaimer: 'Drafting aid, not legal advice. Rules are human-approved with statutory sources shown. Demo data is synthetic.',
  },
  hi: {
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
    disclaimer: 'यह कानूनी सहायता मसौदा है, विधिक सलाह नहीं। नियम प्रमाणित स्रोतों के साथ मानव-सत्यापित हैं। डेटा काल्पनिक है।',
  },
};
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
