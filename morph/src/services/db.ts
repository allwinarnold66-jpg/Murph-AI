import type { Character, ChatMsg } from '../types';
// IndexedDB persistence: characters (with image Blob) and per-character chat history.
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('morph', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('characters', { keyPath: 'id' }); r.result.createObjectStore('chats', { keyPath: 'characterId' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => { const rq = fn(db.transaction(store, mode).objectStore(store)); rq.onsuccess = () => res(rq.result as T); rq.onerror = () => rej(rq.error); });
}
export const chatRepository = {
  async get(id: string): Promise<ChatMsg[]> { return (await run<{ messages: ChatMsg[] } | undefined>('chats', 'readonly', (s) => s.get(id)))?.messages ?? []; },
  save: (id: string, messages: ChatMsg[]) => run('chats', 'readwrite', (s) => s.put({ characterId: id, messages })),
  clear: (id: string) => run('chats', 'readwrite', (s) => s.delete(id)),
};
export const characterRepository = {
  createCharacter: (c: Character) => run<IDBValidKey>('characters', 'readwrite', (s) => s.add(c)),
  updateCharacter: (c: Character) => run<IDBValidKey>('characters', 'readwrite', (s) => s.put(c)),
  getCharacter: (id: string) => run<Character | undefined>('characters', 'readonly', (s) => s.get(id)),
  getCharacters: async () => (await run<Character[]>('characters', 'readonly', (s) => s.getAll())).sort((a, b) => a.createdAt - b.createdAt),
  async deleteCharacter(id: string) { await run('characters', 'readwrite', (s) => s.delete(id)); await chatRepository.clear(id); },
};
export async function resizeImage(file: File, max = 1024): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Please choose a JPG, PNG or WEBP image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image is larger than 10 MB.');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('This image could not be read.'); });
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Image processing failed.'))), 'image/jpeg', 0.92));
}
