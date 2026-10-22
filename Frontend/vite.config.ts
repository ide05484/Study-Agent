import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // TODO: 푸시 알림 수신 시 injectManifest 전략 + 커스텀 서비스워커로 전환
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '보건직 합격 코치',
        short_name: '합격코치',
        lang: 'ko',
        start_url: '/',
        display: 'standalone',
        theme_color: '#1f8a6e',
        background_color: '#ffffff',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
})
