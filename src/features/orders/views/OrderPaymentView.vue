<template>
  <ion-page>
    <ion-header translucent class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" />
        </ion-buttons>
        <ion-title>Order Payment</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen class="payment-page-content">
      <div v-if="isLoading && !order" class="loading-state">
        <ion-spinner name="crescent" />
        <p>Loading payment details...</p>
      </div>

      <div v-else-if="error && !order" class="error-state">
        <Icon icon="lucide:alert-circle" class="error-icon" />
        <h3>Unable to load order</h3>
        <p>{{ error }}</p>
        <AppButton variant="outline" icon="lucide:refresh-cw" @click="fetchOrder(orderId)">Retry</AppButton>
      </div>

      <template v-else-if="order">
        <div class="payment-summary-card">
          <div class="summary-top">
            <div>
              <p class="summary-label">Order</p>
              <strong>#{{ order.order_number || order.id }}</strong>
            </div>
            <div class="status-pill" :class="statusClass">
              {{ order.status?.replace(/_/g, ' ').toUpperCase() }}
            </div>
          </div>
          <div class="summary-details">
            <div>
              <p class="summary-label">Total amount</p>
              <strong>₹{{ order.total ?? 0 }}</strong>
            </div>
            <div>
              <p class="summary-label">Payment type</p>
              <strong>{{ paymentTypeLabel }}</strong>
            </div>
            <div>
              <p class="summary-label">Amount collected</p>
              <strong>{{ formattedAmountPaid }}</strong>
            </div>
          </div>
        </div>

        <div class="payment-card">
          <div class="card-heading">
            <h3>Payment details</h3>
            <p class="card-subtitle">
              {{ isPrepaidOrder ? 'This order is prepaid. No proof upload is required.' : 'Enter the collected amounts before completing the order.' }}
            </p>
          </div>
          <div class="date-restriction-tip" v-if="!orderChangeAllowed && order" style="margin-bottom: 16px;">
            {{ orderDateRestrictionMessage }}
          </div>

          <ion-list lines="full" class="payment-form-list">
            <ion-item class="payment-field">
              <ion-label position="stacked">Order total</ion-label>
              <ion-input readonly :value="`₹${order.total ?? 0}`" class="payment-input" />
            </ion-item>

            <ion-item v-if="!isPrepaidOrder" class="payment-field">
              <ion-label position="stacked">Cash collected</ion-label>
              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                v-model.number="paymentCodAmount"
                placeholder="0"
                class="payment-input"
                :disabled="!orderChangeAllowed"
              />
            </ion-item>

            <ion-item v-if="!isPrepaidOrder" class="payment-field">
              <ion-label position="stacked">UPI collected</ion-label>
              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                v-model.number="paymentUpiAmount"
                placeholder="0"
                class="payment-input"
                :disabled="!orderChangeAllowed"
              />
            </ion-item>

            <ion-item class="payment-field">
              <ion-label position="stacked">Tip (optional)</ion-label>
              <ion-input
                type="number"
                inputmode="numeric"
                min="0"
                v-model.number="paymentTipAmount"
                placeholder="0"
                class="payment-input"
                :disabled="!orderChangeAllowed"
              />
            </ion-item>
          </ion-list>

          <div class="proof-section" v-if="requiresProof">
            <div class="proof-header">
              <div>
                <p class="proof-label">UPI payment proof</p>
                <p class="proof-subtitle">Capture screenshot from the customer phone after transfer.</p>
              </div>
            </div>
            <AppButton
              expand="block"
              size="lg"
              variant="outline"
              :loading="isUpdating"
              :disabled="!orderChangeAllowed"
              @click="capturePaymentProof"
            >
              Capture payment proof
            </AppButton>
            <div v-if="proofImages.length" class="proof-preview-row">
              <div
                v-for="(image, index) in proofImages"
                :key="index"
                class="proof-thumb"
              >
                <img :src="mediaUrl(image.url)" :alt="`Proof ${index + 1}`" />
              </div>
            </div>
          </div>
        </div>

        <div class="payment-actions">
          <AppButton
            expand="block"
            size="lg"
            :loading="isProcessing"
            :disabled="actionDisabled"
            @click="handleCompleteOrder"
          >
            {{ actionButtonText }}
          </AppButton>
        </div>

        <ion-modal :is-open="showGallery" @didDismiss="showGallery = false" class="gallery-modal">
          <div class="gallery-container">
            <div class="gallery-header">
              <AppButton variant="clear" icon-only icon="lucide:x" @click="showGallery = false" class="close-btn" />
            </div>
            <div class="gallery-content">
              <img :src="activeImageUrl" class="full-image" alt="Payment proof preview" />
            </div>
          </div>
        </ion-modal>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/shared/composables'
