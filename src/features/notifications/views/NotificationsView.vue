<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="hasUnread"
            class="mark-all-btn"
            @click="handleMarkAll"
          >
            Mark all read
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeleton -->
      <template v-if="isLoading && notifications.length === 0">
        <div class="notif-list">
          <div v-for="n in 5" :key="n" class="notif-skeleton">
            <div class="notif-skeleton__dot" />
            <div class="notif-skeleton__body">
              <div class="notif-skeleton__title" />
              <div class="notif-skeleton__sub" />
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && notifications.length === 0">
        <div class="notif-empty">
          <Icon icon="lucide:bell-off" class="notif-empty__icon" aria-hidden="true" />
          <p class="notif-empty__title">No notifications</p>
          <p class="notif-empty__text">You're all caught up!</p>
        </div>
      </template>

      <!-- Notifications list -->
      <template v-else>
        <div class="notif-list">
          <div
            v-for="notif in notifications"
            :key="notif.id"
            class="notif-item"
            :class="{ 'notif-item--unread': !notif.is_read }"
            @click="handleRead(notif)"
          >
            <div class="notif-item__dot-wrap">
              <span v-if="!notif.is_read" class="notif-item__dot" aria-label="Unread" />
            </div>
            <div class="notif-item__body">
              <p class="notif-item__title">{{ notif.title }}</p>
              <p v-if="notif.body || notif.message" class="notif-item__message">
                {{ notif.body ?? notif.message }}
              </p>
              <p class="notif-item__time">{{ formatTime(notif.created_at) }}</p>
            </div>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonBackButton, IonContent, IonRefresher, IonRefresherContent,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/shared/api'
import { useToast } from '@/shared/composables'
import type { Notification } from '@/shared/models'

const { showError, showSuccess } = useToast()

const notifications = ref<Notification[]>([])
const isLoading = ref(false)

const hasUnread = computed(() => notifications.value.some((n) => !n.is_read))

async function fetchNotifications(): Promise<void> {
  isLoading.value = true
  try {
    const res = await getNotifications({ is_read: null, page: '1', limit: '50' })
    notifications.value = res.data ?? []
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load notifications')
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchNotifications()
  ;(event.target as HTMLIonRefresherElement).complete()
}

async function handleRead(notif: Notification): Promise<void> {
  if (notif.is_read) return
  try {
    await markNotificationRead(notif.id)
    notif.is_read = true
  } catch {
    // silent
  }
}

async function handleMarkAll(): Promise<void> {
  try {
    await markAllNotificationsRead()
    notifications.value.forEach((n) => (n.is_read = true))
    showSuccess('All notifications marked as read')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to mark all read')
  }
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

onMounted(fetchNotifications)
</script>

<style scoped>
.notif-list {
  display: flex;
  flex-direction: column;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.notif-item:active {
  background: var(--color-background);
}

.notif-item--unread {
  background: var(--color-brand-pale);
}

.notif-item__dot-wrap {
  width: 10px;
  flex-shrink: 0;
  padding-top: 5px;
}

.notif-item__dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand);
}

.notif-item__body {
  flex: 1;
  min-width: 0;
}

.notif-item__title {
  margin: 0 0 2px;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.notif-item__message {
  margin: 0 0 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.notif-item__time {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.mark-all-btn {
  font-size: var(--font-size-sm);
  --color: var(--color-brand);
}

/* Empty */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.notif-empty__icon {
  font-size: 52px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.notif-empty__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.notif-empty__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

/* Skeleton */
.notif-skeleton {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.notif-skeleton__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  flex-shrink: 0;
  margin-top: 5px;
}

.notif-skeleton__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notif-skeleton__title,
.notif-skeleton__sub {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.notif-skeleton__title { height: 16px; width: 70%; }
.notif-skeleton__sub   { height: 12px; width: 50%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
