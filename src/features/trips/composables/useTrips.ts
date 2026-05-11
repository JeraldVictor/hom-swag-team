/**
 * useTrips
 *
 * Composable for fetching and managing the rider's trip list.
 */

import type { Ref } from 'vue'
import { readonly, ref } from 'vue'
import { getTrips } from '@/shared/api/trips.service'
import type { Trip } from '@/shared/models/trip.model'

export interface UseTripsReturn {
  trips: Ref<Trip[]>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  fetchTrips(page?: number, limit?: number): Promise<void>
  refresh(): Promise<void>
}

export function useTrips(): UseTripsReturn {
  const trips = ref<Trip[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTrips(page = 1, limit = 20): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      trips.value = await getTrips(page, limit)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load trips'
      trips.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    await fetchTrips(1)
  }

  return {
    trips,
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchTrips,
    refresh,
  }
}
