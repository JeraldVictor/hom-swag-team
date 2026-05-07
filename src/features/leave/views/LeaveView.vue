<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Leave</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- ── Balance card ──────────────────────────────────────────────── -->
      <div class="balance-card">
        <p class="balance-card__title">Leave Balance</p>
        <div class="balance-grid">
          <div class="balance-item">
            <span class="balance-item__count">{{ DUMMY_BALANCE.paid_leave }}</span>
            <span class="balance-item__label">Paid Leave</span>
          </div>
          <div class="balance-item">
            <span class="balance-item__count">{{ DUMMY_BALANCE.sick_leave }}</span>
            <span class="balance-item__label">Sick Leave</span>
          </div>
          <div class="balance-item">
            <span class="balance-item__count">{{ DUMMY_BALANCE.loss_of_pay }}</span>
            <span class="balance-item__label">Loss of Pay</span>
          </div>
        </div>
      </div>

      <!-- ── Section label ─────────────────────────────────────────────── -->
      <p class="section-label">My Requests</p>

      <!-- ── Loading skeleton ──────────────────────────────────────────── -->
      <template v-if="isLoading">
        <div class="list">
          <div v-for="n in 4" :key="n" class="skeleton">
            <div class="skeleton__top" />
            <div class="skeleton__mid" />
          </div>
        </div>
      </template>

      <!-- ── Empty state ───────────────────────────────────────────────── -->
      <template v-else-if="allRequests.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:calendar-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No requests yet</p>
          <p class="empty-state__text">Tap the + button to submit a request.</p>
        </div>
      </template>

      <!-- ── Requests list ─────────────────────────────────────────────── -->
      <template v-else>
        <div class="list">
          <div
            v-for="req in allRequests"
            :key="`${req.kind}-${req.id}`"
            class="req-card"
            :class="`req-card--${req.kind}`"
          >
            <!-- Left accent -->
            <div class="req-card__accent" />

            <div class="req-card__body">
              <!-- Top row -->
              <div class="req-card__top">
                <span class="req-card__icon-wrap" :class="`req-card__icon-wrap--${req.kind}`">
                  <Icon :icon="kindIcon(req.kind)" aria-hidden="true" />
                </span>
                <div class="req-card__info">
                  <p class="req-card__title">{{ req.title }}</p>
                  <p class="req-card__meta">{{ formatDate(req.date) }}<span v-if="req.detail"> · {{ req.detail }}</span></p>
                </div>
                <span class="req-card__badge" :class="`req-card__badge--${req.status}`">
                  {{ statusLabel(req.status) }}
                </span>
              </div>

              <!-- Reason -->
              <p v-if="req.reason" class="req-card__reason">{{ req.reason }}</p>

              <!-- Cancel button — only for pending requests -->
              <div v-if="req.status === 'requested'" class="req-card__actions">
                <button class="cancel-btn" @click="handleCancel(req)">
                  Cancel request
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- bottom padding so FAB doesn't cover last card -->
      <div class="bottom-spacer" />
    </ion-content>

    <!-- ── FAB — bottom right ────────────────────────────────────────── -->
    <div class="fab-wrap">
      <button class="fab" aria-label="New request" @click="openForm">
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

          <!-- ── Step 1: pick request type ──────────────────────────── -->
          <template v-if="step === 1">
            <p class="sheet-title">What would you like to request?</p>
            <div class="type-grid">
              <button
                v-for="t in REQUEST_TYPES"
                :key="t.value"
                class="type-card"
                :class="{ 'type-card--selected': form.requestType === t.value }"
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

          <!-- ── Step 2: fill the form ───────────────────────────────── -->
          <template v-else>
            <!-- Back + title -->
            <div class="sheet-nav">
              <button class="sheet-back" @click="step = 1">
                <Icon icon="lucide:arrow-left" />
              </button>
              <p class="sheet-title sheet-title--inline">
                {{ selectedTypeLabel }}
              </p>
            </div>

            <!-- Date -->
            <div class="form-field">
              <label class="form-label">Date</label>
              <input
                v-model="form.date"
                type="date"
                class="form-input"
                :min="form.requestType === 'ot' ? undefined : todayStr"
              />
            </div>

            <!-- Leave-specific fields -->
            <template v-if="form.requestType === 'paid_leave' || form.requestType === 'sick_leave'">
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
            </template>

            <!-- OT-specific fields -->
            <template v-if="form.requestType === 'ot'">
              <div class="form-field">
                <label class="form-label">Overtime Hours</label>
                <div class="hours-row">
                  <button class="hours-btn" :disabled="form.hours <= 0.5" @click="form.hours = Math.max(0.5, form.hours - 0.5)">
                    <Icon icon="lucide:minus" />
                  </button>
                  <span class="hours-value">{{ form.hours }} hr{{ form.hours !== 1 ? 's' : '' }}</span>
                  <button class="hours-btn" :disabled="form.hours >= 12" @click="form.hours = Math.min(12, form.hours + 0.5)">
                    <Icon icon="lucide:plus" />
                  </button>
                </div>
              </div>
            </template>

            <!-- Reason -->
            <div class="form-field">
              <label class="form-label">Reason <span class="form-label--optional">(optional)</span></label>
              <textarea
                v-model="form.reason"
                class="form-textarea"
                :placeholder="reasonPlaceholder"
                rows="3"
              />
            </div>

            <!-- Submit -->
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
import {
  IonPage, IonHeader, IonToolbar, IonTitle,
  IonContent, IonRefresher, IonRefresherContent, IonModal, IonSpinner, IonButton,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useToast } from '@/shared/composables'
