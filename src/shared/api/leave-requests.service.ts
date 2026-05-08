/**
 * Leave Requests Service
 *
 * Typed wrappers around the BFF leave request endpoints.
 * API path: /leave-requests (not /leaves)
 */

import apiClient from '@/shared/lib/api'
import type { LeaveRequest, LeaveRequestBody, LeaveBalance } from '@/shared/models/leave-request.model'

/**
 * Fetch all leave requests for the authenticated field worker.
 * GET /leave-requests
 */
export async function getLeaveRequests(params?: {
  page?: number
  limit?: number
  status?: string
  date_from?: string
  date_to?: string
}): Promise<LeaveRequest[]> {
  const response = await apiClient.get<{
    data: LeaveRequest[] | { data: LeaveRequest[]; pagination?: unknown }
  }>('/leave-requests', { params })
  const raw = response.data.data
  // Handle both plain array and paginated envelope
  if (Array.isArray(raw)) return raw
  return (raw as { data: LeaveRequest[] }).data ?? []
}

/**
 * Submit a new leave request.
 * POST /leave-requests
 */
export async function createLeaveRequest(body: LeaveRequestBody): Promise<LeaveRequest> {
  const response = await apiClient.post<{ data: LeaveRequest }>('/leave-requests', body)
  return response.data.data
}

/**
 * Cancel a pending leave request.
 * DELETE /leave-requests/:id
 */
export async function cancelLeaveRequest(id: string | number): Promise<LeaveRequest> {
  const response = await apiClient.delete<{ data: LeaveRequest }>(`/leave-requests/${id}`)
  return response.data.data
}

/**
 * Get leave balance summary for the authenticated field worker.
 * GET /leave-balance
 */
export async function getLeaveBalance(): Promise<LeaveBalance> {
  const response = await apiClient.get<{ data: LeaveBalance }>('/leave-balance')
  return response.data.data
}
