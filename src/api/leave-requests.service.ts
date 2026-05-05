/**
 * Leave Requests Service
 *
 * Typed wrappers around the BFF leave request endpoints.
 */

import apiClient from '@/lib/api'
import type { LeaveRequest, LeaveRequestBody } from '@/models/leave-request.model'

/**
 * Fetch all leave requests for the authenticated field worker.
 * GET /leaves
 */
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const response = await apiClient.get<{ data: LeaveRequest[] }>('/leaves')
  return response.data.data
}

/**
 * Submit a new leave request.
 * POST /leaves
 */
export async function createLeaveRequest(body: LeaveRequestBody): Promise<LeaveRequest> {
  const response = await apiClient.post<{ data: LeaveRequest }>('/leaves', body)
  return response.data.data
}
