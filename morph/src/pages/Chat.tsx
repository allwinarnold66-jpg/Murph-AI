import { useEffect, useRef, useState } from 'react';
import type { Character, ChatMsg, Status } from '../types';
import { characterRepository, chatRepository } from '../services/db';
import { sendMessage } from '../services/api';
import { VoiceInputService, voiceInputSupported, voiceOutput } from '../services/voice';
import CharacterAvatar from '../components/CharacterAvatar';

const label: Record<Status, string> = { idle: 'Ready', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...', error: 'Something went wrong' };
const input = new VoiceInputService();

export default function Chat({ characterId, pickCharacter }: { characterId: string | null; pickCharacter: () => void }) {
  const [c, setC] = useState<Character | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const msgsRef = useRef<ChatMsg[]>([]);
  msgsRef.current = msgs;

  useEffect(() => {
    voiceOutput.stop(); setStatus('idle'); setErr('');
    if (!characterId) { setC(null); return; }
    Promise.all([characterRepository.getCharacter(characterId), chatRepository.get(characterId)]).then(([ch, m]) => { setC(ch ?? null); setMsgs(m); }).catch(() => setErr('Could not read browser storage.'));
    return () => { voiceOutput.stop(); input.stopListening(); };
  }, [characterId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, status]);

  async function ask(q: string) {
    if (!c || !q.trim() || status === 'thinking') return;
    setErr(''); voiceOutput.stop();
    const history = msgsRef.current; const withUser = [...history, { role: 'user' as const, content: q.trim() }];
    setMsgs(withUser); setStatus('thinking');
    try {
      const reply = await sendMessage({ name: c.name, personality: c.personality }, history, q);
      const all = [...withUser, { role: 'assistant' as const, content: reply }];
      setMsgs(all); chatRepository.save(c.id, all).catch(() => setErr('Could not save the conversation.'));
      setStatus('speaking');
      voiceOutput.speak(reply, c, () => setStatus('speaking'), () => setStatus('idle'));
    } catch (e: any) { setErr(e.message); setStatus('error'); }
  }
  function mic() {
    if (status === 'listening') return input.stopListening();
    setErr(''); voiceOutput.stop(); setStatus('listening');
    let got = false;
    input.startListening(c!.language, (t) => { got = true; ask(t); }, () => { if (!got) setStatus('idle'); }, (m) => { setErr(m); setStatus('error'); });
  }
  async function clear() { if (c && confirm('Clear this conversation?')) { await chatRepository.clear(c.id); setMsgs([]); } }

  if (!characterId || !c) return <div className="py-20 text-center"><p className="mb-4 text-white/70">{characterId ? 'Loading...' : 'Choose a character to start.'}</p><button onClick={pickCharacter} className="rounded-xl bg-violet-600 px-4 py-2 hover:bg-violet-500">Go to Characters</button></div>;
  return (
    <div className="grid gap-4 md:h-[calc(100vh-7rem)] md:grid-cols-2">
      <section className="flex flex-col items-center gap-2">
        <div className="h-72 w-full md:h-auto md:flex-1"><CharacterAvatar image={c.image} name={c.name} status={status} /></div>
        <h2 className="text-xl font-semibold">{c.name}</h2>
        <p aria-live="polite" className="text-sm text-violet-300">● {label[status]}</p>
        <button onClick={mic} disabled={!voiceInputSupported} aria-label={status === 'listening' ? 'Stop voice input' : 'Start voice input'} className={`h-16 w-16 rounded-full text-2xl ${status === 'listening' ? 'animate-pulse bg-red-500' : 'bg-violet-600 hover:bg-violet-500'} disabled:opacity-40`}>🎤</button>
        <p className="text-xs text-white/50">{voiceInputSupported ? 'Tap to speak' : 'Voice input is not supported in this browser. Please use a supported browser or type your question.'}</p>
      </section>
      <section className="flex min-h-[24rem] flex-col rounded-3xl bg-white/5 p-3">
        <div className="mb-2 flex justify-end"><button onClick={clear} className="text-xs text-white/50 hover:text-white">Clear Conversation</button></div>
        <div className="flex-1 space-y-2 overflow-y-auto" aria-live="polite">
          {msgs.length === 0 && <p className="mt-10 text-center text-white/50">Start a conversation with your character.</p>}
          {msgs.map((m, i) => <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-violet-600' : 'bg-white/10'}`}><b className="block text-xs opacity-60">{m.role === 'user' ? 'You' : c.name}</b>{m.content}</div>)}
          {status === 'thinking' && <div className="flex gap-1 px-3" aria-label="Thinking">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 rounded-full bg-white" style={{ animation: `dots 1.2s ${d * 0.2}s infinite` }} />)}</div>}
          <div ref={end} />
        </div>
        {err && <p role="alert" className="py-1 text-sm text-red-400">{err}</p>}
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); const q = text; setText(''); ask(q); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything..." aria-label="Type your question" className="flex-1 rounded-xl bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400" />
          <button disabled={!text.trim()} className="rounded-xl bg-violet-600 px-4 hover:bg-violet-500 disabled:opacity-40">Send</button>
        </form>
      </section>
    </div>
  );
}
