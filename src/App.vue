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
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/shared/stores/auth'
import { useAppStore } from '@/shared/stores/app'
import { useNetwork, getIsOnline } from '@/shared/composables/useNetwork'
import { usePermissions } from '@/shared/composables/usePermissions'
import NoInternetView from '@/features/home/views/NoInternetView.vue'
import PermissionSplashView from '@/features/home/views/PermissionSplashView.vue'
import logo from '@/shared/images/HomSwagLogo.png'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// Network state — reactive, shared singleton
const { isOnline } = useNetwork()

// Permissions
const { checkAll, allGranted } = usePermissions()

// Reactive store refs for the template
const { bootPhase } = storeToRefs(appStore)

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
  appStore.setPermissionsGranted(true)
  appStore.setBootPhase('ready')

  const restored = await authStore.restoreSession()
  if (restored && router.currentRoute.value.path === '/login') {
    await router.replace('/home')
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
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  await boot()
})

// Keep the store's isOnline in sync with the composable's reactive ref
watch(isOnline, (online) => {
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
