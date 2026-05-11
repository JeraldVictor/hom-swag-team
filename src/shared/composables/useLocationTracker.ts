/**
 * useLocationTracker
 *
 * Composable that acquires GPS coordinates every `intervalMs` milliseconds
 * (default 60 s) and pushes them to the BFF field API.
 *
 * Per-tick flow:
 *  1. GET /tracking-status
 *     - is_enabled = false → stop interval
 *     - is_blocked = true  → skip tick
 *  2. Acquire GPS via @capacitor/geolocation (enableHighAccuracy: true)
 *  3. POST /location with { latitude, longitude, accuracy }
 *  4. Any error → log warning and skip tick (no crash)
 *
 * Android background support:
 *  - On app background (appStateChange isActive=false): start foreground service
 *  - On app foreground (appStateChange isActive=true): stop foreground service
 *  - Only active on Android; iOS uses BackgroundLocationMode (Info.plist)
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1, 7.5, 1.4, 3.1, 3.2, 3.3
 *
 * A module-level singleton (`locationTracker`) is exported for use in app
 * lifecycle hooks (login, logout, app resume) so all callers share the same
 * interval and `isTracking` state.
 */

import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import type { Ref } from 'vue'
import { ref } from 'vue'
import {
  getTrackingStatus,
  pushLocation,
  setTrackingMasterStatus,
} from '@/shared/api/location.service'
import { ApiError } from '@/shared/lib/api'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import { webSocketService } from '@/shared/lib/websocket.service'
import type { TrackingStatus } from '@/shared/models/location.model'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface LocationTrackerOptions {
  /** Polling interval in milliseconds. Defaults to 60 000 (60 s). */
  intervalMs?: number
}

export interface UseLocationTrackerReturn {
  /** True while the interval is running. */
  isTracking: Ref<boolean>
  /** Start the location tracking interval. No-op if already tracking. */
  start: () => Promise<void>
  /** Stop the location tracking interval. */
  stop: () => void
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function useLocationTracker(options: LocationTrackerOptions = {}): UseLocationTrackerReturn {
  const intervalMs = options.intervalMs ?? 60_000

  const isTracking = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null
  let appStateListener: PluginListenerHandle | null = null
  let socketUnsubscribe: (() => void) | null = null

  // Current tracking status — updated via WebSocket or initial fetch
  const currentStatus = ref<TrackingStatus>({
    is_enabled: true,
    is_blocked: false,
  })

  function getLocationService(): {
    startForegroundService?: () => void
    stopForegroundService?: () => void
  } | null {
    return ((Capacitor as unknown as { Plugins?: Record<string, unknown> }).Plugins
      ?.LocationService ?? null) as {
      startForegroundService?: () => void
      stopForegroundService?: () => void
    } | null
  }

  // -------------------------------------------------------------------------
  // Android foreground service helpers (Requirement 2.2)
  // -------------------------------------------------------------------------

  function startForegroundService(): void {
    try {
      getLocationService()?.startForegroundService?.()
    } catch (err) {
      console.warn('[useLocationTracker] Failed to start foreground service', err)
    }
  }

  function stopForegroundService(): void {
    try {
      getLocationService()?.stopForegroundService?.()
    } catch (err) {
      console.warn('[useLocationTracker] Failed to stop foreground service', err)
    }
  }

  // -------------------------------------------------------------------------
  // GPS acquisition
  // -------------------------------------------------------------------------

  /**
   * Acquire the current GPS position.
   * Requests ACCESS_FINE_LOCATION permission on the first call.
   * Returns null on any error (permission denied, timeout, no fix, etc.).
   */
  async function acquirePosition(): Promise<{
    latitude: number
    longitude: number
    accuracy: number | undefined
  } | null> {
    try {
      // Request permission before the first acquisition attempt.
      // checkPermissions + requestPermissions is idempotent — safe to call
      // every tick; Capacitor caches the granted state after the first prompt.
      const permStatus = await Geolocation.checkPermissions()
      if (permStatus.location !== 'granted') {
        const requested = await Geolocation.requestPermissions({ permissions: ['location'] })
        if (requested.location !== 'granted') {
          console.warn('[useLocationTracker] Location permission not granted — skipping tick')
          return null
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        // backgroundMode: true,  // Capacitor 5+ — keeps GPS active when app is backgrounded on iOS
      })

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
      }
    } catch (err) {
      console.warn('[useLocationTracker] GPS acquisition failed — skipping tick', err)
      return null
    }
  }

