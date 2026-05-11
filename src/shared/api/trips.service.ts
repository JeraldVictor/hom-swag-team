/**
 * Trips Service
 *
 * Typed wrappers around the BFF trips endpoints.
 * Normalizes the raw API response shape into the app's internal Trip model.
 *
 * API response shape:
 *   { success: true, statusCode: 200, data: RawTrip[], message: "OK" }
 *
 * Location coordinates come as GeoJSON: { type: "Point", coordinates: [lng, lat] }
 * We normalize these to { latitude, longitude }.
 */

import apiClient from '@/shared/lib/api'
import type { Coordinates } from '@/shared/models/location.model'
import type { RawTrip, Trip, TripKanbanState } from '@/shared/models/trip.model'

// ── Normalization helpers ──────────────────────────────────────────────────

/**
 * Convert a GeoJSON Point [lng, lat] to our { latitude, longitude } shape.
 */
function geoJsonToCoords(geo: { coordinates: [number, number] }): Coordinates {
  return {
    latitude: geo.coordinates[1],
    longitude: geo.coordinates[0],
  }
}

/**
 * Normalize a raw API trip object into the app's internal Trip model.
 */
function normalizeTrip(raw: RawTrip): Trip {
  const orderId = raw.order_id

  const customerName = typeof orderId === 'object' ? orderId.customer?.full_name : undefined
  const orderNumber = typeof orderId === 'object' ? orderId.order_number : undefined

  return {
    id: raw._id,
    trip_number: raw.trip_number,
    kanban_state: raw.kanban_state,
    start_time: raw.created_at,
    pickup_location: geoJsonToCoords(raw.pickup_location),
    drop_location: geoJsonToCoords(raw.drop_location),
    customer_name: customerName,
    order_number: orderNumber,
    fare: raw.fare,
    notes: raw.notes,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    is_two_way: raw.is_two_way,
    auto_distance_km: raw.auto_distance_km,
  }
}

// ── API functions ──────────────────────────────────────────────────────────

/**
 * Fetch the list of trips assigned to the authenticated rider.
 * GET /trips
 *
 * Returns a normalized Trip array regardless of whether the API
 * returns a plain array or a paginated envelope.
 */
export async function getTrips(page?: number, limit?: number): Promise<Trip[]> {
  const response = await apiClient.get<{ data: RawTrip[] | { data: RawTrip[] } }>('/trips', {
    params: { page, limit },
  })

  const payload = response.data.data

  // Handle plain array: { data: RawTrip[] }
  if (Array.isArray(payload)) {
    return payload.map(normalizeTrip)
  }

  // Handle paginated envelope: { data: { data: RawTrip[], total, page, limit } }
  if (payload && Array.isArray((payload as { data: RawTrip[] }).data)) {
    return (payload as { data: RawTrip[] }).data.map(normalizeTrip)
  }

  return []
}

/**
 * Fetch a single trip by ID.
 * GET /trips/:id
 */
export async function getTrip(id: string | number): Promise<Trip> {
  const response = await apiClient.get<{ data: RawTrip }>(`/trips/${id}`)
  return normalizeTrip(response.data.data)
}

/**
 * Update the kanban state of a trip.
 * PATCH /trips/:id/kanban-state
 */
export async function updateTripStatus(
  id: string | number,
  kanbanState: TripKanbanState
): Promise<Trip> {
  const response = await apiClient.patch<{ data: RawTrip }>(`/trips/${id}/kanban-state`, {
    kanban_state: kanbanState,
  })
  return normalizeTrip(response.data.data)
}

/**
 * Confirm the customer's pickup location and address.
 * PATCH /trips/:id/confirm-location
 */
export async function confirmCustomerLocation(
  id: string | number,
  body: { latitude: number; longitude: number; address?: string }
): Promise<Trip> {
  const response = await apiClient.patch<{ data: RawTrip }>(`/trips/${id}/confirm-location`, body)
  return normalizeTrip(response.data.data)
}

/**
 * Update the self-ride status for a trip (rider travelling independently).
 * PATCH /trips/:id/self-ride
 */
export async function updateRiderSelfRideStatus(
  id: string | number,
  isSelfRide: boolean
): Promise<Trip> {
  const response = await apiClient.patch<{ data: RawTrip }>(`/trips/${id}/self-ride`, {
    is_self_ride: isSelfRide,
  })
  return normalizeTrip(response.data.data)
}
