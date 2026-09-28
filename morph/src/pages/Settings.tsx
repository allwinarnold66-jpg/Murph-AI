import { useState } from 'react';
export default function Settings({ onCleared }: { onCleared: () => void }) {
  const [msg, setMsg] = useState('');
  async function wipe() {
    if (!confirm('Delete ALL characters and conversations from this browser?')) return;
    await new Promise<void>((res) => { const r = indexedDB.deleteDatabase('morph'); r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res(); });
    setMsg('All local data deleted.'); onCleared();
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-2xl bg-white/5 p-4"><h2 className="font-semibold">AI, voice and language</h2><p className="text-sm text-white/60">The Gemini key is configured on the server (server/.env). Voice, speed, pitch and language are set per character: use Edit on the Characters page.</p></div>
      <div className="rounded-2xl bg-white/5 p-4"><h2 className="font-semibold">Storage</h2><p className="mb-2 text-sm text-white/60">Images and chats stay in this browser (IndexedDB).</p><button onClick={wipe} className="rounded-xl bg-red-600/70 px-3 py-2 text-sm hover:bg-red-600">Delete all local data</button>{msg && <p role="status" className="mt-2 text-sm">{msg}</p>}</div>
      <div className="rounded-2xl bg-white/5 p-4"><h2 className="font-semibold">About Morph</h2><p className="text-sm text-white/60">Version 1.0.0 · <a className="underline" href="https://github.com/your-username/morph">GitHub repository</a></p></div>
    </div>
  );
}
