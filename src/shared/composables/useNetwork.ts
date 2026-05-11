/**
 * useNetwork
 *
 * Reactive network connectivity state. Tracks whether the device has an
 * active internet connection using the browser's `navigator.onLine` API
 * and the `online` / `offline` window events.
 *
 * On Capacitor (native), the browser events are still fired by the WebView,
 * so this works correctly on iOS and Android without a native plugin.
 */

import type { Ref } from 'vue'
import { onMounted, onUnmounted, readonly, ref } from 'vue'

export interface UseNetworkReturn {
  /** True when the device has an active internet connection. */
  isOnline: Readonly<Ref<boolean>>
}

// ---------------------------------------------------------------------------
// Module-level singleton so all callers share the same reactive state
// ---------------------------------------------------------------------------

// On Android native, navigator.onLine is unreliable during cold start — the
// WebView reports false before the network stack is ready. Default to true
// so the boot sequence isn't blocked; the real state is synced in onMounted.
const isOnline = ref<boolean>(true)

let listenerCount = 0

function handleOnline() {
  isOnline.value = true
}

function handleOffline() {
  isOnline.value = false
}

export function useNetwork(): UseNetworkReturn {
  onMounted(() => {
    if (listenerCount === 0) {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      // Sync immediately in case the state changed before mount
      isOnline.value = navigator.onLine
    }
    listenerCount++
  })

  onUnmounted(() => {
    listenerCount--
    if (listenerCount === 0) {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  return {
    isOnline: readonly(isOnline),
  }
}

/**
 * Read the current online state outside of a component (e.g. in a store or
 * router guard). Does not register any lifecycle hooks.
 */
export function getIsOnline(): boolean {
  return isOnline.value
}
