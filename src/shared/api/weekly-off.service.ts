/**
 * Weekly Off Service
 *
 * Typed wrappers around the BFF weekly off request endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { WeeklyOffRequest, WeeklyOffRequestBody } from '@/shared/models/weekly-off.model'

/**
 * Fetch all weekly off requests for the authenticated field worker.
 * GET /weekly-off-requests
 */
export async function getWeeklyOffRequests(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<WeeklyOffRequest[]> {
  const response = await apiClient.get<{ data: WeeklyOffRequest[] }>('/weekly-off-requests', { params })
  return response.data.data
}

/**
 * Submit a new weekly off request.
 * POST /weekly-off-requests
 */
export async function createWeeklyOffRequest(body: WeeklyOffRequestBody): Promise<WeeklyOffRequest> {
  const response = await apiClient.post<{ data: WeeklyOffRequest }>('/weekly-off-requests', body)
  return response.data.data
}

/**
 * Cancel a pending weekly off request.
 * DELETE /weekly-off-requests/:id
 */
export async function cancelWeeklyOffRequest(id: string | number): Promise<WeeklyOffRequest> {
  const response = await apiClient.delete<{ data: WeeklyOffRequest }>(`/weekly-off-requests/${id}`)
  return response.data.data
}
