// Appeal drafting is TEMPLATE-FIRST: every legal fact (act, deadline, officer, appeal level) comes from the approved registry record
// and the clock engine. An LLM may translate or polish the text later, but the check in assertFacts() must still pass.
const LEVELS = (s) => [
  { level: 1, to: s.appellate_1 }, { level: 2, to: s.appellate_2 }, { level: 3, to: s.appeal_final },
];
export function nextAppealTarget(service, existingCount) {
  return LEVELS(service).find((l) => l.level === existingCount + 1 && l.to) ?? null; // a level with no authority on record cannot be drafted
}
const T = {
  en: ({ a, s, st, to, level }) => `To,
The ${to}

Subject: ${level === 1 ? 'First' : level === 2 ? 'Second' : 'Third'} appeal for delay in providing a notified service (${s.name}), Application No. ${a.ack_no}

Respected Sir/Madam,

1. I applied for "${s.name}" on ${a.received_on} (Application No. ${a.ack_no}) at ${a.officeName}.
2. Under the ${s.act_name}, this service is notified to be provided within ${s.days} days. The due date was ${st.dueDate}.
3. As of today the application is pending and is ${st.daysLate} day(s) beyond the due date.
4. I request that the application be decided at the earliest, that the reasons for the delay be recorded, and that action under the Act be considered as applicable.

Date: ${a.today}
Applicant reference: ${a.applicant_alias ?? 'on file'}

(Draft prepared by SAMAY from the approved rule record. This is a drafting aid, not legal advice. Please review before sending.)`,
  hi: ({ a, s, st, to, level }) => `सेवा में,
${to}

विषय: अधिसूचित सेवा (${s.name}) में विलंब के संबंध में ${level === 1 ? 'प्रथम' : level === 2 ? 'द्वितीय' : 'तृतीय'} अपील, आवेदन क्रमांक ${a.ack_no}

महोदय/महोदया,

1. मैंने "${s.name}" के लिए दिनांक ${a.received_on} को आवेदन किया था (आवेदन क्रमांक ${a.ack_no}), कार्यालय: ${a.officeName}।
2. ${s.act_name} के अंतर्गत यह सेवा ${s.days} दिनों में उपलब्ध कराई जानी है। देय तिथि ${st.dueDate} थी।
3. आज तक आवेदन लंबित है और देय तिथि से ${st.daysLate} दिन अधिक हो चुके हैं।
4. निवेदन है कि आवेदन का शीघ्र निपटारा किया जाए, विलंब का कारण दर्ज किया जाए तथा अधिनियम के अनुसार उचित कार्रवाई पर विचार किया जाए।

दिनांक: ${a.today}

(यह मसौदा SAMAY द्वारा स्वीकृत नियम-रिकॉर्ड से तैयार किया गया है। यह कानूनी सलाह नहीं है। भेजने से पहले कृपया जाँच लें।)`,
};
export function draftAppeal({ app, service, status, level, to, lang = 'en', today }) {
  const body = (T[lang] ?? T.en)({ a: { ...app, today }, s: service, st: status, to, level });
  assertFacts(body, { app, service, status, to });
  return body;
}
/** Guard: whatever produced the text (template or LLM), it must carry the facts from the rule and clock. */
export function assertFacts(body, { app, service, status, to }) {
  for (const must of [app.ack_no, String(service.days), status.dueDate, to]) {
    if (!body.includes(must)) throw new Error(`appeal text is missing required fact: ${must}`);
  }
}
