/**
 * Discriminates between the two field worker roles in the app.
 * - `rider`      — transports beauticians and handles logistics
 * - `beautician` — performs beauty/cleaning services at customer premises
 */
export type UserType = 'rider' | 'beautician'

/**
 * A single uploaded document attached to a profile.
 */
export interface ProfileDocument {
  /** Document type key */
  type: string
  /** Display label */
  label: string
  /** URL of the uploaded file (image or PDF) */
  url?: string
  /** MIME type of the uploaded file */
  mime_type?: string
  /** ISO 8601 date-time string of when it was uploaded */
  uploaded_at?: string
  /** Verification status set by office staff */
  verified?: boolean
}

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
  /** Date of birth — ISO 8601 date string (YYYY-MM-DD) */
  date_of_birth?: string
  /** Residential address */
  address?: string
  /** Emergency contact name */
  emergency_contact_name?: string
  /** Emergency contact phone */
  emergency_contact_phone?: string
  /** Uploaded KYC and role-specific documents */
  documents?: ProfileDocument[]
  /** ISO 8601 date string */
  created_at?: string
  /** ISO 8601 date string */
  updated_at?: string
}