import { formatISTDate, formatISTDateShort, getTodayIST } from '@/shared/lib/datetime'
import { mediaUrl } from '@/shared/lib/media'
import { useOrderDetail } from '../composables/useOrderDetail'
import type { Order } from '@/shared/models'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string
const { showSuccess, showError } = useToast()
const {
  order,
  isLoading,
  isUpdating,
  error,
  fetchOrder,
  updateOrderDetails,
  advanceStatus,
  captureAndUploadPaymentProof,
} = useOrderDetail()

const paymentCodAmount = ref<number | null>(null)
const paymentUpiAmount = ref<number | null>(null)
const paymentTipAmount = ref<number | null>(null)
const showGallery = ref(false)
const activeImageUrl = ref('')

const scheduleDate = computed(
  () => order.value?.booking_info?.date ?? order.value?.service_date ?? ''
)
const isBookingDateToday = computed(() => {
  if (!scheduleDate.value) return false
  return formatISTDateShort(scheduleDate.value) === getTodayIST()
})
const orderChangeAllowed = computed(() => isBookingDateToday.value)
const bookingDateStatus = computed(() => {
  if (!scheduleDate.value) return 'unknown'
  const bookingDate = formatISTDateShort(scheduleDate.value)
  const today = getTodayIST()
  if (bookingDate === today) return 'today'
  return bookingDate > today ? 'future' : 'past'
})
const orderDateRestrictionMessage = computed(() => {
  if (!scheduleDate.value) return ''
  const formatted = formatISTDate(scheduleDate.value)
  if (bookingDateStatus.value === 'future') {
    return `This order is scheduled for ${formatted}. Status changes are only allowed on the scheduled date.`
  }
  if (bookingDateStatus.value === 'past') {
    return `This order was scheduled for ${formatted}. Updates are only allowed on today’s orders.`
  }
  return ''
})

const paymentMethod = computed(() => (order.value?.payment?.method || '').toLowerCase())
const hasCodAmount = computed(() => Number(order.value?.payment?.cod_amount ?? 0) > 0)
const hasUpiAmount = computed(
  () => Number(order.value?.payment?.upi_amount ?? 0) > 0 || paymentMethod.value.includes('upi')
)
const isPrepaidOrder = computed(() => !hasCodAmount.value && !hasUpiAmount.value)
const proofImages = computed(() => {
  if (!order.value) return []

  const serviceProof = order.value.proof_of_service ?? order.value.payment?.proof
  if (!serviceProof) return []

  if (Array.isArray(serviceProof)) {
    return serviceProof.filter((item): item is { url: string } => !!item?.url)
  }

  const singleProof = serviceProof as { url?: string }
  return singleProof.url ? [{ url: singleProof.url }] : []
})

const requiresProof = computed(
  () => !isPrepaidOrder.value && (hasUpiAmount.value || (paymentUpiAmount.value ?? 0) > 0)
)

const paymentTypeLabel = computed(() => {
  if (isPrepaidOrder.value) return 'Prepaid'
  if (hasCodAmount.value && hasUpiAmount.value) return 'COD + UPI'
  if (hasUpiAmount.value) return 'UPI'
  if (hasCodAmount.value) return 'COD'
  return 'COD / UPI'
})

const formattedAmountPaid = computed(() => {
  const paid = order.value?.payment?.amount_paid ?? 0
  return paid > 0 ? `₹${paid}` : '₹0'
})

const statusClass = computed(() => {
  const status = order.value?.status?.toLowerCase() || ''
  return status === 'completed'
    ? 'status-success'
    : status === 'started'
      ? 'status-brand'
      : 'status-neutral'
})

const actionButtonText = computed(() =>
  isPrepaidOrder.value ? 'Complete Order' : 'Complete Order'
)
const isProcessing = computed(() => isUpdating.value)
const actionDisabled = computed(() => {
  if (!orderChangeAllowed.value) return true
  if (!order.value) return true
  if (order.value.status?.toLowerCase() !== 'started') return true
  if (isPrepaidOrder.value) return false
  if (requiresProof.value && proofImages.value.length === 0) return true
  const codValue = Number(paymentCodAmount.value ?? order.value.payment?.cod_amount ?? 0)
  if (!hasUpiAmount.value && codValue <= 0) return true
  return false
})

