export interface NotificationNavigationData {
  order_id?: string | number
  orderId?: string | number
  trip_id?: string | number
  tripId?: string | number
}

function isNavigationData(value: object | null | undefined): value is NotificationNavigationData {
  if (value === null || value === undefined) return false
  const record = value as Record<string, string | number | boolean | null | undefined>
  return (
    typeof record.order_id === 'string' ||
    typeof record.order_id === 'number' ||
    typeof record.orderId === 'string' ||
    typeof record.orderId === 'number' ||
    typeof record.trip_id === 'string' ||
    typeof record.trip_id === 'number' ||
    typeof record.tripId === 'string' ||
    typeof record.tripId === 'number'
  )
}

export function getNotificationPath(data: object | null | undefined): string {
  if (!isNavigationData(data)) return '/notifications'

  const orderId = data.order_id ?? data.orderId
  if (orderId !== undefined && orderId !== null && String(orderId).length > 0) {
    return `/orders/${encodeURIComponent(String(orderId))}`
  }

  const tripId = data.trip_id ?? data.tripId
  if (tripId !== undefined && tripId !== null && String(tripId).length > 0) {
    return `/trips/${encodeURIComponent(String(tripId))}`
  }

  return '/notifications'
}

export function getNotificationPathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'homswag-partner:' || parsed.host !== 'navigate') {
      return null
    }

    const path = parsed.pathname
    if (path === '/notifications') return path
    if (path.startsWith('/orders/') || path.startsWith('/trips/')) return path
    return '/notifications'
  } catch {
    return null
  }
}
