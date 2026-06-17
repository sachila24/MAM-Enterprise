import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so packaged Electron can load assets from file://
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'wieldy-mulish-hyun.ngrok-free.dev'
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})