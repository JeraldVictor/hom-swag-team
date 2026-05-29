import { ref, watch } from 'vue'
import { webSocketService } from '@/shared/lib/websocket.service'
import { markNotificationRead } from '@/shared/api/notifications.service'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/shared/stores/app'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'

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

// NativeAudio uses a string ID for the loaded asset
const AUDIO_ASSET_ID = 'ringtone_alert'
let audioPreloaded = false
// Web/simulator fallback: HTML5 Audio element
let webAudio: HTMLAudioElement | null = null

export function useGlobalAlerts() {
  const router = useRouter()
  const appStore = useAppStore()

  async function initAudio() {
    if (!appStore.featureFlags.ringtone_alert) return

    if (Capacitor.isNativePlatform()) {
      if (audioPreloaded) return
      try {
        await NativeAudio.preload({
          assetId: AUDIO_ASSET_ID,
          assetPath: 'public/audio/alert.wav',
          audioChannelNum: 1,
          isUrl: false,
        })
        audioPreloaded = true
      } catch (e) {
        console.warn('Failed to preload NativeAudio:', e)
      }
    } else {
      // Web / simulator fallback
      if (!webAudio) {
        webAudio = new Audio('/audio/alert.wav')
        webAudio.loop = true
      }
    }
  }

  async function playAlert() {
    if (!appStore.featureFlags.ringtone_alert) return

    await initAudio()

    if (Capacitor.isNativePlatform()) {
      if (!audioPreloaded) return
      try {
        // Guard against calling loop() when already looping — it would throw
        const { isPlaying } = await NativeAudio.isPlaying({ assetId: AUDIO_ASSET_ID })
        if (!isPlaying) {
          await NativeAudio.loop({ assetId: AUDIO_ASSET_ID })
        }
      } catch (e) {
        console.warn('Audio playback prevented or failed:', e)
      }
    } else if (webAudio && webAudio.paused) {
      webAudio.play().catch(e => console.warn('Web audio play failed:', e))
    }
  }

  async function stopAlert() {
    if (Capacitor.isNativePlatform()) {
      if (!audioPreloaded) return
      try {
        const { isPlaying } = await NativeAudio.isPlaying({ assetId: AUDIO_ASSET_ID })
        if (isPlaying) {
          await NativeAudio.stop({ assetId: AUDIO_ASSET_ID })
        }
      } catch (e) {
        console.warn('Failed to stop NativeAudio:', e)
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
    const rawType = payload.type || defaultType
    if (!rawType) return null

    const type = String(rawType).toLowerCase()

    const isOrder = type.includes('order_assigned') || type.includes('order_status_changed')
    const isTrip = type.includes('trip_assigned') || type.includes('trip_status_changed')
    const isAlert = type.includes('ringtone_alert')

    if (!isOrder && !isTrip && !isAlert) return null

    const resourceId =
      payload.order_id || payload.trip_id || payload.data?.order_id || payload.data?.trip_id

    const key = resourceId
      ? `${type}:${resourceId}`
      : `${type}:${payload.id ?? `${payload.title ?? ''}:${payload.body ?? ''}`}`

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
      notificationId: payload.id,
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
      console.log('[useGlobalAlerts] Alert already seen:', alert.id)
      return
    }
    seenAlertKeys.add(alert.id)

    console.log('[useGlobalAlerts] Showing Global Alert Box:', alert.title)
    activeAlerts.value.push(alert)
    // Audio is managed by the watch below — no direct playAlert() call here to avoid double-trigger
  }

  // Watch for alerts queue changes to stop audio if queue is empty
  watch(
    () => activeAlerts.value.length,
    newLength => {
      if (newLength === 0) stopAlert()
      else playAlert()
    },
    { immediate: true }
  )

  async function dismissAlert(id: string) {
    activeAlerts.value = activeAlerts.value.filter(a => a.id !== id)
  }

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
