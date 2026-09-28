import { useState } from 'react';
import Home from './pages/Home';
import Characters from './pages/Characters';
import Chat from './pages/Chat';
import Settings from './pages/Settings';

type Page = 'home' | 'characters' | 'chat' | 'settings';
const tabs: [Page, string][] = [['home', 'Home'], ['characters', 'Characters'], ['chat', 'Chat'], ['settings', 'Settings']];

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [active, setActive] = useState<string | null>(null);
  const nav = (cls: string) => tabs.map(([p, l]) => <button key={p} onClick={() => setPage(p)} aria-current={page === p ? 'page' : undefined} className={`${cls} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${page === p ? 'bg-violet-600' : 'hover:bg-white/10'}`}>{l}</button>);
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <header className="flex items-center justify-between px-4 py-3"><span className="font-bold tracking-widest text-violet-300">MORPH</span><nav className="hidden gap-1 md:flex" aria-label="Main">{nav('')}</nav></header>
      <main className="mx-auto max-w-6xl px-4 py-2">
        {page === 'home' && <Home go={setPage} />}
        {page === 'characters' && <Characters onTalk={(id) => { setActive(id); setPage('chat'); }} onChanged={(d) => d && d === active && setActive(null)} />}
        {page === 'chat' && <Chat characterId={active} pickCharacter={() => setPage('characters')} />}
        {page === 'settings' && <Settings onCleared={() => setActive(null)} />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around bg-[#15152a] p-2 md:hidden" aria-label="Mobile">{nav('flex-1')}</nav>
    </div>
  );
}
