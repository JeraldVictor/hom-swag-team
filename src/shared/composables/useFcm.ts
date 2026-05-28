/**
 * useFcm
 *
 * Integrates Firebase Cloud Messaging (FCM) via @capacitor-firebase/messaging.
 *
 * Responsibilities:
 * - Request notification permission on native platforms.
 * - Retrieve the FCM registration token and register it with the server so
 *   the backend can send targeted push notifications when the socket is dead.
 * - Listen for foreground FCM messages and surface them as local notifications.
 * - Listen for notification taps (both foreground and background) and navigate
 *   the user to /notifications.
 * - Refresh the token when FCM rotates it and re-register with the server.
 * - Remove the token from the server on logout.
 */

import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useRouter } from 'vue-router'
import apiClient from '@/shared/lib/api'
import webSocketService from '@/shared/lib/websocket.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/** Strip HTML tags and decode basic entities for plain-text notification bodies. */
function stripHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

/** Map notification type string to the pre-created Android channel id. */
function channelIdForType(type?: string): string {
  if (!type) return 'homswag_general'
  const t = type.toLowerCase()
  if (t.includes('order') || t.includes('invoice')) return 'homswag_orders'
  if (t.includes('trip')) return 'homswag_trips'
  return 'homswag_general'
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useFcm() {
  const router = useRouter()

  /**
   * Request permission and return the FCM registration token.
   * Returns null on web or if permission is denied.
   */
  async function getToken(): Promise<string | null> {
    if (!isNative()) return null
    try {
      const { receive } = await FirebaseMessaging.requestPermissions()
      if (receive !== 'granted') {
        console.warn('[FCM] Notification permission not granted:', receive)
        return null
      }
      const { token } = await FirebaseMessaging.getToken()
      return token
    } catch (err) {
      console.warn('[FCM] getToken failed:', err)
      return null
    }
  }

  /**
   * Register the FCM token with the server so it can push to this device.
   * Silently ignores errors — FCM is an enhancement, not a hard requirement.
   */
  async function registerToken(token: string): Promise<void> {
    try {
      await apiClient.post('/fcm-token', { token })
    } catch (err) {
      console.warn('[FCM] registerToken failed:', err)
    }
  }

  /**
   * Remove the FCM token from the server (call on logout).
   */
  async function unregisterToken(token: string): Promise<void> {
    try {
      await apiClient.delete('/fcm-token', { data: { token } })
    } catch (err) {
      console.warn('[FCM] unregisterToken failed:', err)
    }
  }

  /**
   * Initialise FCM for the current session:
   * 1. Gets/registers the token.
   * 2. Listens for foreground messages → schedules a local notification.
   * 3. Listens for notification taps → navigates to /notifications.
   * 4. Listens for token refresh → re-registers the new token.
   *
   * Returns a cleanup function — call it on logout or app unmount.
   */
  async function init(): Promise<() => void> {
    if (!isNative()) return () => {}

    // 1. Register token
    const token = await getToken()
    if (token) {
      await registerToken(token)
    }

    // 2. Foreground messages — FCM delivers data only, no auto notification.
    //    Skip if the socket is alive: App.vue's notification:new handler already
    //    schedules a local notification via Socket.IO, so FCM is only needed as
    //    a fallback when the socket connection is dead.
    const foregroundHandle = await FirebaseMessaging.addListener(
      'notificationReceived',
      async event => {
        if (webSocketService.isConnected) {
          // Socket path will handle it — avoid duplicate notification
          return
        }

        const { title, body, data } = event.notification
        const type = (data as Record<string, string> | undefined)?.type
        const channelId = channelIdForType(type)
        const plainBody = body ? stripHtml(body) : 'You have a new notification'
        const notifId = Math.abs(Date.now()) % 2147483647

        try {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: notifId,
                title: title || 'HomSwag',
                body: plainBody,
                schedule: { at: new Date(Date.now() + 300) },
                channelId,
              },
            ],
          })
        } catch (err) {
          console.warn('[FCM] LocalNotifications.schedule failed:', err)
        }
      }
    )

    // 3. Notification tap (app open / backgrounded → foreground)
    const tapHandle = await FirebaseMessaging.addListener('notificationActionPerformed', _event => {
      void router.push('/notifications')
    })

    // 4. Token refresh — re-register updated token
    const refreshHandle = await FirebaseMessaging.addListener('tokenReceived', async event => {
      await registerToken(event.token)
    })

    return async () => {
      await foregroundHandle.remove()
      await tapHandle.remove()
      await refreshHandle.remove()
      if (token) {
        await unregisterToken(token)
      }
    }
  }

  return { init, getToken, registerToken, unregisterToken }
}
