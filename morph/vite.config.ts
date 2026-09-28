import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Dev: /api is proxied to the Express backend, so the Gemini key never reaches the browser.
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': 'http://localhost:8787' } } });
