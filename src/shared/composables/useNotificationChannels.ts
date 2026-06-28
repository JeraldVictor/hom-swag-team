/**
 * useNotificationChannels
 *
 * Notification-channel maintenance for the native app.
 */

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function useNotificationChannels() {
  /**
   * Delete older notification channels that may have been created with silent
   * settings. The current v4 channels are created natively on Android.
   */
  async function setupNotificationChannels(): Promise<void> {
    if (!isNative()) return
    try {
      await Promise.allSettled([
        LocalNotifications.deleteChannel({ id: 'homswag_ringtone' }),
        LocalNotifications.deleteChannel({ id: 'homswag_fullscreen_alerts_v2' }),
        LocalNotifications.deleteChannel({ id: 'homswag_alarm_service_v1' }),
        LocalNotifications.deleteChannel({ id: 'homswag_orders' }),
        LocalNotifications.deleteChannel({ id: 'homswag_trips' }),
        LocalNotifications.deleteChannel({ id: 'homswag_general' }),
        LocalNotifications.deleteChannel({ id: 'homswag_orders_default_v2' }),
        LocalNotifications.deleteChannel({ id: 'homswag_trips_default_v2' }),
        LocalNotifications.deleteChannel({ id: 'homswag_general_default_v2' }),
        LocalNotifications.deleteChannel({ id: 'homswag_orders_default_v3' }),
        LocalNotifications.deleteChannel({ id: 'homswag_trips_default_v3' }),
        LocalNotifications.deleteChannel({ id: 'homswag_general_default_v3' }),
        LocalNotifications.deleteChannel({ id: 'homswag_orders_default_v4' }),
        LocalNotifications.deleteChannel({ id: 'homswag_trips_default_v4' }),
        LocalNotifications.deleteChannel({ id: 'homswag_general_default_v4' }),
      ])
    } catch (err) {
      console.warn('[Notifications] setupNotificationChannels failed:', err)
    }
  }

  return {
    setupNotificationChannels,
  }
}
