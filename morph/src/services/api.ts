import type { ChatMsg } from '../types';
// The browser only talks to our backend; Gemini is called server-side.
export async function sendMessage(character: { name: string; personality: string }, messages: ChatMsg[], userMessage: string): Promise<string> {
  if (!userMessage.trim()) throw new Error('Please type or say something first.');
  let r: Response;
  try { r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ character, messages, userMessage }) }); }
  catch { throw new Error("Sorry, I couldn't reach the Morph server. Please try again."); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Sorry, I couldn't connect to Morph AI. Please try again.");
  return data.message as string;
}
