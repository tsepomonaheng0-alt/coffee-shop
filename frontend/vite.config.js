import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to the Vite server, which forwards /api/* to the
// Express backend (so there are no CORS problems and VITE_API_URL can stay empty).
const backend = process.env.VITE_DEV_API || 'http://localhost:4000';
const proxy = { '/api': { target: backend, changeOrigin: true } };

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
