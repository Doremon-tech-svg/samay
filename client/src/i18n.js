// Citizen-facing strings in English and Hindi. Officer, Commission and Compiler screens stay English (staff-facing).
// NOTE: Hindi text was written by an AI assistant. Have a native speaker review every string before the demo.
export const STR = {
  en: {
    step1: '1. Start a clock from the slip', photo: '📷 Photo of slip', reading: 'reading…', paste: '…or paste the slip text',
    sample: 'Use sample slip', readSlip: 'Read slip', confirmHint: 'Read from slip. Please confirm below.', fillHint: 'Please fill: ',
    service: 'Service', choose: 'Choose…', ackNo: 'Application no.', receivedOn: 'Date received', office: 'Office', language: 'Language',
    start: 'Confirm and start legal clock', myApps: 'My applications', step2: '2. Clock and rights', selectPrompt: 'Select or start an application.',
    due: 'Due', legalBasis: 'Legal basis', decides: 'Decides', appeal1: 'Appeal 1', appeal2: 'Appeal 2', final: 'Final',
    ruleSource: 'Rule source', dayType: 'Day type', verifiedBy: 'Verified by',
    pause: 'Office raised a query (pause clock)', resume: 'Office query answered (resume clock)',
    draftAppeal: 'One tap: draft appeal to', print: 'Print / save as PDF', send: 'Send (mock)', appealsOnFile: 'Appeals on file',
    logValid: '✓ chain valid', logBroken: '✗ chain broken', events: 'events', tamperLog: 'Tamper-evident log',
    listen: '🔊 Read aloud', dictate: '🎤 Speak slip text', noVoice: 'No voice for this language on this device.', noMic: 'Speech input not supported in this browser.',
    daysLeft: 'DAYS LEFT', daysLate: 'DAYS LATE', online: 'Online', offline: 'Offline', queued: 'saved on this device, will sync when online', synced: 'synced',
    state_ON_TIME: 'On time', state_AT_RISK: 'At risk', state_BREACHED: 'Deadline missed', state_COMPLETED_ON_TIME: 'Done on time', state_COMPLETED_LATE: 'Done late',
    disclaimer: 'Drafting aid, not legal advice. Rules are human-approved with their source shown. Demo data is synthetic.',
  },
  hi: {
    step1: '1. पर्ची से समय-सीमा शुरू करें', photo: '📷 पर्ची की फ़ोटो', reading: 'पढ़ रहे हैं…', paste: '…या पर्ची का पाठ यहाँ चिपकाएँ',
    sample: 'नमूना पर्ची', readSlip: 'पर्ची पढ़ें', confirmHint: 'पर्ची से पढ़ा गया। कृपया नीचे जाँचें।', fillHint: 'कृपया भरें: ',
    service: 'सेवा', choose: 'चुनें…', ackNo: 'आवेदन क्रमांक', receivedOn: 'आवेदन की तारीख', office: 'कार्यालय', language: 'भाषा',
    start: 'पुष्टि करें और कानूनी घड़ी शुरू करें', myApps: 'मेरे आवेदन', step2: '2. घड़ी और अधिकार', selectPrompt: 'कोई आवेदन चुनें या नया शुरू करें।',
    due: 'देय तिथि', legalBasis: 'कानूनी आधार', decides: 'निर्णय लेने वाले', appeal1: 'पहली अपील', appeal2: 'दूसरी अपील', final: 'अंतिम अपील',
    ruleSource: 'नियम का स्रोत', dayType: 'दिन का प्रकार', verifiedBy: 'सत्यापित करने वाले',
    pause: 'कार्यालय ने प्रश्न पूछा (घड़ी रोकें)', resume: 'प्रश्न का उत्तर दे दिया (घड़ी चालू करें)',
    draftAppeal: 'एक टैप: अपील का मसौदा बनाएँ, प्रति:', print: 'प्रिंट / PDF सहेजें', send: 'भेजें (डेमो)', appealsOnFile: 'दर्ज अपीलें',
    logValid: '✓ श्रृंखला सही', logBroken: '✗ श्रृंखला टूटी', events: 'घटनाएँ', tamperLog: 'छेड़छाड़-प्रमाणित लॉग',
    listen: '🔊 सुनें', dictate: '🎤 बोलकर पर्ची लिखें', noVoice: 'इस उपकरण पर इस भाषा की आवाज़ उपलब्ध नहीं है।', noMic: 'इस ब्राउज़र में बोलकर लिखना उपलब्ध नहीं है।',
    daysLeft: 'दिन बचे', daysLate: 'दिन देरी', online: 'ऑनलाइन', offline: 'ऑफ़लाइन', queued: 'इस उपकरण में सहेजा गया, ऑनलाइन होने पर सिंक होगा', synced: 'सिंक हो गया',
    state_ON_TIME: 'समय पर', state_AT_RISK: 'जोखिम में', state_BREACHED: 'समय-सीमा पार', state_COMPLETED_ON_TIME: 'समय पर पूर्ण', state_COMPLETED_LATE: 'देरी से पूर्ण',
    disclaimer: 'यह मसौदा-सहायक है, कानूनी सलाह नहीं। नियम मानव-स्वीकृत हैं और स्रोत दिखाया गया है। डेमो डेटा काल्पनिक है।',
  },
};
export const t = (lang, key) => STR[lang]?.[key] ?? STR.en[key] ?? key;

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
