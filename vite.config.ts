import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'wieldy-mulish-hyun.ngrok-free.dev'
    ]
  }
})