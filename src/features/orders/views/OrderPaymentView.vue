<template>
  <ion-page>
    <ion-header translucent class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" />
        </ion-buttons>
        <ion-title>Payment</ion-title>
        <ion-buttons slot="end">
          <ion-chip v-if="order" class="order-ref-chip">
            #{{ order.order_number || order.id }}
          </ion-chip>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen class="payment-page-content">
      <!-- Loading state -->
      <div v-if="isLoading && !order" class="loading-state">
        <ion-spinner name="crescent" />
        <p>Loading payment details...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error && !order" class="error-state">
        <Icon icon="lucide:alert-circle" class="error-icon" />
        <h3>Unable to load order</h3>
        <p>{{ error }}</p>
        <AppButton variant="outline" icon="lucide:refresh-cw" @click="fetchOrder(orderId)">Retry</AppButton>
      </div>

      <template v-else-if="order">

        <!-- Date restriction banner -->
        <div class="restriction-banner" v-if="!orderChangeAllowed">
          <Icon icon="lucide:clock" />
          <span>{{ orderDateRestrictionMessage }}</span>
        </div>

        <!-- ── HERO: how much to collect ── -->
        <div class="collect-hero" :class="isPrepaidOrder ? 'hero-prepaid' : ''">
          <p class="collect-label">{{ isPrepaidOrder ? 'Fully prepaid' : 'Collect from customer' }}</p>
          <div class="collect-amount">
            <span v-if="!isPrepaidOrder">₹{{ remainingDue }}</span>
            <span v-else>₹0</span>
          </div>
          <div v-if="isPrepaidOrder" class="prepaid-badge">
            <Icon icon="lucide:check-circle" />
            Customer already paid ₹{{ prepaidAmount }} via {{ prepaidMethodLabel || 'online' }}
          </div>
          <div v-else-if="prepaidAmount > 0" class="partial-prepaid-note">
            ₹{{ prepaidAmount }} already prepaid · Collect remaining ₹{{ remainingDue }}
          </div>
        </div>

        <!-- ── PAYMENT INPUTS ── -->
        <div class="inputs-card">
          <p class="inputs-card-title">What you collected</p>

          <!-- Cash row -->
          <div class="input-row" v-if="!isPrepaidOrder">
            <div class="input-icon cash">
              <Icon icon="lucide:banknote" />
            </div>
            <div class="input-body">
              <label class="input-label">Cash collected</label>
              <div class="input-wrap">
                <span class="currency-prefix">₹</span>
                <ion-input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  v-model.number="paymentCodAmount"
                  placeholder="0"
                  :disabled="!orderChangeAllowed"
                  class="big-input"
                />
              </div>
            </div>
          </div>

          <div class="row-divider" v-if="!isPrepaidOrder" />

          <!-- UPI row -->
          <div class="input-row" v-if="!isPrepaidOrder">
            <div class="input-icon upi">
              <Icon icon="lucide:smartphone" />
            </div>
            <div class="input-body">
              <label class="input-label">UPI collected</label>
              <div class="input-wrap">
                <span class="currency-prefix">₹</span>
                <ion-input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  v-model.number="paymentUpiAmount"
                  placeholder="0"
                  :disabled="!orderChangeAllowed"
                  class="big-input"
                />
              </div>
            </div>
          </div>

          <div class="row-divider" />

          <!-- Tip row -->
          <div class="input-row">
            <div class="input-icon tip">
              <Icon icon="lucide:heart" />
            </div>
            <div class="input-body">
              <label class="input-label">Tip <span class="optional-tag">optional · you keep this</span></label>
              <div class="input-wrap">
                <span class="currency-prefix">₹</span>
                <ion-input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  v-model.number="paymentTipAmount"
                  placeholder="0"
                  :disabled="!orderChangeAllowed"
                  class="big-input"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ── UPI QR CODE ── -->
        <button
          v-if="order.office_payment_qr_code?.url"
          class="qr-open-btn"
          @click="openGallery(mediaUrl(order.office_payment_qr_code.url))"
        >
          <div class="qr-open-btn-left">
            <div class="qr-open-icon">
              <Icon icon="lucide:qr-code" />
            </div>
            <div>
              <p class="qr-open-title">Show UPI QR Code</p>
              <p class="qr-open-sub">Tap to open full screen · customer scans to pay</p>
            </div>
          </div>
          <div class="qr-open-thumb">
            <img :src="mediaUrl(order.office_payment_qr_code.url)" alt="QR preview" />
          </div>
        </button>

        <!-- ── UPI PROOF CAPTURE ── -->
        <div class="proof-card" v-if="requiresProof">
          <div class="proof-header-row">
            <div class="input-icon upi"><Icon icon="lucide:camera" /></div>
            <div>
              <p class="proof-label">UPI Payment Proof</p>
              <p class="proof-subtitle">Capture screenshot from the customer's phone</p>
            </div>
          </div>
          <AppButton
            expand="block"
            variant="outline"
            :loading="isUpdating"
            :disabled="!orderChangeAllowed"
            @click="capturePaymentProof"
          >
            {{ proofImages.length ? 'Retake screenshot' : 'Capture screenshot' }}
          </AppButton>
          <div v-if="proofImages.length" class="proof-preview-row">
            <div
              v-for="(image, index) in proofImages"
              :key="index"
              class="proof-thumb"
            >
              <img
                :src="mediaUrl(image.url)"
                :alt="`Proof ${index + 1}`"
                @click="openGallery(mediaUrl(image.url))"
              />
              <div class="proof-check"><Icon icon="lucide:check" /></div>
              <button class="proof-delete" @click.stop="removePaymentProof(index)">
                <Icon icon="lucide:x" />
              </button>
            </div>
          </div>
        </div>

        <!-- Spacer for sticky footer -->
        <div style="height: 200px;" />
      </template>
    </ion-content>

    <!-- ── STICKY FOOTER: balance + actions ── -->
    <div class="sticky-footer" v-if="order">
      <!-- Balance bar — shown when something is entered -->
      <div class="balance-bar" v-if="!isPrepaidOrder && currentCollection > 0">
        <div class="balance-col">
          <span class="balance-label">You collected</span>
          <strong class="balance-val">₹{{ currentCollection }}</strong>
        </div>
        <div class="balance-divider" />
        <div class="balance-col" :class="changeAmount >= 0 ? 'change-positive' : 'change-negative'">
          <span class="balance-label">{{ changeAmount >= 0 ? 'Return change' : 'Still pending' }}</span>
          <strong class="balance-val">₹{{ Math.abs(changeAmount) }}</strong>
        </div>
        <template v-if="normalizePaymentValue(paymentTipAmount) > 0">
          <div class="balance-divider" />
          <div class="balance-col tip-col">
            <span class="balance-label">Tip (yours)</span>
            <strong class="balance-val tip-val">+₹{{ normalizePaymentValue(paymentTipAmount) }}</strong>
          </div>
        </template>
      </div>

      <div class="footer-actions">
        <AppButton
          variant="outline"
          class="view-customer-btn"
          @click="showCustomerSummary = true"
        >
          <Icon icon="lucide:receipt" />
          View summary
        </AppButton>
        <AppButton
          expand="block"
          class="complete-btn"
          :loading="isProcessing"
          :disabled="actionDisabled"
          @click="handleCompleteOrder"
        >
          Complete order
        </AppButton>
      </div>
    </div>

    <!-- ── GALLERY MODAL ── -->
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

    <!-- ── CUSTOMER SUMMARY MODAL ── -->
    <ion-modal :is-open="showCustomerSummary" @didDismiss="showCustomerSummary = false" class="summary-modal" :initial-breakpoint="0.75" :breakpoints="[0, 0.75, 1]">
      <div class="summary-sheet">
        <div class="summary-sheet-header">
          <h2 class="summary-sheet-title">Payment Summary</h2>
          <p class="summary-sheet-sub">Order #{{ order?.order_number || order?.id }}</p>
        </div>

        <div class="summary-sheet-body">
          <div class="summary-line">
            <span>Order total</span>
            <strong>₹{{ order?.total ?? 0 }}</strong>
          </div>
          <div class="summary-line" v-if="prepaidAmount > 0">
            <span>Prepaid ({{ prepaidMethodLabel || 'online' }})</span>
            <strong class="text-success">−₹{{ prepaidAmount }}</strong>
          </div>
          <div class="summary-line summary-highlight">
            <span>To collect</span>
            <strong>{{ remainingDueLabel }}</strong>
          </div>

          <div class="summary-sep" v-if="!isPrepaidOrder" />

          <div class="summary-line" v-if="!isPrepaidOrder">
            <span><Icon icon="lucide:banknote" class="summary-icon" /> Cash (COD)</span>
            <strong>₹{{ normalizePaymentValue(paymentCodAmount) }}</strong>
          </div>
          <div class="summary-line" v-if="!isPrepaidOrder">
            <span><Icon icon="lucide:smartphone" class="summary-icon" /> UPI</span>
            <strong>₹{{ normalizePaymentValue(paymentUpiAmount) }}</strong>
          </div>
          <div class="summary-line" v-if="normalizePaymentValue(paymentTipAmount) > 0">
            <span><Icon icon="lucide:heart" class="summary-icon" /> Tip</span>
            <strong>₹{{ normalizePaymentValue(paymentTipAmount) }}</strong>
          </div>

          <div class="summary-sep" />

          <div class="summary-line summary-total">
            <span>Total received</span>
            <strong>{{ totalReceivedLabel }}</strong>
          </div>
          <div class="summary-line change-line" v-if="changeAmount > 0">
            <span><Icon icon="lucide:arrow-left-right" class="summary-icon" /> Change to return</span>
            <strong class="text-warning">₹{{ changeAmount }}</strong>
          </div>
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { alertController } from '@ionic/vue'
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
const showCustomerSummary = ref(false)

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
const prepaidAmount = computed(() => Number(order.value?.payment?.amount_paid ?? 0))
const orderTotal = computed(() => Number(order.value?.total ?? 0))
const remainingDue = computed(() => Math.max(0, orderTotal.value - prepaidAmount.value))
const hasCodAmount = computed(() => Number(order.value?.payment?.cod_amount ?? 0) > 0)
const hasUpiAmount = computed(
  () => Number(order.value?.payment?.upi_amount ?? 0) > 0 || paymentMethod.value.includes('upi')
)
const isPrepaidOrder = computed(() => remainingDue.value <= 0)
const currentCollection = computed(
  () =>
    normalizePaymentValue(paymentCodAmount.value) + normalizePaymentValue(paymentUpiAmount.value)
)
const collectedNowLabel = computed(() => `₹${currentCollection.value}`)
const totalReceivedLabel = computed(
  () =>
    `₹${prepaidAmount.value + currentCollection.value + normalizePaymentValue(paymentTipAmount.value)}`
)
const prepaidMethodLabel = computed(() => {
  const method = order.value?.payment?.method?.toLowerCase() || ''
  if (!method) return ''
  if (method.includes('upi')) return 'UPI'
  if (method.includes('cod')) return 'COD'
  return order.value?.payment?.method?.toUpperCase() || ''
})
const actualUpiAmount = computed(() => Number(paymentUpiAmount.value ?? 0))
const proofImages = computed(() => {
  if (!order.value) return []

  const paymentProof = order.value.payment?.proof
  if (!paymentProof) return []

  if (Array.isArray(paymentProof)) {
    return paymentProof.filter((item): item is { url: string } => !!item?.url)
  }

  const singleProof = paymentProof as { url?: string }
  return singleProof.url ? [{ url: singleProof.url }] : []
})

