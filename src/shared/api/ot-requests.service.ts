/**
 * OT Requests Service
 *
 * Typed wrappers around the BFF overtime request endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { OtRequest, OtRequestBody } from '@/shared/models/ot-request.model'

/**
 * Fetch all OT requests for the authenticated field worker.
 * GET /ot-requests
 */
export async function getOtRequests(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<OtRequest[]> {
  const response = await apiClient.get<{ data: OtRequest[] }>('/ot-requests', { params })
  return response.data.data
}

/**
 * Submit a new OT request.
 * POST /ot-requests
 */
export async function createOtRequest(body: OtRequestBody): Promise<OtRequest> {
  const response = await apiClient.post<{ data: OtRequest }>('/ot-requests', body)
  return response.data.data
}

/**
 * Cancel a pending OT request.
 * DELETE /ot-requests/:id
 */
export async function cancelOtRequest(id: string | number): Promise<OtRequest> {
  const response = await apiClient.delete<{ data: OtRequest }>(`/ot-requests/${id}`)
  return response.data.data
}