  // -------------------------------------------------------------------------
  // Per-tick logic
  // -------------------------------------------------------------------------

  async function tick(): Promise<void> {
    try {
      // Step 1 — check tracking status from local reactive state (Requirement 2.2)
      // No longer polling the API on every tick to reduce server load.
      const status = currentStatus.value

      if (!status.is_enabled) {
        // Feature flag disabled for this office → stop the interval entirely
        console.warn('[useLocationTracker] Tracking disabled by feature flag — stopping interval')
        stop()
        return
      }

      if (status.is_blocked) {
        // Worker is on leave / week-off / block_time → skip this tick
        console.warn(
          `[useLocationTracker] Worker is blocked (${status.blocked_reason ?? 'unknown'}) — skipping tick`
        )
        return
      }

      // Step 2 — acquire GPS
      const coords = await acquirePosition()
      if (!coords) {
        // acquirePosition already logged the warning
        return
      }

      // Step 3 — push location to server
      try {
        console.log('[useLocationTracker] Pushing location:', coords)
        await pushLocation(coords)
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 503) {
            // Feature flag disabled on the server side → stop interval
            console.warn(
              '[useLocationTracker] Server returned 503 (tracking disabled) — stopping interval'
            )
            stop()
            return
          }
          if (err.status === 422) {
            // Worker is blocked on the server side → skip tick
            console.warn(
              '[useLocationTracker] Server returned 422 (worker blocked) — skipping tick'
            )
            return
          }
        }
        // Any other error → log and skip tick (no crash)
        console.warn('[useLocationTracker] pushLocation failed — skipping tick', err)
      }
    } catch (err) {
      // Catch-all: getTrackingStatus or any unexpected error → skip tick
      console.warn('[useLocationTracker] Tick error — skipping tick', err)
    }
  }

  // -------------------------------------------------------------------------
  // start / stop
  // -------------------------------------------------------------------------

  async function start(): Promise<void> {
    if (isTracking.value) return

    isTracking.value = true

    // 1. Initial status fetch + WebSocket setup
    try {
      // Fetch initial status to avoid waiting for the first socket message
      const initialStatus = await getTrackingStatus()
      console.log('[useLocationTracker] Initial status fetched:', initialStatus)
      currentStatus.value = initialStatus
      setTrackingMasterStatus(initialStatus.is_enabled)

      // Connect socket if not already connected
      const token = await Storage_Service.getString(STORAGE_KEYS.accessToken)
      if (token) {
        webSocketService.connect(token)
      }

      // Listen for status updates pushed from the server
      socketUnsubscribe = webSocketService.on(
        'tracking:status_updated',
        (status: TrackingStatus) => {
          console.log('[useLocationTracker] Received status update from socket:', status)
          currentStatus.value = status
          setTrackingMasterStatus(status.is_enabled)

          // If status changed to disabled, stop immediately
          if (!status.is_enabled && isTracking.value) {
            stop()
          }
        }
      )
    } catch (err) {
      console.warn(
        '[useLocationTracker] Initial status fetch/socket setup failed — continuing with defaults',
        err
      )
    }

    // 2. Set up Android foreground service listener (Requirement 2.2)
    if (Capacitor.getPlatform() === 'android') {
      appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isTracking.value) return
        if (!isActive) {
          // App moved to background — start foreground service to keep tracking alive
          startForegroundService()
        } else {
          // App returned to foreground — stop foreground service
          stopForegroundService()
        }
      })
    }

    // Run the first tick immediately, then on the interval
    await tick()

    intervalId = setInterval(() => {
      void tick()
    }, intervalMs)
  }

  function stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }

    // Clean up the app state listener and stop any running foreground service
    if (appStateListener !== null) {
      appStateListener.remove()
      appStateListener = null
      // Ensure the foreground service is stopped when tracking ends
      if (Capacitor.getPlatform() === 'android') {
        stopForegroundService()
      }
    }

    // Unsubscribe from socket events
    if (socketUnsubscribe) {
      socketUnsubscribe()
      socketUnsubscribe = null
    }

    isTracking.value = false
  }

  return { isTracking, start, stop }
}

// ---------------------------------------------------------------------------
// Module-level singleton
// ---------------------------------------------------------------------------

/**
 * Shared singleton instance of the location tracker.
 *
 * Import this instead of calling `useLocationTracker()` directly whenever you
 * need to control the tracker from outside a Vue component (e.g. auth store,
 * login composable, app lifecycle hooks). All callers share the same interval
 * and `isTracking` reactive state.
 */
export const locationTracker = useLocationTracker()
