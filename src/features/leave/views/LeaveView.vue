<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Leave</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Request leave" @click="showForm = true">
            <Icon icon="lucide:plus" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Leave balance card -->
      <div v-if="balance" class="balance-card">
        <p class="balance-card__title">Leave Balance</p>
        <div class="balance-grid">
          <div v-for="(val, key) in balanceEntries" :key="key" class="balance-item">
            <span class="balance-item__count">{{ val }}</span>
            <span class="balance-item__label">{{ formatLeaveType(String(key)) }}</span>
          </div>
        </div>
      </div>

      <!-- Loading skeleton -->
      <template v-if="isLoading && requests.length === 0">
        <div class="leave-list">
          <div v-for="n in 4" :key="n" class="leave-skeleton">
            <div class="leave-skeleton__top" />
            <div class="leave-skeleton__mid" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && requests.length === 0">
        <div class="leave-empty">
          <Icon icon="lucide:calendar-off" class="leave-empty__icon" aria-hidden="true" />
          <p class="leave-empty__title">No leave requests</p>
          <p class="leave-empty__text">Tap + to request a leave.</p>
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error && requests.length === 0">
        <div class="leave-empty">
          <Icon icon="lucide:wifi-off" class="leave-empty__icon" aria-hidden="true" />
          <p class="leave-empty__title">Could not load requests</p>
          <p class="leave-empty__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchRequests">Retry</ion-button>
        </div>
      </template>

      <!-- Leave list -->
      <template v-else>
        <div class="leave-list">
          <div v-for="req in requests" :key="req.id ?? req._id" class="leave-card">
            <div class="leave-card__header">
              <div>
                <p class="leave-card__date">{{ formatDate(req.date) }}</p>
                <p class="leave-card__type">{{ formatLeaveType(req.leave_type) }} · {{ formatDuration(req.duration) }}</p>
              </div>
              <AppBadge :text="req.status" :variant="statusVariant(req.status)" size="sm" />
            </div>
            <p v-if="req.reason" class="leave-card__reason">{{ req.reason }}</p>
            <div v-if="req.status === 'requested'" class="leave-card__actions">
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

    <!-- Request leave modal -->
    <ion-modal :is-open="showForm" @didDismiss="showForm = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Request Leave</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showForm = false">
              <Icon icon="lucide:x" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="form-content">
        <div class="form-body">
          <!-- Date -->
          <div class="form-field">
            <label class="form-label">Date</label>
            <input
              v-model="form.date"
              type="date"
              class="form-input"
              :min="todayStr"
            />
          </div>

          <!-- Leave type -->
          <div class="form-field">
            <label class="form-label">Leave Type</label>
            <select v-model="form.leave_type" class="form-select">
              <option value="paid_leave">Paid Leave</option>
              <option value="sick_leave">Sick Leave</option>
              <option value="loss_of_pay">Loss of Pay</option>
              <option value="block_time">Block Time</option>
            </select>
          </div>

          <!-- Duration -->
          <div class="form-field">
            <label class="form-label">Duration</label>
            <select v-model="form.duration" class="form-select">
              <option value="full_day">Full Day</option>
              <option value="first_half">First Half</option>
              <option value="second_half">Second Half</option>
            </select>
          </div>

          <!-- Reason -->
          <div class="form-field">
            <label class="form-label">Reason (optional)</label>
            <textarea
              v-model="form.reason"
              class="form-textarea"
              placeholder="Briefly describe the reason..."
              rows="3"
            />
          </div>

          <ion-button
            expand="block"
            :disabled="isSubmitting || !form.date"
            class="submit-btn"
            @click="handleSubmit"
          >
            <ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
            Submit Request
          </ion-button>

          <p v-if="error" class="form-error">{{ error }}</p>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonRefresher, IonRefresherContent, IonModal, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'
import { useLeave } from '../composables/useLeave'
import { useToast } from '@/shared/composables'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import type { LeaveStatus, LeaveDuration, LeaveType } from '@/shared/models'

