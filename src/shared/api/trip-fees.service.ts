/**
 * Trip Fees Service
 *
 * Typed wrappers around the BFF trip fees report endpoints.
 * Riders use this to view their earnings breakdown.
 */

import apiClient from '@/shared/lib/api'
import type { TripFeesReport } from '@/shared/models/trip-fees.model'

/**
 * Fetch the trip fees report for the authenticated rider.
 * GET /trip-fees
 */
export async function getTripFeesReport(params?: {
  from_date?: string
  to_date?: string
  q?: string
  page?: number
  limit?: number
}): Promise<TripFeesReport> {
  const response = await apiClient.get<{ data: TripFeesReport }>('/trip-fees', { params })
  return response.data.data
}
