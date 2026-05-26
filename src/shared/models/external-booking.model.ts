/**
 * External Booking Request model.
 * Beauticians can request to log bookings sourced outside the platform.
 */

export type ExternalBookingStatus = 'requested' | 'pending' | 'approved' | 'rejected'

export interface ExternalBooking {
  id: string | number
  _id?: string
  customer_name: string
  customer_phone?: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  service_date: string
  service_time?: string
  service_description?: string
  cost?: number
  address?: string
  status: ExternalBookingStatus
  /** Proof image URL after upload */
  proof_url?: string
  /** All proof image URLs after upload */
  proof_urls?: string[]
  external_booking_details?: {
    provider?: string
    cost?: number
    reimbursement_status?: ExternalBookingStatus
    reimbursement_proof?: Array<{ url?: string }>
  }
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
  cost?: number
  address?: string
  order_id?: string
  pickup_location?: { latitude: number; longitude: number }
  drop_location?: { latitude: number; longitude: number }
  provider?: string
}
