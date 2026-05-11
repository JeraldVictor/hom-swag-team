/**
 * Reimbursements Service
 *
 * Typed wrappers around the BFF travel reimbursement endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { Reimbursement, ReimbursementBody } from '@/shared/models/reimbursement.model'

/**
 * Fetch all reimbursement requests for the authenticated field worker.
 * GET /reimbursements
 */
export async function getReimbursements(params?: {
  page?: number
  limit?: number
  status?: string
}): Promise<Reimbursement[]> {
  const response = await apiClient.get<{ data: Reimbursement[] }>('/reimbursements', { params })
  return response.data.data
}

/**
 * Submit a new reimbursement request.
 * POST /reimbursements
 */
export async function createReimbursement(body: ReimbursementBody): Promise<Reimbursement> {
  const response = await apiClient.post<{ data: Reimbursement }>('/reimbursements', body)
  return response.data.data
}

/**
 * Upload travel proof (receipt/photo) for a reimbursement request.
 * POST /reimbursements/:id/proof
 */
export async function uploadReimbursementProof(
  id: string | number,
  formData: FormData,
): Promise<Reimbursement> {
  const response = await apiClient.post<{ data: Reimbursement }>(
    `/reimbursements/${String(id)}/proof`,
    formData
  )
  return response.data.data
}

/**
 * Cancel a pending reimbursement request.
 * DELETE /reimbursements/:id
 */
export async function cancelReimbursement(id: string | number): Promise<Reimbursement> {
  const response = await apiClient.delete<{ data: Reimbursement }>(`/reimbursements/${id}`)
  return response.data.data
}
