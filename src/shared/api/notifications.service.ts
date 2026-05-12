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
  const response = await apiClient.get<{ data: unknown }>('/notifications', {
    params,
  })

  const raw = response.data.data as unknown
  if (Array.isArray(raw)) {
    return { data: raw as Notification[] }
  }

  if (raw && typeof raw === 'object') {
    const typed = raw as Record<string, unknown>
    if (Array.isArray(typed.items)) {
      return {
        data: typed.items as Notification[],
        total: typeof typed.total === 'number' ? typed.total : undefined,
        unread_count: typeof typed.unread_count === 'number' ? typed.unread_count : undefined,
        page: typeof typed.page === 'number' ? typed.page : undefined,
        limit: typeof typed.limit === 'number' ? typed.limit : undefined,
      }
    }
    if (Array.isArray(typed.data)) {
      return {
        data: typed.data as Notification[],
        total: typeof typed.total === 'number' ? typed.total : undefined,
        unread_count: typeof typed.unread_count === 'number' ? typed.unread_count : undefined,
        page: typeof typed.page === 'number' ? typed.page : undefined,
        limit: typeof typed.limit === 'number' ? typed.limit : undefined,
      }
    }
  }

  return { data: [] }
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
