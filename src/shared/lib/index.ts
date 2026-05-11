/**
 * Shared Lib — barrel export
 *
 * Re-exports core library utilities from a single entry point.
 * Import utilities from '@/shared/lib' rather than individual files.
 */

export { ApiError, default as apiClient } from './api'
export * from './datetime'
export { isGoogleMapsLoaded, loadGoogleMaps } from './google-maps'
export { locationService } from './location.service'
export { STORAGE_KEYS, Storage_Service } from './storage'
export { webSocketService } from './websocket.service'
