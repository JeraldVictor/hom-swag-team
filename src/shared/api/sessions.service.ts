/**
 * Sessions Service
 *
 * Typed wrappers around the BFF sessions endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { Session } from '@/shared/models/session.model'

/**
 * List active login sessions for the authenticated field worker.
 * GET /sessions
 */
export async function getSessions(): Promise<Session[]> {
  const response = await apiClient.get<{ data: Session[] | { data: Session[] } }>('/sessions')
  const raw = response.data.data
  if (Array.isArray(raw)) return raw
  return (raw as { data: Session[] }).data ?? []
}

/**
 * Revoke a specific active session.
 * DELETE /sessions/:id
 */
export async function revokeSession(id: string | number): Promise<void> {
  await apiClient.delete(`/sessions/${id}`)
}
