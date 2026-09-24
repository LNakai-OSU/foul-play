import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = process.env.PORT ?? '3001';

export default defineConfig({
  plugins: [react()],
  server: {
    // Bind IPv4 loopback explicitly: Vite's default "localhost" can resolve to IPv6-only (::1),
    // which makes http://127.0.0.1:9432 (or an IPv4-first browser) refuse the connection.
    host: '127.0.0.1',
    port: 9432,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: false },
    },
  },
  build: { chunkSizeWarningLimit: 1200 },
});
