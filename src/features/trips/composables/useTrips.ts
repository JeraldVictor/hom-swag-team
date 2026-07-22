/**
 * useTrips
 *
 * Composable for fetching and managing the rider's trip list.
 */

import type { Ref } from 'vue'
import { readonly, ref, watch } from 'vue'
import { getOfficeId } from '@/shared/api/location.service'
import { getTrips } from '@/shared/api/trips.service'
import type { Trip, TripStatus } from '@/shared/models/trip.model'
import { TRIP_STATUS } from '@/shared/models/trip.model'

export type TripStatusFilter = TripStatus | 'all'

export interface UseTripsReturn {
  trips: Readonly<Ref<Trip[]>>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  dateFilter: Ref<'today' | 'tomorrow' | 'past'>
  statusFilter: Ref<TripStatusFilter>
  searchQuery: Ref<string>
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
  const statusFilter = ref<TripStatusFilter>(TRIP_STATUS.ASSIGNED)
  const searchQuery = ref('')
  const currentPage = ref(1)
  const hasMore = ref(true)
  let latestRequestId = 0

  async function fetchTrips(reset = true): Promise<void> {
    const requestId = ++latestRequestId
    if (reset) {
      isLoading.value = true
      currentPage.value = 1
      hasMore.value = true
      trips.value = []
    }

    error.value = null
    try {
      const officeId = await getOfficeId()

      const params: Record<string, unknown> = {
        office_id: officeId,
        x: dateFilter.value,
        page: currentPage.value,
        limit: 20,
      }

      if (statusFilter.value !== 'all') {
        params.status = statusFilter.value
      }
      if (searchQuery.value.trim()) {
        params.q = searchQuery.value.trim()
      }

      const { data, pagination } = await getTrips(params)

      if (requestId !== latestRequestId) return

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
      if (requestId !== latestRequestId) return
      error.value = err instanceof Error ? err.message : 'Failed to fetch trips'
    } finally {
      if (requestId === latestRequestId) {
        isLoading.value = false
      }
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

  watch(dateFilter, () => {
    if (dateFilter.value === 'past' && statusFilter.value !== 'all') {
      statusFilter.value = 'all'
      return
    }
    fetchTrips(true)
  })

  watch(statusFilter, () => {
    if (dateFilter.value === 'past' && statusFilter.value !== 'all') {
      statusFilter.value = 'all'
      return
    }
    fetchTrips(true)
  })

  watch(searchQuery, () => {
    fetchTrips(true)
  })

  return {
    trips: readonly(trips) as Readonly<Ref<Trip[]>>,
    isLoading: readonly(isLoading),
    error: readonly(error),
    dateFilter,
    statusFilter,
    searchQuery,
    hasMore: readonly(hasMore),
    fetchTrips,
    loadMoreTrips,
    refresh,
  }
}