const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { user } = storeToRefs(authStore)
const { userType } = storeToRefs(userTypeStore)
const { showSuccess, showError } = useToast()

const {
  requests, balance, isLoading, isSubmitting, isCancelling, error,
  fetchRequests, fetchBalance, submitRequest, cancelRequest,
} = useLeave()

const showForm = ref(false)
const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  date: todayStr,
  leave_type: 'paid_leave' as LeaveType,
  duration: 'full_day' as LeaveDuration,
  reason: '',
})

const balanceEntries = computed(() => {
  if (!balance.value) return {}
  return Object.fromEntries(
    Object.entries(balance.value).filter(([, v]) => typeof v === 'number')
  )
})

function statusVariant(status: LeaveStatus) {
  const map: Record<LeaveStatus, 'success' | 'warning' | 'error' | 'default'> = {
    approved: 'success',
    requested: 'warning',
    rejected: 'error',
  }
  return map[status] ?? 'default'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatLeaveType(type?: string): string {
  const map: Record<string, string> = {
    paid_leave: 'Paid Leave',
    sick_leave: 'Sick Leave',
    loss_of_pay: 'Loss of Pay',
    block_time: 'Block Time',
  }
  return map[type ?? ''] ?? (type ?? '')
}

function formatDuration(d?: LeaveDuration): string {
  const map: Record<LeaveDuration, string> = {
    full_day: 'Full Day',
    first_half: 'First Half',
    second_half: 'Second Half',
  }
  return d ? (map[d] ?? d) : ''
}

async function handleSubmit(): Promise<void> {
  if (!user.value || !userType.value) return
  const result = await submitRequest({
    requester_id: String(user.value.id),
    requester_type: userType.value as 'beautician' | 'rider',
    date: form.value.date,
    leave_type: form.value.leave_type,
    duration: form.value.duration,
    reason: form.value.reason || undefined,
  })
  if (result) {
    showSuccess('Leave request submitted')
    showForm.value = false
    form.value = { date: todayStr, leave_type: 'paid_leave', duration: 'full_day', reason: '' }
  } else {
    showError(error.value ?? 'Failed to submit')
  }
}

async function handleCancel(id: string | number): Promise<void> {
  const ok = await cancelRequest(id)
  if (ok) showSuccess('Leave request cancelled')
  else showError(error.value ?? 'Failed to cancel')
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await Promise.all([fetchRequests(), fetchBalance()])
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(() => {
  fetchRequests()
  fetchBalance()
})
onIonViewWillEnter(() => {
  if (requests.value.length > 0) fetchRequests()
})
</script>

<style scoped>
.header-icon { font-size: 22px; }

/* Balance card */
.balance-card {
  margin: 16px 16px 0;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  border-radius: var(--radius-xl);
  padding: 16px;
  color: #fff;
}

.balance-card__title {
  margin: 0 0 12px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
}

.balance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.balance-item__count {
  font-size: var(--font-size-2xl);
  font-weight: 800;
}

.balance-item__label {
  font-size: var(--font-size-xs);
  opacity: 0.8;
  text-align: center;
}

/* Leave list */
.leave-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.leave-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.leave-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.leave-card__date {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.leave-card__type {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.leave-card__reason {
  margin: 4px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.leave-card__actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

/* Empty */
.leave-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.leave-empty__icon {
  font-size: 52px;
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.leave-empty__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}

.leave-empty__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
}

/* Skeleton */
.leave-skeleton {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leave-skeleton__top,
.leave-skeleton__mid {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.leave-skeleton__top { height: 18px; width: 55%; }
.leave-skeleton__mid { height: 14px; width: 40%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Form modal */
.form-content { --padding-bottom: 32px; }

.form-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input,
.form-select,
.form-textarea {
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

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--color-brand);
}

.form-textarea { resize: vertical; }

.submit-btn { --border-radius: var(--radius-xl); margin-top: 4px; }

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}
</style>
