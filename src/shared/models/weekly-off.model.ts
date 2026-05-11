/**
 * Weekly Off Request model.
 * Maps to the server's WeekOff model.
 * Submitted by beauticians and riders to request a recurring day off.
 */

export type WeeklyOffStatus = 'requested' | 'approved' | 'rejected'

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface WeeklyOffRequest {
  id: string | number
  _id?: string
  /** Preferred day of the week (string name from server's day_of_week_name) */
  day_of_week: DayOfWeek
  /** Numeric day (0=Sunday … 6=Saturday) as stored on server */
  day_of_week_num?: number
  /** Effective from date (YYYY-MM-DD) */
  effective_from?: string
  /** Effective to date (YYYY-MM-DD) */
  effective_to?: string
  /** Legacy: specific date field (kept for calendar compatibility) */
  date?: string
  reason?: string
  /** is_active flag from server */
  is_active?: boolean
  status: WeeklyOffStatus
  requester_type?: 'beautician' | 'rider'
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}

export interface WeeklyOffRequestBody {
  requester_id: string
  requester_type: 'beautician' | 'rider'
  /** Day name or 0-6 number */
  day_of_week: DayOfWeek | number
  /** ISO 8601 date string (YYYY-MM-DD) */
  effective_from: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  effective_to: string
  reason?: string
}

export type WeeklyOffCreateBody = Pick<
  WeeklyOffRequestBody,
  'day_of_week' | 'effective_from' | 'effective_to' | 'reason'
>
