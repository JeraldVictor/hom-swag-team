/**
 * Leave type options as defined by the BFF API.
 */
export type LeaveType = 'paid_leave' | 'sick_leave' | 'loss_of_pay' | 'block_time'

/**
 * Approval lifecycle states for a leave request.
 */
export type LeaveStatus = 'requested' | 'approved' | 'rejected'

/**
 * Duration options for a leave request.
 */
export type LeaveDuration = 'full_day' | 'first_half' | 'second_half'

/**
 * A leave application entity submitted by a beautician or rider.
 */
export interface LeaveRequest {
  id: string | number
  _id?: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  leave_type: LeaveType
  duration: LeaveDuration
  status: LeaveStatus
  reason?: string
  /** ISO 8601 time string — required when duration is first_half or second_half */
  start_time?: string
  /** ISO 8601 time string — required when duration is first_half or second_half */
  end_time?: string
  requester_type?: 'beautician' | 'rider'
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}

/**
 * Request body for creating a new leave request.
 * Sent to POST /leave-requests
 */
export interface LeaveRequestBody {
  requester_id: string
  requester_type: 'beautician' | 'rider'
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  leave_type: LeaveType
  duration: LeaveDuration
  reason?: string
  /** Required when duration is first_half or second_half — format: HH:MM AM/PM */
  start_time?: string
  /** Required when duration is first_half or second_half — format: HH:MM AM/PM */
  end_time?: string
}

/**
 * Leave balance summary returned by GET /leave-balance
 */
export interface LeaveBalance {
  paid_leave?: number
  sick_leave?: number
  loss_of_pay?: number
  block_time?: number
  total_taken?: number
  total_available?: number
  [key: string]: number | undefined
}
