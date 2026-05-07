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
  blocked_reason?: 'leave' | 'week_off' | 'block_time'
}

/**
 * Coordinates payload for POST /location.
 */
export interface PushLocationPayload {
  latitude: number
  longitude: number
  accuracy?: number
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

/**
 * Push the worker's current GPS coordinates to the server.
 *
 * POST /location
 *
 * HTTP 503 → feature flag disabled (caller should stop the interval).
 * HTTP 422 → worker is blocked (caller should skip the tick).
 */
export async function pushLocation(coords: PushLocationPayload): Promise<void> {
  await apiClient.post('/location', coords)
}
