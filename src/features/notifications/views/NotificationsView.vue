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

      <div class="notif-filter" role="tablist" aria-label="Notification filter">
        <button
          type="button"
          class="notif-filter__btn"
          :class="{ 'notif-filter__btn--active': filter === 'all' }"
          role="tab"
          :aria-selected="filter === 'all'"
          @click="setFilter('all')"
        >
          <span>All</span>
          <span class="notif-filter__count">{{ notifications.length }}</span>
        </button>
        <button
          type="button"
          class="notif-filter__btn"
          :class="{ 'notif-filter__btn--active': filter === 'unread' }"
          role="tab"
          :aria-selected="filter === 'unread'"
          @click="setFilter('unread')"
        >
          <span>Unread</span>
          <span class="notif-filter__count" :class="{ 'notif-filter__count--danger': unreadCount > 0 }">
            {{ unreadCount }}
          </span>
        </button>
      </div>

      <!-- Loading skeleton -->
      <template v-if="isLoading && notifications.length === 0">
        <div class="notif-list">
          <div v-for="n in 5" :key="n" class="notif-skeleton">
            <div class="notif-skeleton__icon" />
            <div class="notif-skeleton__body">
              <div class="notif-skeleton__title" />
              <div class="notif-skeleton__sub" />
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && filteredNotifications.length === 0">
        <div class="notif-empty">
          <div class="notif-empty__icon-wrap">
            <Icon icon="lucide:bell-off" class="notif-empty__icon" aria-hidden="true" />
          </div>
          <p class="notif-empty__title">No {{ filter === 'unread' ? 'unread' : '' }} notifications</p>
          <p class="notif-empty__text">You're all caught up!</p>
        </div>
      </template>

      <!-- Notifications list -->
      <template v-else>
        <ion-list lines="none" class="notif-list">
          <div v-for="(group, dateLabel) in groupedNotifications" :key="dateLabel">
            <ion-list-header class="notif-group-header">
              <ion-label>{{ dateLabel }}</ion-label>
            </ion-list-header>

            <ion-item-sliding
              v-for="notif in group"
              :key="notif.id"
              :disabled="notif.is_read"
            >
              <ion-item
                button
                class="notif-item"
                :class="{ 'notif-item--unread': !notif.is_read }"
                @click="handleRead(notif)"
              >
                <div slot="start" class="notif-item__icon-wrap" :class="`notif-item__icon--${getIconType(notif.type)}`">
                  <Icon :icon="getIcon(notif.type)" class="notif-item__icon" />
                  <span v-if="!notif.is_read" class="notif-item__unread-dot" />
                </div>
                <ion-label class="notif-item__content">
                  <div class="notif-item__header">
                    <h2 class="notif-item__title">{{ notif.title }}</h2>
                    <span class="notif-item__time">{{ formatTime(notif.created_at) }}</span>
                  </div>
                  <p
                    v-if="notif.body || notif.message"
                    class="notif-item__message"
                    v-html="notif.body ?? notif.message"
                  ></p>
                </ion-label>
              </ion-item>

              <ion-item-options side="end">
                <ion-item-option color="primary" @click="handleRead(notif, false)">
                  <Icon icon="lucide:check-circle" slot="icon-only" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </div>
        </ion-list>
      </template>

      <!-- Notification Detail Modal -->
      <ion-modal
        :is-open="!!selectedNotif"
        @didDismiss="selectedNotif = null"
        :initial-breakpoint="0.5"
        :breakpoints="[0, 0.5, 0.9]"
      >
        <div class="notif-detail" v-if="selectedNotif">
          <div class="notif-detail__header">
            <div class="notif-detail__icon-wrap" :class="`notif-item__icon--${getIconType(selectedNotif.type)}`">
              <Icon :icon="getIcon(selectedNotif.type)" class="notif-detail__icon" />
            </div>
            <div class="notif-detail__meta">
              <h2 class="notif-detail__title">{{ selectedNotif.title }}</h2>
              <p class="notif-detail__time">{{ formatFullDate(selectedNotif.created_at) }}</p>
            </div>
            <ion-button fill="clear" color="medium" @click="selectedNotif = null">
              <Icon icon="lucide:x" />
            </ion-button>
          </div>
          
          <div class="notif-detail__content">
            <div 
              class="notif-detail__body" 
              v-html="selectedNotif.body ?? selectedNotif.message ?? 'No content available.'"
            ></div>
          </div>

          <div class="notif-detail__footer" v-if="hasAction(selectedNotif)">
            <ion-button expand="block" @click="handleAction(selectedNotif)">
              View Details
              <Icon icon="lucide:chevron-right" slot="end" />
            </ion-button>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/shared/composables'
