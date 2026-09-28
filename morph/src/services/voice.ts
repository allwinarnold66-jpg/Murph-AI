import type { Character, Language } from '../types';
const isTamil = (t: string) => /[\u0B80-\u0BFF]/.test(t);
// ---- Voice input (swap for a cloud STT provider later) ----
const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
export const voiceInputSupported = !!SR;
export class VoiceInputService {
  private rec: any = null;
  startListening(lang: Language, onText: (t: string) => void, onEnd: () => void, onError: (m: string) => void) {
    if (!SR) return onError('Voice input is not supported in this browser. Please use a supported browser or type your question.');
    this.rec = new SR(); this.rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN'; this.rec.interimResults = false;
    this.rec.onresult = (e: any) => onText(e.results[0][0].transcript);
    this.rec.onerror = (e: any) => onError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : e.error === 'no-speech' ? "I didn't hear anything. Try again." : 'Speech recognition failed.');
    this.rec.onend = onEnd;
    try { this.rec.start(); } catch { onError('Speech recognition failed.'); }
  }
  stopListening() { try { this.rec?.stop(); } catch { /* already stopped */ } }
}
// ---- Voice output ----
export const voiceOutputSupported = 'speechSynthesis' in window;
export const getVoices = () => (voiceOutputSupported ? speechSynthesis.getVoices() : []);
const HINT = { female: /female|zira|samantha|heera|priya|susan|veena|aria|jenny/i, male: /(?<!fe)male|david|ravi|hemant|mark|guy|daniel/i };
// Browsers expose no gender metadata, so this is a heuristic; the user can always pick a voice manually.
export function pickVoice(c: Pick<Character, 'voiceType' | 'voiceURI'>, lang: 'en' | 'ta') {
  const all = getVoices();
  const saved = all.find((v) => v.voiceURI === c.voiceURI);
  if (saved) return saved;
  const byLang = all.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const pool = byLang.length ? byLang : all;
  return pool.find((v) => v.lang === (lang === 'ta' ? 'ta-IN' : 'en-IN') && HINT[c.voiceType].test(v.name)) || pool.find((v) => HINT[c.voiceType].test(v.name)) || pool[0];
}
export const voiceOutput = {
  speak(text: string, c: Pick<Character, 'voiceType' | 'voiceURI' | 'language' | 'rate' | 'pitch'>, onStart: () => void, onEnd: () => void) {
    if (!voiceOutputSupported) return onEnd();
    speechSynthesis.cancel();
    const lang = c.language === 'auto' ? (isTamil(text) ? 'ta' : 'en') : c.language;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(c, lang); if (v) u.voice = v; u.lang = v?.lang || (lang === 'ta' ? 'ta-IN' : 'en-IN');
    u.rate = c.rate; u.pitch = c.pitch; u.onstart = onStart; u.onend = onEnd; u.onerror = onEnd;
    speechSynthesis.speak(u);
  },
  stop() { if (voiceOutputSupported) speechSynthesis.cancel(); },
  pause() { if (voiceOutputSupported) speechSynthesis.pause(); },
  resume() { if (voiceOutputSupported) speechSynthesis.resume(); },
};
