import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/chat': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
      '/user': 'http://localhost:5000',
      '/auth': 'http://localhost:5000'
    }
  }
})
