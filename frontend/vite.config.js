import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The service worker (and so the install prompt) is normally build-only.
      // run.bat sets VITE_PWA_DEV=true so a `npm run dev` demo is installable
      // on a phone; leave it unset for day-to-day work to avoid stale caches.
      devOptions: { enabled: process.env.VITE_PWA_DEV === 'true' },
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'mask-icon.svg', 'sentinel.svg'],
      manifest: {
        name: 'Sentinel Public Safety Platform',
        short_name: 'Sentinel',
        description: 'AI-Powered Citizen Incident Reporting & Dispatcher Dashboard',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: ['src/tests/**/*.{test,spec}.{js,jsx}'],
  },
  server: {
    port: 5173,
    // Allows the cloudflared quick-tunnel hostname (random per run) through
    // Vite's dev-server host check when sharing a showcase link.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      // Uploaded evidence is served by the backend, not by Vite. Without this the
      // dispatcher's <img> tags 404 in development.
      '/media_uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
});
