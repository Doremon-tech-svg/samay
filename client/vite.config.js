import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA: app shell precached by Workbox; registry/applications API GETs use NetworkFirst with a cache fallback so the helper
// screen still opens and lists last-seen data offline. Writes made offline go through src/offlineQueue.js.
// Demo caveat: cached API responses are keyed by URL, not by the x-demo-date header, so cached clocks can look stale after time-travel.
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'SAMAY: service guarantee engine', short_name: 'SAMAY', description: 'Legal clocks and one-tap appeals for public service deadlines',
      theme_color: '#14284b', background_color: '#f4f6fa', display: 'standalone', start_url: '/',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
    },
    workbox: {
      navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api/],
      runtimeCaching: [{
        urlPattern: ({ url, request }) => request.method === 'GET' && /^\/api\/(registry|applications|audit)/.test(url.pathname),
        handler: 'NetworkFirst', options: { cacheName: 'samay-api', networkTimeoutSeconds: 4, expiration: { maxEntries: 80, maxAgeSeconds: 7 * 86400 } },
      }],
    },
  })],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
