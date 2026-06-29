<template>
  <ion-app>
    <!-- No internet overlay — shown on top of everything when offline -->
    <NoInternetView v-if="!isOnline" @retry="handleRetry" />

    <!-- Force Update Screen -->
    <div v-else-if="updateRequired" class="update-required" aria-label="Update Required" aria-live="polite">
      <div class="update-card">
        <div class="update-card__glass"></div>
        <div class="update-card__content">
          <img :src="logo" alt="HomSwag Logo" class="update-card__logo" />
          <h1 class="update-card__title">Update Required</h1>
          <p class="update-card__description">
            A new version of HomSwag Partner is available. Please update to the latest version to continue accessing your dashboard and bookings.
          </p>
          <div class="update-card__version-info">
            <span class="update-card__version-tag">Current: v{{ currentVersion }}</span>
            <span class="update-card__version-arrow">→</span>
            <span class="update-card__version-tag update-card__version-tag--new">New: v{{ availableVersion }}</span>
          </div>
          <button class="update-card__button" @click="handleUpdate">
            <Icon icon="lucide:download" class="update-card__btn-icon" />
            Update Now
          </button>
        </div>
      </div>
    </div>

    <!-- Boot splash — checking network + permissions on every cold start / refresh -->
    <div v-else-if="bootPhase === 'booting'" class="boot-splash" aria-label="Loading" aria-live="polite">
      <div class="boot-splash__inner">
        <img :src="logo" alt="HomSwag" class="boot-splash__logo" />
        <Icon icon="lucide:loader-circle" class="boot-splash__spinner" aria-hidden="true" />
      </div>
    </div>

    <!-- Permission splash — network confirmed but required permissions not yet granted -->
    <PermissionSplashView
      v-else-if="bootPhase === 'needs-permissions'"
      @granted="handlePermissionsGranted"
    />

    <!-- Normal app — only rendered when fully ready -->
    <ion-router-outlet v-else />
  </ion-app>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update'
// biome-ignore lint/correctness/noUnusedImports: template usage
import { Icon } from '@iconify/vue'
// biome-ignore lint/correctness/noUnusedImports: template usage
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
// biome-ignore lint/correctness/noUnusedImports: template usage
import NoInternetView from '@/features/home/views/NoInternetView.vue'
// biome-ignore lint/correctness/noUnusedImports: template usage
import PermissionSplashView from '@/features/home/views/PermissionSplashView.vue'
import { useFcm } from '@/shared/composables/useFcm'
import { locationTracker } from '@/shared/composables/useLocationTracker'
import { getIsOnline, useNetwork } from '@/shared/composables/useNetwork'
import { useNotificationChannels } from '@/shared/composables/useNotificationChannels'
import { usePermissions } from '@/shared/composables/usePermissions'
import { useToast } from '@/shared/composables/useToast'
// biome-ignore lint/correctness/noUnusedImports: template usage
import logo from '@/shared/images/HomSwagLogo.png'
import { webSocketService } from '@/shared/lib/websocket.service'
import type { RawNotification } from '@/shared/models/notification.model'
import { useAppStore } from '@/shared/stores/app'
import { useAuthStore } from '@/shared/stores/auth'
import { useNotificationStore } from '@/shared/stores/notification'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const notificationChannels = useNotificationChannels()
const fcm = useFcm()

// Network state — reactive, shared singleton
const { isOnline } = useNetwork()

// Permissions
const { checkAll, allGranted } = usePermissions()

// Reactive store refs for the template
// biome-ignore lint/correctness/noUnusedVariables: template usage
const { bootPhase } = storeToRefs(appStore)
const { showToast } = useToast()

const updateRequired = ref(false)
const currentVersion = ref('')
const availableVersion = ref('')

async function checkAppUpdate(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false
  }

  try {
    const info = await AppUpdate.getAppUpdateInfo()
    if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
      if (Capacitor.getPlatform() === 'android') {
        currentVersion.value = info.currentVersionCode || ''
        availableVersion.value = info.availableVersionCode || ''
      } else {
        currentVersion.value = info.currentVersionName || ''
        availableVersion.value = info.availableVersionName || ''
      }

      if (info.immediateUpdateAllowed) {
        try {
          await AppUpdate.performImmediateUpdate()
        } catch (immediateErr) {
          console.warn('[App] Native immediate update failed/cancelled:', immediateErr)
        }
      }

      updateRequired.value = true
      return true
    }
  } catch (err) {
    console.warn('[App] InApp Update check failed:', err)
  }

  return false
}

