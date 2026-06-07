import { Capacitor, registerPlugin } from '@capacitor/core'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { markNotificationRead } from '@/shared/api/notifications.service'
import { webSocketService } from '@/shared/lib/websocket.service'
import { useAppStore } from '@/shared/stores/app'

interface AlarmPluginInterface {
  playRingtone(): Promise<void>
  stopRingtone(): Promise<void>
}

// Registered once at module level — zero overhead when unused
const AlarmPlugin = registerPlugin<AlarmPluginInterface>('AlarmPlugin')

export interface GlobalAlert {
  id: string
  type: string
  title: string
  body: string
  data?: any
  notificationId?: string
}

// Shared state so that any component using this composable gets the same alerts
const activeAlerts = ref<GlobalAlert[]>([])
const seenAlertKeys = new Set<string>()

// Web/simulator fallback: HTML5 Audio element (created lazily)
let webAudio: HTMLAudioElement | null = null

export function useGlobalAlerts() {
  const router = useRouter()
  const appStore = useAppStore()

  async function playAlert() {
    // Only return early if the flag is explicitly set to false.
    // If it's undefined (e.g. config not loaded), we default to TRUE for safety.
    if (appStore.featureFlags.ringtone_alert === false) {
      console.log('[useGlobalAlerts] Ringtone alert disabled by feature flag')
      return
    }

    console.log('[useGlobalAlerts] Playing ringtone alert...')
    if (Capacitor.isNativePlatform()) {
      try {
        await AlarmPlugin.playRingtone()
      } catch (e) {
        console.warn('[useGlobalAlerts] AlarmPlugin.playRingtone failed:', e)
      }
    } else {
      // Web / simulator fallback — HTML5 Audio on the default output
      if (!webAudio) {
        webAudio = new Audio('/audio/alert.wav')
        webAudio.loop = true
      }
      if (webAudio.paused) {
        webAudio.play().catch(e => console.warn('[useGlobalAlerts] Web audio play failed:', e))
      }
    }
  }

  async function stopAlert() {
    console.log('[useGlobalAlerts] Stopping ringtone alert')
    if (Capacitor.isNativePlatform()) {
      try {
        await AlarmPlugin.stopRingtone()
      } catch (e) {
        console.warn('[useGlobalAlerts] AlarmPlugin.stopRingtone failed:', e)
      }
    } else if (webAudio && !webAudio.paused) {
      webAudio.pause()
      webAudio.currentTime = 0
    }
  }

  function buildAlert(
    payload: any,
    defaultType: 'order_assigned' | 'trip_assigned' | 'ringtone_alert' | null = null
  ) {
    const rawType = payload.type || payload.data?.type || defaultType
    if (!rawType) return null

    const type = String(rawType).toLowerCase()

    const isOrder = type.includes('order_assigned') || type.includes('order_status_changed')
    const isTrip = type.includes('trip_assigned') || type.includes('trip_status_changed')
    const isAlert = type.includes('ringtone_alert')

    if (!isOrder && !isTrip && !isAlert) return null

    const resourceId =
      payload.order_id ||
      payload.orderId ||
      payload.trip_id ||
      payload.tripId ||
      payload.data?.order_id ||
      payload.data?.orderId ||
      payload.data?.trip_id ||
      payload.data?.tripId

    const notificationId =
      payload.id ||
      payload.notification_id ||
      payload.notificationId ||
      payload.data?.id ||
      payload.data?.notification_id ||
      payload.data?.notificationId

    const key = notificationId
      ? String(notificationId)
      : resourceId
        ? `${type}:${resourceId}`
        : `${type}:${payload.title ?? ''}:${payload.body ?? ''}`

    // Derive a display-friendly title from the type when none is provided.
    const fallbackTitle = type.includes('order_status_changed')
      ? 'Order Update'
      : type.includes('trip_status_changed')
        ? 'Trip Update'
        : isOrder
          ? 'New Order Assigned'
          : isTrip
            ? 'New Trip Assigned'
            : 'Alert Notification'

    const fallbackBody = type.includes('order_status_changed')
      ? payload.order_number
        ? `Order #${payload.order_number} has been updated.`
        : 'An order assigned to you has been updated.'
      : type.includes('trip_status_changed')
        ? 'A trip assigned to you has been updated.'
        : isOrder
          ? payload.order_number
            ? `You have been assigned to order #${payload.order_number}.`
            : 'You have been assigned to a new order.'
          : isTrip
            ? 'You have been assigned to a new trip.'
            : 'You have a new important alert.'

    const title = payload.title || fallbackTitle
    const body = payload.body || fallbackBody

    // Normalise to the canonical alert type so GlobalAlertBox renders the
    // correct icon/colour for both "assigned" and "status_changed" variants.
    const alertType = isOrder ? 'order_assigned' : isTrip ? 'trip_assigned' : 'ringtone_alert'

    return {
      id: key,
      type: alertType,
      title,
      body,
      data: payload.data ?? payload,
      notificationId: payload.id || payload.notification_id,
    }
  }

  function handleNewNotification(
    payload: any,
    defaultType: 'order_assigned' | 'trip_assigned' | 'ringtone_alert' | null = null
  ) {
    console.log('[useGlobalAlerts] New notification received:', payload)
    const alert = buildAlert(payload, defaultType)
    if (!alert) {
      console.log('[useGlobalAlerts] Notification type ignored by GlobalAlerts')
      return
    }

    if (seenAlertKeys.has(alert.id)) {
      console.log('[useGlobalAlerts] Alert already shown in this session:', alert.id)
      return
    }
    seenAlertKeys.add(alert.id)

    console.log('[useGlobalAlerts] Showing Global Alert Box:', alert.title)
    activeAlerts.value.push(alert)
    void playAlert()
  }

  async function dismissAlert(id: string) {
    activeAlerts.value = activeAlerts.value.filter(a => a.id !== id)
    if (seenAlertKeys.has(id)) {
      seenAlertKeys.delete(id)
      console.log('[useGlobalAlerts] Removed alert key for reuse:', id)
    }
  }

  // Stop audio as soon as the last alert is dismissed
  watch(
    () => activeAlerts.value.length,
    newLength => {
      if (newLength === 0) void stopAlert()
    }
  )

  async function viewAlert(id: string, type: string, data: any) {
    console.log('[useGlobalAlerts] Viewing alert:', { id, type, data })
    const alert = activeAlerts.value.find(a => a.id === id)

    if (alert?.notificationId) {
      try {
        await markNotificationRead(alert.notificationId)
      } catch (e) {
        console.error('Failed to mark alert as read', e)
      }
    }

    await dismissAlert(id)

    const resourceId = data?.order_id || data?.orderId || data?.trip_id || data?.tripId

    if ((type.includes('trip') || type.includes('rider')) && resourceId) {
      void router.push(`/trips/${resourceId}`)
    } else if ((type.includes('order') || type.includes('beautician')) && resourceId) {
      void router.push(`/orders/${resourceId}`)
    } else {
      void router.push('/notifications')
    }
  }

  // starts the high-priority ringtone audio
  async function triggerAudio() {
    await playAlert()
  }

  return {
    activeAlerts,
    dismissAlert,
    viewAlert,
    handleNewNotification,
    triggerAudio,
  }
}
