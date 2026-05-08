<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/leave" />
        </ion-buttons>
        <ion-title>OT Requests</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="New OT request" @click="showForm = true">
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
          <Icon icon="lucide:clock-plus" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No OT requests</p>
          <p class="empty-state__text">Tap + to submit an overtime request.</p>
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
          <div v-for="req in requests" :key="req.id ?? req._id" class="ot-card">
            <div class="ot-card__header">
              <div>
                <p class="ot-card__date">{{ formatDate(req.date) }}</p>
                <p class="ot-card__sub">Overtime Request</p>
              </div>
              <AppBadge :text="statusLabel(req.status)" :variant="statusVariant(req.status)" size="sm" />
            </div>
            <p v-if="req.reason" class="ot-card__reason">{{ req.reason }}</p>
            <div class="ot-card__actions">
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

    <!-- New OT request modal -->
    <ion-modal :is-open="showForm" @didDismiss="showForm = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Request OT</ion-title>
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
            <label class="form-label">Date</label>
            <input v-model="form.date" type="date" class="form-input" :max="todayStr" />
          </div>
          <div class="form-field">
            <label class="form-label">Reason (optional)</label>
            <textarea v-model="form.reason" class="form-textarea" placeholder="Why did you work overtime?" rows="3" />
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>
          <ion-button
            expand="block"
            :disabled="isSubmitting || !form.date"
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
import { useOtRequests } from '../composables/useOtRequests'
import { useToast } from '@/shared/composables'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import type { OtRequestStatus } from '@/shared/models'

const { showSuccess, showError } = useToast()
const {
  requests, isLoading, isSubmitting, isCancelling, error,
  fetchRequests, submitRequest, cancelRequest,
} = useOtRequests()

const showForm = ref(false)
const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  date: todayStr,
  reason: '',
})

function statusLabel(status: OtRequestStatus): string {
  const map: Record<OtRequestStatus, string> = {
    requested: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[status] ?? status
}

function statusVariant(status: OtRequestStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'approved') return 'success'
  if (status === 'requested') return 'warning'
  if (status === 'rejected') return 'error'
  return 'default'
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

async function handleSubmit(): Promise<void> {
  const result = await submitRequest({
    date: form.value.date,
    reason: form.value.reason || undefined,
  })
  if (result) {
    showSuccess('OT request submitted')
    showForm.value = false
    form.value = { date: todayStr, reason: '' }
  } else {
    showError(error.value ?? 'Failed to submit')
  }
}

async function handleCancel(id: string): Promise<void> {
  const ok = await cancelRequest(id)
  if (ok) showSuccess('OT request cancelled')
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

.ot-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ot-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ot-card__date {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.ot-card__sub {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.ot-card__reason {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.ot-card__actions { display: flex; justify-content: flex-end; }

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

.form-input, .form-textarea {
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

.form-input:focus, .form-textarea:focus { border-color: var(--color-brand); }
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
