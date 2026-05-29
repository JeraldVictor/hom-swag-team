<template>
  <ion-app>
    <!-- No internet overlay — shown on top of everything when offline -->
    <NoInternetView v-if="!isOnline" @retry="handleRetry" />

    <!-- Boot splash — checking network + permissions on every cold start / refresh -->
    <div v-else-if="bootPhase === 'booting'" class="boot-splash" aria-label="Loading" aria-live="polite">
      <div class="boot-splash__inner">
        <img :src="logo" alt="HomSwag" class="boot-splash__logo" />
        <Icon icon="lucide:loader-circle" class="boot-splash__spinner" aria-hidden="true" />
      </div>
    </div>

    <!-- Permission splash — network confirmed but permissions not yet granted -->
    <PermissionSplashView
      v-else-if="bootPhase === 'needs-permissions'"
      @granted="handlePermissionsGranted"
    />

    <!-- Normal app — only rendered when fully ready -->
    <ion-router-outlet v-else />

    <!-- Global high-priority alert overlay (e.g. new trips/orders) -->
    <GlobalAlertBox />
  </ion-app>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Icon } from '@iconify/vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import NoInternetView from '@/features/home/views/NoInternetView.vue'
import PermissionSplashView from '@/features/home/views/PermissionSplashView.vue'
import GlobalAlertBox from '@/shared/components/ui/GlobalAlertBox.vue'
import { useGlobalAlerts } from '@/shared/composables/useGlobalAlerts'
import { locationTracker } from '@/shared/composables/useLocationTracker'
import { getIsOnline, useNetwork } from '@/shared/composables/useNetwork'
import { useBackgroundRunner } from '@/shared/composables/useBackgroundRunner'
import { useFcm } from '@/shared/composables/useFcm'
import { usePermissions } from '@/shared/composables/usePermissions'
import { useToast } from '@/shared/composables/useToast'
import logo from '@/shared/images/HomSwagLogo.png'
import { ENV } from '@/shared/lib/env'
import { webSocketService } from '@/shared/lib/websocket.service'
import type { RawNotification } from '@/shared/models/notification.model'
import { useAppStore } from '@/shared/stores/app'
import { useAuthStore } from '@/shared/stores/auth'
import { useNotificationStore } from '@/shared/stores/notification'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const { handleNewNotification } = useGlobalAlerts()
const backgroundRunner = useBackgroundRunner()
const fcm = useFcm()

// Network state — reactive, shared singleton
const { isOnline } = useNetwork()

// Permissions
const { checkAll, allGranted } = usePermissions()

// Reactive store refs for the template
const { bootPhase } = storeToRefs(appStore)
const { showToast } = useToast()

// ---------------------------------------------------------------------------
// Boot sequence
// ---------------------------------------------------------------------------

async function boot() {
  // 1. Sync network state into the store
  appStore.setOnline(getIsOnline())

  if (!isOnline.value) {
    // Stay in 'booting' — the retry handler will re-run boot() when back online
    return
  }

  // 2. Check permissions (no prompt yet — just read current state)
  await checkAll()

  if (!allGranted.value) {
    appStore.setBootPhase('needs-permissions')
    return
  }

  // 3. All good — restore session and mark ready
  await finishBoot()
}

