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
  </ion-app>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { Icon } from '@iconify/vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import NoInternetView from '@/features/home/views/NoInternetView.vue'
import PermissionSplashView from '@/features/home/views/PermissionSplashView.vue'
import { locationTracker } from '@/shared/composables/useLocationTracker'
import { getIsOnline, useNetwork } from '@/shared/composables/useNetwork'
import { usePermissions } from '@/shared/composables/usePermissions'
import { useToast } from '@/shared/composables/useToast'
import logo from '@/shared/images/HomSwagLogo.png'
import { webSocketService } from '@/shared/lib/websocket.service'
import type { RawNotification } from '@/shared/models/notification.model'
import { useAppStore } from '@/shared/stores/app'
import { useAuthStore } from '@/shared/stores/auth'
import { useNotificationStore } from '@/shared/stores/notification'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

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

  if (restored) {
    // Ensure socket is connected if we have a session
    if (authStore.accessToken) {
      webSocketService.connect(authStore.accessToken)
      // Start background location tracking if enabled
      void locationTracker.start()
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
    await authStore.logout()
    await router.replace('/login')
  }
  window.addEventListener('homswag:logout', apiLogoutListener)

  // Listen for new notifications
  webSocketService.on('notification:new', (data: RawNotification) => {
    const notificationStore = useNotificationStore()
    notificationStore.addNotification(data)

    showToast(data.title || 'New notification', 'primary')
  })

  await boot()
  await setupAppStateListener()
})

onUnmounted(() => {
  appStateListener?.remove()
  if (apiLogoutListener) {
    window.removeEventListener('homswag:logout', apiLogoutListener)
  }
})

// Keep the store's isOnline in sync with the composable's reactive ref
watch(isOnline, online => {
  appStore.setOnline(online)
})
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