import type { Notification, NotificationData } from '@/shared/models/notification.model'
import { useNotificationStore } from '@/shared/stores/notification'

const { showError, showSuccess } = useToast()
const notificationStore = useNotificationStore()
const router = useRouter()

const filter = ref<'all' | 'unread'>('all')
const selectedNotif = ref<Notification | null>(null)

const notifications = computed(() => notificationStore.notifications)
const isLoading = computed(() => notificationStore.isLoading)
const unreadCount = computed(() => notificationStore.unreadCount)
const hasUnread = computed(() => notificationStore.hasUnread)

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') {
    return notifications.value.filter(n => !n.is_read)
  }
  return notifications.value
})

const groupedNotifications = computed(() => {
  const groups: Record<string, Notification[]> = {}

  filteredNotifications.value.forEach(notif => {
    const dateLabel = getDateLabel(notif.created_at)
    if (!groups[dateLabel]) {
      groups[dateLabel] = []
    }
    groups[dateLabel].push(notif)
  })

  return groups
})

function setFilter(nextFilter: 'all' | 'unread'): void {
  filter.value = nextFilter
}

async function fetchNotifications(): Promise<void> {
  await notificationStore.fetchNotifications()
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchNotifications()
  ;(event.target as HTMLIonRefresherElement).complete()
}

async function handleRead(notif: Notification, showModal = true): Promise<void> {
  if (!notif.is_read) {
    await notificationStore.markAsRead(notif.id)
  }

  if (showModal) {
    selectedNotif.value = notif
  }
}

function hasAction(notif: Notification): boolean {
  const type = notif.type
  const data: NotificationData = notif.data ?? {}
  const hasRef = !!(data.order_id || data.trip_id || notif.reference_id)

  const actionableTypes = [
    'order_assigned',
    'order_status_changed',
    'invoice_sent',
    'trip_assigned',
    'trip_status_changed',
    'leave_approved',
    'leave_rejected',
    'complaint_visible',
  ]

  return actionableTypes.includes(type ?? '') || hasRef
}

function handleAction(notif: Notification): void {
  selectedNotif.value = null

  // Deep linking logic
  const type = notif.type
  const data: NotificationData = notif.data ?? {}

  if (type === 'order_assigned' || type === 'order_status_changed' || type === 'invoice_sent') {
    const orderId = data.order_id ?? notif.reference_id
    if (orderId) {
      router.push(`/orders/${orderId}`)
    } else {
      router.push('/orders')
    }
  } else if (type === 'trip_assigned' || type === 'trip_status_changed') {
    const tripId = data.trip_id ?? notif.reference_id
    if (tripId) {
      router.push(`/trips/${tripId}`)
    } else {
      router.push('/trips')
    }
  } else if (type === 'leave_approved' || type === 'leave_rejected') {
    router.push('/leave')
  } else if (type === 'complaint_visible') {
    router.push('/complaints')
  } else {
    // Check for generic reference
    if (notif.reference_id && notif.reference_type) {
      if (notif.reference_type === 'order') router.push(`/orders/${notif.reference_id}`)
      else if (notif.reference_type === 'trip') router.push(`/trips/${notif.reference_id}`)
    }
  }
}

async function handleMarkAll(): Promise<void> {
  try {
    await notificationStore.markAllRead()
    showSuccess('All notifications marked as read')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to mark all read')
  }
}

function getIcon(type?: string): string {
  switch (type) {
    case 'order_assigned':
      return 'lucide:shopping-bag'
    case 'order_status_changed':
      return 'lucide:clipboard-list'
    case 'trip_assigned':
      return 'lucide:navigation'
    case 'trip_status_changed':
      return 'lucide:map-pin'
    case 'leave_approved':
      return 'lucide:calendar-check'
    case 'leave_rejected':
      return 'lucide:calendar-x'
    case 'complaint_visible':
      return 'lucide:alert-circle'
    case 'invoice_sent':
      return 'lucide:file-text'
    case 'system_alert':
      return 'lucide:bell'
    case 'general':
    default:
      return 'lucide:bell'
  }
}

function getIconType(type?: string): string {
  if (!type) return 'default'
  if (type.includes('order')) return 'order'
  if (type.includes('trip')) return 'trip'
  if (type.includes('leave')) return 'leave'
  if (type.includes('complaint')) return 'danger'
  if (type.includes('invoice')) return 'invoice'
  return 'default'
}

