/**
 * Menu Service
 *
 * Typed wrapper around the BFF menu endpoint.
 */

import apiClient from '@/shared/lib/api'
import type { MenuResponse } from '@/shared/models/menu.model'

/**
 * Fetch the full menu structure for the field app.
 * GET /menu
 */
export async function getMenu(params?: { zone_id?: string; city_id?: string }): Promise<MenuResponse> {
  const response = await apiClient.get<{ data: MenuResponse }>('/menu', { params })
  return response.data.data
}
