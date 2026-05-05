/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the BFF (Backend For Frontend) API */
  readonly VITE_BFF_API_URL: string
  /** Google Maps JavaScript API key */
  readonly VITE_GOOGLE_MAPS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
