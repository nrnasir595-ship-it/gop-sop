
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Accessing process.env in Vite config is fine since it runs in Node.js
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    port: 3000,
    host: true
  }
})
