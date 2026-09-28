export interface HistoryItem { role: 'user' | 'assistant'; content: string }
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function buildSystemPrompt(name: string, personality: string) {
  return `You are Morph, an interactive AI character.
Your character name is ${name}.
Your personality is: ${personality || 'friendly and helpful'}
You are having a natural voice conversation, so keep answers concise and speakable (no markdown, no emojis).
LANGUAGE RULE: reply in the language the user used. English -> English. Tamil -> Tamil. Tanglish or mixed Tamil-English -> natural Tanglish in the same style. Do not translate the question.
For technical questions explain clearly with simple examples. For casual talk sound natural, not robotic.
Remember earlier messages. Never claim to be a real human; you are an AI character inside the Morph application.`;
}

export async function generateReply(name: string, personality: string, history: HistoryItem[], userMessage: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') throw Object.assign(new Error('Server is missing GEMINI_API_KEY'), { status: 500 });
  const contents = [...history, { role: 'user' as const, content: userMessage }].map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: buildSystemPrompt(name, personality) }] }, contents }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) { console.error('Gemini error', r.status, await r.text()); throw Object.assign(new Error('AI service error'), { status: 502 }); }
  const data: any = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim();
  if (!text) throw Object.assign(new Error('Empty AI response'), { status: 502 });
  return text as string;
}
