import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Inoltra le richieste che iniziano con /api al tuo backend
      '/api': {
        target: 'http://localhost:3001', // L'indirizzo del tuo backend
        changeOrigin: true,
      },
    },
  },
});