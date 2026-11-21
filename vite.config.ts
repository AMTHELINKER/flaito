import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const shared = fileURLToPath(new URL('./src/shared/index.ts', import.meta.url));
const src = fileURLToPath(new URL('./src', import.meta.url));
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:3000';

export default defineConfig({
  resolve: {
    alias: { '@laito/shared': shared, '@': src },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Laito – écrire et partager vos livres',
        short_name: 'Laito',
        description:
          'Un carnet d’écriture calme et élégant pour écrire, garder privé ou partager vos livres.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F3E9D7',
        theme_color: '#3E2A1E',
        categories: ['books', 'productivity', 'education'],
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'laito-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/api/v1/read/') ||
                url.pathname.startsWith('/api/v1/catalog')),
            handler: 'NetworkFirst',
            options: { cacheName: 'laito-reading', networkTimeoutSeconds: 4 },
          },
          {
            // Écriture hors ligne : livres, chapitres et contenus déjà ouverts.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/api/v1/books') ||
                url.pathname.startsWith('/api/v1/chapters')),
            handler: 'NetworkFirst',
            options: { cacheName: 'laito-writing', networkTimeoutSeconds: 4 },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
  preview: {
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
});
