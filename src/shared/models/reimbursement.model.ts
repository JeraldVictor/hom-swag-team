/**
 * Travel Reimbursement model.
 * Riders and beauticians can upload travel proof and request reimbursement.
 */

export type ReimbursementStatus = 'requested' | 'approved' | 'rejected' | 'paid'

export type ReimbursementType = 'auto' | 'bus' | 'train' | 'cab' | 'other'

export interface Reimbursement {
  id: string | number
  _id?: string
  /** ISO 8601 date string (YYYY-MM-DD) */
  travel_date: string
  travel_type: ReimbursementType
  amount: number
  description?: string
  /** Proof image/receipt URL after upload */
  proof_url?: string
  status: ReimbursementStatus
  /** Related order or trip ID if applicable */
  reference_id?: string
  reference_type?: 'order' | 'trip'
  requester_type?: 'beautician' | 'rider'
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}

export interface ReimbursementBody {
  requester_id: string
  requester_type: 'beautician' | 'rider'
  /** ISO 8601 date string (YYYY-MM-DD) */
  travel_date: string
  travel_type: ReimbursementType
  amount: number
  description?: string
  reference_id?: string
  reference_type?: 'order' | 'trip'
}
