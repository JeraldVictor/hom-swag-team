/**
 * Support Service
 *
 * Typed wrappers around the BFF support/feedback endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { SupportBody, SupportTicket } from '@/shared/models/support.model'

/**
 * Submit a support request or feedback.
 * POST /support
 */
export async function createSupportTicket(body: SupportBody): Promise<SupportTicket> {
  const response = await apiClient.post<{ data: SupportTicket }>('/support', body)
  return response.data.data
}

/**
 * List support/feedback submissions for the authenticated field worker.
 * GET /support
 */
export async function getSupportTickets(): Promise<SupportTicket[]> {
  const response = await apiClient.get<{ data: SupportTicket[] | { data: SupportTicket[] } }>(
    '/support'
  )
  const raw = response.data.data
  if (Array.isArray(raw)) return raw
  return (raw as { data: SupportTicket[] }).data ?? []
}
