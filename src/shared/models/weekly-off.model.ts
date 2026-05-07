/**
 * Weekly Off Request model.
 * Submitted by beauticians and riders to request a specific day off each week.
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
  /** Preferred day of the week */
  day_of_week: DayOfWeek
  /** ISO 8601 date string — the specific date being requested off */
  date?: string
  reason?: string
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
  day_of_week: DayOfWeek
  /** ISO 8601 date string (YYYY-MM-DD) */
  date?: string
  reason?: string
}
