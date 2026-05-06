/**
 * A complaint entity visible to a beautician.
 */
export interface Complaint {
  id: string | number
  _id?: string
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  order_id?: string
  order_number?: string
  customer_name?: string
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
}
