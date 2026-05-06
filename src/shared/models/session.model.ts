/**
 * An active login session for a field worker.
 */
export interface Session {
  id: string | number
  _id?: string
  device?: string
  client_type?: string
  ip_address?: string
  user_agent?: string
  is_current?: boolean
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  last_used_at?: string
  expires_at?: string
}
