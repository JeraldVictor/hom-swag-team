/**
 * Profile Service
 *
 * Typed wrapper around the BFF profile endpoint.
 */

import apiClient from '@/lib/api'
import type { UserProfile } from '@/models/user.model'

/**
 * Fetch the authenticated field worker's profile.
 * GET /profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<{ data: UserProfile }>('/profile')
  return response.data.data
}
