/**
 * useTracking
 *
 * High-level composable that orchestrates real-time location tracking for
 * riders and beauticians. It:
 *   1. Requests location permission
 *   2. Connects to the WebSocket server (using the stored access token)
 *   3. Starts watching GPS position via @capacitor/geolocation
 *   4. Emits each position update over the WebSocket connection
 *   5. Also POSTs each update to the BFF REST endpoint (via locationService)
 *
 * Call `startTracking()` when a trip/order begins and `stopTracking()` when
 * it ends or the component unmounts.
 */

import type { Ref } from 'vue'
import { onUnmounted, readonly, ref } from 'vue'
import { locationService } from '@/shared/lib/location.service'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import { webSocketService } from '@/shared/lib/websocket.service'
import type { Coordinates } from '@/shared/models/location.model'

export interface UseTrackingReturn {
  /** Current GPS coordinates, or null if not yet acquired */
  currentPosition: Readonly<Ref<Coordinates | null>>
  /** True while tracking is active */
  isTracking: Readonly<Ref<boolean>>
  /** True while the WebSocket is connected */
  isConnected: Readonly<Ref<boolean>>
  /** Error message, or null */
  error: Readonly<Ref<string | null>>
  /** Start location tracking and WebSocket emission */
  startTracking(intervalMs?: number): Promise<void>
  /** Stop location tracking and disconnect WebSocket */
  stopTracking(): Promise<void>
}

/** Default GPS update interval: 10 seconds */
const DEFAULT_INTERVAL_MS = 10_000

export function useTracking(): UseTrackingReturn {
  const currentPosition = ref<Coordinates | null>(null)
  const isTracking = ref(false)
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  let watchId: string | null = null

  async function startTracking(intervalMs: number = DEFAULT_INTERVAL_MS): Promise<void> {
    if (isTracking.value) return

    error.value = null

    // 1. Request permission
    try {
      const status = await locationService.requestPermission()
      if (status !== 'granted') {
        error.value = 'Location permission denied. Please enable it in device settings.'
        return
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Permission request failed'
      return
    }

    // 2. Connect WebSocket
    try {
      const token = await Storage_Service.getString(STORAGE_KEYS.accessToken)
      if (token) {
        webSocketService.connect(token)
        isConnected.value = true
      }
    } catch {
      // Non-fatal — tracking can continue without WebSocket
    }

    // 3. Start GPS watch
    try {
      watchId = await locationService.startWatching(coords => {
        currentPosition.value = coords
        // isConnected reflects actual socket state
        isConnected.value = webSocketService.isConnected
      }, intervalMs)

      isTracking.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start GPS tracking'
      webSocketService.disconnect()
      isConnected.value = false
    }
  }

  async function stopTracking(): Promise<void> {
    if (!isTracking.value) return

    // Stop GPS watch
    if (watchId) {
      try {
        await locationService.stopWatching(watchId)
      } catch {
        // Ignore
      }
      watchId = null
    }

    // Disconnect WebSocket
    webSocketService.disconnect()
    isConnected.value = false
    isTracking.value = false
  }

  // Auto-cleanup when the component using this composable unmounts
  onUnmounted(() => {
    stopTracking()
  })

  return {
    currentPosition: readonly(currentPosition),
    isTracking: readonly(isTracking),
    isConnected: readonly(isConnected),
    error: readonly(error),
    startTracking,
    stopTracking,
  }
}
