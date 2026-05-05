/**
 * Discriminates between the two field worker roles in the app.
 * - `rider`      — transports beauticians and handles logistics
 * - `beautician` — performs beauty/cleaning services at customer premises
 */
export type UserType = 'rider' | 'beautician'

/**
 * Profile data for an authenticated field worker.
 * Returned by GET /profile and embedded in AuthResponse.
 */
export interface UserProfile {
  id: string | number
  name: string
  phone: string
  user_type: UserType
  photo?: {
    url: string
  }
  email?: string
  /** ISO 8601 date string */
  created_at?: string
  /** ISO 8601 date string */
  updated_at?: string
}
