<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Leave</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/ot-requests')" aria-label="OT Requests">
            <Icon icon="lucide:clock-plus" class="header-icon" />
          </ion-button>
          <ion-button @click="router.push('/weekly-off')" aria-label="Weekly Off">
            <Icon icon="lucide:calendar-x-2" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- ── Balance card ──────────────────────────────────────────────── -->
      <div class="balance-card">
        <p class="balance-card__title">Leave Balance (This Year)</p>
        <div class="balance-grid">
          <div class="balance-item">
            <span class="balance-item__count">{{ balance?.paid_leave ?? 0 }}</span>
            <span class="balance-item__label">Paid Leave</span>
          </div>
          <div class="balance-item">
            <span class="balance-item__count">{{ balance?.sick_leave ?? 0 }}</span>
            <span class="balance-item__label">Sick Leave</span>
          </div>
          <div class="balance-item">
            <span class="balance-item__count">{{ balance?.loss_of_pay ?? 0 }}</span>
            <span class="balance-item__label">Loss of Pay</span>
          </div>
        </div>
      </div>

      <!-- ── Section label ─────────────────────────────────────────────── -->
      <p class="section-label">My Requests</p>

      <!-- ── Loading skeleton ──────────────────────────────────────────── -->
      <template v-if="isLoading && requests.length === 0">
        <div class="list">
          <div v-for="n in 4" :key="n" class="skeleton">
            <div class="skeleton__top" />
            <div class="skeleton__mid" />
          </div>
        </div>
      </template>

      <!-- ── Error state ───────────────────────────────────────────────── -->
      <template v-else-if="error && requests.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load requests</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="loadAll">Retry</ion-button>
        </div>
      </template>

      <!-- ── Empty state ───────────────────────────────────────────────── -->
      <template v-else-if="!isLoading && requests.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:calendar-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No requests yet</p>
          <p class="empty-state__text">Tap the + button to submit a leave request.</p>
        </div>
      </template>

      <!-- ── Requests list ─────────────────────────────────────────────── -->
      <template v-else>
        <div class="list">
          <div
            v-for="req in sortedRequests"
            :key="req.id ?? req._id"
            class="req-card"
            :class="`req-card--${req.leave_type}`"
          >
            <div class="req-card__accent" />
            <div class="req-card__body">
              <div class="req-card__top">
                <span class="req-card__icon-wrap" :class="`req-card__icon-wrap--${req.leave_type}`">
                  <Icon :icon="leaveIcon(req.leave_type)" aria-hidden="true" />
                </span>
                <div class="req-card__info">
                  <p class="req-card__title">{{ leaveLabel(req.leave_type) }}</p>
                  <p class="req-card__meta">
                    {{ formatDate(req.date) }}
                    <span v-if="req.duration"> · {{ durationLabel(req.duration) }}</span>
                  </p>
                </div>
                <span class="req-card__badge" :class="`req-card__badge--${req.status}`">
                  {{ statusLabel(req.status) }}
                </span>
              </div>
              <p v-if="req.reason" class="req-card__reason">{{ req.reason }}</p>
              <div v-if="req.status === 'requested'" class="req-card__actions">
                <ion-button
                  fill="outline"
                  color="danger"
                  size="small"
                  :disabled="isCancelling === (req.id ?? req._id)"
                  @click="handleCancel(req)"
                >
                  <ion-spinner v-if="isCancelling === (req.id ?? req._id)" name="crescent" slot="start" />
                  Cancel request
                </ion-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div class="bottom-spacer" />
    </ion-content>

    <!-- ── FAB ────────────────────────────────────────────────────────── -->
    <div class="fab-wrap">
      <button class="fab" aria-label="New leave request" @click="openForm">
        <Icon icon="lucide:plus" class="fab__icon" />
      </button>
    </div>

    <!-- ── Request sheet ─────────────────────────────────────────────── -->
    <ion-modal
      :is-open="showForm"
      :initial-breakpoint="0.92"
      :breakpoints="[0, 0.92]"
      handle-behavior="cycle"
      @didDismiss="closeForm"
    >
      <ion-content class="sheet-content">
        <div class="sheet-body">

          <!-- Step 1: pick type -->
          <template v-if="step === 1">
            <p class="sheet-title">What would you like to request?</p>
            <div class="type-grid">
              <button
                v-for="t in REQUEST_TYPES"
                :key="t.value"
                class="type-card"
                :class="{ 'type-card--selected': form.leaveType === t.value }"
                @click="selectType(t.value)"
              >
                <span class="type-card__icon-wrap" :class="`type-card__icon-wrap--${t.value}`">
                  <Icon :icon="t.icon" />
                </span>
                <p class="type-card__label">{{ t.label }}</p>
                <p class="type-card__sub">{{ t.sub }}</p>
              </button>
            </div>
          </template>

          <!-- Step 2: fill form -->
          <template v-else>
            <div class="sheet-nav">
              <button class="sheet-back" @click="step = 1">
                <Icon icon="lucide:arrow-left" />
              </button>
              <p class="sheet-title sheet-title--inline">{{ selectedTypeLabel }}</p>
            </div>

            <div class="form-field">
              <label class="form-label">Date</label>
              <input v-model="form.date" type="date" class="form-input" :min="todayStr" />
            </div>

            <div class="form-field">
              <label class="form-label">Duration</label>
              <div class="duration-tabs">
                <button
                  v-for="d in DURATIONS"
                  :key="d.value"
                  class="duration-tab"
                  :class="{ 'duration-tab--active': form.duration === d.value }"
                  @click="form.duration = d.value"
                >
                  {{ d.label }}
                </button>
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">Reason <span class="form-label--optional">(optional)</span></label>
              <textarea
                v-model="form.reason"
                class="form-textarea"
                :placeholder="reasonPlaceholder"
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

            <p v-if="submitError" class="form-error">{{ submitError }}</p>
          </template>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonRefresher, IonRefresherContent, IonModal, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useLeave } from '../composables/useLeave'
