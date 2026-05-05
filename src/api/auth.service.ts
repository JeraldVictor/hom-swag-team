/**
 * Auth Service
 *
 * Typed wrappers around the BFF authentication endpoints.
 */

import apiClient from '@/lib/api'
import type {
  OtpRequestBody,
  OtpVerifyBody,
  AuthResponse,
  RefreshTokenBody,
  TokenPair,
  LogoutBody,
} from '@/models/auth.model'

/**
 * Request an OTP to be sent to the provided phone number.
 * POST /auth/otp/request
 */
export async function requestOtp(body: OtpRequestBody): Promise<void> {
  await apiClient.post('/auth/otp/request', body)
}

/**
 * Verify the OTP and receive an auth response with tokens and user profile.
 * POST /auth/otp/verify
 */
export async function verifyOtp(body: OtpVerifyBody): Promise<AuthResponse> {
  const response = await apiClient.post<{ data: AuthResponse }>('/auth/otp/verify', body)
  return response.data.data
}

/**
 * Refresh the access token using a valid refresh token.
 * POST /auth/refresh
 */
export async function refreshToken(body: RefreshTokenBody): Promise<TokenPair> {
  const response = await apiClient.post<{ data: TokenPair }>('/auth/refresh', body)
  return response.data.data
}

/**
 * Invalidate the refresh token and log the user out.
 * POST /auth/logout
 */
export async function logout(body: LogoutBody): Promise<void> {
  await apiClient.post('/auth/logout', body)
}
