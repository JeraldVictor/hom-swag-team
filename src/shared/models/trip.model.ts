import type { OrderAddress } from '@/shared/models/order.model'
import type { Coordinates } from './location.model'

/**
 * Kanban progression states for a rider's trip.
 * Covers both the API-returned states and the internal progression states.
 */
export enum KANBAN_STATE {
  REQUESTS = 'requests',
  ASSIGNED = 'assigned',
  VIEWED_BY_RIDER = 'viewed_by_rider',
  TRIP_STARTED = 'trip_started',
  DROPPED_AND_WAITING = 'dropped_and_waiting',
  TRIP_COMPLETED = 'trip_completed',
  FARE_CALCULATION_PENDING = 'fare_calculation_pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ATTENTION_NEEDED = 'attention_needed',
}

export type TripKanbanState =
  | 'requests'
  | 'assigned'
  | 'viewed_by_rider'
  | 'trip_started'
  | 'dropped_and_waiting'
  | 'trip_completed'
  | 'fare_calculation_pending'
  | 'attention_needed'
  | 'completed'
  | 'cancelled'

export enum TRIP_STATUS {
  SCHEDULED = 'scheduled',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  STARTED = 'started',
  DROPPED_AND_WAITING = 'dropped_and_waiting',
  ATTENTION_NEEDED = 'attention_needed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export type TripStatus = `${TRIP_STATUS}`

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
          effective_start_time?: string
          selected_start_time?: string
          surge_amount?: number
        }
        address?: OrderAddress
        delivery_address?: OrderAddress
      }
    | string
    | null
  pickup_location: GeoJsonPoint
  drop_location: GeoJsonPoint
  status?: TripStatus
  is_viewed?: boolean
  viewed_at?: string
  trip_number: string
  date?: string
  kanban_state: TripKanbanState
  is_two_way: boolean
  is_self_drive: boolean
  created_at: string
  updated_at: string
  order_date?: string
  order_time?: string
  zone_id?: string
  auto_distance_km?: number
  extra_km?: number
  is_commission_applicable?: boolean
  commission_amount?: number
  fare?: number
  fare_calculation?: {
    trip_distance_km?: number
    petrol_cost_per_liter?: number
    standard_mileage_per_liter?: number
    calculated_fare?: number
    calculated_at?: string
  }
  notes?: string
  pickup_note?: string
  drop_note?: string
  attention_note?: string
  beautician?: {
    name?: string | null
    phone?: string | null
  } | null
}

/**
 * Normalized trip entity used throughout the app.
 * Produced by normalizing a RawTrip in the service layer.
 */
export interface Trip {
  id: string
  trip_number: string
  status: TripStatus
  kanban_state: TripKanbanState
  is_viewed?: boolean
  viewed_at?: string
  /** ISO 8601 — derived from scheduled order time or created_at fallback */
  start_time: string
  pickup_location: Coordinates & { address?: string }
  drop_location: Coordinates & { address?: string }
  /** Customer name from the nested order */
  customer_name?: string
  /** Order number from the nested order */
  order_number?: string
  date?: string
  order_date?: string
  order_time?: string
  end_time?: string
  fare?: number
  created_at?: string
  updated_at?: string
  notes?: string
  pickup_note?: string
  drop_note?: string
  attention_note?: string
  is_two_way?: boolean
  auto_distance_km?: number
  extra_km?: number
  is_commission_applicable?: boolean
  commission_amount?: number
  fare_calculation?: RawTrip['fare_calculation']
  is_external_booking?: boolean
  external_booking_details?: {
    provider: string
    cost: number
    reimbursement_status: string
  }
  beautician_name?: string
  beautician_phone?: string
}