watch(
  order,
  value => {
    if (!value) return
    paymentCodAmount.value = value.payment?.cod_amount ?? null
    paymentUpiAmount.value = value.payment?.upi_amount ?? null
    paymentTipAmount.value = value.payment?.tip ?? null
  },
  { immediate: true }
)

function ensureTodayEditable(): boolean {
  if (!order.value) return false
  if (!orderChangeAllowed.value) {
    showError('Only today’s orders can be updated today.')
    return false
  }
  return true
}

async function capturePaymentProof() {
  if (!ensureTodayEditable()) return
  const uploaded = await captureAndUploadPaymentProof()
  if (uploaded) {
    showSuccess('Payment proof captured successfully')
  } else if (error.value) {
    showError(error.value)
  }
}

function openGallery(url: string) {
  activeImageUrl.value = url
  showGallery.value = true
}

async function handleCompleteOrder() {
  if (!ensureTodayEditable()) return
  if (!order.value) return
  if (order.value.status.toLowerCase() !== 'started') {
    showError('Order must be in started status to complete payment.')
    return
  }

  const codAmount = Number(paymentCodAmount.value ?? order.value.payment?.cod_amount ?? 0)
  const upiAmount = Number(paymentUpiAmount.value ?? order.value.payment?.upi_amount ?? 0)
  const tipAmount = Number(paymentTipAmount.value ?? order.value.payment?.tip ?? 0)

  if (!isPrepaidOrder.value) {
    if (!hasUpiAmount.value && codAmount <= 0) {
      showError('Please enter the cash collected amount.')
      return
    }
    if (requiresProof.value && proofImages.value.length === 0) {
      showError('Capture UPI payment proof before completing the order.')
      return
    }
  }

  if (!isPrepaidOrder.value) {
    const methodParts: string[] = []
    if (codAmount > 0) methodParts.push('COD')
    if (upiAmount > 0) methodParts.push('UPI')

    await updateOrderDetails({
      payment: {
        status: 'paid',
        amount_paid: codAmount + upiAmount + tipAmount,
        cod_amount: codAmount || undefined,
        upi_amount: upiAmount || undefined,
        tip: tipAmount || undefined,
        method: methodParts.length ? methodParts.join('+') : undefined,
      },
    })
    if (error.value) return
  } else if (order.value.payment?.status?.toLowerCase() !== 'paid') {
    await updateOrderDetails({
      payment: {
        status: 'paid',
        amount_paid: order.value.payment?.amount_paid ?? order.value.total ?? 0,
      },
    })
    if (error.value) return
  }

  await advanceStatus()
  if (!error.value) {
    showSuccess('Order completed successfully')
    router.replace({ name: 'OrderDetail', params: { id: orderId } })
  }
}

onMounted(() => {
  fetchOrder(orderId)
})
</script>

<style scoped>
.payment-page-content {
  --background: #f4f5fb;
  padding: 16px;
}
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  gap: 14px;
  color: var(--color-text-muted);
}
.error-icon {
  font-size: 44px;
  color: var(--color-danger);
}
.payment-summary-card,
.payment-card {
  background: var(--color-surface);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
  padding: 18px;
  margin-bottom: 16px;
}
.summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.summary-label {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.summary-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.status-pill {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.status-brand { background: rgba(79, 70, 229, 0.1); color: var(--color-brand); }
.status-success { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }
.status-neutral { background: rgba(107, 114, 128, 0.12); color: var(--color-text); }
.card-heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}
.card-heading h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}
.card-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.payment-form-list {
  background: transparent;
}
.payment-field {
  --min-height: 72px;
  padding: 0;
  border-radius: 16px;
  margin-bottom: 12px;
  background: var(--color-background);
}
.payment-input {
  --background: transparent;
  --padding-start: 0;
  font-size: 18px;
  font-weight: 700;
}
.proof-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.proof-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.proof-label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}
.proof-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}
.proof-preview-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.proof-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  cursor: pointer;
}
.proof-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.payment-actions {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.gallery-modal { --background: rgba(0,0,0,0.95); --width: 100%; --height: 100%; }
.gallery-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
.gallery-header { padding: env(safe-area-inset-top, 12px) 16px 12px; display: flex; justify-content: flex-end; }
.close-btn { --color: #fff; --background: rgba(255,255,255,0.1); --border-radius: 50%; width: 40px; height: 40px; }
.gallery-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.full-image { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
</style>
