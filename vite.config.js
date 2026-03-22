import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Survey App POS',
        short_name: 'SurveyPOS',
        description: 'Offline-capable survey application for points of sale',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
      }
    })
  ],
})
