import type { Coordinates } from './location.model'

/**
 * Kanban progression states for a rider's trip.
 * Maps to the Timeline_Component steps for the rider flow.
 */
export type TripKanbanState =
  | 'Assigned'
  | 'Viewed'
  | 'Trip Started'
  | 'Trip Completed'
  | 'Fare Calculated'
  | 'Completed'

/**
 * A logistics entity representing a rider's journey from pickup to drop location.
 * The `kanban_state` field drives the Timeline_Component progression.
 */
export interface Trip {
  id: string | number
  kanban_state: TripKanbanState
  /** ISO 8601 date-time string for the trip start time */
  start_time: string
  pickup_location: Coordinates & {
    address?: string
  }
  drop_location: Coordinates & {
    address?: string
  }
  /** ISO 8601 date-time string */
  end_time?: string
  /** Calculated fare amount */
  fare?: number
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
  notes?: string
}
