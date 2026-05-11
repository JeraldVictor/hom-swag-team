/**
 * Weekly Off Service
 *
 * Typed wrappers around the BFF weekly off request endpoints.
 * Server endpoint: /weekly-off-requests (maps to WeekOff model)
 */

import apiClient from '@/shared/lib/api'
import type { WeeklyOffCreateBody, WeeklyOffRequest } from '@/shared/models/weekly-off.model'

/**
 * Fetch all weekly off requests for the authenticated field worker.
 * GET /weekly-off-requests
 */
export async function getWeeklyOffRequests(): Promise<WeeklyOffRequest[]> {
  const response = await apiClient.get<{ data: WeeklyOffRequest[] | { data: WeeklyOffRequest[] } }>(
    '/weekly-off-requests'
  )
  const raw = response.data.data
  if (Array.isArray(raw)) return raw
  return (raw as { data: WeeklyOffRequest[] }).data ?? []
}

/**
 * Submit a new weekly off request.
 * POST /weekly-off-requests
 * Body: { day_of_week: 0-6 | string, effective_from: YYYY-MM-DD, effective_to: YYYY-MM-DD, reason?: string }
 */
export async function createWeeklyOffRequest(body: WeeklyOffCreateBody): Promise<WeeklyOffRequest> {
  const response = await apiClient.post<{ data: WeeklyOffRequest }>('/weekly-off-requests', body)
  return response.data.data
}

/**
 * Cancel a weekly off request.
 * DELETE /weekly-off-requests/:id
 */
export async function cancelWeeklyOffRequest(id: string | number): Promise<void> {
  await apiClient.delete(`/weekly-off-requests/${id}`)
}
