/**
 * useApi
 *
 * Wraps async API calls with reactive loading and error state.
 * Each call to `useApi()` returns an independent `isLoading` / `error` pair
 * so multiple API operations on the same component don't share state.
 */

import type { Ref } from 'vue'
import { ref } from 'vue'

export interface UseApiReturn {
  /** True while the async function is executing. */
  isLoading: Ref<boolean>
  /** Holds the error message from the last failed call, or null. */
  error: Ref<string | null>
  /**
   * Execute an async function, managing loading/error state automatically.
   *
   * @param fn - A zero-argument async factory that returns a value of type T
   * @returns  The resolved value, or `null` if the call threw an error
   */
  execute<T>(fn: () => Promise<T>): Promise<T | null>
}

export function useApi(): UseApiReturn {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function execute<T>(fn: () => Promise<T>): Promise<T | null> {
    isLoading.value = true
    error.value = null

    try {
      const result = await fn()
      return result
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = String(err)
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, execute }
}