function getDateLabel(iso?: string): string {
  if (!iso) return 'Earlier'
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatFullDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  notificationStore.fetchNotifications()
})
</script>

<style scoped>
.mark-all-btn {
  font-size: 14px;
  font-weight: 600;
  --color: var(--color-brand);
}

.notif-filter {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-background, #fff);
  border-bottom: 1px solid var(--color-border, #eee);
}

.notif-filter__btn {
  appearance: none;
  border: 1px solid var(--color-border, #e6e2e5);
  background: var(--color-white, #fff);
  color: var(--color-text-secondary, #5f5660);
  border-radius: 8px;
  min-height: 40px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease;
}

.notif-filter__btn--active {
  background: var(--color-brand, #6f164e);
  border-color: var(--color-brand, #6f164e);
  color: #fff;
}

.notif-filter__count {
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.08);
  color: currentColor;
  font-size: 12px;
  line-height: 1;
}

.notif-filter__btn--active .notif-filter__count {
  background: rgba(255, 255, 255, 0.22);
}

.notif-filter__count--danger {
  background: var(--ion-color-danger, #eb445a);
  color: #fff;
}

.notif-group-header {
  --background: var(--color-background-alt, #f8f9fa);
  --color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.notif-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --inner-padding-end: 0;
  --background: var(--color-white, #ffffff);
  border-bottom: 1px solid var(--color-border, #eee);
}

.notif-item--unread {
  --background: var(--color-brand-light, #f0f4ff);
}

.notif-item__icon-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.notif-item__icon {
  font-size: 22px;
}

.notif-item__unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: var(--ion-color-danger, #eb445a);
  border: 2px solid var(--color-white, #fff);
  border-radius: 50%;
}

.notif-item__icon--order { background: #e3f2fd; color: #1976d2; }
.notif-item__icon--trip { background: #f1f8e9; color: #689f38; }
.notif-item__icon--leave { background: #fff3e0; color: #ef6c00; }
.notif-item__icon--danger { background: #ffebee; color: #d32f2f; }
.notif-item__icon--invoice { background: #f3e5f5; color: #7b1fa2; }
.notif-item__icon--default { background: #f5f5f5; color: #616161; }

.notif-item__content {
  margin: 0;
}

.notif-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.notif-item__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #111);
  line-height: 1.2;
}

.notif-item__time {
  font-size: 11px;
  color: var(--color-text-muted, #999);
  white-space: nowrap;
  margin-left: 8px;
}

.notif-item__message {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary, #666);
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  box-orient: vertical;
  overflow: hidden;
}

/* Empty State */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.notif-empty__icon-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--color-background-alt, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.notif-empty__icon {
  font-size: 40px;
  color: var(--color-text-muted, #999);
}

.notif-empty__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text, #111);
  margin: 0 0 8px;
}

.notif-empty__text {
  font-size: 14px;
  color: var(--color-text-secondary, #666);
  margin: 0;
}

/* Skeleton */
.notif-skeleton {
  display: flex;
  padding: 16px;
  border-bottom: 1px solid var(--color-border, #eee);
}

.notif-skeleton__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--color-skeleton, #eee);
  margin-right: 12px;
}

.notif-skeleton__body {
  flex: 1;
}

.notif-skeleton__title {
  width: 60%;
  height: 16px;
  background: var(--color-skeleton, #eee);
  border-radius: 4px;
  margin-bottom: 8px;
}

.notif-skeleton__sub {
  width: 90%;
  height: 12px;
  background: var(--color-skeleton, #eee);
  border-radius: 4px;
}

/* Detail Modal */
.notif-detail {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.notif-detail__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.notif-detail__icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-detail__icon {
  font-size: 28px;
}

.notif-detail__meta {
  flex: 1;
}

.notif-detail__title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text, #111);
  line-height: 1.2;
}

.notif-detail__time {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted, #999);
}

.notif-detail__content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 24px;
}

.notif-detail__body {
  font-size: 16px;
  color: var(--color-text-secondary, #444);
  line-height: 1.6;
}

.notif-detail__body :deep(strong) {
  font-weight: 700;
  color: var(--color-text);
}

.notif-detail__body :deep(p) {
  margin-bottom: 12px;
}

.notif-detail__footer {
  padding-top: 16px;
}

ion-modal {
  --border-radius: 32px 32px 0 0;
}
</style>
