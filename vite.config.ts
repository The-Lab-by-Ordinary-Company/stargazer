import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Stargazer',
        short_name: 'Stargazer',
        description:
          'Live space data, visualized. Track the ISS, browse NASA imagery, and explore the cosmos.',
        theme_color: '#0a0a0a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.wheretheiss\.at\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'iss-api-cache',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5174,
    strictPort: false
  },
  // satellite.js v7 ships a WASM/pthreads variant with top-level await,
  // which trips Vite's default esbuild target. Skip prebundling and let
  // the JS entry point load directly.
  resolve: {
    alias: {
      'satellite.js/dist': resolve(__dirname, 'node_modules/satellite.js/dist')
    }
  },
  optimizeDeps: {
    exclude: ['satellite.js']
  }
});
