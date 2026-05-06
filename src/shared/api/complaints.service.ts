/**
 * Complaints Service
 *
 * Typed wrapper around the BFF complaints endpoint.
 */

import apiClient from '@/shared/lib/api'
import type { Complaint } from '@/shared/models/complaint.model'

/**
 * Fetch complaints visible to the authenticated beautician.
 * GET /complaints
 */
export async function getComplaints(): Promise<Complaint[]> {
  const response = await apiClient.get<{ data: Complaint[] }>('/complaints')
  return response.data.data
}
