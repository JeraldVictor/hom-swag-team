/**
 * Orders Service
 *
 * Typed wrappers around the BFF orders endpoints.
 */

import apiClient from '@/lib/api'
import type { Order, OrderStatus } from '@/models/order.model'
import type { PaginatedResponse } from '@/models/pagination.model'

/**
 * Fetch a paginated list of orders assigned to the authenticated beautician.
 * GET /orders
 */
export async function getOrders(page?: number, limit?: number): Promise<PaginatedResponse<Order>> {
  const response = await apiClient.get<{ data: PaginatedResponse<Order> }>('/orders', {
    params: { page, limit },
  })
  return response.data.data
}

/**
 * Fetch a single order by ID.
 * GET /orders/:id
 */
export async function getOrder(id: string | number): Promise<Order> {
  const response = await apiClient.get<{ data: Order }>(`/orders/${id}`)
  return response.data.data
}

/**
 * Update the status of an order.
 * PATCH /orders/:id/status
 */
export async function updateOrderStatus(id: string | number, status: OrderStatus): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}/status`, { status })
  return response.data.data
}
