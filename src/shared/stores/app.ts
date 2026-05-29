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

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

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

export interface AppConfig {
  feature_flags: Record<string, boolean>
}

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

  /** Server-provided app configuration including feature flags. */
  const config = ref<AppConfig | null>(null)

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /** True when the app is fully ready for normal use. */
  const isReady = computed<boolean>(() => bootPhase.value === 'ready')

  /** Feature flags loaded from the server */
  const featureFlags = computed<Record<string, boolean>>(() => config.value?.feature_flags ?? {})

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

  async function fetchConfig(): Promise<void> {
    try {
      const apiClient = (await import('@/shared/lib/api')).default
      const { data } = await apiClient.get<{ data: AppConfig }>('/config')
      config.value = data.data
    } catch (e) {
      console.error('[AppStore] Failed to fetch app config:', e)
    }
  }

  return {
    isOnline,
    permissionsGranted,
    bootPhase,
    config,
    isReady,
    featureFlags,
    setOnline,
    setPermissionsGranted,
    setBootPhase,
    fetchConfig,
  }
})
