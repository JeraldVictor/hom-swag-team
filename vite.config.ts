/// <reference types="vitest" />

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { mobileConsolePlugin } from './plugins/mobile-console'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Forwards Android WebView console.* output + uncaught errors to this
    // terminal during `ionic cap run android -l --external`. Dev only.
    mobileConsolePlugin(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'phantom-ui'
        }
      }
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host:'0.0.0.0',
    port: 8090,
    proxy: {
      // Proxy /api/* → <BFF_ORIGIN>/bff/field/*
      // In dev, requests from the browser/device hit the Vite dev server at
      // the same origin, which forwards them here — no CORS, no localhost issues.
      '/api': {
        target: process.env.VITE_BFF_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/bff/field'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  },
  preview: {
    host:'0.0.0.0',
    port: 8090
  },
})
