import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { handleAIProxy } from './vite-ai-proxy.js'

const host = process.env.TAURI_DEV_HOST

function anchorAIProxy(): Plugin {
  return {
    name: 'anchor-ai-proxy',
    configureServer(server) {
      server.middlewares.use('/api/anchor-ai', (request, response) => {
        void handleAIProxy(request, response)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/anchor-ai', (request, response) => {
        void handleAIProxy(request, response)
      })
    },
  }
}

export default defineConfig({
  clearScreen: false,
  plugins: [react(), anchorAIProxy()],
  server: {
    host: host || false,
    port: 5173,
    strictPort: true,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'es2022',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
})
