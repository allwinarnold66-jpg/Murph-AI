# Morph
**Your Character. Your AI.** Upload any image, give it a name, personality and voice, then talk to it. Answers come from Gemini in English, Tamil or Tanglish and are spoken aloud while the character animates.

## Features
Character library (add/edit/delete, unlimited) · images stored in IndexedDB · per-character chat history · mic input (Web Speech API) with text fallback · browser text-to-speech with manual voice, speed and pitch · responsive UI.

## Tech Stack
React, TypeScript, Vite, Tailwind CSS, Node/Express, Gemini API.

## Project Structure
`server/` (Express: routes, services, middleware) and `src/` (components, pages, services, types).

## Local Setup
```
npm install
cp server/.env.example server/.env   # then put your key in server/.env
npm run dev                          # frontend :5173, backend :8787
```
Other scripts: `npm run typecheck`, `npm run build`, `npm start` (backend only).

## Environment Variables
`GEMINI_API_KEY` (required), `GEMINI_MODEL` (optional, default `gemini-2.5-flash`), `PORT` (optional). Set in `server/.env`, which is git-ignored. Get a key at https://aistudio.google.com/apikey

## Voice Support and Browser Compatibility
Speech recognition works in Chrome and Edge (needs internet; Safari partial; Firefox unsupported, so use text input). Speech synthesis works in all major browsers, but the available voices, including Tamil (`ta-IN`), depend on your OS. Browsers expose no reliable voice gender, so Morph uses a name heuristic and lets you choose a voice manually.

## Character Upload
Characters page > + Add Character > choose a JPG/PNG/WEBP (max 10 MB, resized to 1024 px). Images never leave the browser. To use a default image, put it at `public/assets/default-character.jpg` and upload it once. Clearing site data deletes characters.

## GitHub Setup
`git init && git add . && git commit -m "Morph" && git remote add origin <url> && git push -u origin main`. Never commit `.env`.

## Deployment
GitHub Pages cannot hold a secret. Deploy the frontend (`npm run build`, output `dist/`) to Vercel/Netlify/Pages, and the backend (`npm start`, set `GEMINI_API_KEY`) to Render/Railway. In production, serve both under one domain or add a rewrite/proxy for `/api` to the backend.

## Security
The key exists only on the server. Requests are validated and length-limited; errors returned to the browser are generic. Add rate limiting before making the backend public.

## Future Features
Replace `CharacterAvatar` with Live2D/Rive or audio-driven lip-sync; cloud STT/TTS behind `services/voice.ts`; streaming replies; character memory; accounts and sync.
