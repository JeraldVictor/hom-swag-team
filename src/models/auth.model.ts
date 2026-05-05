import type { UserProfile } from './user.model'

/**
 * Request body for initiating OTP authentication.
 * Sent to POST /auth/otp/request
 */
export interface OtpRequestBody {
  phone: string
}

/**
 * Request body for verifying an OTP code.
 * Sent to POST /auth/otp/verify
 */
export interface OtpVerifyBody {
  phone: string
  otp: string
}

/**
 * Access/refresh token pair returned after successful authentication.
 */
export interface TokenPair {
  access_token: string
  refresh_token: string
}

/**
 * Full authentication response returned by the BFF API after OTP verification.
 * `get_profile` signals that the client should immediately fetch the full profile.
 */
export interface AuthResponse extends TokenPair {
  user: UserProfile
  get_profile?: boolean
}

/**
 * Request body for refreshing an access token.
 * Sent to POST /auth/refresh
 */
export interface RefreshTokenBody {
  refresh_token: string
}

/**
 * Request body for logging out and invalidating the refresh token.
 * Sent to POST /auth/logout
 */
export interface LogoutBody {
  refresh_token: string
}
