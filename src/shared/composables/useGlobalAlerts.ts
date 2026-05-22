import { ref, watch } from 'vue'
import { webSocketService } from '@/shared/lib/websocket.service'
import { markNotificationRead } from '@/shared/api/notifications.service'
import { useRouter } from 'vue-router'

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
let audio: HTMLAudioElement | null = null
let audioUnlocked = false

export function useGlobalAlerts() {
  const router = useRouter()

  function initAudio() {
    if (typeof window === 'undefined' || audio) return

    audio = new Audio('/audio/alert.wav')
    audio.loop = true
    audio.preload = 'auto'

    const unlockAudio = () => {
      if (!audio || audioUnlocked) return

      const currentAudio = audio
      currentAudio
        .play()
        .then(() => {
          currentAudio.pause()
          currentAudio.currentTime = 0
          audioUnlocked = true
        })
        .catch(() => {
          // Ignore autoplay restrictions until the next user gesture.
        })
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true })
  }

  function playAlert() {
    initAudio()
    if (audio) {
      audio.play().catch(e => console.warn('Audio playback prevented by browser policy:', e))
    }
  }

  function stopAlert() {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }

  function buildAlert(payload: any, defaultType: 'order_assigned' | 'trip_assigned' | null = null) {
    const type = payload.type || defaultType
    if (type !== 'order_assigned' && type !== 'trip_assigned') return null

    const resourceId =
      payload.order_id || payload.trip_id || payload.data?.order_id || payload.data?.trip_id

    const key = resourceId
      ? `${type}:${resourceId}`
      : `${type}:${payload.id ?? `${payload.title ?? ''}:${payload.body ?? ''}`}`
    const title =
      payload.title || (type === 'order_assigned' ? 'New Order Assigned' : 'New Trip Assigned')
    const body =
      payload.body ||
      (type === 'order_assigned'
        ? payload.order_number
          ? `You have been assigned to order #${payload.order_number}.`
          : 'You have been assigned to a new order.'
        : 'You have been assigned to a new trip.')

    return {
      id: key,
      type,
      title,
      body,
      data: payload.data ?? payload,
      notificationId: payload.id,
    }
  }

  function handleNewNotification(
    payload: any,
    defaultType: 'order_assigned' | 'trip_assigned' | null = null
  ) {
    const alert = buildAlert(payload, defaultType)
    if (!alert) return

    if (seenAlertKeys.has(alert.id)) return
    seenAlertKeys.add(alert.id)

    activeAlerts.value.push(alert)
    playAlert()
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
    const alert = activeAlerts.value.find(a => a.id === id)

    if (alert?.notificationId) {
      try {
        await markNotificationRead(alert.notificationId)
      } catch (e) {
        console.error('Failed to mark alert as read', e)
      }
    }

    await dismissAlert(id)

    if (type === 'trip_assigned' && data?.trip_id) {
      router.push(`/trips/${data.trip_id}`)
    } else if (type === 'order_assigned' && data?.order_id) {
      router.push(`/orders/${data.order_id}`)
    }
  }

  // Starts listening to the global notification event(s)
  function startListening() {
    return webSocketService.on('notification:new', payload => handleNewNotification(payload))
  }

  return {
    activeAlerts,
    dismissAlert,
    viewAlert,
    startListening,
  }
}