// biome-ignore lint/correctness/noUnusedVariables: template usage
async function handleUpdate() {
  try {
    const info = await AppUpdate.getAppUpdateInfo()
    if (info.immediateUpdateAllowed) {
      await AppUpdate.performImmediateUpdate()
    } else {
      await AppUpdate.openAppStore()
    }
  } catch (err) {
    console.error('[App] Failed to update:', err)
    try {
      await AppUpdate.openAppStore()
    } catch (fallbackErr) {
      console.error('[App] Fallback openAppStore failed:', fallbackErr)
    }
  }
}

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

  // 1.5. Check for updates
  const hasUpdate = await checkAppUpdate()
  if (hasUpdate) {
    return
  }

  // 2. Check required permissions (no prompt yet — just read current state)
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

  // Create Android notification channels for ordinary notification-bar alerts.
  void notificationChannels.setupNotificationChannels()

  if (restored) {
    if (router.currentRoute.value.path === '/login') {
      await router.replace('/home')
    }
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

// biome-ignore lint/correctness/noUnusedVariables: template usage
async function handleRetry() {
  appStore.setOnline(navigator.onLine)
  if (isOnline.value) {
    await boot()
  }
}

// biome-ignore lint/correctness/noUnusedVariables: template usage
async function handlePermissionsGranted() {
  await finishBoot()
}

// ---------------------------------------------------------------------------
// App state change — restart tracker when app comes to foreground
// ---------------------------------------------------------------------------

let appStateListener: PluginListenerHandle | null = null
let apiLogoutListener: ((event: Event) => void) | null = null
let fcmCleanup: (() => void | Promise<void>) | null = null
let activeSessionToken: string | null = null

async function setupAppStateListener() {
  appStateListener = await App.addListener('appStateChange', async ({ isActive }) => {
    if (isActive) {
      if (getIsOnline()) {
        const hasUpdate = await checkAppUpdate()
        if (hasUpdate) {
          return
        }
      }

      if (authStore.isAuthenticated && !locationTracker.isTracking.value) {
        // App returned to foreground and user is authenticated — restart tracker
        // if it was stopped (e.g. by the OS killing the background process)
        void locationTracker.start()
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  void import('@aejkatappaja/phantom-ui')

  // Handle deep-links from push/local notifications (homswag-partner://...)
  void App.addListener('appUrlOpen', (event: { url: string }) => {
    const url = event.url
    console.log('[App] appUrlOpen:', url)
    try {
      if (url.startsWith('homswag-partner://alert')) {
        const urlObj = new URL(url.replace('homswag-partner://', 'http://'))
        const params = Object.fromEntries(
          Array.from(urlObj.searchParams as unknown as Iterable<readonly [string, string]>)
        )
        if (params.order_id || params.orderId) {
          void router.push(`/orders/${params.order_id || params.orderId}`)
        } else if (params.trip_id || params.tripId) {
          void router.push(`/trips/${params.trip_id || params.tripId}`)
        } else {
          void router.push('/notifications')
        }
        return
      }

      if (url.startsWith('homswag-partner://navigate')) {
        const path = url.replace('homswag-partner://navigate', '')
        if (path && path !== '/') {
          void router.push(path)
        }
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
    await fcmCleanup?.()
    fcmCleanup = null
    await authStore.logout()
    await router.replace('/login')
  }
  window.addEventListener('homswag:logout', apiLogoutListener)

  webSocketService.on('feature_flag:updated', () => {
    void appStore.fetchConfig()
  })
  webSocketService.on('feature_flag:deleted', (data: { key: string }) => {
    appStore.removeFeatureFlag(data.key)
  })

  // Unified listener for new notifications
  webSocketService.on('notification:new', (data: RawNotification) => {
    console.log('[App] Notification received via Socket:', data)

    // 1. Update the local store
    const notificationStore = useNotificationStore()
    notificationStore.addNotification(data)

    const rawType = data.type || data.data?.type || ''
    const type = String(rawType).toLowerCase()

    // 2. Normal notification - show toast
    showToast(data.title || 'New notification', 'primary')

    // 3. Local notification fallback for foreground/background transition
    if (Capacitor.isNativePlatform()) {
      let channelId = 'homswag_general_default_v5'
      if (type.includes('order') || type.includes('invoice'))
        channelId = 'homswag_orders_default_v5'
      else if (type.includes('trip')) channelId = 'homswag_trips_default_v5'

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
  void fcmCleanup?.()
})

// Keep the store's isOnline in sync with the composable's reactive ref
watch(isOnline, online => {
  appStore.setOnline(online)
})

// Keep realtime notification ownership tied to the active access token.
// This handles cold boot, logout, and switching users in the same app session.
watch(
  () => authStore.accessToken,
  async token => {
    const notificationStore = useNotificationStore()

    if (!token) {
      activeSessionToken = null
      await fcmCleanup?.()
      fcmCleanup = null
      webSocketService.disconnect()
      locationTracker.stop()
      notificationStore.clearNotifications()
      return
    }

    if (activeSessionToken === token) return

    await fcmCleanup?.()
    fcmCleanup = null
    activeSessionToken = token

    webSocketService.connect(token)
    void locationTracker.start()
    void appStore.fetchConfig()
    notificationStore.clearNotifications()
    void notificationStore.fetchNotifications()

    try {
      fcmCleanup = await fcm.init()
    } catch (err) {
      fcmCleanup = null
      console.warn('[App] FCM init failed:', err)
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

.update-required {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(30, 58, 138, 0.08) 100%), var(--color-background);
  padding: var(--spacing-6);
}

.update-card {
  position: relative;
  width: 100%;
  max-width: 360px;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: var(--color-surface);
}

.update-card__glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 1;
}

.update-card__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--spacing-8) var(--spacing-6);
}

.update-card__logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: var(--radius-xl);
  margin-bottom: var(--spacing-6);
  box-shadow: 0 8px 16px rgba(124, 58, 237, 0.15);
}

.update-card__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--spacing-3) 0;
  letter-spacing: -0.5px;
}

.update-card__description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0 0 var(--spacing-6) 0;
}

.update-card__version-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-8);
  background: rgba(124, 58, 237, 0.05);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  border: 1px solid rgba(124, 58, 237, 0.1);
}

.update-card__version-tag {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.update-card__version-arrow {
  color: var(--color-brand);
  font-weight: var(--font-weight-bold);
}

.update-card__version-tag--new {
  color: var(--color-brand);
  font-weight: var(--font-weight-bold);
}

.update-card__button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  background: var(--color-brand);
  color: var(--ion-color-primary-contrast);
  border: none;
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.update-card__button:active {
  transform: scale(0.98);
  box-shadow: 0 4px 10px rgba(124, 58, 237, 0.2);
}

.update-card__btn-icon {
  width: 20px;
  height: 20px;
}
</style>
