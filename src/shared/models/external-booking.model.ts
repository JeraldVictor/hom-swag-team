/**
 * External Booking Request model.
 * Beauticians can request to log bookings sourced outside the platform.
 */

export type ExternalBookingStatus = 'requested' | 'approved' | 'rejected'

export interface ExternalBooking {
  id: string | number
  _id?: string
  customer_name: string
  customer_phone?: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  service_date: string
  service_time?: string
  service_description?: string
  amount?: number
  address?: string
  status: ExternalBookingStatus
  /** Proof image URL after upload */
  proof_url?: string
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}

export interface ExternalBookingBody {
  customer_name: string
  customer_phone?: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  service_date: string
  service_time?: string
  service_description?: string
  amount?: number
  address?: string
}
