import type { UserProfile } from './user.model'

/**
 * Request body for initiating OTP authentication.
 * Sent to POST /auth/otp/request
 */
export interface OtpRequestBody {
  phone: string
}

/**
 * Response from POST /auth/otp/request
 * `otp` is only present in non-production environments.
 */
export interface OtpRequestResponse {
  new_user: boolean
  otp?: string | null
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
 * Full authentication response returned by the BFF API after OTP verification.
 * Field names match the OpenAPI spec: camelCase `accessToken` / `refreshToken`.
 * `get_profile` signals that the client should immediately fetch the full profile.
 */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  get_profile: boolean
  user: {
    id: string
    name: string
    phone: string
    user_type: UserProfile['user_type']
    office_id?: string
  }
}

/**
 * Request body for refreshing an access token.
 * Sent to POST /auth/refresh
 */
export interface RefreshTokenBody {
  refresh_token: string
}

/**
 * Token pair returned by POST /auth/refresh.
 * Field names match the OpenAPI spec.
 */
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

/**
 * Request body for logging out and invalidating the refresh token.
 * Sent to POST /auth/logout
 */
export interface LogoutBody {
  refresh_token: string
}