async function finishBoot() {
  const restored = await authStore.restoreSession()

  appStore.setPermissionsGranted(true)
  appStore.setBootPhase('ready')

  // Sync the BFF API URL into CapacitorKV so the background runner knows
  // where to poll. Token sync is handled inside authStore.restoreSession().
  void backgroundRunner.syncApiUrl(ENV.VITE_BFF_API_URL)

  // Create Android notification channels so the runner's local notifications
  // use the device default tone + vibration (orders, trips, general).
  void backgroundRunner.setupNotificationChannels()

  if (restored) {
    // Ensure socket is connected if we have a session
    if (authStore.accessToken) {
      webSocketService.connect(authStore.accessToken)
      // Start background location tracking if enabled
      void locationTracker.start()

      // Fetch server config for feature flags
      await appStore.fetchConfig()

      // Fetch initial notifications
      const notificationStore = useNotificationStore()
      void notificationStore.fetchNotifications()
    }

    if (router.currentRoute.value.path === '/login') {
      await router.replace('/home')
    }
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleRetry() {
  appStore.setOnline(navigator.onLine)
  if (isOnline.value) {
    await boot()
  }
}

async function handlePermissionsGranted() {
  await finishBoot()
}

// ---------------------------------------------------------------------------
// App state change — restart tracker when app comes to foreground
// ---------------------------------------------------------------------------

let appStateListener: PluginListenerHandle | null = null
let apiLogoutListener: ((event: Event) => void) | null = null
let backgroundRunnerListenerCleanup: (() => void) | null = null
let fcmCleanup: (() => void) | null = null

async function setupAppStateListener() {
  appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && authStore.isAuthenticated && !locationTracker.isTracking.value) {
      // App returned to foreground and user is authenticated — restart tracker
      // if it was stopped (e.g. by the OS killing the background process)
      void locationTracker.start()
    }
  })
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  void import('@aejkatappaja/phantom-ui')

  // Handle deep-links from RingtoneActivity (homswag-team://navigate/...)
  // This fires when the user taps "View Details" on the native alarm UI and the
  // app is brought to the foreground (or cold-started) via the intent URL.
  void App.addListener('appUrlOpen', (event: { url: string }) => {
    const url = event.url
    console.log('[App] appUrlOpen:', url)
    try {
      // homswag-team://navigate/orders/<id>
      // homswag-team://navigate/trips/<id>
      // homswag-team://navigate/notifications
      const path = url.replace(/^homswag-team:\/\/navigate/, '')
      if (path && path !== '/') {
        void router.push(path)
      }
    } catch (e) {
      console.warn('[App] appUrlOpen navigation error:', e)
    }
  })

  // Listen for force logout events from the server (e.g. account deactivated/blocked)
  webSocketService.on('force_logout', async (data: { reason?: string }) => {
    console.warn('[App] Force logout received:', data.reason)

    // Stop tracking immediately
    locationTracker.stop()

    // Show notification to user
    const reasonMessage =
      data.reason === 'account_deactivated'
        ? 'Your account has been deactivated. Please contact support.'
        : 'You have been logged out for security reasons.'

    showToast(reasonMessage, 'danger')

    // Clear session and redirect
    await authStore.logout()
    await router.replace('/login')
  })

  // Listen for API-triggered logout events
  apiLogoutListener = async () => {
    console.warn('[App] API logout event received')
    locationTracker.stop()
    fcmCleanup?.()
    fcmCleanup = null
    await authStore.logout()
    await router.replace('/login')
  }
  window.addEventListener('homswag:logout', apiLogoutListener)

  // Unified listener for new notifications
  webSocketService.on('notification:new', (data: RawNotification) => {
    console.log('[App] Notification received via Socket:', data)

    // 1. Update the local store
    const notificationStore = useNotificationStore()
    notificationStore.addNotification(data)

    const rawType = data.type || ''
    const type = String(rawType).toLowerCase()

    // 2. Check if it's a high-priority alert (Ringtone/Order/Trip assigned or updated)
    const isHighPriority =
      type.includes('ringtone_alert') ||
      type.includes('order_assigned') ||
      type.includes('order_status_changed') ||
      type.includes('trip_assigned') ||
      type.includes('trip_status_changed')

    if (isHighPriority) {
      console.log('[App] Triggering high-priority Global Alert UI for type:', type)
      handleNewNotification(data)
      // Return early: the overlay handles sound and UI
      return
    }

    // 3. Normal notification - show toast
    showToast(data.title || 'New notification', 'primary')

    // 4. Local notification fallback for foreground/background transition
    if (Capacitor.isNativePlatform()) {
      let channelId = 'homswag_general'
      if (type.includes('order') || type.includes('invoice')) channelId = 'homswag_orders'
      else if (type.includes('trip')) channelId = 'homswag_trips'

      const rawBody = data.body || data.message || 'You have a new notification'
      const plainBody = rawBody
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()

      const notifId = Math.abs(Date.now()) % 2147483647
      void LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title: data.title || 'HomSwag',
            body: plainBody,
            schedule: { at: new Date(Date.now() + 100) },
            channelId,
            extra: data.data || data,
          },
        ],
      })
    }
  })

  // Listen for order updates from admin / backend and notify active views
  webSocketService.on('order:updated', (data: { order_id: string }) => {
    window.dispatchEvent(new CustomEvent('homswag:order-updated', { detail: data }))
  })

  // Listen for taps on notifications scheduled by the background runner
  backgroundRunnerListenerCleanup = await backgroundRunner.setupNotificationListener(
    (notificationId, event) => {
      console.log('[App] Background runner notification tapped, id:', notificationId)
      // The event from background runner may include `notification` or `extras` directly
      const data = event?.notification?.extra || event?.extra || event?.data || {}
      if (data?.order_id || data?.orderId) {
        const id = data.order_id || data.orderId
        void router.push(`/orders/${id}`)
      } else if (data?.trip_id || data?.tripId) {
        const id = data.trip_id || data.tripId
        void router.push(`/trips/${id}`)
      } else {
        void router.push('/notifications')
      }
    }
  )

  // Listen for taps on local notifications scheduled by the Socket.IO handler
  if (Capacitor.isNativePlatform()) {
    void LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const data = event.notification.extra
      if (data?.order_id || data?.orderId) {
        const id = data.order_id || data.orderId
        void router.push(`/orders/${id}`)
      } else if (data?.trip_id || data?.tripId) {
        const id = data.trip_id || data.tripId
        void router.push(`/trips/${id}`)
      } else {
        void router.push('/notifications')
      }
    })
  }

  await boot()
  await setupAppStateListener()
})

onUnmounted(() => {
  appStateListener?.remove()
  if (apiLogoutListener) {
    window.removeEventListener('homswag:logout', apiLogoutListener)
  }
  backgroundRunnerListenerCleanup?.()
  fcmCleanup?.()
})

// Keep the store's isOnline in sync with the composable's reactive ref
watch(isOnline, online => {
  appStore.setOnline(online)
})

// Initialise FCM only when the user is authenticated.
// This ensures token registration never fires before login,
// which would cause a 401 → logout event → boot loop.
watch(
  () => authStore.isAuthenticated,
  async authenticated => {
    if (authenticated) {
      fcmCleanup = await fcm.init()
    } else {
      fcmCleanup?.()
      fcmCleanup = null
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.boot-splash {
  position: fixed;
  inset: 0;
  z-index: 9997;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
}

.boot-splash__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.boot-splash__logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  border-radius: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.boot-splash__spinner {
  width: 32px;
  height: 32px;
  color: var(--color-brand);
  animation: spin 0.8s linear infinite;
}
</style>
