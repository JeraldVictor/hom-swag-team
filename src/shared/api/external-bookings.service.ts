/**
 * External Bookings Service
 *
 * Typed wrappers around the BFF external booking endpoints.
 * Beauticians use this to log bookings sourced outside the platform.
 */

import apiClient from '@/shared/lib/api'
import type { ExternalBooking, ExternalBookingBody } from '@/shared/models/external-booking.model'

/**
 * Fetch all external booking requests for the authenticated beautician.
 * GET /external-bookings
 */
export async function getExternalBookings(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<ExternalBooking[]> {
  const response = await apiClient.get<{ data: ExternalBooking[] }>('/external-bookings', { params })
  return response.data.data
}

/**
 * Submit a new external booking request.
 * POST /external-bookings
 */
export async function createExternalBooking(body: ExternalBookingBody): Promise<ExternalBooking> {
  const response = await apiClient.post<{ data: ExternalBooking }>('/external-bookings', body)
  return response.data.data
}

/**
 * Upload proof for an external booking.
 * POST /external-bookings/:id/proof
 */
export async function uploadExternalBookingProof(
  id: string | number,
  formData: FormData,
): Promise<ExternalBooking> {
  const response = await apiClient.post<{ data: ExternalBooking }>(
    `/external-bookings/${id}/proof`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return response.data.data
}
