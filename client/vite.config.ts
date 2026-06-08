import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// During local dev, /api is proxied to the .NET API so the browser
// never hits CORS. In production the client talks to VITE_API_URL.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Ensure a single React instance so deps (e.g. Radix UI) never pull in a
    // second copy — otherwise hooks fail with "Invalid hook call".
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Pre-bundle these at startup so importing them mid-session (e.g. the
    // Checkbox used by the reference-image panel) doesn't trigger a disruptive
    // on-the-fly dep re-optimization + reload.
    include: ['lucide-react', '@radix-ui/react-checkbox', '@radix-ui/react-slot'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
});
