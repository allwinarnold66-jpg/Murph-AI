import { Router } from 'express';
import { generateReply } from '../services/geminiService';
const router = Router();
router.post('/', async (req, res, next) => {
  try {
    const { character, messages, userMessage } = req.body ?? {};
    if (typeof userMessage !== 'string' || !userMessage.trim()) return res.status(400).json({ error: 'Message is empty.' });
    if (!character || typeof character.name !== 'string') return res.status(400).json({ error: 'Invalid character.' });
    const history = Array.isArray(messages) ? messages.slice(-20).filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string') : [];
    const message = await generateReply(String(character.name).slice(0, 60), String(character.personality ?? '').slice(0, 1000), history, userMessage.trim().slice(0, 2000));
    res.json({ message, language: /[\u0B80-\u0BFF]/.test(message) ? 'ta' : 'en' });
  } catch (e) { next(e); }
});
export default router;
