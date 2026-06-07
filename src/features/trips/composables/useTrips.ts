/**
 * useTrips
 *
 * Composable for fetching and managing the rider's trip list.
 */

import type { Ref } from 'vue'
import { readonly, ref, watch } from 'vue'
import { getOfficeId } from '@/shared/api/location.service'
import { getTrips } from '@/shared/api/trips.service'
import { formatISTDateShort } from '@/shared/lib/datetime'
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

  function getTripScheduleDate(trip: Trip): string {
    const sourceDate =
      trip.order_date || trip.start_time || trip.created_at || new Date().toISOString()
    return formatISTDateShort(sourceDate)
  }

  function isActiveTrip(trip: Trip): boolean {
    return [
      'requests',
      'assigned',
      'viewed_by_rider',
      'trip_started',
      'dropped_and_waiting',
      'fare_calculation_pending',
    ].includes(trip.kanban_state)
  }

  function matchesStatusFilter(trip: Trip): boolean {
    if (statusFilter.value === 'assigned') {
      return trip.kanban_state === 'assigned' || trip.kanban_state === 'viewed_by_rider'
    }

    if (statusFilter.value === 'trip_started') {
      return trip.kanban_state === 'trip_started'
    }

    if (statusFilter.value === 'dropped_and_waiting') {
      return trip.kanban_state === 'dropped_and_waiting'
    }

    if (statusFilter.value === 'trip_completed') {
      return (
        trip.kanban_state === 'trip_completed' ||
        trip.kanban_state === 'fare_calculation_pending' ||
        trip.kanban_state === 'completed'
      )
    }

    if (statusFilter.value === 'cancelled') {
      return trip.kanban_state === 'cancelled'
    }

    return trip.kanban_state === statusFilter.value
  }

  function filterTripsByDate(tripsToFilter: Trip[], todayStr: string, tomorrowStr: string): Trip[] {
    return tripsToFilter.filter(trip => {
      const scheduleDate = getTripScheduleDate(trip)
      const isToday = scheduleDate === todayStr
      const isTomorrow = scheduleDate === tomorrowStr
      const isPast = scheduleDate < todayStr

      if (dateFilter.value === 'today') {
        return isToday
      }

      if (dateFilter.value === 'tomorrow') {
        return isTomorrow
      }

      return isPast
    })
  }

  async function fetchTrips(reset = true): Promise<void> {
    if (reset) {
      isLoading.value = true
      currentPage.value = 1
      hasMore.value = true
      trips.value = []
    }

    error.value = null
    try {
      const nowISO = new Date().toISOString()
      const todayStr = formatISTDateShort(nowISO)
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const tomorrowStr = formatISTDateShort(tomorrow.toISOString())

      let dateParam: string | undefined
      if (dateFilter.value === 'today') dateParam = todayStr
      else if (dateFilter.value === 'tomorrow') dateParam = tomorrowStr

      const officeId = await getOfficeId()

      const params: Record<string, unknown> = {
        office_id: officeId,
        kanban_state: statusFilter.value,
        page: currentPage.value,
        limit: 20,
      }
      if (dateParam) {
        params.date = dateParam
      }

      const { data, pagination } = await getTrips(params)
      const filteredData = filterTripsByDate(data, todayStr, tomorrowStr).filter(
        matchesStatusFilter
      )

      if (reset) {
        trips.value = filteredData
      } else {
        trips.value = [...trips.value, ...filteredData]
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
