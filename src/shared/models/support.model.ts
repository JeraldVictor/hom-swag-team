/**
 * Support/feedback category options.
 */
export type SupportCategory = 'support' | 'feedback' | 'bug_report' | 'other'

/**
 * Request body for submitting support/feedback.
 * Sent to POST /support
 */
export interface SupportBody {
  category: SupportCategory
  subject: string
  description: string
}

/**
 * A support/feedback submission.
 */
export interface SupportTicket {
  id: string | number
  _id?: string
  category: SupportCategory
  subject: string
  description: string
  status?: string
  /** ISO 8601 date-time string */
  created_at?: string
}