import type { LeaveDuration } from '@/shared/models'

const { showSuccess } = useToast()

// ── Constants ──────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split('T')[0]

const DUMMY_BALANCE = { paid_leave: 8, sick_leave: 4, loss_of_pay: 0 }

type RequestKind = 'paid_leave' | 'sick_leave' | 'ot'
type RequestStatus = 'requested' | 'approved' | 'rejected'

interface RequestItem {
  id: string
  kind: RequestKind
  title: string
  date: string
  detail?: string
  reason?: string
  status: RequestStatus
}

const REQUEST_TYPES: { value: RequestKind; label: string; sub: string; icon: string }[] = [
  { value: 'paid_leave', label: 'Paid Leave',  sub: 'Use your paid leave balance',   icon: 'lucide:umbrella' },
  { value: 'sick_leave', label: 'Sick Leave',  sub: 'Not feeling well? Take a day',  icon: 'lucide:thermometer' },
  { value: 'ot',         label: 'OT Request',  sub: 'Claim overtime hours worked',   icon: 'lucide:clock-plus' },
]

const DURATIONS: { value: LeaveDuration; label: string }[] = [
  { value: 'full_day',    label: 'Full Day' },
  { value: 'first_half',  label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
]

// ── Dummy data ─────────────────────────────────────────────────────────────

function relDate(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const dummyRequests = ref<RequestItem[]>([
  { id: '1', kind: 'paid_leave', title: 'Paid Leave',  date: relDate(-10), detail: 'Full Day',    status: 'approved',  reason: 'Family function' },
  { id: '2', kind: 'sick_leave', title: 'Sick Leave',  date: relDate(-5),  detail: 'First Half',  status: 'approved',  reason: 'Fever' },
  { id: '3', kind: 'ot',         title: 'Overtime',    date: relDate(-3),  detail: '2 hrs',       status: 'approved' },
  { id: '4', kind: 'paid_leave', title: 'Paid Leave',  date: relDate(2),   detail: 'Full Day',    status: 'requested' },
  { id: '5', kind: 'ot',         title: 'Overtime',    date: relDate(0),   detail: '3 hrs',       status: 'requested', reason: 'Extra delivery run' },
  { id: '6', kind: 'sick_leave', title: 'Sick Leave',  date: relDate(8),   detail: 'Second Half', status: 'requested' },
  { id: '7', kind: 'paid_leave', title: 'Paid Leave',  date: relDate(15),  detail: 'Full Day',    status: 'rejected',  reason: 'Personal work' },
])

// ── State ──────────────────────────────────────────────────────────────────

const isLoading   = ref(false)
const isSubmitting = ref(false)
const submitError  = ref<string | null>(null)
const showForm     = ref(false)
const step         = ref<1 | 2>(1)

const form = ref({
  requestType: 'paid_leave' as RequestKind,
  date: todayStr,
  duration: 'full_day' as LeaveDuration,
  hours: 2,
  reason: '',
})

// ── Computed ───────────────────────────────────────────────────────────────

// Sort newest first
const allRequests = computed(() =>
  [...dummyRequests.value].sort((a, b) => b.date.localeCompare(a.date))
)

const selectedTypeLabel = computed(() =>
  REQUEST_TYPES.find((t) => t.value === form.value.requestType)?.label ?? ''
)

const reasonPlaceholder = computed(() => {
  if (form.value.requestType === 'sick_leave') return 'Describe your symptoms briefly...'
  if (form.value.requestType === 'ot') return 'Why did you work overtime?'
  return 'Any specific reason for this leave?'
})

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(status: RequestStatus): string {
  return { requested: 'Pending', approved: 'Approved', rejected: 'Rejected' }[status] ?? status
}

function kindIcon(kind: RequestKind): string {
  return { paid_leave: 'lucide:umbrella', sick_leave: 'lucide:thermometer', ot: 'lucide:clock-plus' }[kind]
}

// ── Form flow ──────────────────────────────────────────────────────────────

function openForm(): void {
  step.value = 1
  form.value = { requestType: 'paid_leave', date: todayStr, duration: 'full_day', hours: 2, reason: '' }
  submitError.value = null
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
}

function selectType(type: RequestKind): void {
  form.value.requestType = type
  step.value = 2
}

function handleSubmit(): void {
  if (!form.value.date) return
  isSubmitting.value = true
  submitError.value = null

  // Simulate async submit with a short delay
  setTimeout(() => {
    const kind = form.value.requestType
    const detail = kind === 'ot'
      ? `${form.value.hours} hr${form.value.hours !== 1 ? 's' : ''}`
      : { full_day: 'Full Day', first_half: 'First Half', second_half: 'Second Half' }[form.value.duration]

    const newReq: RequestItem = {
      id: String(Date.now()),
      kind,
      title: REQUEST_TYPES.find((t) => t.value === kind)?.label ?? kind,
      date: form.value.date,
      detail,
      reason: form.value.reason || undefined,
      status: 'requested',
    }

    dummyRequests.value.unshift(newReq)
    isSubmitting.value = false
    showForm.value = false
    showSuccess('Request submitted successfully')
  }, 600)
}

function handleCancel(req: RequestItem): void {
  dummyRequests.value = dummyRequests.value.filter((r) => r.id !== req.id)
  showSuccess('Request cancelled')
}

function handleRefresh(event: CustomEvent): void {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
    ;(event.target as HTMLIonRefresherElement).complete()
  }, 500)
}

