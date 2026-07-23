/**
 * useTripDetail
 *
 * Composable for fetching a single trip and managing its status.
 * Also handles the tracking lifecycle — starts tracking when the trip is
 * in progress and stops it when completed.
 */

import type { Ref } from 'vue'
import { computed, readonly, ref } from 'vue'
import { getTrip, updateTripStatus } from '@/shared/api/trips.service'
import type { Trip, TripStatus } from '@/shared/models/trip.model'
import { TRIP_STATUS } from '@/shared/models/trip.model'

export interface UseTripDetailReturn {
  trip: Readonly<Ref<Trip | null>>
  isLoading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  isUpdating: Readonly<Ref<boolean>>
  /** True when the trip is actively in progress (tracking should be on) */
  isInProgress: Readonly<Ref<boolean>>
  /** True when the trip is fully completed */
  isCompleted: Readonly<Ref<boolean>>
  fetchTrip(id: string | number): Promise<void>
  advanceStatus(nextStatusOverride?: TripStatus, distanceKm?: number): Promise<void>
}

/** States where the rider is actively moving */
const IN_PROGRESS_STATUSES: TripStatus[] = [TRIP_STATUS.STARTED, TRIP_STATUS.DROPPED_AND_WAITING]

/** States that are considered fully done */
const COMPLETED_STATUSES: TripStatus[] = [TRIP_STATUS.COMPLETED]

/** The next status in the trip progression */
const NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  [TRIP_STATUS.ASSIGNED]: TRIP_STATUS.STARTED,
  [TRIP_STATUS.STARTED]: TRIP_STATUS.COMPLETED,
  [TRIP_STATUS.DROPPED_AND_WAITING]: TRIP_STATUS.COMPLETED,
}

export function useTripDetail(): UseTripDetailReturn {
  const trip = ref<Trip | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isUpdating = ref(false)

  const isInProgress = computed(() =>
    trip.value ? IN_PROGRESS_STATUSES.includes(trip.value.status) : false
  )

  const isCompleted = computed(() =>
    trip.value ? COMPLETED_STATUSES.includes(trip.value.status) : false
  )

  async function fetchTrip(id: string | number): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      trip.value = await getTrip(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load trip'
    } finally {
      isLoading.value = false
    }
  }

  async function advanceStatus(
    nextStatusOverride?: TripStatus,
    distanceKm?: number
  ): Promise<void> {
    if (!trip.value) return
    if (COMPLETED_STATUSES.includes(trip.value.status)) return
    const next = nextStatusOverride || NEXT_STATUS[trip.value.status]
    if (!next) return

    isUpdating.value = true
    error.value = null
    try {
      trip.value = await updateTripStatus(trip.value.id, next, distanceKm)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update trip status'
    } finally {
      isUpdating.value = false
    }
  }

  return {
    trip: readonly(trip),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isUpdating: readonly(isUpdating),
    isInProgress: readonly(isInProgress),
    isCompleted: readonly(isCompleted),
    fetchTrip,
    advanceStatus,
  }
}
