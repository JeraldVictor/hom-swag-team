<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/leave" />
        </ion-buttons>
        <ion-title>Weekly Off</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Request weekly off" @click="showForm = true">
            <Icon icon="lucide:plus" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeleton -->
      <template v-if="isLoading && requests.length === 0">
        <div class="list">
          <div v-for="n in 3" :key="n" class="skeleton">
            <div class="skeleton__top" />
            <div class="skeleton__mid" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && requests.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:calendar-x-2" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No weekly off requests</p>
          <p class="empty-state__text">Tap + to request a weekly day off.</p>
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error && requests.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load requests</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchRequests">Retry</ion-button>
        </div>
      </template>

      <!-- List -->
      <template v-else>
        <div class="list">
          <div v-for="req in requests" :key="req.id ?? req._id" class="woff-card">
            <div class="woff-card__header">
              <div>
                <p class="woff-card__day">{{ dayLabel(req.day_of_week) }}</p>
                <p v-if="req.date" class="woff-card__date">{{ formatDate(req.date) }}</p>
              </div>
              <AppBadge :text="statusLabel(req.status)" :variant="statusVariant(req.status)" size="sm" />
            </div>
            <p v-if="req.reason" class="woff-card__reason">{{ req.reason }}</p>
            <div v-if="req.status === 'requested'" class="woff-card__actions">
              <ion-button
                fill="outline"
                color="danger"
                size="small"
                :disabled="isCancelling === (req.id ?? req._id)"
                @click="handleCancel(String(req.id ?? req._id ?? ''))"
              >
                <ion-spinner v-if="isCancelling === (req.id ?? req._id)" name="crescent" slot="start" />
                Cancel
              </ion-button>
            </div>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- New weekly off modal -->
    <ion-modal :is-open="showForm" @didDismiss="showForm = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Request Weekly Off</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showForm = false">
              <Icon icon="lucide:x" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="form-content">
        <div class="form-body">
          <div class="form-field">
            <label class="form-label">Preferred Day</label>
            <select v-model="form.day_of_week" class="form-select">
              <option v-for="d in days" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">Specific Date (optional)</label>
            <input v-model="form.date" type="date" class="form-input" />
          </div>
          <div class="form-field">
            <label class="form-label">Reason (optional)</label>
            <textarea v-model="form.reason" class="form-textarea" placeholder="Any specific reason..." rows="3" />
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>
          <ion-button
            expand="block"
            :disabled="isSubmitting"
            class="submit-btn"
            @click="handleSubmit"
          >
            <ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
            Submit Request
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton,
  IonContent, IonRefresher, IonRefresherContent, IonModal, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useWeeklyOff } from '../composables/useWeeklyOff'
import { useToast } from '@/shared/composables'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import type { WeeklyOffStatus, DayOfWeek } from '@/shared/models'

const { showSuccess, showError } = useToast()
const {
  requests, isLoading, isSubmitting, isCancelling, error,
  fetchRequests, submitRequest, cancelRequest,
} = useWeeklyOff()

const showForm = ref(false)

const days: { value: DayOfWeek; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

const form = ref({
  day_of_week: 'sunday' as DayOfWeek,
  date: '',
  reason: '',
})

function dayLabel(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

function statusLabel(status: WeeklyOffStatus): string {
  const map: Record<WeeklyOffStatus, string> = {
    requested: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[status] ?? status
}

function statusVariant(status: WeeklyOffStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'approved') return 'success'
  if (status === 'requested') return 'warning'
  if (status === 'rejected') return 'error'
  return 'default'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function handleSubmit(): Promise<void> {
  const result = await submitRequest({
    day_of_week: form.value.day_of_week,
    date: form.value.date || undefined,
    reason: form.value.reason || undefined,
  })
  if (result) {
    showSuccess('Weekly off request submitted')
    showForm.value = false
    form.value = { day_of_week: 'sunday', date: '', reason: '' }
  } else {
    showError(error.value ?? 'Failed to submit')
  }
}

async function handleCancel(id: string): Promise<void> {
  const ok = await cancelRequest(id)
  if (ok) showSuccess('Weekly off request cancelled')
  else showError(error.value ?? 'Failed to cancel')
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchRequests()
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(fetchRequests)
onIonViewWillEnter(() => {
  if (requests.value.length > 0) fetchRequests()
})
</script>

<style scoped>
.header-icon { font-size: 22px; }

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.woff-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.woff-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.woff-card__day {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.woff-card__date {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.woff-card__reason {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.woff-card__actions { display: flex; justify-content: flex-end; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.empty-state__icon { font-size: 52px; color: var(--color-text-muted); margin-bottom: 8px; }
.empty-state__title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.empty-state__text { margin: 0; font-size: var(--font-size-base); color: var(--color-text-muted); }

.skeleton {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton__top, .skeleton__mid {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton__top { height: 18px; width: 55%; }
.skeleton__mid { height: 14px; width: 40%; }

.form-content { --padding-bottom: 32px; }

.form-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-surface);
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}

.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--color-brand); }
.form-textarea { resize: vertical; }

.submit-btn { --border-radius: var(--radius-xl); margin-top: 4px; }

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
