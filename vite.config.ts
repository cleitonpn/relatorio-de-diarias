import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Prumo — Gestão de Diárias',
        short_name: 'Prumo',
        description: 'Controle de feiras, equipe, diárias e pagamentos para empreiteiros.',
        theme_color: '#4338CA',
        background_color: '#0B0D14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/__/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  build: {
    // Firebase é pesado. Separado em pedaços, o navegador guarda em cache o que
    // não muda e só rebaixa o código do app a cada atualização.
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-app': ['firebase/app', 'firebase/auth'],
          'firebase-db': ['firebase/firestore', 'firebase/storage'],
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'qrcode'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
