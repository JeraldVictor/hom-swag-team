<template>
  <ion-page>
    <ion-content class="impersonate-page" :fullscreen="true">
      <div class="impersonate-card">
        <Icon
          :icon="status === 'error' ? 'lucide:circle-alert' : 'lucide:loader-circle'"
          class="impersonate-icon"
          :class="{ 'impersonate-icon--spin': status === 'loading' }"
        />
        <h1>{{ title }}</h1>
        <p>{{ message }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: template usage
import { Icon } from '@iconify/vue'
// biome-ignore lint/correctness/noUnusedImports: template usage
import { IonContent, IonPage } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile } from '@/shared/api/profile.service'
import type { AuthResponse } from '@/shared/models/auth.model'
import { useAuthStore } from '@/shared/stores/auth'

type ImpersonationPayload = AuthResponse & {
  impersonation?: {
    user_id: string
    user_type: 'rider' | 'beautician'
    user_name?: string
    user_phone: string
    started_at: string
    staff_id?: string
    staff_name?: string
  }
}

const router = useRouter()
const authStore = useAuthStore()
const status = ref<'loading' | 'error'>('loading')
const message = ref('Opening partner dashboard...')

// biome-ignore lint/correctness/noUnusedVariables: template usage
const title = computed(() => (status.value === 'error' ? 'Unable to sign in' : 'Signing you in'))

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function readPayload(): ImpersonationPayload {
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  const encodedPayload = params.get('payload')
  if (!encodedPayload) {
    throw new Error('Missing impersonation payload.')
  }

  const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<ImpersonationPayload>
  if (!parsed.accessToken || !parsed.refreshToken || !parsed.user?.user_type) {
    throw new Error('Invalid impersonation payload.')
  }

  return {
    get_profile: false,
    ...parsed,
  } as ImpersonationPayload
}

onMounted(async () => {
  try {
    const payload = readPayload()
    await authStore.login(payload)
    try {
      const fullProfile = await getProfile()
      await authStore.setUserProfile(fullProfile)
    } catch {
      // Non-fatal — the impersonation payload still contains enough identity to continue.
    }
    await router.replace('/home')
  } catch (error) {
    console.error('[ImpersonateView] Failed to open impersonation session:', error)
    status.value = 'error'
    message.value = error instanceof Error ? error.message : 'Please try again from the admin app.'
  }
})
</script>

<style scoped>
.impersonate-page {
  --background: #f8fafc;
}

.impersonate-card {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  color: #111827;
}

.impersonate-icon {
  width: 2rem;
  height: 2rem;
  color: #7c3aed;
}

.impersonate-icon--spin {
  animation: spin 0.9s linear infinite;
}

.impersonate-card h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.impersonate-card p {
  margin: 0;
  max-width: 22rem;
  color: #6b7280;
  font-size: 0.9375rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
