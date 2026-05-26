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
import { getOfficeId } from '@/shared/api/location.service'
import type { Coordinates } from '@/shared/models/location.model'
import type { RawTrip, Trip, TripKanbanState } from '@/shared/models/trip.model'

// ── Normalization helpers ──────────────────────────────────────────────────

/**
 * Convert a GeoJSON Point [lng, lat] to our { latitude, longitude } shape.
 */
function geoJsonToCoords(geo?: { coordinates: [number, number] }): Coordinates {
  if (!geo || !geo.coordinates || geo.coordinates.length < 2) {
    return {} as Coordinates
  }
  return {
    latitude: geo.coordinates[1],
    longitude: geo.coordinates[0],
  }
}

/**
 * Normalize a raw API trip object into the app's internal Trip model.
 */
function parseIstStartTime(orderDate?: string, orderTime?: string): string | undefined {
  if (!orderDate || !orderTime) return undefined

  const dateParts = orderDate.split('-').map(Number)
  const timeParts = orderTime.split(':').map(Number)

  if (dateParts.length !== 3 || timeParts.length < 2) {
    return undefined
  }

  const [year, month, day] = dateParts
  const [hours, minutes] = timeParts
  if ([year, month, day, hours, minutes].some(n => Number.isNaN(n))) {
    return undefined
  }

  // Construct a UTC timestamp that represents the same instant as the given IST date/time.
  const utcHours = hours - 5
  const utcMinutes = minutes - 30
  const date = new Date(Date.UTC(year, month - 1, day, utcHours, utcMinutes))

  return date.toISOString()
}

function normalizeTrip(raw: RawTrip): Trip {
  const orderId = raw.order_id

  const customerName = typeof orderId === 'object' ? orderId.customer?.full_name : undefined
  const orderNumber = typeof orderId === 'object' ? orderId.order_number : undefined
  const orderDate =
    typeof orderId === 'object' ? orderId.booking_info?.date || raw.order_date : raw.order_date
  const orderTime =
    typeof orderId === 'object'
      ? orderId.booking_info?.effective_start_time ||
        orderId.booking_info?.selected_start_time ||
        raw.order_time
      : raw.order_time
  const scheduledStartTime = parseIstStartTime(orderDate, orderTime)

  return {
    id: raw._id,
    trip_number: raw.trip_number,
    kanban_state: raw.kanban_state,
    start_time: scheduledStartTime ?? raw.created_at,
    pickup_location: geoJsonToCoords(raw.pickup_location),
    drop_location: geoJsonToCoords(raw.drop_location),
    customer_name: customerName,
    order_number: orderNumber,
    order_date: orderDate,
    order_time: orderTime,
    fare: raw.fare,
    notes: raw.notes,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    is_two_way: raw.is_two_way,
    auto_distance_km: raw.auto_distance_km,
    beautician_name: raw.beautician?.name,
    beautician_phone: raw.beautician?.phone,
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
export async function getTrips(
  params: Record<string, any> = {}
): Promise<{ data: Trip[]; pagination?: any }> {
  if (!params.office_id) {
    params.office_id = await getOfficeId()
  }

  if (params.status && !params.kanban_state) {
    params.kanban_state = params.status
    delete params.status
  }

  const response = await apiClient.get<any>('/trips', { params })

  // Handle new paginated format vs old format
  let rawData: RawTrip[] = []
  let pagination = undefined

  if (response.data?.data && !Array.isArray(response.data.data) && response.data.data.data) {
    // Nested format from backend: { data: { data: [...], pagination: {...} } }
    rawData = response.data.data.data
    pagination = response.data.data.pagination
  } else if (response.data?.pagination) {
    // Top-level pagination
    rawData = response.data.data || []
    pagination = response.data.pagination
  } else if (Array.isArray(response.data?.data)) {
    // Flat array format
    rawData = response.data.data
  }

  return {
    data: rawData.map(normalizeTrip),
    pagination,
  }
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
  kanbanState: TripKanbanState,
  distanceKm?: number
): Promise<Trip> {
  const response = await apiClient.patch<{ data: RawTrip }>(`/trips/${id}/kanban-state`, {
    kanban_state: kanbanState,
    distance_km: distanceKm,
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