import { useToast } from '@/shared/composables'
import { useAuthStore } from '@/shared/stores'
import { useUserTypeStore } from '@/shared/stores'
import { storeToRefs } from 'pinia'
import type { LeaveType, LeaveDuration, LeaveRequest } from '@/shared/models'

const router = useRouter()
const { showSuccess, showError } = useToast()
const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { user: _user } = storeToRefs(authStore)
const { userType: _userType } = storeToRefs(userTypeStore)

const {
  requests, balance, isLoading, isSubmitting, isCancelling, error,
  fetchRequests, fetchBalance, submitRequest, cancelRequest,
} = useLeave()

// ── Constants ──────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split('T')[0]

type LeaveKind = 'paid_leave' | 'sick_leave' | 'loss_of_pay'

const REQUEST_TYPES: { value: LeaveKind; label: string; sub: string; icon: string }[] = [
  { value: 'paid_leave',  label: 'Paid Leave',    sub: 'Use your paid leave balance',  icon: 'lucide:umbrella' },
  { value: 'sick_leave',  label: 'Sick Leave',    sub: 'Not feeling well? Take a day', icon: 'lucide:thermometer' },
  { value: 'loss_of_pay', label: 'Loss of Pay',   sub: 'Unpaid leave request',         icon: 'lucide:minus-circle' },
]

