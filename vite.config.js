import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.lottie'],
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.app', '.free.pinggy.link'],
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  }
})
