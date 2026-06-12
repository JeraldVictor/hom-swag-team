<template>
  <div class="order-content anim-fade-in">

    <!-- ── Trip & Rider Card ──────────────────────────────────────────────── -->
    <div class="content-card" v-if="showAssignedTripInfo && assignedTrips.length">
      <div class="card-header">
        <div class="header-icon-wrap"><Icon icon="lucide:truck" /></div>
        <h3>Rider & Trip</h3>
      </div>
      <div
        v-for="(assignedTrip, index) in assignedTrips"
        :key="assignedTrip._id || assignedTrip.id || index"
        class="trip-card"
      >
        <div class="trip-card-header">
          <span class="trip-card-title">Trip {{ index + 1 }}</span>
        </div>
        <div class="trip-info-grid">
          <div class="trip-info-row" v-if="assignedTrip.trip_number">
            <span>Trip #</span>
            <strong>{{ assignedTrip.trip_number }}</strong>
          </div>
          <div class="trip-info-row" v-if="assignedTrip.is_external_booking || !assignedTrip.rider?.name">
            <span>Type</span>
            <strong>
              {{ assignedTrip.is_external_booking ? (assignedTrip.external_booking_details?.provider || 'External Ride') : 'Self Booking' }}
            </strong>
          </div>
          <div class="trip-info-row" v-if="assignedTrip.rider?.name">
            <span>Rider</span>
            <strong>{{ assignedTrip.rider.name }}</strong>
          </div>
          <div class="trip-info-row" v-if="assignedTrip.rider?.phone">
            <span>Phone</span>
            <a :href="`tel:${assignedTrip.rider.phone}`">{{ assignedTrip.rider.phone }}</a>
          </div>
          <div class="trip-info-row" v-if="assignedTrip.rider?.vehicle_number || assignedTrip.rider?.registration_number">
            <span>Vehicle</span>
            <strong>{{ assignedTrip.rider?.vehicle_number || assignedTrip.rider?.registration_number }}</strong>
          </div>
          <div class="trip-info-row" v-if="assignedTrip.start_time">
            <span>Started</span>
            <strong>{{ formatTime(assignedTrip.start_time) }}</strong>
          </div>
          <div class="trip-info-row" v-if="assignedTrip.end_time">
            <span>Ended</span>
            <strong>{{ formatTime(assignedTrip.end_time) }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Notes & Instructions Card ─────────────────────────────────────── -->
    <div class="content-card" v-if="hasOrderContext">
      <div class="card-header">
        <div class="header-icon-wrap"><Icon icon="lucide:notebook-tabs" /></div>
        <h3>Notes & Instructions</h3>
      </div>
      <div class="context-grid">
        <div v-if="order.notes" class="context-box note-box">
          <div class="box-header">
            <Icon icon="lucide:message-square-quote" />
            <span>Customer Note</span>
          </div>
          <p v-html="order.notes"></p>
        </div>
        <div v-if="order.custom_instruction || order.instruction_presets?.length" class="context-box instruction-box">
          <div class="box-header">
            <Icon icon="lucide:clipboard-list" />
            <span>Special Instructions</span>
          </div>
          <p v-if="order.custom_instruction" :class="{ 'mb-2': order.instruction_presets?.length }" v-html="order.custom_instruction"></p>
          <div v-if="order.instruction_presets?.length" class="preset-chips">
            <template v-for="preset in order.instruction_presets" 
              :key="preset._id">
              <AppBadge  v-if="preset.beautician_visible" variant="info" size="sm">
                {{ preset.text }}
                {{ preset.description ? `: ${preset.description}` : '' }}
              </AppBadge>
            </template>
          </div>
        </div>
        <div v-if="order.staff_notes || order.payment?.internal_comment" class="context-box internal-box">
          <div class="box-header">
            <Icon icon="lucide:shield-alert" />
            <span>Internal Reference</span>
          </div>
          <p v-if="order.staff_notes"><strong>Staff:</strong> {{ order.staff_notes }}</p>
          <p v-if="order.payment?.internal_comment" :class="{ 'mt-1': order.staff_notes }">
            <strong>Payment:</strong> {{ order.payment.internal_comment }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Services & Items Card ──────────────────────────────────────────── -->
    <div class="content-card">
      <div class="card-header card-header-with-action">
        <div class="header-icon-wrap"><Icon icon="lucide:shopping-bag" /></div>
        <h3>Services</h3>
      </div>
      <div class="items-list">
        <OrderItemRow
          v-for="item in order.products"
          :key="item.product_id"
          :item="item"
          :can-upgrade="props.canUpgrade"
          @upgrade="(item) => emit('upgrade-order', item)"
        />
      </div>
      <div class="order-summary">
        <div class="summary-row">
          <span>Subtotal</span>
          <strong>₹{{ order.subtotal ?? 0 }}</strong>
        </div>
        <div v-if="membershipCharge > 0" class="summary-row">
          <span>Membership</span>
          <strong>₹{{ membershipCharge }}</strong>
        </div>
        <div v-if="otherCharges > 0" class="summary-row">
          <span>Other Charges</span>
          <strong>₹{{ otherCharges }}</strong>
        </div>
        <div v-if="discountTotal > 0" class="summary-row">
          <span>Discounts</span>
          <strong class="text-success">-₹{{ discountTotal }}</strong>
        </div>
        <div class="summary-row summary-total-row">
          <span>Total</span>
          <strong>₹{{ order.total ?? 0 }}</strong>
        </div>
      </div>
    </div>

    <!-- ── Payment Card ───────────────────────────────────────────────────── -->
    <div v-if="!isCustomerHidden && !isCompleted" class="content-card">
      <div class="card-header">
        <div class="header-icon-wrap"><Icon icon="lucide:credit-card" /></div>
        <h3>Payment</h3>
        <span :class="['pay-status-chip', 'ms-auto', `pay-status--${paymentStatusKey}`]">
          <Icon :icon="paymentStatusIcon" />
          {{ order.payment?.status?.toUpperCase() || 'PENDING' }}
        </span>
      </div>
      <div class="pay-method-row">
        <Icon icon="lucide:wallet" class="pay-method-icon" />
        <span>{{ order.payment?.method?.toUpperCase() || 'COD / UPI' }}</span>
        <span v-if="order.payment?.reference" class="pay-ref-inline">Ref: {{ order.payment.reference }}</span>
      </div>
      <div class="payment-details-grid">
        <div class="payment-detail-item" v-if="(order.payment?.cod_amount ?? parsedPaymentRemark?.cod ?? 0) > 0">
          <span>Cash (COD)</span>
          <strong>₹{{ order.payment?.cod_amount ?? parsedPaymentRemark?.cod }}</strong>
        </div>
        <div class="payment-detail-item" v-if="(order.payment?.upi_amount ?? parsedPaymentRemark?.upi ?? 0) > 0">
          <span>UPI</span>
          <strong>₹{{ order.payment?.upi_amount ?? parsedPaymentRemark?.upi }}</strong>
        </div>
        <div class="payment-detail-item" v-if="pendingAmount > 0 && prepaidAmount > 0">
          <span>Already prepaid</span>
          <strong>₹{{ prepaidAmount }}</strong>
        </div>
        <div class="payment-detail-item" v-if="pendingAmount > 0">
          <span>Pending amount</span>
          <strong>₹{{ pendingAmount }}</strong>
        </div>
        <div class="payment-detail-item" v-if="(order.payment?.tip ?? order.tip ?? parsedPaymentRemark?.tip ?? 0) > 0">
          <span>Tip</span>
          <strong class="text-brand">₹{{ order.payment?.tip ?? order.tip ?? parsedPaymentRemark?.tip }}</strong>
        </div>
        <div class="payment-detail-item">
          <span>Collected</span>
          <strong :class="{ 'text-success': order.payment?.status?.toLowerCase() === 'paid' }">
            {{ order.payment?.amount_paid != null ? `₹${order.payment.amount_paid}` : '—' }}
          </strong>
        </div>
        <div class="payment-detail-item full-width" v-if="order.payment?.remark && !parsedPaymentRemark">
          <span>Remark</span>
          <p class="remark-text">{{ order.payment.remark }}</p>
        </div>
      </div>
      <div class="payment-hint" v-if="order.payment?.status?.toLowerCase() !== 'paid' && !isCompleted">
        <p>Collect cash or ask the customer to process the payment as per the order details.</p>
      </div>
    </div>

    <!-- ── Verification Photos Card ───────────────────────────────────────── -->
    <div v-if="!isCustomerHidden || isCompleted" class="content-card">
      <div class="card-header">
        <div class="header-icon-wrap"><Icon icon="lucide:camera" /></div>
        <h3>Verification Photos</h3>
      </div>
      <div class="proof-group">
        <div class="proof-entry">
          <div class="proof-label-row">
            <p class="proof-label">Arrival Selfie</p>
            <AppButton
              v-if="order.status.toLowerCase() === ORDER_STATUS.ONGOING && !order.arrival_selfie && isEditable"
              variant="clear" size="sm" icon="lucide:camera"
              @click="emit('upload-selfie')"
              class="action-btn-sm"
            >Take Selfie</AppButton>
          </div>
          <div class="proof-preview" v-if="order.arrival_selfie?.url" @click="emit('open-gallery', mediaUrl(order.arrival_selfie.url))">
            <img :src="mediaUrl(order.arrival_selfie?.url)" alt="Arrival selfie" />
          </div>
          <p v-else class="proof-empty">No arrival selfie uploaded yet.</p>
        </div>

        <div class="proof-entry">
          <div class="proof-label-row">
            <p class="proof-label">Setup Photos</p>
            <div class="proof-actions" v-if="order.status.toLowerCase() === ORDER_STATUS.REACHED_CUSTOMER_PLACE && order.arrival_selfie">
              <AppButton variant="clear" size="sm" icon="lucide:camera" @click="emit('capture-setup-photo')" class="action-btn-sm">Camera</AppButton>
            </div>
          </div>
          <div v-if="setupPhotos.length" class="proof-list">
            <div v-for="(image, index) in setupPhotos" :key="index" class="proof-thumbnail" @click="emit('open-gallery', mediaUrl(image.url))">
              <img :src="mediaUrl(image.url)" :alt="`Setup photo ${index + 1}`" />
            </div>
          </div>
          <p v-else class="proof-empty">No setup photos uploaded yet.</p>
        </div>

        <div class="proof-entry">
          <div class="proof-label-row">
            <p class="proof-label">Payment Proof</p>
            <div class="proof-actions" v-if="order.status.toLowerCase() === ORDER_STATUS.STARTED && isEditable">
              <AppButton variant="clear" size="sm" icon="lucide:camera" @click="emit('capture-payment-proof')" class="action-btn-sm">Camera</AppButton>
              <AppButton variant="clear" size="sm" icon="lucide:upload" @click="emit('trigger-proof-input')" class="action-btn-sm">Upload</AppButton>
            </div>
          </div>
          <div v-if="proofImages.length" class="proof-list">
            <div v-for="(image, index) in proofImages" :key="index" class="proof-thumbnail" @click="emit('open-gallery', mediaUrl(image.url))">
              <img :src="mediaUrl(image.url)" :alt="`Payment proof ${index + 1}`" />
            </div>
          </div>
          <p v-else class="proof-empty">No payment proof uploaded yet.</p>
        </div>
      </div>
    </div>

    <!-- ── Payment Status Editor ──────────────────────────────────────────── -->
    <div
      class="content-card"
      v-if="!isCustomerHidden && order.status.toLowerCase() === ORDER_STATUS.STARTED && proofImages.length && isEditable"
    >
      <div class="card-header">
        <div class="header-icon-wrap"><Icon icon="lucide:sliders-horizontal" /></div>
        <h3>Payment Status</h3>
      </div>
      <div class="payment-status-row">
        <select
          :value="paymentStatus"
          @change="emit('update:paymentStatus', ($event.target as HTMLSelectElement).value as any)"
          class="form-select"
        >
          <option value="" disabled>Select payment status</option>
          <option v-for="option in paymentStatusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <AppButton
          variant="outline" size="sm" :loading="isUpdating"
          :disabled="!paymentStatus || paymentStatus === order.payment?.status?.toLowerCase()"
          @click="emit('save-payment-status')"
        >Save status</AppButton>
      </div>
      <p class="hint">
        Choose Paid, Unpaid, or Conflict after uploading payment proof. This must be updated before completing the order.
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { mediaUrl } from '@/shared/lib/media'
import type { Order, OrderProduct, OrderTrip, PaymentStatus } from '@/shared/models'
import { ORDER_STATUS } from '../../../shared/constants'
import OrderItemRow from './OrderItemRow.vue'

interface ProofImage {
  url: string
}

const props = defineProps<{
  order: Order
  assignedTrips: readonly OrderTrip[]
  showAssignedTripInfo: boolean
  isCustomerHidden: boolean
  hasOrderContext: boolean
  isCompleted: boolean
  isEditable: boolean
  canUpgrade: boolean
  parsedPaymentRemark: { cod?: number | null; upi?: number | null; tip?: number | null } | null
  proofImages: ProofImage[]
  setupPhotos: ProofImage[]
  paymentStatus: PaymentStatus | ''
  paymentStatusOptions: Array<{ label: string; value: string }>
  isUpdating: boolean
}>()

const emit = defineEmits<{
  'update:paymentStatus': [value: PaymentStatus | '']
  'open-gallery': [url: string]
  'trigger-proof-input': []
  'upload-selfie': []
  'capture-setup-photo': []
  'capture-payment-proof': []
  'save-payment-status': []
  'upgrade-order': [item: OrderProduct]
}>()

// ── Status chip helpers ────────────────────────────────────────────────────

function tripStatusClass(trip: OrderTrip) {
  const s = (trip?.kanban_state || '').toLowerCase()
  if (s === 'in_progress' || s.includes('progress')) return 'chip-brand'
  if (s === 'done' || s.includes('complete')) return 'chip-success'
  if (s.includes('cancel')) return 'chip-danger'
  return 'chip-neutral'
}

function tripStatusIcon(trip: OrderTrip) {
  const s = (trip?.kanban_state || '').toLowerCase()
  if (s === 'in_progress' || s.includes('progress')) return 'lucide:truck'
  if (s === 'done' || s.includes('complete')) return 'lucide:check-circle-2'
  if (s.includes('cancel')) return 'lucide:x-circle'
  return 'lucide:circle'
}

const prepaidAmount = computed(() => {
  if (!props.order.payment) return 0
  return props.order.payment.amount_paid ?? 0
})

const membershipCharge = computed(() => props.order.membership_charge ?? 0)
const discountTotal = computed(() => props.order.discount_total ?? 0)
const otherCharges = computed(
  () =>
    (props.order.delivery_fee ?? 0) +
    (props.order.convenience_fees ?? 0) +
    (props.order.hygiene_fees ?? 0) +
    (props.order.booking_info?.surge_amount ?? 0) +
    (props.order.rounding ?? 0)
)

const pendingAmount = computed(() => {
  const total = props.order.total ?? 0
  return Math.max(0, total - prepaidAmount.value)
})

const paymentStatusKey = computed(() => {
  const status = props.order.payment?.status?.toLowerCase() ?? 'pending'
  if (
    status === 'conflict' ||
    status === 'unpaid' ||
    status === 'failed' ||
    status === 'refunded'
  ) {
    return status
  }
  if (pendingAmount.value > 0 && prepaidAmount.value > 0) return 'partial'
  return status
})

const paymentStatusIcon = computed(() => {
  const s = paymentStatusKey.value
  if (s === 'paid') return 'lucide:check-circle-2'
  if (s === 'partial') return 'lucide:clock'
  if (s === 'unpaid') return 'lucide:clock'
  if (s === 'conflict') return 'lucide:alert-circle'
  return 'lucide:circle-dashed'
})

// ── Date/time formatting ───────────────────────────────────────────────────

function formatTime(val: string): string {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return val
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return val
  }
}
</script>

<style scoped>
/* ── Status Chips ─────────────────────────────────────────────────────────── */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px 3px 6px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.trip-card {
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  margin-top: 16px;
}

.trip-card:first-of-type {
  padding-top: 0;
  border-top: none;
  margin-top: 0;
}

.trip-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.trip-card-title {
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chip-brand   { background: var(--color-brand-pale);    color: var(--color-brand); }
.chip-success { background: #e8f5e9;                    color: #2e7d32; }
.chip-danger  { background: var(--color-danger-pale);   color: var(--color-danger); }
.chip-warning { background: #fffbeb;                    color: #b45309; }
.chip-neutral { background: var(--color-background); color: var(--color-text-muted); border: 1px solid var(--color-border); }

/* ── Payment Status Chip ──────────────────────────────────────────────────── */
.pay-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 7px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.pay-status--paid     { background: #e8f5e9;                   color: #2e7d32; }
.pay-status--partial  { background: #fff7ed;                   color: #c2410c; }
.pay-status--unpaid   { background: #fffbeb;                   color: #b45309; }
.pay-status--conflict { background: var(--color-danger-pale);  color: var(--color-danger); }
.pay-status--pending,
.pay-status--failed,
.pay-status--refunded { background: var(--color-background); color: var(--color-text-muted); border: 1px solid var(--color-border); }

/* ── Cards ────────────────────────────────────────────────────────────────── */
.content-card {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04), 0 6px 24px rgba(0, 0, 0, 0.07);
}

/* ── Card Header ──────────────────────────────────────────────────────────── */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.card-header-with-action {
  justify-content: space-between;
}

.card-header-action {
  margin-left: auto;
}

.header-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--color-brand-pale);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}

.card-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

/* ── Trip Card ────────────────────────────────────────────────────────────── */
.trip-info-grid {
  display: flex;
  flex-direction: column;
}

.trip-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
}

.trip-info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.trip-info-row span {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.trip-info-row strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
  text-align: right;
}

.trip-info-row a {
  font-size: 13px;
  color: var(--color-brand);
  font-weight: 700;
}

/* ── Notes Card ───────────────────────────────────────────────────────────── */
.context-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.context-box {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.box-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.box-header svg { width: 12px; height: 12px; color: var(--color-brand); }

.context-box p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text);
}

.preset-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }

.note-box { background: var(--color-brand-pale); border-color: rgba(var(--color-brand-rgb), 0.12); }
.instruction-box { background: #fffbe6; border-color: #ffe58f; }
.internal-box { background: var(--color-surface); border-style: dashed; }

/* ── Items List ───────────────────────────────────────────────────────────── */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

/* ── Order Summary ────────────────────────────────────────────────────────── */
.order-summary {
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.summary-row:last-child { border-bottom: none; }

.summary-row span {
  font-size: 13px;
  color: var(--color-text-muted);
}

.summary-row strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text);
}

.summary-total-row {
  padding: 10px 0 0;
  border-bottom: none !important;
  margin-top: 2px;
}

.summary-total-row span { font-size: 14px; font-weight: 700; color: var(--color-text); }
.summary-total-row strong { font-size: 18px; color: var(--color-brand); font-weight: 800; }

/* ── Payment Method Row ───────────────────────────────────────────────────── */
.pay-method-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-brand-pale);
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.pay-method-icon { color: var(--color-brand); font-size: 15px; flex-shrink: 0; }

