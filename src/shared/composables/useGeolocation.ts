/**
 * useGeolocation
 *
 * Composable that wraps @capacitor/geolocation to provide reactive GPS state.
 * Handles permission requests, one-shot position fetches, and continuous watching.
 *
 * Emits each position update over the WebSocket connection (if connected) so
 * the admin can track the rider/beautician in real time.
 */

import type { Ref } from 'vue'
import { readonly, ref } from 'vue'
import { locationService } from '@/shared/lib/location.service'
import { webSocketService } from '@/shared/lib/websocket.service'
import type { Coordinates } from '@/shared/models/location.model'

export interface UseGeolocationReturn {
  /** Current GPS coordinates, or null if not yet acquired. */
  currentPosition: Readonly<Ref<Coordinates | null>>
  /** True while a position fetch or permission request is in progress. */
  isLoading: Readonly<Ref<boolean>>
  /** Error message from the last failed operation, or null. */
  error: Readonly<Ref<string | null>>
  /** True when a position watch is active. */
  isWatching: Readonly<Ref<boolean>>
  /** Request location permission from the device. */
  requestPermission(): Promise<string>
  /** Fetch the current position once. */
  getCurrentPosition(): Promise<Coordinates | null>
  /** Start watching position and emitting over WebSocket. */
  startWatching(intervalMs?: number): Promise<void>
  /** Stop the active position watch. */
  stopWatching(): Promise<void>
}

export function useGeolocation(): UseGeolocationReturn {
  const currentPosition = ref<Coordinates | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isWatching = ref(false)
  let watchId: string | null = null

  async function requestPermission(): Promise<string> {
    isLoading.value = true
    error.value = null
    try {
      const status = await locationService.requestPermission()
      return status
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Permission request failed'
      return 'denied'
    } finally {
      isLoading.value = false
    }
  }

  async function getCurrentPosition(): Promise<Coordinates | null> {
    isLoading.value = true
    error.value = null
    try {
      const coords = await locationService.getCurrentPosition()
      currentPosition.value = coords
      return coords
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get position'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function startWatching(intervalMs?: number): Promise<void> {
    if (isWatching.value) return

    error.value = null
    try {
      watchId = await locationService.startWatching(coords => {
        currentPosition.value = coords
        // Emit over WebSocket for real-time admin tracking
        webSocketService.emitLocation(coords)
      }, intervalMs)
      isWatching.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start watching'
    }
  }

  async function stopWatching(): Promise<void> {
    if (!isWatching.value || !watchId) return
    try {
      await locationService.stopWatching(watchId)
    } finally {
      watchId = null
      isWatching.value = false
    }
  }

  return {
    currentPosition: readonly(currentPosition),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isWatching: readonly(isWatching),
    requestPermission,
    getCurrentPosition,
    startWatching,
    stopWatching,
  }
}
