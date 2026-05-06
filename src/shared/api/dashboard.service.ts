/**
 * Dashboard Service
 *
 * Typed wrapper around the BFF dashboard endpoint.
 */

import apiClient from '@/shared/lib/api'
import type { DashboardData } from '@/shared/models/dashboard.model'

/**
 * Fetch dashboard summary for the authenticated field worker.
 * GET /dashboard
 */
export async function getDashboard(): Promise<DashboardData> {
  const response = await apiClient.get<{ data: DashboardData }>('/dashboard')
  return response.data.data
}
