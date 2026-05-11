/**
 * OT Requests Service
 *
 * Typed wrappers around the BFF overtime request endpoints.
 * Server endpoint: /ot-requests (maps to OvertimeEntry model)
 */

import apiClient from '@/shared/lib/api'
import type { OtRequest, OtRequestCreateBody } from '@/shared/models/ot-request.model'

/**
 * Fetch all OT requests for the authenticated field worker.
 * GET /ot-requests
 */
export async function getOtRequests(): Promise<OtRequest[]> {
  const response = await apiClient.get<{ data: OtRequest[] | { data: OtRequest[] } }>(
    '/ot-requests'
  )
  const raw = response.data.data
  if (Array.isArray(raw)) return raw
  return (raw as { data: OtRequest[] }).data ?? []
}

/**
 * Submit a new OT request.
 * POST /ot-requests
 * Body: { date: YYYY-MM-DD, reason?: string }
 */
export async function createOtRequest(body: OtRequestCreateBody): Promise<OtRequest> {
  const response = await apiClient.post<{ data: OtRequest }>('/ot-requests', body)
  return response.data.data
}

/**
 * Cancel a pending OT request.
 * DELETE /ot-requests/:id
 */
export async function cancelOtRequest(id: string | number): Promise<void> {
  await apiClient.delete(`/ot-requests/${id}`)
}
