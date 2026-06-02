import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local dev, /api is proxied to the .NET API so the browser
// never hits CORS. In production the client talks to VITE_API_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
});
