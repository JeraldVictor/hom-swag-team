/**
 * Location Service (API)
 *
 * Typed wrapper around the BFF location endpoint.
 */

import apiClient from '@/shared/lib/api'
import type { LocationPayload } from '@/shared/models/location.model'

/**
 * Post the current GPS location to the BFF API.
 * POST /location
 */
export async function postLocation(payload: LocationPayload): Promise<void> {
  await apiClient.post('/location', payload)
}
