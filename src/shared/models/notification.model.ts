/**
 * A notification entity for a field worker.
 */
export interface NotificationData {
  order_id?: string | number
  trip_id?: string | number
  [key: string]: unknown
}

export interface Notification {
  id: string | number
  _id?: string
  title: string
  body?: string
  message?: string
  is_read: boolean
  type?: string
  /** ISO 8601 date-time string */
  created_at?: string
  /** ISO 8601 date-time string */
  updated_at?: string
  /** Optional reference to a related entity */
  reference_id?: string
  reference_type?: string
  data?: NotificationData
}

export interface RawNotification extends Omit<Notification, 'id' | 'is_read'> {
  id: string | number
  is_read?: boolean
}

/**
 * Paginated notifications response.
 */
export interface NotificationsResponse {
  data: Notification[]
  total?: number
  unread_count?: number
  page?: number
  limit?: number
}
