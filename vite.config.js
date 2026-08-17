import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  // Quale build sta girando davvero sul dispositivo di chi segnala un difetto: il
  // service worker puo' servire il bundle vecchio per un po' dopo un aggiornamento
  // (e' gia' successo), e senza questo dato si cerca nel codice di oggi un difetto
  // di quello di ieri
  define: {
    __APP_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Senza elencarli qui non finiscono nel precache e offline mancano: lo
      // sfondo a righe tornerebbe crema in palestra, che e' esattamente dove
      // la connessione non c'e'.
      includeAssets: ['icons/icon.svg', 'sfondo-righe.svg'],
      manifest: {
        name: 'Gym App',
        short_name: 'GymApp',
        description: 'Il tuo compagno di allenamento in palestra',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#FF6B35',
        background_color: '#FDF6EC',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
