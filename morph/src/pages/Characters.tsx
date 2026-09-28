import { useEffect, useState } from 'react';
import type { Character } from '../types';
import { characterRepository } from '../services/db';
import CharacterForm from '../components/CharacterForm';
import { useObjectUrl } from '../components/CharacterAvatar';

function Card({ c, onTalk, onEdit, onDelete }: { c: Character; onTalk: () => void; onEdit: () => void; onDelete: () => void }) {
  const u = useObjectUrl(c.image);
  return (
    <div className="flex flex-col rounded-3xl bg-white/5 p-3 transition hover:-translate-y-1 hover:bg-white/10">
      <div className="flex h-48 items-center justify-center">{u && <img src={u} alt={`Portrait of ${c.name}`} className="max-h-full max-w-full rounded-xl object-contain" />}</div>
      <h3 className="mt-2 text-lg font-semibold">{c.name}</h3>
      <p className="text-xs text-violet-300">{c.voiceType === 'male' ? 'Male' : 'Female'} voice</p>
      <p className="mb-3 line-clamp-2 text-sm text-white/60">{c.personality || 'Friendly and helpful'}</p>
      <div className="mt-auto flex gap-2 text-sm"><button onClick={onTalk} className="flex-1 rounded-lg bg-violet-600 py-1.5 hover:bg-violet-500">Talk Now</button><button onClick={onEdit} className="rounded-lg bg-white/10 px-3 hover:bg-white/20">Edit</button><button onClick={onDelete} className="rounded-lg bg-white/10 px-3 hover:bg-red-500/60">Delete</button></div>
    </div>
  );
}
export default function Characters({ onTalk, onChanged }: { onTalk: (id: string) => void; onChanged: (deletedId?: string) => void }) {
  const [list, setList] = useState<Character[]>([]);
  const [form, setForm] = useState<{ open: boolean; c?: Character }>({ open: false });
  const [error, setError] = useState('');
  const load = () => characterRepository.getCharacters().then(setList).catch(() => setError('Could not read browser storage.'));
  useEffect(() => { load(); }, []);
  async function del(c: Character) { if (!confirm(`Delete "${c.name}"? Their conversation will be removed too.`)) return; await characterRepository.deleteCharacter(c.id); onChanged(c.id); load(); }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">My Characters</h1><button onClick={() => setForm({ open: true })} className="rounded-xl bg-violet-600 px-4 py-2 font-medium hover:bg-violet-500">+ Add Character</button></div>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      {list.length === 0 && !error && <div className="rounded-3xl bg-white/5 p-10 text-center"><p className="text-lg">No characters yet.</p><p className="text-white/60">Create your first AI character.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <Card key={c.id} c={c} onTalk={() => onTalk(c.id)} onEdit={() => setForm({ open: true, c })} onDelete={() => del(c)} />)}</div>
      {form.open && <CharacterForm existing={form.c} onClose={() => setForm({ open: false })} onSaved={() => { setForm({ open: false }); load(); onChanged(); }} />}
    </div>
  );
}
