/**
 * Centralized environment values for the client app.
 *
 * This wrapper keeps raw `import.meta.env` lookups in one place so the rest of
 * the app can rely on a stable typed object and feature flags.
 */

export const ENV = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SSR: import.meta.env.SSR,
  BASE_URL: import.meta.env.BASE_URL,
  VITE_BFF_API_URL: import.meta.env.VITE_BFF_API_URL,
  VITE_BFF_BASE_URL: (import.meta.env.VITE_BFF_BASE_URL as string | undefined) ?? '',
  VITE_MEDIA_BASE_URL:
    (import.meta.env.VITE_MEDIA_BASE_URL as string | undefined) ?? 'https://partner.homswag.com',
  VITE_WS_URL: (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:3000',
  VITE_GOOGLE_MAPS_API_KEY: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '',
  VITE_FEATURE_MAPS: import.meta.env.VITE_FEATURE_MAPS === 'true',
  VITE_FEATURE_DIRECTIONS: import.meta.env.VITE_FEATURE_DIRECTIONS === 'true',
} as const

export type EnvValues = typeof ENV
