/**
 * UI Store
 *
 * Manages global UI state: active tab, loading indicator, and toast queue.
 * Uses Composition API style with defineStore.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToastItem {
  message: string
  color?: string
  duration?: number
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUiStore = defineStore('ui', () => {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** The currently active bottom tab identifier. */
  const activeTab = ref<string>('')

  /** Whether a global loading overlay is visible. */
  const isLoading = ref<boolean>(false)

  /** Queue of pending toast notifications. */
  const toastQueue = ref<ToastItem[]>([])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Set the active bottom tab.
   */
  function setActiveTab(tab: string): void {
    activeTab.value = tab
  }

  /**
   * Show or hide the global loading indicator.
   */
  function setLoading(loading: boolean): void {
    isLoading.value = loading
  }

  /**
   * Add a toast notification to the queue.
   */
  function pushToast(toast: ToastItem): void {
    toastQueue.value.push(toast)
  }

  return {
    // State
    activeTab,
    isLoading,
    toastQueue,
    // Actions
    setActiveTab,
    setLoading,
    pushToast,
  }
})
