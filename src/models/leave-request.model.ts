/**
 * Approval lifecycle states for a leave request.
 */
export type LeaveStatus = 'requested' | 'approved' | 'rejected'

/**
 * Duration options for a leave request.
 * - `full_day`    — entire working day
 * - `first_half`  — morning half (requires start_time / end_time)
 * - `second_half` — afternoon half (requires start_time / end_time)
 */
export type LeaveDuration = 'full_day' | 'first_half' | 'second_half'

/**
 * A leave application entity submitted by a beautician or rider.
 */
export interface LeaveRequest {
  id: string | number
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  duration: LeaveDuration
  status: LeaveStatus
  reason: string
  /** ISO 8601 time string — required when duration is first_half or second_half */
  start_time?: string
  /** ISO 8601 time string — required when duration is first_half or second_half */
  end_time?: string
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}

/**
 * Request body for creating a new leave request.
 * Sent to POST /leaves
 */
export interface LeaveRequestBody {
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  duration: LeaveDuration
  reason: string
  /** Required when duration is first_half or second_half */
  start_time?: string
  /** Required when duration is first_half or second_half */
  end_time?: string
}
