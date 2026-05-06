/**
 * Orders Service
 *
 * Typed wrappers around the BFF orders endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { Order, UpdateOrderStatusBody, VerifyServiceOtpBody } from '@/shared/models/order.model'
import type { PaginatedResponse } from '@/shared/models/pagination.model'

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
 * GET /orders/:id  (via PATCH /orders/:id which returns the order)
 */
export async function getOrder(id: string | number): Promise<Order> {
  const response = await apiClient.get<{ data: Order }>(`/orders/${id}`)
  return response.data.data
}

/**
 * Update the status of an order.
 * PATCH /orders/:id/status
 */
export async function updateOrderStatus(
  id: string | number,
  body: UpdateOrderStatusBody,
): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}/status`, body)
  return response.data.data
}

/**
 * Generate a service OTP for the order (before starting service).
 * POST /orders/:id/otp/generate
 */
export async function generateServiceOtp(id: string | number): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(`/orders/${id}/otp/generate`)
  return response.data.data
}

/**
 * Verify the service OTP provided by the customer.
 * POST /orders/:id/otp/verify
 */
export async function verifyServiceOtp(
  id: string | number,
  body: VerifyServiceOtpBody,
): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(`/orders/${id}/otp/verify`, body)
  return response.data.data
}

/**
 * Update order details (products, delivery address, etc.).
 * PATCH /orders/:id
 */
export async function updateOrder(
  id: string | number,
  body: { products?: unknown[]; delivery_address?: unknown; status_reason?: string },
): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}`, body)
  return response.data.data
}
