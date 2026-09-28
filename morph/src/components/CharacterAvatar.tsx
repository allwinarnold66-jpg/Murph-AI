import { useEffect, useState } from 'react';
import type { Status } from '../types';
export function useObjectUrl(blob: Blob) {
  const [url, setUrl] = useState('');
  useEffect(() => { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u); }, [blob]);
  return url;
}
// Subtle CSS-only animation. Real lip-sync (Live2D/Rive/phoneme) can replace this component later.
export default function CharacterAvatar({ image, name, status }: { image: Blob; name: string; status: Status }) {
  const url = useObjectUrl(image);
  const cls = { idle: 'a-idle', listening: 'a-listening', thinking: 'a-thinking', speaking: 'a-speaking', error: 'a-idle' }[status];
  return (
    <div className={`flex h-full w-full items-center justify-center rounded-3xl bg-white/5 p-2 transition-shadow duration-300 ${status === 'speaking' ? 'shadow-[0_0_40px_rgba(139,92,246,.6)]' : ''}`}>
      {url && <img src={url} alt={`Portrait of ${name}`} className={`max-h-full max-w-full rounded-2xl object-contain transition-transform duration-500 ${cls}`} />}
    </div>
  );
}
