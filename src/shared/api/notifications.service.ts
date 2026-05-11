/**
 * Notifications Service
 *
 * Typed wrappers around the BFF notifications endpoints.
 */

import apiClient from '@/shared/lib/api'
import type { Notification, NotificationsResponse } from '@/shared/models/notification.model'

/**
 * Fetch notifications for the authenticated field worker.
 * GET /notifications
 */
export async function getNotifications(params?: {
  is_read?: string | null
  page?: string | null
  limit?: string | null
}): Promise<NotificationsResponse> {
  const response = await apiClient.get<{ data: NotificationsResponse }>('/notifications', {
    params,
  })
  // API may return { data: Notification[] } or { data: { data: Notification[], unread_count } }
  const raw = response.data.data
  if (Array.isArray(raw)) {
    return { data: raw as unknown as Notification[] }
  }
  return raw as NotificationsResponse
}

/**
 * Mark a single notification as read.
 * PATCH /notifications/:id/read
 */
export async function markNotificationRead(id: string | number): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`)
}

/**
 * Mark all notifications as read.
 * POST /notifications/read-all
 */
export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all')
}
