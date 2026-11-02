// Browser voice helpers. Availability depends on browser and installed device voices (Hindi voices are often missing on desktop).
// Always feature-detect; the UI must work without voice.
const has = (k) => typeof window !== 'undefined' && k in window;
export const canSpeak = () => has('speechSynthesis');
export const canListen = () => has('SpeechRecognition') || has('webkitSpeechRecognition');
const BCP = { en: 'en-IN', hi: 'hi-IN' };

export function speak(text, lang) {
  if (!canSpeak()) return false;
  const synth = window.speechSynthesis; synth.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = BCP[lang] ?? 'en-IN'; u.rate = 0.92;
  const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang === 'hi' ? 'hi' : 'en'));
  if (lang === 'hi' && !voice) return false; // no Hindi voice installed: tell the user instead of reading Hindi with an English voice
  if (voice) u.voice = voice;
  synth.speak(u); return true;
}
export function listen(lang, onText, onError) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) return false;
  const r = new R(); r.lang = BCP[lang] ?? 'en-IN'; r.interimResults = false; r.maxAlternatives = 1;
  r.onresult = (e) => onText(e.results[0][0].transcript); r.onerror = (e) => onError?.(e.error);
  r.start(); return true;
}
