
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: ['pwa-icon.svg'],

      manifest: {
        name: 'Cierre de Caja',
        short_name: 'Cierre Caja',
        description: 'Aplicación para gestionar cierres de caja, gastos y movimientos.',
        theme_color: '#173b32',
        background_color: '#f5f5f0',
        display: 'standalone',
        start_url: './',
        scope: './',

        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
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
