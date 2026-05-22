/**
 * useTripDetail
 *
 * Composable for fetching a single trip and managing its kanban state.
 * Also handles the tracking lifecycle — starts tracking when the trip is
 * in progress and stops it when completed.
 */

import type { Ref } from 'vue'
import { computed, readonly, ref } from 'vue'
import { getTrip, updateTripStatus } from '@/shared/api/trips.service'
import type { Trip, TripKanbanState } from '@/shared/models/trip.model'

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
  advanceStatus(nextStateOverride?: TripKanbanState, distanceKm?: number): Promise<void>
}

/** States where the rider is actively moving */
const IN_PROGRESS_STATES: TripKanbanState[] = ['trip_started', 'dropped_and_waiting']

/** States that are considered fully done */
const COMPLETED_STATES: TripKanbanState[] = ['fare_calculation_pending', 'completed']

/** The next state in the kanban progression */
const NEXT_STATE: Partial<Record<TripKanbanState, TripKanbanState>> = {
  assigned: 'viewed_by_rider',
  viewed_by_rider: 'trip_started',
  // 'trip_started' logic requires knowing if it's 2-way, so we handle it dynamically in the component or via a special method.
  // For now, we will expose an `advanceStatusDynamic(trip)` in the component instead of using this simple map for all states.
  trip_started: 'trip_completed',
  dropped_and_waiting: 'trip_completed',
  trip_completed: 'fare_calculation_pending',
  fare_calculation_pending: 'completed',
}

export function useTripDetail(): UseTripDetailReturn {
  const trip = ref<Trip | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isUpdating = ref(false)

  const isInProgress = computed(() =>
    trip.value ? IN_PROGRESS_STATES.includes(trip.value.kanban_state) : false
  )

  const isCompleted = computed(() =>
    trip.value ? COMPLETED_STATES.includes(trip.value.kanban_state) : false
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
    nextStateOverride?: TripKanbanState,
    distanceKm?: number
  ): Promise<void> {
    if (!trip.value) return
    const next = nextStateOverride || NEXT_STATE[trip.value.kanban_state]
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
