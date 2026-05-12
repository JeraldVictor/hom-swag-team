/// <reference types="vitest" />

import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { mobileConsolePlugin } from './plugins/mobile-console'
import { config as loadDotenv } from '@dotenvx/dotenvx'

function loadEnvironmentFiles(mode: string) {
  const isProdMode = mode === 'production' || mode === 'prod'
  const envFiles = isProdMode ? ['.env', '.env.prod'] : ['.env', '.env.local']
  const result = loadDotenv({
    envs: envFiles.map(file => ({ type: 'envFile', value: path.resolve(__dirname, file) })),
    overload: true,
  })

  if (result.error) {
    throw result.error
  }
}

export default defineConfig(({ mode }) => {
  const isProdMode = mode === 'production' || mode === 'prod'
  loadEnvironmentFiles(mode)

  const viteEnv = {
    MODE: mode,
    DEV: !isProdMode,
    PROD: isProdMode,
    SSR: false,
    BASE_URL: process.env.BASE_URL ?? '/',
    VITE_BFF_API_URL: process.env.VITE_BFF_API_URL ?? '',
    VITE_BFF_BASE_URL: process.env.VITE_BFF_BASE_URL ?? 'http://localhost:3000',
    VITE_MEDIA_BASE_URL: process.env.VITE_MEDIA_BASE_URL ?? 'http://alpha.homswag.com',
    VITE_WS_URL: process.env.VITE_WS_URL ?? 'http://localhost:3000',
    VITE_GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
    VITE_FEATURE_MAPS: process.env.VITE_FEATURE_MAPS ?? 'false',
    VITE_FEATURE_DIRECTIONS: process.env.VITE_FEATURE_DIRECTIONS ?? 'false',
  }

  return {
    plugins: [
      // Forwards Android WebView console.* output + uncaught errors to this
      // terminal during `ionic cap run android -l --external`. Dev only.
      mobileConsolePlugin(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: tag => tag === 'phantom-ui',
          },
        },
      }),
    ],
    define: {
      'import.meta.env': JSON.stringify(viteEnv),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 8090,
      proxy: {
        '/api': {
          target: viteEnv.VITE_BFF_BASE_URL,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '/bff/field'),
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
    preview: {
      host: '0.0.0.0',
      port: 8090,
    },
  }
})
