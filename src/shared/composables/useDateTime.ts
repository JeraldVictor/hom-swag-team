/**
 * useDateTime
 *
 * Composable that re-exports the pure IST datetime utilities from
 * `src/lib/datetime.ts` and adds reactive helpers for use in Vue components.
 */

import { computed, ref } from 'vue'
import { formatISTDate, formatISTTime } from '@/shared/lib/datetime'

export { formatISTDate, formatISTTime }

export function useDateTime() {
  /**
   * A reactive ref holding the current IST time string (updates on demand).
   * Call `refreshNow()` to update it.
   */
  const nowISO = ref(new Date().toISOString())

  /** Refresh `nowISO` to the current timestamp. */
  function refreshNow(): void {
    nowISO.value = new Date().toISOString()
  }

  /** Reactive current IST time string, e.g. "3:45 PM". */
  const currentISTTime = computed(() => formatISTTime(nowISO.value))

  /** Reactive current IST date string, e.g. "Mon, 6 May 2026". */
  const currentISTDate = computed(() => formatISTDate(nowISO.value))

  /**
   * Format any ISO string as an IST time string.
   * Convenience wrapper so templates don't need a separate import.
   */
  function toISTTime(isoString: string): string {
    return formatISTTime(isoString)
  }

  /**
   * Format any ISO string as a human-readable IST date string.
   * Convenience wrapper so templates don't need a separate import.
   */
  function toISTDate(isoString: string): string {
    return formatISTDate(isoString)
  }

  return {
    nowISO,
    refreshNow,
    currentISTTime,
    currentISTDate,
    toISTTime,
    toISTDate,
    // Re-export pure functions for direct use
    formatISTTime,
    formatISTDate,
  }
}
