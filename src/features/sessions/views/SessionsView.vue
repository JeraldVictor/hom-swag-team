<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" />
        </ion-buttons>
        <ion-title>Active Sessions</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="isLoading && sessions.length === 0" class="sessions-loading">
        <div v-for="n in 3" :key="n" class="session-skeleton">
          <div class="session-skeleton__icon" />
          <div class="session-skeleton__body">
            <div class="session-skeleton__title" />
            <div class="session-skeleton__sub" />
          </div>
        </div>
      </div>

      <div v-else-if="sessions.length === 0" class="sessions-empty">
        <Icon icon="lucide:monitor-x" class="sessions-empty__icon" aria-hidden="true" />
        <p class="sessions-empty__title">No active sessions</p>
      </div>

      <div v-else class="sessions-list">
        <p class="sessions-hint">These are all devices currently logged into your account.</p>
        <div
          v-for="session in sessions"
          :key="session.id ?? session._id"
          class="session-card"
          :class="{ 'session-card--current': session.is_current }"
        >
          <div class="session-card__icon-wrap">
            <Icon icon="lucide:monitor-smartphone" class="session-card__icon" aria-hidden="true" />
          </div>
          <div class="session-card__body">
            <p class="session-card__device">
              {{ session.device ?? session.client_type ?? 'Unknown device' }}
              <span v-if="session.is_current" class="session-card__current-badge">Current</span>
            </p>
            <p v-if="session.ip_address" class="session-card__meta">{{ session.ip_address }}</p>
            <p v-if="session.last_used_at" class="session-card__meta">
              Last active {{ formatTime(session.last_used_at) }}
            </p>
          </div>
          <button
            v-if="!session.is_current"
            class="session-card__revoke"
            :disabled="revoking === (session.id ?? session._id)"
            aria-label="Revoke session"
            @click="handleRevoke(session.id ?? session._id ?? '')"
          >
            <ion-spinner v-if="revoking === (session.id ?? session._id)" name="crescent" />
            <Icon v-else icon="lucide:log-out" />
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonRefresher, IonRefresherContent, IonSpinner,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { getSessions, revokeSession } from '@/shared/api'
import { useToast } from '@/shared/composables'
import type { Session } from '@/shared/models'

const { showSuccess, showError } = useToast()

const sessions = ref<Session[]>([])
const isLoading = ref(false)
const revoking = ref<string | number | null>(null)

async function fetchSessions(): Promise<void> {
  isLoading.value = true
  try {
    sessions.value = await getSessions()
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load sessions')
  } finally {
    isLoading.value = false
  }
}

async function handleRevoke(id: string | number): Promise<void> {
  revoking.value = id
  try {
    await revokeSession(id)
    sessions.value = sessions.value.filter((s) => s.id !== id && s._id !== id)
    showSuccess('Session revoked')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to revoke session')
  } finally {
    revoking.value = null
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchSessions()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

onMounted(fetchSessions)
</script>

<style scoped>
.sessions-list { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

.sessions-hint {
  margin: 0 0 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.session-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.session-card--current {
  border-color: var(--color-brand-light);
  background: var(--color-brand-pale);
}

.session-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.session-card__icon { font-size: 20px; color: var(--color-brand); }

.session-card__body { flex: 1; min-width: 0; }

.session-card__device {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-card__current-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-brand);
  background: var(--color-brand-pale);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.session-card__meta {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.session-card__revoke {
  background: var(--color-error-bg);
  border: none;
  border-radius: var(--radius-lg);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-error-text);
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.session-card__revoke:disabled { opacity: 0.5; }

/* Empty */
.sessions-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.sessions-empty__icon { font-size: 52px; color: var(--color-text-muted); margin-bottom: 8px; }
.sessions-empty__title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }

/* Loading */
.sessions-loading { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

.session-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.session-skeleton__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--color-border);
  flex-shrink: 0;
}

.session-skeleton__body { flex: 1; display: flex; flex-direction: column; gap: 8px; }

.session-skeleton__title,
.session-skeleton__sub {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.session-skeleton__title { height: 16px; width: 60%; }
.session-skeleton__sub   { height: 12px; width: 40%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
