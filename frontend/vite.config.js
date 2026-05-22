import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // ascultă pe 0.0.0.0 → accesibil din rețea
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
