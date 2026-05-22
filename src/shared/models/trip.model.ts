import type { Coordinates } from './location.model'

/**
 * Kanban progression states for a rider's trip.
 * Covers both the API-returned states and the internal progression states.
 */
export type TripKanbanState =
  | 'requests'
  | 'assigned'
  | 'viewed_by_rider'
  | 'trip_started'
  | 'dropped_and_waiting'
  | 'trip_completed'
  | 'fare_calculation_pending'
  | 'completed'
  | 'cancelled'

/**
 * Raw GeoJSON Point as returned by the API.
 * coordinates: [longitude, latitude]
 */
export interface GeoJsonPoint {
  type: 'Point'
  coordinates: [number, number]
}

/**
 * Raw trip shape as returned by the BFF API.
 * Use this only in the service layer for normalization.
 */
export interface RawTrip {
  _id: string
  office_id: string
  rider_id: string
  order_id:
    | {
        _id: string
        order_number: string
        status: string
        customer?: {
          full_name: string
          email?: string
          phone?: string
        }
        booking_info?: {
          timing?: string
          date?: string
          surge_amount?: number
        }
      }
    | string
  pickup_location: GeoJsonPoint
  drop_location: GeoJsonPoint
  status: string
  trip_number: string
  kanban_state: TripKanbanState
  is_two_way: boolean
  is_self_drive: boolean
  created_at: string
  updated_at: string
  zone_id?: string
  auto_distance_km?: number
  fare?: number
  notes?: string
  beautician?: {
    name: string
    phone: string
  }
}

/**
 * Normalized trip entity used throughout the app.
 * Produced by normalizing a RawTrip in the service layer.
 */
export interface Trip {
  id: string
  trip_number: string
  kanban_state: TripKanbanState
  /** ISO 8601 — derived from created_at since API has no start_time */
  start_time: string
  pickup_location: Coordinates & { address?: string }
  drop_location: Coordinates & { address?: string }
  /** Customer name from the nested order */
  customer_name?: string
  /** Order number from the nested order */
  order_number?: string
  end_time?: string
  fare?: number
  created_at?: string
  updated_at?: string
  notes?: string
  is_two_way?: boolean
  auto_distance_km?: number
  is_external_booking?: boolean
  external_booking_details?: {
    provider: string
    cost: number
    reimbursement_status: string
  }
  beautician_name?: string
  beautician_phone?: string
}
