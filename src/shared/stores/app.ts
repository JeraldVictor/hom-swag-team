/**
 * App Store
 *
 * Manages the app's boot lifecycle state:
 *   - Network connectivity (isOnline)
 *   - Permission grant status (permissionsGranted)
 *   - Boot phase (booting → permissions → ready)
 *
 * This store is read by App.vue to decide which screen to render and by the
 * router guard to block navigation when the device is offline.
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BootPhase =
  /** App is initialising (checking network + permissions). */
  | 'booting'
  /** Network is available but permissions have not been granted yet. */
  | 'needs-permissions'
  /** Everything is ready — normal app flow. */
  | 'ready'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = defineStore('app', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** Whether the device currently has an internet connection. */
  const isOnline = ref<boolean>(true)

  /** Whether all required runtime permissions have been granted. */
  const permissionsGranted = ref<boolean>(false)

  /** Current boot phase. */
  const bootPhase = ref<BootPhase>('booting')

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /** True when the app is fully ready for normal use. */
  const isReady = computed<boolean>(() => bootPhase.value === 'ready')

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function setOnline(online: boolean): void {
    isOnline.value = online
  }

  function setPermissionsGranted(granted: boolean): void {
    permissionsGranted.value = granted
  }

  function setBootPhase(phase: BootPhase): void {
    bootPhase.value = phase
  }

  return {
    isOnline,
    permissionsGranted,
    bootPhase,
    isReady,
    setOnline,
    setPermissionsGranted,
    setBootPhase,
  }
})
