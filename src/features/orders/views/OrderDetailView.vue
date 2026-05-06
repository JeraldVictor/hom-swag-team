<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" />
        </ion-buttons>
        <ion-title>Order Details</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="order-detail-content">
      <!-- Loading -->
      <div v-if="isLoading" class="detail-loading">
        <div class="detail-loading__spinner" />
        <p>Loading order…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error && !order" class="detail-error">
        <Icon icon="lucide:alert-circle" class="detail-error__icon" aria-hidden="true" />
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="fetchOrder(orderId)">Retry</ion-button>
      </div>

      <!-- Order content -->
      <template v-else-if="order">
        <!-- Status timeline -->
        <div class="status-timeline">
          <div
            v-for="(step, i) in statusSteps"
            :key="step.key"
            class="status-step"
            :class="{
              'status-step--done': isStepDone(step.key),
              'status-step--active': isStepActive(step.key),
            }"
          >
            <div class="status-step__indicator">
              <div class="status-step__dot">
                <Icon v-if="isStepDone(step.key)" icon="lucide:check" class="status-step__check" />
              </div>
              <div v-if="i < statusSteps.length - 1" class="status-step__line" />
            </div>
            <span class="status-step__label">{{ step.label }}</span>
          </div>
        </div>

        <!-- Info card -->
        <div class="info-card">
          <!-- Order number + date -->
          <div class="info-row info-row--header">
            <div>
              <p class="info-label">Order</p>
              <p class="info-value">#{{ order.order_number ?? order.id }}</p>
            </div>
            <div class="text-right">
              <p class="info-label">Date</p>
              <p class="info-value">{{ formattedDate }}</p>
            </div>
          </div>

          <div class="info-divider" />

          <!-- Customer -->
          <div v-if="customerName" class="info-row">
            <Icon icon="lucide:user" class="info-icon" aria-hidden="true" />
            <div>
              <p class="info-label">Customer</p>
              <p class="info-value">{{ customerName }}</p>
              <p v-if="customerPhone" class="info-sub">
                <a :href="`tel:${customerPhone}`" class="info-link">{{ customerPhone }}</a>
              </p>
            </div>
          </div>

          <!-- Address -->
          <div v-if="addressText" class="info-row">
            <Icon icon="lucide:map-pin" class="info-icon" aria-hidden="true" />
            <div>
              <p class="info-label">Service Address</p>
              <p class="info-value">{{ addressText }}</p>
            </div>
          </div>

          <!-- Timing -->
          <div v-if="order.booking_info?.timing" class="info-row">
            <Icon icon="lucide:clock" class="info-icon" aria-hidden="true" />
            <div>
              <p class="info-label">Timing</p>
              <p class="info-value">{{ order.booking_info.timing }}</p>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="order.notes" class="info-row">
            <Icon icon="lucide:file-text" class="info-icon" aria-hidden="true" />
            <div>
              <p class="info-label">Notes</p>
              <p class="info-value">{{ order.notes }}</p>
            </div>
          </div>
        </div>

        <!-- OTP section (shown when status is Confirmed, before starting) -->
        <div v-if="showOtpSection" class="otp-card">
          <p class="otp-card__title">
            <Icon icon="lucide:shield-check" aria-hidden="true" />
            Service OTP
          </p>
          <p class="otp-card__hint">Share this OTP with the customer to verify your arrival.</p>

          <div v-if="order.service_otp" class="otp-display">
            <span class="otp-display__code">{{ order.service_otp }}</span>
          </div>

          <ion-button
            v-if="!order.service_otp"
            expand="block"
            fill="outline"
            :disabled="isGeneratingOtp"
            @click="handleGenerateOtp"
          >
            <ion-spinner v-if="isGeneratingOtp" name="crescent" slot="start" />
            Generate OTP
          </ion-button>

          <!-- OTP verify input -->
          <div v-if="order.service_otp" class="otp-verify">
            <p class="otp-verify__label">Customer confirms OTP:</p>
            <div class="otp-verify__row">
              <input
                v-model="otpInput"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="Enter 6-digit OTP"
                class="otp-verify__input"
              />
              <ion-button
                :disabled="otpInput.length !== 6 || isVerifyingOtp"
                @click="handleVerifyOtp"
              >
                <ion-spinner v-if="isVerifyingOtp" name="crescent" />
                <span v-else>Verify</span>
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Cancel after arrival -->
        <div v-if="canCancelAfterArrival" class="cancel-section">
          <ion-button
            expand="block"
            fill="outline"
            color="danger"
            :disabled="isUpdating"
            @click="showCancelModal = true"
          >
            Cancel After Arrival
          </ion-button>
        </div>
      </template>
    </ion-content>

    <!-- Action footer -->
    <div v-if="order && nextActionLabel && !isCompleted" class="action-footer">
      <ion-button
        expand="block"
        :disabled="isUpdating"
        class="action-btn"
        @click="handleAdvance"
      >
        <ion-spinner v-if="isUpdating" name="crescent" slot="start" />
        {{ nextActionLabel }}
      </ion-button>
    </div>

    <!-- Cancel modal -->
    <ion-modal :is-open="showCancelModal" @didDismiss="showCancelModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Cancel Order</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showCancelModal = false">
              <Icon icon="lucide:x" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div class="cancel-form">
          <p class="cancel-form__hint">Please provide a reason for cancellation after arrival.</p>
          <textarea
            v-model="cancelReason"
            class="cancel-form__input"
            placeholder="Reason for cancellation..."
            rows="4"
          />
          <ion-button
            expand="block"
            color="danger"
            :disabled="!cancelReason.trim() || isUpdating"
            @click="handleCancelAfterArrival"
          >
            <ion-spinner v-if="isUpdating" name="crescent" slot="start" />
            Confirm Cancellation
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonSpinner, IonModal,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useOrderDetail } from '../composables/useOrderDetail'
import { useToast } from '@/shared/composables'

