/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

interface ImportMetaEnv {
  /** Base URL for the BFF (Backend For Frontend) API */
  readonly VITE_BFF_API_URL: string
  readonly VITE_BFF_BASE_URL: string
  readonly VITE_MEDIA_BASE_URL: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_WS_URL: string
  readonly VITE_FEATURE_MAPS: string
  readonly VITE_FEATURE_DIRECTIONS: string
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
