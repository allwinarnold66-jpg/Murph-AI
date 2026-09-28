const features = [['Voice Conversations', 'Speak and hear replies.'], ['Multilingual AI', 'English, Tamil and Tanglish.'], ['Custom Characters', 'Any image becomes a character.'], ['Personalities', 'You define how they talk.']];
export default function Home({ go }: { go: (p: 'characters' | 'chat') => void }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10 text-center">
      <h1 className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-6xl font-bold tracking-widest text-transparent">MORPH</h1>
      <p className="text-xl">Your Character. Your AI.</p>
      <p className="text-white/70">Turn any image into your own interactive AI character and talk with it using your voice.</p>
      <div className="flex justify-center gap-3"><button onClick={() => go('characters')} className="rounded-xl bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500">Create Character</button><button onClick={() => go('chat')} className="rounded-xl bg-white/10 px-5 py-3 hover:bg-white/20">Try Morph</button></div>
      <div className="grid gap-3 sm:grid-cols-2">{features.map(([t, d]) => <div key={t} className="rounded-2xl bg-white/5 p-4 text-left"><h3 className="font-semibold">{t}</h3><p className="text-sm text-white/60">{d}</p></div>)}</div>
      <p className="text-sm text-white/40">Talk. Think. Connect.</p>
    </div>
  );
}