.pay-ref-inline {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 400;
}

/* ── Payment Details ──────────────────────────────────────────────────────── */
.payment-details-grid {
  display: flex;
  flex-direction: column;
}

.payment-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid var(--color-border);
}

.payment-detail-item:last-child { border-bottom: none; }

.payment-detail-item span {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
}

.payment-detail-item strong {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.payment-detail-item.full-width {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

/* ── Remark / hint ────────────────────────────────────────────────────────── */
.remark-text {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.payment-hint {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.payment-hint p { margin: 0; font-size: 12px; color: var(--color-text-muted); }

.qr-code-block {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.qr-code-block img { width: 140px; height: 140px; border-radius: 12px; border: 1px solid var(--color-border); }
.qr-title { margin: 0; font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

/* ── Proof Photos Card ────────────────────────────────────────────────────── */
.proof-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.proof-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proof-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.proof-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.proof-actions { display: flex; gap: 4px; }

.action-btn-sm {
  --padding-start: 8px;
  --padding-end: 8px;
  font-size: 12px;
}

.proof-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.proof-preview img,
.proof-thumbnail img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid var(--color-border);
}

.proof-preview,
.proof-thumbnail {
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.proof-preview:active,
.proof-thumbnail:active {
  transform: scale(0.93);
  opacity: 0.8;
}

.proof-empty {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
}

/* ── Payment Status Editor ────────────────────────────────────────────────── */
.payment-status-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.form-select {
  flex: 1;
  min-width: 140px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}

/* ── Utilities ────────────────────────────────────────────────────────────── */
.ms-auto    { margin-left: auto; }
.text-brand { color: var(--color-brand); }
.text-success { color: var(--color-success); }
.text-danger  { color: var(--color-danger); }
.mb-2 { margin-bottom: 6px; }
.mt-1 { margin-top: 4px; }
.hint { margin: 8px 0 0; font-size: 12px; color: var(--color-text-muted); }
</style>
