/**
 * Location Service (API)
 *
 * Typed wrappers around the BFF field location endpoints.
 *
 * Note: The Vite dev proxy maps `/api/*` → `http://localhost:3000/bff/field/*`,
 * so paths here are relative to the BFF field base (e.g. `/tracking-status`,
 * `/location`). The BFF field prefix is handled by the proxy / base URL.
 */

import apiClient from '@/shared/lib/api'
import { webSocketService } from '@/shared/lib/websocket.service'
import { getProfile } from '@/shared/api/profile.service'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import type { UserProfile } from '@/shared/models/user.model'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Response from GET /tracking-status.
 * Tells the mobile tracker whether to run and whether the worker is blocked.
 */
export interface TrackingStatusResponse {
  /** Feature flag for the worker's office — if false, stop the interval */
  is_enabled: boolean
  /** Worker is on leave / week-off / block_time right now — if true, skip tick */
  is_blocked: boolean
  interval_ms?: number
  blocked_reason?: 'leave' | 'week_off' | 'block_time'
}

/**
 * Coordinates payload for POST /location.
 */
export interface PushLocationPayload {
  latitude: number
  longitude: number
  accuracy?: number
  office_id: string
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Check whether location tracking is enabled for the worker's office and
 * whether the worker is currently in a blocked duration.
 *
 * GET /tracking-status
 */
export async function getTrackingStatus(): Promise<TrackingStatusResponse> {
  const response = await apiClient.get<{ data: TrackingStatusResponse }>('/tracking-status')
  return response.data.data
}

export async function getOfficeId(): Promise<string> {
  const storedProfile = await Storage_Service.getJSON<UserProfile>(STORAGE_KEYS.userProfile)
  if (storedProfile?.office_id) {
    return storedProfile.office_id
  }

  const profile = await getProfile()
  if (profile.office_id) {
    await Storage_Service.setJSON(STORAGE_KEYS.userProfile, profile)
    return profile.office_id
  }

  throw new Error('Unable to resolve office_id for location push')
}

/**
 * Internal master switch for location tracking.
 * This can be updated by the useLocationTracker singleton based on BFF status.
 */
let isTrackingMasterEnabled = true

/**
 * Update the master tracking switch.
 * @param enabled  Whether tracking is globally enabled for this worker.
 */
export function setTrackingMasterStatus(enabled: boolean): void {
  isTrackingMasterEnabled = enabled
}

/**
 * Push the worker's current GPS coordinates to the server.
 *
 * Prefers WebSocket emission if connected (Requirement 2.2).
 * Falls back to REST POST /location if WebSocket is unavailable.
 *
 * This function respects the master tracking switch.
 *
 * HTTP 503 → feature flag disabled (caller should stop the interval).
 * HTTP 422 → worker is blocked (caller should skip the tick).
 */
export async function pushLocation(coords: PushLocationPayload): Promise<void> {
  if (!isTrackingMasterEnabled) {
    return
  }

  if (webSocketService.isConnected) {
    console.log('[location.service] Sending location over WebSocket', coords)
    webSocketService.emitLocation(coords)
    return
  }

  console.log('[location.service] WebSocket disconnected, posting location to /location', coords)
  await apiClient.post('/location', coords)
}
