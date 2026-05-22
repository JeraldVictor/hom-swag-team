/**
 * useTrips
 *
 * Composable for fetching and managing the rider's trip list.
 */

import type { Ref } from 'vue'
import { readonly, ref, watch } from 'vue'
import { getTrips } from '@/shared/api/trips.service'
import type { Trip, TripKanbanState } from '@/shared/models/trip.model'

export interface UseTripsReturn {
  trips: Readonly<Ref<Trip[]>>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  dateFilter: Ref<'today' | 'tomorrow' | 'past'>
  statusFilter: Ref<TripKanbanState>
  hasMore: Readonly<Ref<boolean>>
  fetchTrips(reset?: boolean): Promise<void>
  loadMoreTrips(): Promise<void>
  refresh(): Promise<void>
}

export function useTrips(): UseTripsReturn {
  const trips = ref<Trip[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const dateFilter = ref<'today' | 'tomorrow' | 'past'>('today')
  const statusFilter = ref<TripKanbanState>('assigned')
  const currentPage = ref(1)
  const hasMore = ref(true)

  async function fetchTrips(reset = true): Promise<void> {
    if (reset) {
      isLoading.value = true
      currentPage.value = 1
      hasMore.value = true
      trips.value = []
    }

    error.value = null
    try {
      const { data, pagination } = await getTrips({
        date: dateFilter.value,
        status: statusFilter.value,
        page: currentPage.value,
        limit: 20,
      })

      if (reset) {
        trips.value = data
      } else {
        trips.value = [...trips.value, ...data]
      }

      if (pagination && pagination.page >= pagination.pages) {
        hasMore.value = false
      } else if (!pagination && data.length < 20) {
        // Fallback if no pagination object
        hasMore.value = false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch trips'
    } finally {
      isLoading.value = false
    }
  }

  async function loadMoreTrips(): Promise<void> {
    if (!hasMore.value || isLoading.value) return
    currentPage.value++
    await fetchTrips(false)
  }

  async function refresh(): Promise<void> {
    await fetchTrips(true)
  }

  // Reload when filters change
  watch([dateFilter, statusFilter], () => {
    fetchTrips(true)
  })

  return {
    trips: readonly(trips) as Readonly<Ref<Trip[]>>,
    isLoading: readonly(isLoading),
    error: readonly(error),
    dateFilter,
    statusFilter,
    hasMore: readonly(hasMore),
    fetchTrips,
    loadMoreTrips,
    refresh,
  }
}
