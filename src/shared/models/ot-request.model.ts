/**
 * OT (Overtime) Request model.
 * Maps to the server's OvertimeEntry model.
 * Submitted by beauticians and riders when they work beyond their scheduled hours.
 */

export type OtRequestStatus = 'requested' | 'approved' | 'rejected'

export interface OtRequest {
  id: string | number
  _id?: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  reason?: string
  /** Status — server OvertimeEntry has no approval flow yet; treat all as 'requested' */
  status: OtRequestStatus
  requester_type?: 'beautician' | 'rider'
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}

export interface OtRequestBody {
  requester_id: string
  requester_type: 'beautician' | 'rider'
  /** ISO 8601 date string (YYYY-MM-DD) */
  date: string
  reason?: string
}

export type OtRequestCreateBody = Pick<OtRequestBody, 'date' | 'reason'>
