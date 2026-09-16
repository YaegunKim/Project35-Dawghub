import { copyFileSync, readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// maplibre-gl's own bundled code loads its render worker via
// `new Worker(new URL('maplibre-gl-worker.mjs', import.meta.url))`, resolved relative to
// wherever its chunk ends up being served from — and that worker file itself statically
// imports a second file, `maplibre-gl-shared.mjs`, the same way (relative to its own URL).
// Vite's worker-detection rewrites the first reference to /assets/maplibre-gl-worker.mjs at
// build time but — since maplibre-gl is excluded from dep pre-bundling (see
// optimizeDeps.exclude below) and only pulled in via manualChunks — never actually emits
// either file into dist/, so every production build 404s on them (masked as a "text/html"
// MIME error by Amplify's SPA fallback for the worker itself; a plain 404 for the shared
// file, since nothing else references it for the fallback rule to catch) and the map never
// loads. Dev mode never hits this, since Vite resolves worker imports straight from
// node_modules at request time. Copy both files in ourselves as the fix.
function copyMaplibreWorkerPlugin(): Plugin {
  return {
    name: 'copy-maplibre-worker',
    closeBundle() {
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        copyFileSync(`node_modules/maplibre-gl/dist/${file}`, `dist/assets/${file}`)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl')) return 'maplibre'
            if (id.includes('leaflet')) return 'leaflet'
            if (id.includes('gtfs-realtime-bindings') || id.includes('protobufjs')) return 'gtfs-realtime'
            if (id.includes('aws-amplify') || id.includes('@aws-amplify')) return 'amplify'
            if (id.includes('@fortawesome')) return 'fontawesome'
          }
        },
      },
    },
  },
  plugins: [
    react(),
    // Registered before VitePWA so the copied worker file exists in time to be swept into
    // its precache manifest too (offline PWA support for the map).
    copyMaplibreWorkerPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/logo.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'DawgHub',
        short_name: 'DawgHub',
        description: 'UGA student community, schedule, map, and dining in one app.',
        theme_color: '#ba0c2f',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