const route = useRoute()
const orderId = computed(() => route.params.id as string)
const { showSuccess, showError } = useToast()

const {
  order, isLoading, isUpdating, isGeneratingOtp, isVerifyingOtp, error,
  nextActionLabel, isCompleted,
  fetchOrder, advanceStatus, cancelAfterArrival, generateOtp, verifyOtp,
} = useOrderDetail()

const otpInput = ref('')
const showCancelModal = ref(false)
const cancelReason = ref('')

// Status steps for the timeline
const statusSteps = [
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'started',   label: 'Started' },
  { key: 'ongoing',   label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
]

const statusOrder = ['Confirmed', 'started', 'Started', 'ongoing', 'Ongoing', 'completed', 'Completed']

function isStepDone(key: string): boolean {
  if (!order.value) return false
  const currentIdx = statusOrder.findIndex(
    (s) => s.toLowerCase() === order.value!.status.toLowerCase()
  )
  const stepIdx = statusOrder.findIndex((s) => s.toLowerCase() === key.toLowerCase())
  return stepIdx < currentIdx
}

function isStepActive(key: string): boolean {
  if (!order.value) return false
  return order.value.status.toLowerCase() === key.toLowerCase()
}

const customerName = computed(() =>
  order.value?.customer?.full_name ?? order.value?.customer?.name ?? null
)

const customerPhone = computed(() => order.value?.customer?.phone ?? null)

const addressText = computed(() => {
  const a = order.value?.delivery_address ?? order.value?.address
  if (!a) return null
  return [a.street ?? a.line1, a.landmark, a.city, a.pincode].filter(Boolean).join(', ')
})

const formattedDate = computed(() => {
  const d = order.value?.booking_info?.date ?? order.value?.service_date ?? order.value?.created_at
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
})

const showOtpSection = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return s === 'confirmed'
})

const canCancelAfterArrival = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return s === 'confirmed' || s === 'started'
})

async function handleAdvance(): Promise<void> {
  await advanceStatus()
  if (!error.value) showSuccess('Order status updated')
  else showError(error.value)
}

async function handleGenerateOtp(): Promise<void> {
  const otp = await generateOtp()
  if (!otp) showError(error.value ?? 'Failed to generate OTP')
}

async function handleVerifyOtp(): Promise<void> {
  const ok = await verifyOtp(otpInput.value)
  if (ok) {
    showSuccess('OTP verified — service started')
    otpInput.value = ''
  } else {
    showError(error.value ?? 'Invalid OTP')
  }
}

async function handleCancelAfterArrival(): Promise<void> {
  await cancelAfterArrival(cancelReason.value)
  if (!error.value) {
    showSuccess('Order cancelled')
    showCancelModal.value = false
    cancelReason.value = ''
  } else {
    showError(error.value)
  }
}

onMounted(() => fetchOrder(orderId.value))
</script>

<style scoped>
.order-detail-content { --padding-bottom: 100px; }

/* Loading / error */
.detail-loading,
.detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 32px;
  text-align: center;
  color: var(--color-text-muted);
}

.detail-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.detail-error__icon { font-size: 48px; color: var(--color-error); }

/* Status timeline */
.status-timeline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 16px 8px;
  gap: 4px;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 6px;
}

.status-step__indicator {
  display: flex;
  align-items: center;
  width: 100%;
}

.status-step__dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.status-step--done .status-step__dot {
  background: var(--color-success);
  border-color: var(--color-success);
}

.status-step--active .status-step__dot {
  background: var(--color-brand);
  border-color: var(--color-brand);
  box-shadow: 0 0 0 4px var(--color-brand-pale);
}

.status-step__check { font-size: 13px; color: #fff; }

.status-step__line {
  flex: 1;
  height: 2px;
  background: var(--color-border);
  margin: 0 2px;
}

.status-step--done + .status-step .status-step__line,
.status-step--done .status-step__line {
  background: var(--color-success);
}

.status-step__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: center;
  font-weight: 500;
}

.status-step--active .status-step__label {
  color: var(--color-brand);
  font-weight: 700;
}

.status-step--done .status-step__label {
  color: var(--color-success-text);
}

/* Info card */
.info-card {
  margin: 8px 16px 0;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.info-row--header {
  justify-content: space-between;
}

.text-right { text-align: right; }

.info-icon {
  font-size: 16px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-top: 2px;
}

.info-label {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.info-value {
  margin: 2px 0 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.info-sub {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.info-link { color: var(--color-brand); text-decoration: none; }

.info-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 -16px;
}

/* OTP card */
.otp-card {
  margin: 12px 16px 0;
  background: var(--color-surface);
  border: 1.5px solid var(--color-brand-light);
  border-radius: var(--radius-xl);
  padding: 16px;
}

.otp-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-brand);
}

.otp-card__hint {
  margin: 0 0 12px;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.otp-display {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.otp-display__code {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 8px;
  color: var(--color-brand);
  font-family: monospace;
}

.otp-verify__label {
  margin: 0 0 8px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.otp-verify__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.otp-verify__input {
  flex: 1;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
  color: var(--color-text);
  background: var(--color-surface);
  outline: none;
  font-family: monospace;
}

.otp-verify__input:focus { border-color: var(--color-brand); }

/* Cancel section */
.cancel-section {
  margin: 12px 16px 0;
}

/* Action footer */
.action-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;
}

.action-btn { --border-radius: var(--radius-xl); }

/* Cancel form */
.cancel-form {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cancel-form__hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.cancel-form__input {
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
  resize: vertical;
}

.cancel-form__input:focus { border-color: var(--color-danger); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
