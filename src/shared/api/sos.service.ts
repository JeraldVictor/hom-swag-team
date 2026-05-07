/**
 * SOS Service
 *
 * Typed wrappers around the BFF SOS alert endpoints.
 * Triggering an SOS notifies office staff to call the field worker.
 */

import apiClient from '@/shared/lib/api'
import type { SosAlert, SosTriggerBody } from '@/shared/models/sos.model'

/**
 * Trigger an SOS alert.
 * POST /sos
 */
export async function triggerSos(body: SosTriggerBody): Promise<SosAlert> {
  const response = await apiClient.post<{ data: SosAlert }>('/sos', body)
  return response.data.data
}

/**
 * Fetch the most recent SOS alert for the authenticated user.
 * GET /sos/latest
 */
export async function getLatestSos(): Promise<SosAlert | null> {
  try {
    const response = await apiClient.get<{ data: SosAlert | null }>('/sos/latest')
    return response.data.data
  } catch {
    return null
  }
}

/**
 * Resolve/cancel an active SOS alert.
 * PATCH /sos/:id/resolve
 */
export async function resolveSos(id: string | number): Promise<SosAlert> {
  const response = await apiClient.patch<{ data: SosAlert }>(`/sos/${id}/resolve`)
  return response.data.data
}
