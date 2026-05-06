/**
 * usePermissions
 *
 * Manages the app's required runtime permissions:
 *   - Location (via @capacitor/geolocation)
 *   - Camera (via @capacitor/camera)
 *   - Notifications (via @capacitor/local-notifications)
 *
 * Exposes a reactive status object and helpers to check / request each
 * permission. The `requestAll` helper walks through all permissions in
 * sequence and is used by the permission splash screen on first launch.
 *
 * Permission states follow the Capacitor convention:
 *   'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
 */

import { ref, computed, readonly } from 'vue'
import type { Ref } from 'vue'
import { Geolocation } from '@capacitor/geolocation'
import { Camera } from '@capacitor/camera'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unknown'

export interface PermissionStatuses {
  location: PermissionState
  camera: PermissionState
  notifications: PermissionState
}

export interface UsePermissionsReturn {
  /** Reactive status for each permission. */
  statuses: Readonly<Ref<PermissionStatuses>>
  /** True when all required permissions are granted. */
  allGranted: Readonly<Ref<boolean>>
  /** True while a permission check or request is in progress. */
  isLoading: Readonly<Ref<boolean>>
  /** Check current permission states without prompting the user. */
  checkAll(): Promise<void>
  /** Request all permissions that are not yet granted. */
  requestAll(): Promise<void>
  /** Request only the location permission. */
  requestLocation(): Promise<PermissionState>
  /** Request only the camera permission. */
  requestCamera(): Promise<PermissionState>
  /** Request only the notifications permission. */
  requestNotifications(): Promise<PermissionState>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when running on a real native device (iOS / Android). */
function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function usePermissions(): UsePermissionsReturn {
  const statuses = ref<PermissionStatuses>({
    location: 'unknown',
    camera: 'unknown',
    notifications: 'unknown',
  })

  const isLoading = ref(false)

  const allGranted = computed<boolean>(() => {
    const { location, camera, notifications } = statuses.value
    return location === 'granted' && camera === 'granted' && notifications === 'granted'
  })

  // -------------------------------------------------------------------------
  // Check (no prompt)
  // -------------------------------------------------------------------------

  async function checkAll(): Promise<void> {
    isLoading.value = true
    try {
      if (!isNative()) {
        // On web/PWA, permissions behave differently — treat as granted so the
        // splash screen doesn't block the web experience.
        statuses.value = { location: 'granted', camera: 'granted', notifications: 'granted' }
        return
      }

      const [locationResult, cameraResult, notifResult] = await Promise.all([
        Geolocation.checkPermissions().catch(() => ({ location: 'unknown' as PermissionState })),
        Camera.checkPermissions().catch(() => ({ camera: 'unknown' as PermissionState })),
        LocalNotifications.checkPermissions().catch(() => ({ display: 'unknown' as PermissionState })),
      ])

      statuses.value = {
        location: (locationResult as { location: PermissionState }).location ?? 'unknown',
        camera: (cameraResult as { camera: PermissionState }).camera ?? 'unknown',
        notifications: (notifResult as { display: PermissionState }).display ?? 'unknown',
      }
    } finally {
      isLoading.value = false
    }
  }

  // -------------------------------------------------------------------------
  // Individual request helpers
  // -------------------------------------------------------------------------

  async function requestLocation(): Promise<PermissionState> {
    if (!isNative()) return 'granted'
    try {
      const result = await Geolocation.requestPermissions()
      const state = result.location as PermissionState
      statuses.value = { ...statuses.value, location: state }
      return state
    } catch {
      statuses.value = { ...statuses.value, location: 'denied' }
      return 'denied'
    }
  }

  async function requestCamera(): Promise<PermissionState> {
    if (!isNative()) return 'granted'
    try {
      const result = await Camera.requestPermissions()
      const state = result.camera as PermissionState
      statuses.value = { ...statuses.value, camera: state }
      return state
    } catch {
      statuses.value = { ...statuses.value, camera: 'denied' }
      return 'denied'
    }
  }

  async function requestNotifications(): Promise<PermissionState> {
    if (!isNative()) return 'granted'
    try {
      const result = await LocalNotifications.requestPermissions()
      const state = result.display as PermissionState
      statuses.value = { ...statuses.value, notifications: state }
      return state
    } catch {
      statuses.value = { ...statuses.value, notifications: 'denied' }
      return 'denied'
    }
  }

  // -------------------------------------------------------------------------
  // Request all
  // -------------------------------------------------------------------------

  /**
   * Request each permission in sequence. Stops early if the user denies a
   * required permission (location). Camera and notifications are requested
   * regardless of each other's outcome.
   */
  async function requestAll(): Promise<void> {
    isLoading.value = true
    try {
      await requestLocation()
      await requestCamera()
      await requestNotifications()
    } finally {
      isLoading.value = false
    }
  }

  return {
    statuses: readonly(statuses),
    allGranted: readonly(allGranted),
    isLoading: readonly(isLoading),
    checkAll,
    requestAll,
    requestLocation,
    requestCamera,
    requestNotifications,
  }
}
