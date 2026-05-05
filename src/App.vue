<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useAuthStore } from '@/shared/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

/**
 * On app boot, restore any persisted session from storage.
 * If a valid session exists and the user is on the login page, redirect to home.
 * The router guard handles the reverse (unauthenticated → login).
 */
onMounted(async () => {
  const restored = await authStore.restoreSession()

  if (restored && router.currentRoute.value.path === '/login') {
    await router.replace('/home')
  }
})
</script>