const DURATIONS: { value: LeaveDuration; label: string }[] = [
  { value: 'full_day',    label: 'Full Day' },
  { value: 'first_half',  label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
]

// ── State ──────────────────────────────────────────────────────────────────

const showForm    = ref(false)
const step        = ref<1 | 2>(1)
const submitError = ref<string | null>(null)

const form = ref({
  leaveType: 'paid_leave' as LeaveKind,
  date: todayStr,
  duration: 'full_day' as LeaveDuration,
  reason: '',
})

// ── Computed ───────────────────────────────────────────────────────────────

const sortedRequests = computed(() =>
  [...requests.value].sort((a, b) => b.date.localeCompare(a.date))
)

const selectedTypeLabel = computed(() =>
  REQUEST_TYPES.find((t) => t.value === form.value.leaveType)?.label ?? ''
)

const reasonPlaceholder = computed(() => {
  if (form.value.leaveType === 'sick_leave') return 'Describe your symptoms briefly...'
  return 'Any specific reason for this leave?'
})

// ── Helpers ────────────────────────────────────────────────────────────────

function leaveLabel(type: LeaveType): string {
  const map: Record<string, string> = {
    paid_leave: 'Paid Leave',
    sick_leave: 'Sick Leave',
    loss_of_pay: 'Loss of Pay',
    block_time: 'Block Time',
  }
  return map[type] ?? type
}

function leaveIcon(type: LeaveType): string {
  const map: Record<string, string> = {
    paid_leave: 'lucide:umbrella',
    sick_leave: 'lucide:thermometer',
    loss_of_pay: 'lucide:minus-circle',
    block_time: 'lucide:ban',
  }
  return map[type] ?? 'lucide:calendar'
}

function durationLabel(d: LeaveDuration): string {
  const map: Record<LeaveDuration, string> = {
    full_day: 'Full Day',
    first_half: 'First Half',
    second_half: 'Second Half',
  }
  return map[d] ?? d
}

function statusLabel(status: string): string {
  return { requested: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] ?? status
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Form flow ──────────────────────────────────────────────────────────────

function openForm(): void {
  step.value = 1
  form.value = { leaveType: 'paid_leave', date: todayStr, duration: 'full_day', reason: '' }
  submitError.value = null
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
}

function selectType(type: LeaveKind): void {
  form.value.leaveType = type
  step.value = 2
}

async function handleSubmit(): Promise<void> {
  if (!form.value.date) return
  submitError.value = null

  const result = await submitRequest({
    date: form.value.date,
    leave_type: form.value.leaveType as LeaveType,
    duration: form.value.duration,
    reason: form.value.reason || undefined,
  })

  if (result) {
    showSuccess('Leave request submitted')
    showForm.value = false
    // Refresh balance
    fetchBalance()
  } else {
    submitError.value = error.value ?? 'Failed to submit'
    showError(submitError.value)
  }
}

async function handleCancel(req: LeaveRequest): Promise<void> {
  const id = req.id ?? req._id ?? ''
  const ok = await cancelRequest(id)
  if (ok) {
    showSuccess('Request cancelled')
    fetchBalance()
  } else {
    showError(error.value ?? 'Failed to cancel')
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await loadAll()
  ;(event.target as HTMLIonRefresherElement).complete()
}

async function loadAll(): Promise<void> {
  await Promise.all([fetchRequests(), fetchBalance()])
}

onMounted(loadAll)
onIonViewWillEnter(() => {
  loadAll()
})
</script>

<style scoped>
/* ── Balance card ────────────────────────────────────────────────────────── */

.balance-card {
  margin: 16px 16px 0;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  border-radius: var(--radius-xl);
  padding: 16px;
  color: #fff;
}

.balance-card__title {
  margin: 0 0 12px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.balance-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.balance-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0 4px;
  border-right: 1px solid rgba(255,255,255,0.2);
}

.balance-item:last-child { border-right: none; }

.balance-item__count {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  line-height: 1;
}

.balance-item__label {
  font-size: var(--font-size-xs);
  opacity: 0.75;
  text-align: center;
  line-height: 1.3;
}

/* ── Section label ───────────────────────────────────────────────────────── */

.section-label {
  margin: 20px 16px 8px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

/* ── Request list ────────────────────────────────────────────────────────── */

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px;
}

.req-card {
  display: flex;
  align-items: stretch;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.req-card__accent { width: 4px; flex-shrink: 0; }
.req-card--paid_leave  .req-card__accent { background: #f59e0b; }
.req-card--sick_leave  .req-card__accent { background: #ef4444; }
.req-card--loss_of_pay .req-card__accent { background: #6b7280; }
.req-card--block_time  .req-card__accent { background: #8b5cf6; }

.req-card__body {
  flex: 1;
  padding: 12px 12px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.req-card__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.req-card__icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.req-card__icon-wrap--paid_leave  { background: #fef3c7; color: #d97706; }
.req-card__icon-wrap--sick_leave  { background: #fee2e2; color: #dc2626; }
.req-card__icon-wrap--loss_of_pay { background: #f3f4f6; color: #6b7280; }
.req-card__icon-wrap--block_time  { background: #ede9fe; color: #7c3aed; }

.req-card__info { flex: 1; min-width: 0; }

.req-card__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.req-card__meta {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.req-card__badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.req-card__badge--approved  { background: #d1fae5; color: #065f46; }
.req-card__badge--requested { background: #fef3c7; color: #92400e; }
.req-card__badge--rejected  { background: #fee2e2; color: #991b1b; }

.req-card__reason {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  padding-left: 46px;
}

.req-card__actions { display: flex; justify-content: flex-end; }

/* ── Empty / error state ─────────────────────────────────────────────────── */

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
.empty-state__text  { margin: 0; font-size: var(--font-size-base); color: var(--color-text-muted); }

/* ── Skeleton ────────────────────────────────────────────────────────────── */

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

/* ── FAB ─────────────────────────────────────────────────────────────────── */

.fab-wrap {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 16px);
  right: 20px;
  z-index: 200;
}

.fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-brand);
  border: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.fab:active { transform: scale(0.93); box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
.fab__icon { font-size: 26px; color: #fff; }

.bottom-spacer { height: 96px; }

/* ── Bottom sheet ────────────────────────────────────────────────────────── */

.sheet-content { --background: var(--color-surface); }

.sheet-body {
  padding: 8px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sheet-title {
  margin: 8px 0 0;
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-text);
}

.sheet-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.sheet-back {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-text);
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.sheet-title--inline { margin: 0; font-size: var(--font-size-lg); }

/* ── Type picker ─────────────────────────────────────────────────────────── */

.type-grid { display: flex; flex-direction: column; gap: 10px; }

.type-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.type-card:active { background: var(--color-brand-pale); }
.type-card--selected { border-color: var(--color-brand); background: var(--color-brand-pale); }

.type-card__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.type-card__icon-wrap--paid_leave  { background: #fef3c7; color: #d97706; }
.type-card__icon-wrap--sick_leave  { background: #fee2e2; color: #dc2626; }
.type-card__icon-wrap--loss_of_pay { background: #f3f4f6; color: #6b7280; }

.type-card__label { margin: 0; font-size: var(--font-size-base); font-weight: 700; color: var(--color-text); }
.type-card__sub   { margin: 2px 0 0; font-size: var(--font-size-sm); color: var(--color-text-muted); }

/* ── Form fields ─────────────────────────────────────────────────────────── */

.form-field { display: flex; flex-direction: column; gap: 8px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-label--optional { font-weight: 400; color: var(--color-text-muted); }

.form-input, .form-textarea {
  width: 100%;
  padding: 11px 13px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-background);
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}

.form-input:focus, .form-textarea:focus { border-color: var(--color-brand); }
.form-textarea { resize: vertical; }

.duration-tabs { display: flex; gap: 8px; }

.duration-tab {
  flex: 1;
  padding: 9px 4px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s ease;
}

.duration-tab--active {
  border-color: var(--color-brand);
  background: var(--color-brand-pale);
  color: var(--color-brand);
}

.submit-btn { --border-radius: var(--radius-xl); }

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

.header-icon { font-size: 20px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
