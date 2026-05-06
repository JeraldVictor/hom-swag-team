/**
 * Profile Service
 *
 * Typed wrappers around the BFF profile endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { UserProfile } from '@/shared/models/user.model'

/**
 * Fetch the authenticated field worker's profile.
 * GET /profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<{ data: UserProfile }>('/profile')
  return response.data.data
}

/**
 * Update the authenticated field worker's profile.
 * PATCH /profile
 */
export async function updateProfile(data: Partial<UserProfile> & Record<string, unknown>): Promise<UserProfile> {
  const response = await apiClient.patch<{ data: UserProfile }>('/profile', data)
  return response.data.data
}
