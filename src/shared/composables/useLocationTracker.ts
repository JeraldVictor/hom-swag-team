/**
 * useLocationTracker
 *
 * Composable that acquires GPS coordinates every `intervalMs` milliseconds
 * (default 60 s) and sends them to the server when the app is in foreground.
 *
 * Per-tick flow:
 *  1. Check if app is active (in foreground) — skip if backgrounded
 *  2. GET /tracking-status
 *     - is_enabled = false → stop interval
 *     - is_blocked = true  → skip tick
 *  3. Acquire GPS via @capacitor/geolocation (enableHighAccuracy: true)
 *  4. Emit location to WebSocket when app is open
 *  5. Also POST /location with { latitude, longitude, accuracy } as fallback
 *  6. Any error → log warning and skip tick (no crash)
 *
 * Tracking behavior:
 *  - Only active when app is in foreground (isActive = true)
 *  - Pauses automatically when app goes to background
 *  - Resumes automatically when app returns to foreground
 *  - No background tracking, no foreground service, no persistent notification
 *
 * A module-level singleton (`locationTracker`) is exported for use in app
 * lifecycle hooks (login, logout, app resume) so all callers share the same
 * interval and `isTracking` state.
 */

import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
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
  let isAppActive = true

  // Current tracking status — updated via WebSocket or initial fetch
  const currentStatus = ref<TrackingStatus>({
    is_enabled: true,
    is_blocked: false,
  })

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
      // Only track when the app is active (in foreground)
      if (!isAppActive) {
        console.log('[useLocationTracker] App is in background — skipping tick')
        return
      }

      // Step 1 — check tracking status from local reactive state
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

      // Step 3 — emit location to WebSocket (when app is open)
      console.log('[useLocationTracker] Emitting location to WebSocket:', coords)
      try {
        webSocketService.emitLocation(coords)
      } catch (err) {
        console.warn('[useLocationTracker] WebSocket emit failed:', err)
      }

      // Step 4 — also push to REST API as fallback
      try {
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
      // Catch-all: any unexpected error → skip tick
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

    // 2. Set up app state listener to pause/resume tracking based on foreground/background
    appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      if (!isTracking.value) return
      console.log('[useLocationTracker] App state changed: isActive =', isActive)
      isAppActive = isActive
      // App will skip ticks when isAppActive is false (in background)
      // No need to pause the interval — just skip ticks
    })

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

    // Clean up the app state listener
    if (appStateListener !== null) {
      appStateListener.remove()
      appStateListener = null
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
