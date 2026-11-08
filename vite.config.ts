
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/cierre-caja/',

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: [
        'pwa-icon.svg',
        'pwa-icon-192.png',
        'pwa-icon-512.png',
      ],

      manifest: {
        id: './',
        name: 'Cierre de Caja',
        short_name: 'Cierre Caja',

        description:
          'Aplicación para gestionar cierres de caja, gastos y movimientos.',

        theme_color: '#173b32',
        background_color: '#f5f5f0',

        display: 'standalone',
        orientation: 'portrait',

        start_url: './',
        scope: './',

        icons: [
          {
            src: 'pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },

      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff2}',
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
