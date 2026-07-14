import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.join(rootDir, 'web'),
  base: '/drawimages/assets/',
  plugins: [react()],
  resolve: {
    alias: {
      '@web': path.join(rootDir, 'web', 'src'),
    },
  },
  server: {
    host: true,
    port: 5177,
    proxy: {
      '/drawimages/api': {
        target: 'http://127.0.0.1:7777',
        changeOrigin: true,
      },
      '/api/v1': {
        target: 'http://127.0.0.1:7777',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.join(rootDir, 'lib', 'web'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
