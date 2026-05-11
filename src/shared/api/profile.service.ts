/**
 * Profile Service
 *
 * Typed wrappers around the BFF profile endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { ProfileDocument, UserProfile } from '@/shared/models/user.model'

/**
 * Fetch the authenticated field worker's profile.
 * GET /profile
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<{ data: UserProfile }>('/profile')
  return response.data.data
}

/**
 * Update the authenticated field worker's profile fields.
 * PATCH /profile
 */
export async function updateProfile(
  data: Partial<UserProfile> & Record<string, unknown>
): Promise<UserProfile> {
  const response = await apiClient.patch<{ data: UserProfile }>('/profile', data)
  return response.data.data
}

/**
 * Upload or replace the profile photo.
 * POST /profile/photo
 */
export async function uploadProfilePhoto(formData: FormData): Promise<UserProfile> {
  const response = await apiClient.post<{ data: UserProfile }>('/profile/photo', formData)
  return response.data.data
}

/**
 * Upload a KYC or role-specific document.
 * POST /profile/documents/:type
 */
export async function uploadProfileDocument(
  type: string,
  formData: FormData
): Promise<ProfileDocument> {
  const response = await apiClient.post<{ data: ProfileDocument }>(
    `/profile/documents/${String(type)}`,
    formData
  )
  return response.data.data
}

/**
 * Delete a previously uploaded document.
 * DELETE /profile/documents/:type
 */
export async function deleteProfileDocument(type: string): Promise<void> {
  await apiClient.delete(`/profile/documents/${type}`)
}
