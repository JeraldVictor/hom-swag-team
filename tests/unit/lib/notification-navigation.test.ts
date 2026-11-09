import { describe, expect, it } from 'vitest'
import {
  getNotificationPath,
  getNotificationPathFromUrl,
} from '@/shared/lib/notification-navigation'

describe('notification navigation', () => {
  it('routes order notifications to the order detail page', () => {
    expect(getNotificationPath({ order_id: 'order/123' })).toBe('/orders/order%2F123')
    expect(getNotificationPath({ orderId: 42 })).toBe('/orders/42')
  })

  it('routes trip notifications to the trip detail page', () => {
    expect(getNotificationPath({ trip_id: 'trip-123' })).toBe('/trips/trip-123')
    expect(getNotificationPath({ tripId: 42 })).toBe('/trips/42')
  })

  it('falls back to the notification list without a related entity', () => {
    expect(getNotificationPath({})).toBe('/notifications')
    expect(getNotificationPath(null)).toBe('/notifications')
  })

  it('accepts native deep links from notification taps', () => {
    expect(getNotificationPathFromUrl('homswag-partner://navigate/orders/123')).toBe('/orders/123')
    expect(getNotificationPathFromUrl('homswag-partner://navigate/trips/456')).toBe('/trips/456')
    expect(getNotificationPathFromUrl('homswag-partner://navigate/notifications')).toBe(
      '/notifications'
    )
  })

  it('rejects unrelated deep links', () => {
    expect(getNotificationPathFromUrl('https://example.com/orders/123')).toBeNull()
    expect(getNotificationPathFromUrl('homswag-partner://other/orders/123')).toBeNull()
  })
})
