/// <reference types="vitest" />

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
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
      // Proxy /api/* → http://localhost:3000/bff/field/*
      // The browser hits the same origin (Vite dev server), so no CORS.
      '/api': {
        target: process.env.VITE_BFF_API_URL || 'http://localhost:3000',
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