async function presentConfirm(header: string, message: string) {
  const alert = await alertController.create({
    header,
    message,
    buttons: [
      { text: 'No', role: 'cancel' },
      { text: 'Yes', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  return role === 'confirm'
}

async function removePaymentProof(index: number) {
  if (!order.value) return
  const confirmed = await presentConfirm(
    'Remove Proof',
    'Are you sure you want to remove this payment proof?'
  )
  if (!confirmed) return

  const currentProof = [...proofImages.value]
  currentProof.splice(index, 1)

  await updateOrderDetails({
    payment: {
      ...order.value.payment,
      proof: currentProof,
    },
  })
}

const requiresProof = computed(() => !isPrepaidOrder.value && actualUpiAmount.value > 0)

const paymentTypeLabel = computed(() => {
  if (isPrepaidOrder.value && prepaidAmount.value > 0) {
    return prepaidMethodLabel.value ? `Prepaid via ${prepaidMethodLabel.value}` : 'Prepaid'
  }
  if (!isPrepaidOrder.value && prepaidAmount.value > 0) {
    return prepaidMethodLabel.value
      ? `Partially prepaid via ${prepaidMethodLabel.value}`
      : 'Partially prepaid'
  }
  if (hasCodAmount.value && hasUpiAmount.value) return 'COD + UPI'
  if (hasUpiAmount.value) return 'UPI'
  if (hasCodAmount.value) return 'COD'
  return 'COD / UPI'
})

const remainingDueLabel = computed(() => {
  if (!order.value) return '—'
  if (remainingDue.value <= 0) return '₹0'
  return `₹${remainingDue.value}`
})

const paymentPrepaidLabel = computed(() => `₹${prepaidAmount.value}`)

const hasRemainingDue = computed(() => remainingDue.value > 0)

// Balance: positive = give change back, negative = still pending
const changeAmount = computed(() => currentCollection.value - remainingDue.value)

function normalizePaymentValue(value: unknown): number {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

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
  const codValue = normalizePaymentValue(paymentCodAmount.value)
  const upiValue = normalizePaymentValue(paymentUpiAmount.value)
  if (codValue + upiValue <= 0) return true
  return false
})

watch(
  order,
  (newVal, oldVal) => {
    if (!newVal) return
    // Only initialize the fields if this is the first time the order is loaded
    // This prevents clearing user-typed values when the order object updates (e.g. after uploading proof)
    if (!oldVal) {
      paymentCodAmount.value = null
      paymentUpiAmount.value = null
      paymentTipAmount.value = newVal.payment?.tip ?? null
    }
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

  const codAmount = normalizePaymentValue(paymentCodAmount.value)
  const upiAmount = normalizePaymentValue(paymentUpiAmount.value)
  const tipAmount = normalizePaymentValue(paymentTipAmount.value ?? order.value.payment?.tip ?? 0)
  const previousPrepaidAmount = Number(order.value.payment?.amount_paid ?? 0)

  if (!isPrepaidOrder.value) {
    if (codAmount + upiAmount <= 0) {
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
    const collectedTotal = previousPrepaidAmount + codAmount + upiAmount + tipAmount
    const finalStatus = collectedTotal >= orderTotal.value ? 'paid' : 'partial'

    await updateOrderDetails({
      payment: {
        status: finalStatus,
        amount_paid: previousPrepaidAmount > 0 ? collectedTotal : codAmount + upiAmount + tipAmount,
        cod_amount: codAmount,
        upi_amount: upiAmount,
        tip: tipAmount,
        method: methodParts.join('+'),
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

  await advanceStatus(undefined, undefined, true)
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
/* ── Page ── */
.payment-page-content {
  --background: #f2f3f8;
}

/* ── Loading / Error ── */
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
.error-icon { font-size: 44px; color: var(--color-danger); }

/* ── Toolbar chip ── */
.order-ref-chip {
  font-size: 12px;
  font-weight: 600;
  --background: rgba(79, 70, 229, 0.1);
  --color: var(--color-brand);
  margin-right: 8px;
}

/* ── Date restriction banner ── */
.restriction-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  border-radius: 14px;
  padding: 12px 16px;
  margin: 12px 16px 0;
  font-size: 13px;
  line-height: 1.5;
}

/* ── Hero: collect amount ── */
.collect-hero {
  margin: 16px 16px 0;
  padding: 28px 20px 24px;
  background: var(--color-brand, #4f46e5);
  border-radius: 24px;
  text-align: center;
  color: #fff;
}
.collect-hero.hero-prepaid {
  background: var(--color-success, #10b981);
}
.collect-label {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.75;
}
.collect-amount {
  font-size: 56px;
  font-weight: 900;
  letter-spacing: -2px;
  line-height: 1;
  margin-bottom: 10px;
}
.prepaid-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
}
.partial-prepaid-note {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
}

/* ── Inputs card ── */
.inputs-card {
  margin: 14px 16px 0;
  background: var(--color-surface, #fff);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  padding: 4px 0;
  overflow: hidden;
}
.inputs-card-title {
  margin: 0;
  padding: 14px 18px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}
.input-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
}
.input-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.input-icon.cash { background: rgba(16, 185, 129, 0.12); color: #059669; }
.input-icon.upi  { background: rgba(79, 70, 229, 0.12);  color: var(--color-brand); }
.input-icon.tip  { background: rgba(239, 68, 68, 0.1);   color: #dc2626; }
.input-body {
  flex: 1;
  min-width: 0;
}
.input-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}
.optional-tag {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.6;
  margin-left: 4px;
}
.input-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}
.currency-prefix {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1;
  margin-right: 2px;
}
.big-input {
  --background: transparent;
  --padding-start: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text);
  flex: 1;
}
.row-divider {
  height: 1px;
  background: var(--color-border, #f1f1f4);
  margin: 0 18px;
}

/* ── QR open button ── */
.qr-open-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: calc(100% - 32px);
  margin: 14px 16px 0;
  padding: 14px 16px;
  background: var(--color-surface, #fff);
  border: 2px solid var(--color-brand, #4f46e5);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.1);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.qr-open-btn:active {
  opacity: 0.85;
  transform: scale(0.98);
}
.qr-open-btn-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.qr-open-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.12);
  color: var(--color-brand, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.qr-open-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-brand, #4f46e5);
}
.qr-open-sub {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
}
.qr-open-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
}
.qr-open-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Proof card ── */
.proof-card {
  margin: 14px 16px 0;
  background: var(--color-surface, #fff);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.proof-header-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.proof-label {
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
.proof-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
}
.proof-preview-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.proof-thumb {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--color-success, #10b981);
  cursor: pointer;
  flex-shrink: 0;
}
.proof-thumb img { width: 100%; height: 100%; object-fit: cover; }
.proof-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: var(--color-success, #10b981);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.proof-delete {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 22px;
  height: 22px;
  background: var(--color-danger, #ef4444);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 0;
  z-index: 2;
}

/* ── Sticky footer ── */
.sticky-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-surface, #fff);
  border-top: 1px solid var(--color-border, #f1f1f4);
  box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.1);
  padding: 12px 16px calc(env(safe-area-inset-bottom, 12px) + 12px);
}

/* Balance bar */
.balance-bar {
  display: flex;
  align-items: stretch;
  border-radius: 16px;
  background: #f8f9ff;
  border: 1px solid rgba(79, 70, 229, 0.15);
  margin: 0 0 12px;
  overflow: hidden;
}
.balance-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  gap: 2px;
}
.balance-divider {
  width: 1px;
  background: rgba(79, 70, 229, 0.15);
}
.balance-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
}
.balance-val {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
}
.change-positive .balance-val { color: #059669; }
.change-negative .balance-val { color: #dc2626; }
.tip-val { color: #d97706; }
.tip-col .balance-label { color: #d97706; }

/* Footer actions */
.footer-actions {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.view-customer-btn {
  flex: 0 0 auto;
  min-width: 148px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  --border-radius: 14px;
  height: 52px;
}
.complete-btn {
  flex: 1;
  --border-radius: 14px;
  height: 52px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

/* ── Gallery modal ── */
.gallery-modal { --background: rgba(0,0,0,0.95); --width: 100%; --height: 100%; }
.gallery-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
.gallery-header { padding: env(safe-area-inset-top, 12px) 16px 12px; display: flex; justify-content: flex-end; }
.close-btn { --color: #fff; --background: rgba(255,255,255,0.1); --border-radius: 50%; width: 40px; height: 40px; }
.gallery-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.full-image { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }

/* ── Customer summary sheet ── */
.summary-modal {
  --border-radius: 28px 28px 0 0;
}
.summary-sheet {
  padding: 0 0 env(safe-area-inset-bottom, 20px);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.summary-sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
  margin: 14px auto 0;
}
.summary-sheet-header {
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--color-border, #f1f1f4);
}
.summary-sheet-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
}
.summary-sheet-sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}
.summary-sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  font-size: 15px;
  color: var(--color-text);
}
.summary-line span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
}
.summary-icon {
  font-size: 16px;
}
.summary-highlight {
  background: rgba(79, 70, 229, 0.07);
  border-radius: 12px;
  padding: 12px 14px;
  margin: 6px 0;
}
.summary-highlight span {
  font-weight: 700;
  color: var(--color-brand);
}
.summary-highlight strong {
  font-size: 20px;
  color: var(--color-brand);
}
.summary-sep {
  height: 1px;
  background: var(--color-border, #f1f1f4);
  margin: 6px 0;
}
.summary-total {
  font-size: 17px;
  font-weight: 700;
}
.summary-total span { color: var(--color-text); font-weight: 700; }
.change-line {
  background: rgba(245, 158, 11, 0.1);
  border-radius: 12px;
  padding: 10px 14px;
  margin-top: 4px;
}
.text-success { color: #059669; }
.text-warning { color: #d97706; }
</style>
