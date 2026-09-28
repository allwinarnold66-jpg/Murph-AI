import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import chat from './routes/chat';
import { errorHandler } from './middleware/errorHandler';
// The Gemini key lives ONLY in server/.env (git-ignored). Never put it in React code.
dotenv.config({ path: 'server/.env' });
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api/chat', chat);
app.use(errorHandler);
const port = Number(process.env.PORT) || 8787;
app.listen(port, () => console.log(`Morph API on http://localhost:${port}`));
