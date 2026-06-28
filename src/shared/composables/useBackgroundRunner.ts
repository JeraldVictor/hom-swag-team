/**
 * useBackgroundRunner
 *
 * Bridge composable between the Vue app and the @capacitor/background-runner
 * headless JS environment.
 *
 * Responsibilities:
 * - Sync the auth token and BFF API URL into CapacitorKV so the background
 *   runner can make authenticated requests without the webview.
 * - Set up a listener for notification tap actions dispatched by the runner.
 * - Expose a `dispatchCheck` helper to manually trigger a notification poll
 *   (useful for dev/debug, or to force an immediate check after login).
 */

import { BackgroundRunner } from '@capacitor/background-runner'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Must match the `label` in capacitor.config.ts BackgroundRunner plugin config. */
const RUNNER_LABEL = 'com.homswag.partner.background.notifications'

/** CapacitorKV keys written here and read by the runner script. */
const KV_AUTH_TOKEN = 'backgroundAuthToken'
const KV_API_URL = 'bffApiUrl'
const KV_LAST_SEEN_IDS = 'lastSeenNotifIds'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useBackgroundRunner() {
  /**
   * Write the auth token into native CapacitorKV so the background runner
   * can authenticate requests while the webview is not available.
   *
   * Call this after login and after restoring a session.
   */
  async function syncAuthToken(token: string): Promise<void> {
    if (!isNative()) return
    // Use @capacitor/preferences as the KV bridge — CapacitorKV in the runner
    // reads from the same native UserDefaults / SharedPreferences store.
    await Preferences.set({ key: KV_AUTH_TOKEN, value: token })
  }

  /**
   * Create Android notification channels for the three notification categories.
   * Channels use normal notification-bar behavior only.
   *
   * This is a no-op on iOS (iOS does not use channels) and on non-native platforms.
   * Safe to call multiple times — the OS ignores duplicate channel creation.
   */
  async function setupNotificationChannels(): Promise<void> {
    if (!isNative()) return
    try {
      await Promise.allSettled([
        LocalNotifications.deleteChannel({ id: 'homswag_ringtone' }),
        LocalNotifications.deleteChannel({ id: 'homswag_fullscreen_alerts_v2' }),
        LocalNotifications.deleteChannel({ id: 'homswag_alarm_service_v1' }),
      ])

      await Promise.all([
        LocalNotifications.createChannel({
          id: 'homswag_orders',
          name: 'Orders',
          description: 'New order and order update notifications',
          importance: 3,
          vibration: true,
          visibility: 0,
        }),
        LocalNotifications.createChannel({
          id: 'homswag_trips',
          name: 'Trips',
          description: 'New trip and trip update notifications',
          importance: 3,
          vibration: true,
          visibility: 0,
        }),
        LocalNotifications.createChannel({
          id: 'homswag_general',
          name: 'General',
          description: 'General HomSwag notifications',
          importance: 3,
          vibration: true,
          visibility: 0,
        }),
      ])
    } catch (err) {
      console.warn('[BackgroundRunner] setupNotificationChannels failed:', err)
    }
  }

  /**
   * endpoint to poll. Call this once at boot (finishBoot).
   */
  async function syncApiUrl(url: string): Promise<void> {
    if (!isNative()) return
    await Preferences.set({ key: KV_API_URL, value: url })
  }

  /**
   * Remove the auth token from native KV on logout so the background runner
   * stops making authenticated requests.
   */
  async function clearAuthToken(): Promise<void> {
    if (!isNative()) return
    await Preferences.remove({ key: KV_AUTH_TOKEN })
    await Preferences.remove({ key: KV_LAST_SEEN_IDS })
  }

  /**
   * Register a listener for when the user taps a notification that was
   * scheduled by the background runner.
   *
   * Returns a cleanup function — call it on component unmount.
   */
  async function setupNotificationListener(
    onTap: (notificationId: number, event: any) => void
  ): Promise<() => void> {
    if (!isNative()) return () => {}
    try {
      const handle = await BackgroundRunner.addListener(
        'backgroundRunnerNotificationReceived',
        event => {
          onTap(event.notificationId, event)
        }
      )
      return () => {
        void handle.remove()
      }
    } catch (err) {
      console.warn('[BackgroundRunner] addListener failed:', err)
      return () => {}
    }
  }

  /**
   * Manually dispatch the notificationCheck event to the runner.
   * Useful for testing the runner in the foreground without waiting 15 min.
   */
  async function dispatchCheck(): Promise<void> {
    if (!isNative()) return
    try {
      await BackgroundRunner.dispatchEvent({
        label: RUNNER_LABEL,
        event: 'notificationCheck',
        details: {},
      })
    } catch (err) {
      console.warn('[BackgroundRunner] dispatchCheck failed:', err)
    }
  }

  return {
    syncAuthToken,
    syncApiUrl,
    clearAuthToken,
    setupNotificationChannels,
    setupNotificationListener,
    dispatchCheck,
  }
}
