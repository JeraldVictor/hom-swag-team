/**
 * Orders Service
 *
 * Typed wrappers around the BFF orders endpoints.
 */

import apiClient from '@/shared/lib/api'
import type {
  Order,
  UpdateOrderPayload,
  UpdateOrderStatusBody,
  UpgradeProductBody,
  VerifyServiceOtpBody,
} from '@/shared/models/order.model'
import type { PaginatedResponse } from '@/shared/models/pagination.model'

function hideTeamRestrictedOrderMessages(order: Order): Order {
  const {
    notes: _notes,
    staff_notes: _staffNotes,
    custom_instruction: _customInstruction,
    ...visibleOrder
  } = order

  if (!visibleOrder.payment?.internal_comment) return visibleOrder

  const { internal_comment: _internalComment, ...visiblePayment } = visibleOrder.payment
  return {
    ...visibleOrder,
    payment: visiblePayment,
  }
}

function hideTeamRestrictedOrderMessagesFromPage(
  page: PaginatedResponse<Order>
): PaginatedResponse<Order> {
  return {
    ...page,
    data: page.data.map(hideTeamRestrictedOrderMessages),
  }
}

/**
 * Fetch a paginated list of orders assigned to the authenticated beautician.
 * GET /orders
 */
export async function getOrders(
  page?: number,
  limit?: number,
  statusOrX?: string,
  dateOrShow?: string
): Promise<PaginatedResponse<Order>> {
  const safeStatusOrX = statusOrX && statusOrX !== 'undefined' ? statusOrX : undefined
  const safeDateOrShow = dateOrShow && dateOrShow !== 'undefined' ? dateOrShow : undefined
  const isSimpleOrderQuery =
    safeStatusOrX != null &&
    ['today', 'tomorrow', 'past'].includes(safeStatusOrX) &&
    safeDateOrShow != null &&
    ['confirmed', 'ongoing', 'completed', 'cancelled'].includes(safeDateOrShow)

  const response = await apiClient.get<{ data: PaginatedResponse<Order> | Order[] }>('/orders', {
    params: isSimpleOrderQuery
      ? { page, limit, x: safeStatusOrX, show: safeDateOrShow }
      : { page, limit, status: safeStatusOrX, date: safeDateOrShow },
  })
  const raw = response.data.data
  // Handle both paginated envelope and plain array
  if (Array.isArray(raw)) {
    return {
      data: raw.map(hideTeamRestrictedOrderMessages),
      total: raw.length,
      count: raw.length,
      page: 1,
      limit: raw.length,
      pages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
  return hideTeamRestrictedOrderMessagesFromPage(raw as PaginatedResponse<Order>)
}

/**
 * Fetch a single order by ID.
 * GET /orders/:id
 */
export async function getOrder(id: string | number): Promise<Order> {
  const response = await apiClient.get<{ data: Order }>(`/orders/${id}`)
  const order = hideTeamRestrictedOrderMessages(response.data.data)

  if (order.beautician_viewed !== true) {
    try {
      const viewedOrder = await markOrderViewed(id)
      return hideTeamRestrictedOrderMessages(viewedOrder)
    } catch {
      // Viewing the order should still succeed if recording the viewed state fails.
    }
  }

  return order
}

/**
 * Update the status of an order.
 * PATCH /orders/:id/status
 */
export async function updateOrderStatus(
  id: string | number,
  body: UpdateOrderStatusBody
): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}/status`, body)
  return response.data.data
}

/**
 * Generate a service OTP for the order (before starting service).
 * POST /orders/:id/otp/generate
 */
export async function generateServiceOtp(
  id: string | number
): Promise<{ otp: string; expires_at: string }> {
  const response = await apiClient.post<{ data: { otp: string; expires_at: string } }>(
    `/orders/${id}/otp/generate`
  )
  return response.data.data
}

/**
 * Generate an OTP when modifying a service order before confirming changes.
 */
export async function generateOrderChangeOtp(
  id: string | number
): Promise<{ otp: string; expires_at: string }> {
  const response = await apiClient.post<{ data: { otp: string; expires_at: string } }>(
    `/orders/${id}/generate_order_change_otp`
  )
  return response.data.data
}

/**
 * Verify the service OTP provided by the customer.
 * POST /orders/:id/otp/verify
 */
export async function verifyServiceOtp(
  id: string | number,
  body: VerifyServiceOtpBody
): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(`/orders/${id}/otp/verify`, body)
  return response.data.data
}

/**
 * Upgrade a product in an order.
 * POST /orders/:id/upgrade-product
 */
export async function upgradeOrderProduct(
  id: string | number,
  body: UpgradeProductBody
): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(`/orders/${id}/upgrade-product`, body)
  return response.data.data
}

/**
 * Update order details (products, delivery address, etc.).
 * PATCH /orders/:id
 */
export async function updateOrder(id: string | number, body: UpdateOrderPayload): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}`, body)
  return response.data.data
}

export async function markOrderViewed(id: string | number): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}/viewed`, {})
  return response.data.data
}

/**
 * Upload a selfie taken on arrival at the customer's location.
 * POST /orders/:id/arrival-selfie
 */
export async function uploadArrivalSelfie(id: string | number, formData: FormData): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(
    `/orders/${String(id)}/arrival-selfie`,
    formData
  )
  return response.data.data
}

/**
 * Upload proof that the service has been completed (photo evidence).
 * POST /orders/:id/completion-proof
 */
export async function uploadCompletionProof(
  id: string | number,
  formData: FormData
): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(
    `/orders/${String(id)}/completion-proof`,
    formData
  )
  return response.data.data
}

/**
 * Upload proof of a payment transaction (UPI / mixed payment).
 * POST /orders/:id/payment-proof
 */
export async function uploadPaymentProof(id: string | number, formData: FormData): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(
    `/orders/${String(id)}/payment-proof`,
    formData
  )
  return response.data.data
}

/**
 * Upload setup photos taken at the customer's home before starting service.
 * POST /orders/:id/setup-photos
 */
export async function uploadSetupPhotos(id: string | number, formData: FormData): Promise<Order> {
  const response = await apiClient.post<{ data: Order }>(
    `/orders/${String(id)}/setup-photos`,
    formData
  )
  return response.data.data
}

/**
 * Get or generate a payment link for the order.
 * POST /orders/:id/payment-link
 */
export async function getPaymentLink(id: string | number): Promise<{ url: string }> {
  const response = await apiClient.post<{ data: { url: string } }>(`/orders/${id}/payment-link`)
  return response.data.data
}

/**
 * Update the self-ride status for an order (beautician travelling independently).
 * PATCH /orders/:id/self-ride
 */
export async function updateSelfRideStatus(
  id: string | number,
  isSelfRide: boolean
): Promise<Order> {
  const response = await apiClient.patch<{ data: Order }>(`/orders/${id}/self-ride`, {
    is_self_ride: isSelfRide,
  })
  return response.data.data
}
