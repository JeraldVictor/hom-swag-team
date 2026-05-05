/**
 * Trips Service
 *
 * Typed wrappers around the BFF trips endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { Trip, TripKanbanState } from '@/shared/models/trip.model'
import type { PaginatedResponse } from '@/shared/models/pagination.model'

/**
 * Fetch a paginated list of trips assigned to the authenticated rider.
 * GET /trips
 */
export async function getTrips(page?: number, limit?: number): Promise<PaginatedResponse<Trip>> {
  const response = await apiClient.get<{ data: PaginatedResponse<Trip> }>('/trips', {
    params: { page, limit },
  })
  return response.data.data
}

/**
 * Fetch a single trip by ID.
 * GET /trips/:id
 */
export async function getTrip(id: string | number): Promise<Trip> {
  const response = await apiClient.get<{ data: Trip }>(`/trips/${id}`)
  return response.data.data
}

/**
 * Update the kanban state of a trip.
 * PATCH /trips/:id/kanban-state
 */
export async function updateTripStatus(
  id: string | number,
  kanbanState: TripKanbanState,
): Promise<Trip> {
  const response = await apiClient.patch<{ data: Trip }>(`/trips/${id}/kanban-state`, {
    kanban_state: kanbanState,
  })
  return response.data.data
}
