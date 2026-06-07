/**
 * Google Maps JS API Loader
 *
 * Lazily loads the Google Maps JavaScript API (with Places library) once and
 * caches the promise so subsequent calls resolve immediately.
 *
 * Usage:
 *   import { loadGoogleMaps } from '@/shared/lib/google-maps'
 *   await loadGoogleMaps()
 *   const map = new google.maps.Map(el, options)
 */

import { ENV } from '@/shared/lib/env'
import { FEATURES } from '@/shared/lib/feature-flags'

let loadPromise: Promise<void> | null = null

/**
 * Load the Google Maps JS API with the Places library.
 * Safe to call multiple times — the script is only injected once.
 */
export function loadGoogleMaps(): Promise<void> {
  if (!FEATURES.maps) {
    return Promise.reject(new Error('Maps feature is disabled'))
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. SSR hydration or duplicate call)
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve()
      return
    }

    const apiKey = ENV.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('[GoogleMaps] VITE_GOOGLE_MAPS_API_KEY is not set. Map features will not work.')
    }

    const callbackName = '__googleMapsInitCallback__'

    // Expose the callback globally so the script can call it on load
    ;(window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName]

      // Detect API key errors (e.g. ApiTargetBlockedMapError, InvalidKeyMapError)
      // Google fires gm-err-authfailure on the window when the key is blocked/invalid
      const authErrorHandler = () => {
        window.removeEventListener('gm-authfailure', authErrorHandler)
        loadPromise = null // allow retry
        reject(new Error('Google Maps API key is invalid or blocked for this domain'))
      }
      window.addEventListener('gm-authfailure', authErrorHandler)

      // If no auth error fires within a tick, the map loaded successfully
      setTimeout(() => {
        window.removeEventListener('gm-authfailure', authErrorHandler)
        resolve()
      }, 0)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey ?? ''}&libraries=places,geometry&callback=${callbackName}&loading=async`
    script.async = true
    script.defer = true
    script.onerror = () => {
      loadPromise = null // allow retry
      reject(new Error('Failed to load Google Maps JS API'))
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

/**
 * Returns true if the Google Maps JS API is already loaded.
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps
}
