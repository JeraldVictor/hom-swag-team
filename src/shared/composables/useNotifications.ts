/**
 * useNotifications
 *
 * Wraps `@capacitor/local-notifications` to provide typed helpers for
 * scheduling local push notifications and requesting the required permission.
 */

import { LocalNotifications } from '@capacitor/local-notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleNotificationOptions {
  /** Unique numeric identifier for this notification. */
  id: number
  /** Notification title. */
  title: string
  /** Notification body text. */
  body: string
  /** The Date at which the notification should fire. */
  scheduleAt: Date
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Request permission to display local notifications.
 *
 * @returns The permission state returned by the OS.
 */
async function requestPermission(): Promise<string> {
  const result = await LocalNotifications.requestPermissions()
  return result.display
}

/**
 * Schedule a single local notification to fire at the given time.
 *
 * @param options - Notification content and schedule time
 */
async function scheduleNotification(options: ScheduleNotificationOptions): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: {
          at: options.scheduleAt,
        },
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useNotifications() {
  return {
    requestPermission,
    scheduleNotification,
  }
}
