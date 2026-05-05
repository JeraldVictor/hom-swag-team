/**
 * Shared Lib — barrel export
 *
 * Re-exports core library utilities from a single entry point.
 * Import utilities from '@/shared/lib' rather than individual files.
 */

export { default as apiClient, ApiError } from './api'
export { Storage_Service, STORAGE_KEYS } from './storage'
export * from './datetime'
export { loadGoogleMaps, isGoogleMapsLoaded } from './google-maps'
export { webSocketService } from './websocket.service'
export { locationService } from './location.service'
