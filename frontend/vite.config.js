import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // ascultă pe 0.0.0.0 → accesibil din rețea
    proxy: {
      // VITE_API_PROXY permite alt backend (ex. instanța de test pe 8001)
      '/api': process.env.VITE_API_PROXY || 'http://localhost:8000',
    },
  },
})