onMounted(() => {
  // Simulate initial load flash
  isLoading.value = true
  setTimeout(() => { isLoading.value = false }, 300)
})

onIonViewWillEnter(() => { /* data is local, nothing to re-fetch */ })
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
  gap: 0;
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

.req-card__accent {
  width: 4px;
  flex-shrink: 0;
}

.req-card--paid_leave .req-card__accent { background: #f59e0b; }
.req-card--sick_leave .req-card__accent { background: #ef4444; }
.req-card--ot         .req-card__accent { background: #8b5cf6; }

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

.req-card__icon-wrap--paid_leave { background: #fef3c7; color: #d97706; }
.req-card__icon-wrap--sick_leave { background: #fee2e2; color: #dc2626; }
.req-card__icon-wrap--ot         { background: #ede9fe; color: #7c3aed; }

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
  padding-left: 46px; /* align with text after icon */
}

.req-card__actions {
  display: flex;
  justify-content: flex-end;
}

.cancel-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 5px 12px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-error-text);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.cancel-btn:active { background: var(--color-error-bg); }

/* ── Empty state ─────────────────────────────────────────────────────────── */

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

.fab:active {
  transform: scale(0.93);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}

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

/* ── Type picker grid ────────────────────────────────────────────────────── */

.type-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

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

.type-card--selected {
  border-color: var(--color-brand);
  background: var(--color-brand-pale);
}

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

.type-card__icon-wrap--paid_leave { background: #fef3c7; color: #d97706; }
.type-card__icon-wrap--sick_leave { background: #fee2e2; color: #dc2626; }
.type-card__icon-wrap--ot         { background: #ede9fe; color: #7c3aed; }

.type-card__label {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.type-card__sub {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Form fields ─────────────────────────────────────────────────────────── */

.form-field { display: flex; flex-direction: column; gap: 8px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-label--optional {
  font-weight: 400;
  color: var(--color-text-muted);
}

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

/* Duration tabs */
.duration-tabs {
  display: flex;
  gap: 8px;
}

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

/* Hours stepper */
.hours-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.hours-btn {
  width: 48px;
  height: 48px;
  background: none;
  border: none;
  font-size: 20px;
  color: var(--color-brand);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s ease;
}

.hours-btn:active:not(:disabled) { background: var(--color-brand-pale); }
.hours-btn:disabled { color: var(--color-text-muted); cursor: not-allowed; }

.hours-value {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-text);
}

.submit-btn { --border-radius: var(--radius-xl); }

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
