import { useEffect, useRef, useState } from 'react';
import type { Character, Language, VoiceType } from '../types';
import { characterRepository, resizeImage } from '../services/db';
import { getVoices, voiceOutput, voiceOutputSupported } from '../services/voice';
import { useObjectUrl } from './CharacterAvatar';

const field = 'w-full rounded-xl bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400';
function Preview({ blob, name }: { blob: Blob; name: string }) { const u = useObjectUrl(blob); return <img src={u} alt={`Preview of ${name || 'character'}`} className="mx-auto max-h-56 rounded-xl object-contain" />; }

export default function CharacterForm({ existing, onClose, onSaved }: { existing?: Character; onClose: () => void; onSaved: () => void }) {
  const [image, setImage] = useState<Blob | undefined>(existing?.image);
  const [name, setName] = useState(existing?.name ?? '');
  const [personality, setPersonality] = useState(existing?.personality ?? '');
  const [voiceType, setVoiceType] = useState<VoiceType>(existing?.voiceType ?? 'female');
  const [language, setLanguage] = useState<Language>(existing?.language ?? 'auto');
  const [voiceURI, setVoiceURI] = useState(existing?.voiceURI ?? '');
  const [rate, setRate] = useState(existing?.rate ?? 1);
  const [pitch, setPitch] = useState(existing?.pitch ?? 1);
  const [voices, setVoices] = useState(getVoices());
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!voiceOutputSupported) return;
    const f = () => setVoices(getVoices());
    speechSynthesis.addEventListener('voiceschanged', f);
    return () => speechSynthesis.removeEventListener('voiceschanged', f);
  }, []);

  async function pick(f?: File) { if (!f) return; try { setImage(await resizeImage(f)); setError(''); } catch (e: any) { setError(e.message); } }
  const draft = () => ({ voiceType, voiceURI: voiceURI || undefined, language, rate, pitch });
  async function save() {
    if (!image) return setError('Please choose an image.');
    if (!name.trim()) return setError('Please give your character a name.');
    try {
      const c: Character = { id: existing?.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? Date.now(), name: name.trim(), personality: personality.trim(), image, ...draft() };
      await (existing ? characterRepository.updateCharacter(c) : characterRepository.createCharacter(c));
      onSaved();
    } catch { setError('Could not save to browser storage.'); }
  }
  return (
    <div role="dialog" aria-modal="true" aria-label={existing ? 'Edit character' : 'Add new character'} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-3xl bg-[#15152a] p-5">
        <h2 className="text-xl font-semibold">{existing ? 'Edit character' : 'Add new character'}</h2>
        {image && <Preview blob={image} name={name} />}
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <button onClick={() => file.current?.click()} className="w-full rounded-xl border border-dashed border-white/30 py-2 hover:bg-white/10">{image ? 'Change image' : 'Upload image'}</button>
        <label className="block text-sm">Character name<input className={field} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm">Personality<textarea className={field} rows={3} value={personality} placeholder="You are a friendly professor who explains difficult concepts with simple examples." onChange={(e) => setPersonality(e.target.value)} /></label>
        <fieldset className="text-sm"><legend>Voice</legend>{(['male', 'female'] as const).map((v) => <label key={v} className="mr-4"><input type="radio" checked={voiceType === v} onChange={() => setVoiceType(v)} /> {v === 'male' ? 'Male' : 'Female'} voice</label>)}</fieldset>
        <fieldset className="text-sm"><legend>Language</legend>{(['auto', 'en', 'ta'] as const).map((v) => <label key={v} className="mr-4"><input type="radio" checked={language === v} onChange={() => setLanguage(v)} /> {v === 'auto' ? 'Auto' : v === 'en' ? 'English' : 'Tamil'}</label>)}</fieldset>
        <label className="block text-sm">Browser voice (optional)<select className={field} value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}><option value="">Automatic</option>{voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}</select></label>
        <label className="block text-sm">Speed {rate}<input type="range" min={0.5} max={1.5} step={0.25} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full" /></label>
        <label className="block text-sm">Pitch {pitch}<input type="range" min={0.5} max={1.5} step={0.25} value={pitch} onChange={(e) => setPitch(+e.target.value)} className="w-full" /></label>
        <button onClick={() => voiceOutput.speak(language === 'ta' ? 'வணக்கம், நான் உங்கள் கதாபாத்திரம்.' : `Hello, I am ${name || 'your character'}.`, draft(), () => {}, () => {})} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Test voice</button>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2 hover:bg-white/10">Cancel</button><button onClick={save} className="rounded-xl bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500">{existing ? 'Save' : 'Create Character'}</button></div>
      </div>
    </div>
  );
}
