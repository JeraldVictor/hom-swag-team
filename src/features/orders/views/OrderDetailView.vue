<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" />
        </ion-buttons>
        <ion-title>#{{ order?.order_number?.split('-').pop() || '...' }}</ion-title>
        <ion-buttons slot="end">
          <AppButton v-if="order && !isCompleted" variant="clear" icon-only icon="lucide:refresh-cw" @click="handleRefresh" :class="{ 'spin': isLoading }" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="order-page-content">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh" class="modern-refresher">
        <ion-refresher-content pulling-icon="lucide:arrow-down" refreshing-spinner="crescent" />
      </ion-refresher>
      <input
        ref="proofInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        style="display: none"
        @change="handleCompletionProofChange"
      />
      <div v-if="isLoading && !order" class="loading-state">
        <ion-spinner name="crescent" />
        <p>Loading order details...</p>
      </div>

      <div v-else-if="error && !order" class="error-state">
        <Icon icon="lucide:alert-circle" class="error-icon" />
        <h3>Something went wrong</h3>
        <p>{{ error }}</p>
        <AppButton variant="outline" icon="lucide:refresh-cw" @click="handleRefresh">Retry</AppButton>
      </div>

      <template v-else-if="order">
        <!-- Compact Hero Card -->
        <OrderHeroCard
          :order-number="order.order_number ?? ''"
          :status-label="orderStatusLabel"
          :status-variant="statusVariant"
          :customer-name="order.customer?.full_name || 'Customer'"
          :address="fullAddress"
          :phone="order.customer?.phone"
          :duration="order?.booking_info?.timing || ''"
          :is-customer-hidden="isCustomerHidden"
          :show-actions="!isCompleted && !isCustomerHidden"
          :total="order.total ?? 0"
          :date="formattedDate"
          :status="order.status as ORDER_STATUS"
          :effective_start_time="order.booking_info?.effective_start_time || ''"
          :effective_end_time="order.booking_info?.effective_end_time || ''"
          :beautician_start_time="order?.booking_info?.beautician_start_time"
          @navigate="navigateToLocation"
          @book-ride="showRideModal = true"
          @copy-address="copyAddress"
        />

        <div class="order-top-actions" v-if="canEditOrder && orderChangeAllowed">
          <button class="edit-order-btn" @click="handleEditOrder">
            <span class="edit-order-btn-icon">
              <Icon icon="lucide:edit-3" />
            </span>
            <span class="edit-order-btn-label">Edit Order</span>
            <Icon icon="lucide:chevron-right" class="edit-order-btn-arrow" />
          </button>
        </div>

        <OrderBodyCards
          :order="(order as unknown as Order)"
          :assigned-trips="assignedTrips"
          :show-assigned-trip-info="showAssignedTripInfo"
          :is-customer-hidden="isCustomerHidden"
          :has-order-context="hasOrderContext"
          :is-completed="isCompleted"
          :parsed-payment-remark="parsedPaymentRemark"
          :proof-images="proofImages"
          :setup-photos="setupPhotos"
          :is-editable="orderChangeAllowed"
          v-model:payment-status="paymentStatus"
          :payment-status-options="paymentStatusOptions"
          :is-updating="isUpdating"
          :can-upgrade="canUpgrade"
          @upgrade-order="handleUpgradeOrder"
          @open-gallery="openGallery"
          @trigger-proof-input="triggerProofInput"
          @upload-selfie="handleUploadSelfie"
          @capture-setup-photo="handleCaptureSetupPhoto"
          @capture-payment-proof="handleCapturePaymentProof"
          @save-payment-status="handleSavePaymentStatus"
        />

        <!-- ── COMPLETED: Payment summary + customer info ── -->
        <div class="completed-summary-card" v-if="isCompleted">
          <!-- Header -->
          <div class="cs-header">
            <div class="cs-header-icon">
              <Icon icon="lucide:circle-check" />
            </div>
            <div class="cs-header-copy">
              <p class="cs-header-title">Order Completed</p>
              <p class="cs-header-sub">{{ formattedDate }}</p>
            </div>
            <span class="cs-status-badge" :class="order.payment?.status === 'paid' ? 'cs-badge-paid' : 'cs-badge-partial'">
              {{ order.payment?.status === 'paid' ? 'Paid' : (order.payment?.status ?? 'Pending') }}
            </span>
          </div>

          <div class="cs-divider" />

          <!-- Payment rows -->
          <div class="cs-rows">
            <div class="cs-row">
              <span class="cs-row-label">Order total</span>
              <strong class="cs-row-val">₹{{ order.total ?? 0 }}</strong>
            </div>
            <div class="cs-row" v-if="completedPrepaid > 0">
              <span class="cs-row-label">Prepaid online</span>
              <strong class="cs-row-val cs-val-success">−₹{{ completedPrepaid }}</strong>
            </div>
            <div class="cs-row" v-if="completedCod > 0">
              <span class="cs-row-label cs-row-label-icon"><Icon icon="lucide:banknote" class="cs-icon-cash" /> Cash (COD)</span>
              <strong class="cs-row-val">₹{{ completedCod }}</strong>
            </div>
            <div class="cs-row" v-if="completedUpi > 0">
              <span class="cs-row-label cs-row-label-icon"><Icon icon="lucide:smartphone" class="cs-icon-upi" /> UPI</span>
              <strong class="cs-row-val">₹{{ completedUpi }}</strong>
            </div>
            <div class="cs-row" v-if="completedTip > 0">
              <span class="cs-row-label cs-row-label-icon"><Icon icon="lucide:heart" class="cs-icon-tip" /> Tip <span class="cs-tip-note">· you keep this</span></span>
              <strong class="cs-row-val cs-val-tip">+₹{{ completedTip }}</strong>
            </div>
          </div>

          <!-- Total received -->
          <div class="cs-total-row">
            <span>Total received</span>
            <strong>₹{{ order.payment?.amount_paid ?? 0 }}</strong>
          </div>

        </div>

        <div v-if="isCompleted" style="height: 32px;" />
        <div v-if="!isCompleted && orderChangeAllowed" style="height: 110px;" />

        <div class="action-footer" v-if="!isCompleted && orderChangeAllowed">
          <div v-if="error" class="error-banner">{{ error }}</div>
          <!-- Main Actions -->
          <div class="main-actions">
            <AppButton 
              v-if="paymentActionLabel"
              expand="block"
              size="lg"
              :loading="isUpdating"
              :disabled="!orderChangeAllowed"
              :icon="isSelfieStep ? 'lucide:camera' : undefined"
              @click="handleMainAction"
              class="primary-action-btn-custom"
            >
              {{ paymentActionLabel }}
            </AppButton>
            <div class="date-restriction-tip" v-if="!orderChangeAllowed && order" style="text-align: center; color: var(--color-text-muted); font-size: 13px; margin: 8px 0; padding: 8px; background: var(--color-surface); border-radius: 8px;">
              {{ orderDateRestrictionMessage }}
            </div>
 
            <AppButton 
              v-if="canCancel && orderChangeAllowed"
              expand="block"
              variant="outline"
              color="danger" 
              icon="lucide:ban"
              @click="openCancelModal"
              style="margin-top: 12px;"
            >
              Customer Request to Cancel
            </AppButton>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- OTP Verification Drawer -->
    <ion-modal 
      :is-open="showOtpInput" 
      @didDismiss="showOtpInput = false" 
      class="otp-modal"
      :initial-breakpoint="0.5"
      :breakpoints="[0, 0.5, 0.7]"
      handle-behavior="cycle"
    >
      <div class="otp-drawer-content">
        <div class="otp-header">
          <div class="otp-icon-wrapper">
            <Icon icon="lucide:shield-check" />
          </div>
          <h3>Verify Service OTP</h3>
          <p>Enter the 6-digit code provided by the customer to start the service.</p>
        </div>
        
        <div class="otp-input-section">
          <OtpInput v-model="otpValue" @complete="handleVerifyOtp" />
        </div>

        <div class="otp-footer">
          <AppButton 
            expand="block" 
            size="lg" 
            :disabled="otpValue.length < 6" 
            :loading="isVerifyingOtp" 
            @click="handleVerifyOtp"
          >
            Verify & Start Service
          </AppButton>
          <AppButton variant="ghost" expand="block" @click="showOtpInput = false">
            Cancel
          </AppButton>
        </div>
      </div>
    </ion-modal>

    <!-- Cancel Modal -->
    <ion-modal 
      :is-open="showCancelModal" 
      @didDismiss="showCancelModal = false" 
      class="cancel-modal"
      :initial-breakpoint="0.85"
      :breakpoints="[0, 0.85, 1]"
      handle-behavior="cycle"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>Cancel Order</ion-title>
          <ion-buttons slot="end">
            <AppButton variant="clear" icon-only icon="lucide:x" @click="showCancelModal = false" />
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="cancel-container">
          <div class="cancel-warning">
            <div class="warning-icon-wrapper">
              <Icon icon="lucide:alert-triangle" />
            </div>
            <h3>Are you sure?</h3>
            <p>Cancellation is permanent. Please ensure you have valid reasons and the customer's consent.</p>
          </div>

          <div class="cancel-form-section">
            <div class="form-label-group">
              <Icon icon="lucide:clipboard-edit" />
              <label class="form-label">Reason for Cancellation</label>
            </div>
            <textarea
              v-model="cancelReason"
              placeholder="Provide a detailed reason for cancellation..."
              rows="4"
              class="modern-textarea"
            ></textarea>
          </div>

          <div class="cancel-form-section">
            <p class="form-hint">A cancellation request will be sent to admin for review.</p>
          </div>

          <div class="cancel-actions">
            <AppButton
              variant="danger"
              expand="block"
              :disabled="!cancelReason.trim()"
              :loading="isUpdating"
              @click="handleCancel"
            >
              Confirm & Cancel Order
            </AppButton>
            <AppButton variant="ghost" expand="block" @click="showCancelModal = false">
              Go Back
            </AppButton>
          </div>
        </div>
      </ion-content>
    </ion-modal>


    <!-- Reusable Ride Selection Modal -->
    <RideSelectorModal
      v-model:is-open="showRideModal"
      :order-id="String(order?._id || order?.id || '')"
      :customer-name="order?.customer?.full_name || 'Customer'"
      :destination="{ 
        lat: order?.delivery_address?.latitude ? Number(order.delivery_address.latitude) : Number(order?.address?.latitude || 0),
        lng: order?.delivery_address?.longitude ? Number(order.delivery_address.longitude) : Number(order?.address?.longitude || 0)
      }"
      @booked="(p: string) => showSuccess(`Ride booked via ${p}`)"
    />

    <!-- Upgrade Item Modal -->
    <ion-modal
      :is-open="showUpgradeModal"
      @didDismiss="showUpgradeModal = false"
      class="upgrade-modal"
      :initial-breakpoint="0.75"
      :breakpoints="[0, 0.75, 1]"
      handle-behavior="cycle"
    >
      <div class="upgrade-modal-content">
        <!-- Handle -->
       

        <!-- Header -->
        <div class="upgrade-header">
          <div class="upgrade-header-icon">
            <Icon icon="lucide:arrow-up-right" />
          </div>
          <div class="upgrade-header-copy">
            <h3 class="upgrade-title">Upgrade Service</h3>
            <p class="upgrade-subtitle">{{ selectedItem?.title ? `Upgrading: ${selectedItem.title}` : 'Choose a better option' }}</p>
          </div>
          <button class="upgrade-close-btn" @click="showUpgradeModal = false">
            <Icon icon="lucide:x" />
          </button>
        </div>

        <!-- Body -->
        <div class="upgrade-body">
          <div v-if="isFetchingUpgrades" class="upgrade-loading">
            <div class="upgrade-loading-spinner">
              <Icon icon="lucide:loader-2" class="spin" />
            </div>
            <p>Finding upgrade options…</p>
          </div>

          <div v-else-if="upgradableProducts.length === 0" class="upgrade-empty">
            <div class="upgrade-empty-icon-wrap">
              <Icon icon="lucide:package-x" />
            </div>
            <h4>Nothing available</h4>
            <p>There are no upgrades for this item right now.</p>
          </div>

          <div v-else class="upgrade-list">
            <button
              v-for="product in upgradableProducts"
              :key="product._id || product.id"
              class="upgrade-item"
              :disabled="isFetchingUpgrades"
              @click="handleUpgrade(product)"
            >
              <div class="upgrade-item-left">
                <div class="upgrade-item-icon-wrap">
                  <Icon icon="lucide:sparkles" />
                </div>
                <div class="upgrade-item-copy">
                  <p class="upgrade-item-title">{{ product.title || product.name }}</p>
                  <p class="upgrade-item-price">₹{{ product.base_price ?? product.price ?? product.min_price ?? 0 }}</p>
                </div>
              </div>
              <span class="upgrade-item-select">
                Select <Icon icon="lucide:chevron-right" class="select-chevron" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </ion-modal>

    <!-- Image Gallery Modal -->
    <ion-modal :is-open="showGallery" @didDismiss="showGallery = false" class="gallery-modal">
      <div class="gallery-container">
        <div class="gallery-header">
          <AppButton variant="clear" icon-only icon="lucide:x" @click="showGallery = false" class="close-btn" />
        </div>
        <div class="gallery-content">
          <img :src="activeImageUrl" class="full-image" alt="Preview" />
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, onIonViewWillEnter, toastController } from '@ionic/vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/shared/composables'
import { useNavigation } from '@/shared/composables/useNavigation'
import { ORDER_STATUS } from '@/shared/constants'
import { formatISTDate, formatISTDateShort, getTodayIST } from '@/shared/lib/datetime'
import { mediaUrl } from '@/shared/lib/media'
import type { Order, OrderProduct, OrderTrip, PaymentStatus } from '@/shared/models'
import OrderBodyCards from '../components/OrderBodyCards.vue'
import OrderHeroCard from '../components/OrderHeroCard.vue'
import { useOrderDetail } from '../composables/useOrderDetail'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

const {
  order,
  isLoading,
  isUpdating,
  isVerifyingOtp,
  error,
  nextActionLabel,
  isCompleted,
  canUpgrade,
  fetchOrder,
  advanceStatus,
  uploadSelfie,
  uploadCompletionProof,
  cancelAfterArrival,
  upgradeProduct,
  getUpgradableProducts,
  captureAndUploadPaymentProof,
  captureAndUploadSetupPhoto,
  updateOrderDetails,
  generateOtp,
} = useOrderDetail()

// ── UI State ───────────────────────────────────────────────────────────────

const { showSuccess, showError } = useToast()
const showRideModal = ref(false)
const showGallery = ref(false)
const activeImageUrl = ref('')
const showOtpInput = ref(false)
const otpValue = ref('')
const showCancelModal = ref(false)
const cancelReason = ref('')
const showUpgradeModal = ref(false)
const isFetchingUpgrades = ref(false)
const selectedItem = ref<OrderProduct | null>(null)
const upgradableProducts = ref<any[]>([])
const proofInput = ref<HTMLInputElement | null>(null)
const paymentStatus = ref<PaymentStatus | ''>('')
const paymentStatusOptions = [
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Conflict', value: 'conflict' },
]
const showCompletedCustomer = ref(false)
const { openNavigationMenu } = useNavigation()

const hasPaymentMethod = computed(() => {
  const method = order.value?.payment?.method?.toLowerCase() || ''
  return method
})

const hasCodAmount = computed(() => {
  return Number(order.value?.payment?.cod_amount ?? 0) > 0
})

const hasUpiAmount = computed(() => {
  const method = hasPaymentMethod.value
  return Number(order.value?.payment?.upi_amount ?? 0) > 0 || method.includes('upi')
})

const isPrepaidOrder = computed(() => {
  return !hasCodAmount.value && !hasUpiAmount.value
})

const completedCod = computed(() => Number(order.value?.payment?.cod_amount ?? 0))
const completedUpi = computed(() => Number(order.value?.payment?.upi_amount ?? 0))
const completedTip = computed(() => Number(order.value?.payment?.tip ?? order.value?.tip ?? 0))
const completedPrepaid = computed(() => {
  const amountPaid = Number(order.value?.payment?.amount_paid ?? 0)
  const doorCollection = completedCod.value + completedUpi.value + completedTip.value
  return Math.max(0, amountPaid - doorCollection)
})

const paymentActionLabel = computed(() => {
  if (order.value?.status?.toLowerCase() === 'started') {
    return isPrepaidOrder.value ? 'Complete Order' : 'Collect Payment'
  }
  return nextActionLabel.value
})

// ── Computed ───────────────────────────────────────────────────────────────

const customerInitials = computed(() => {
  const name = order.value?.customer?.full_name || order.value?.customer?.name || '?'
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const formattedDate = computed(() => {
  const d = order.value?.booking_info?.date ?? order.value?.service_date ?? order.value?.created_at
  if (!d) return '...'
  return formatISTDate(d)
})

const totalServiceDuration = computed(() => {
  const products = order.value?.products || []
  return products.reduce((sum, item) => {
    const duration = Number(item.duration ?? 0)
    const multiplier = Number(item.quantity ?? 1)
    return sum + duration * multiplier
  }, 0)
})

const fullAddress = computed(() => {
  if (!order.value) return '...'
  const addr = order.value.delivery_address || order.value.address
  if (!addr) return 'No address provided'
  return [addr.street || addr.line1, addr.landmark, addr.city, addr.pincode]
    .filter(Boolean)
    .join(', ')
})

const scheduleDate = computed(
  () => order.value?.booking_info?.date ?? order.value?.service_date ?? ''
)
const orderChangeAllowed = computed(() => isBookingDateToday.value && !isCompleted.value)
const orderDateRestrictionMessage = computed(() => {
  if (!scheduleDate.value) return ''
  const formatted = formatISTDate(scheduleDate.value)
  if (bookingDateStatus.value === 'future') {
    return `This order is scheduled for ${formatted}. Status changes are only allowed on the scheduled date.`
  }
  if (bookingDateStatus.value === 'past') {
    return `This order was scheduled for ${formatted}. Edits and updates are no longer allowed.`
  }
  return ''
})

const hasOrderContext = computed(() => {
  return !!(
    order.value?.notes ||
    order.value?.custom_instruction ||
    order.value?.staff_notes ||
    order.value?.payment?.internal_comment ||
    order.value?.instruction_presets?.length
  )
})

const isCustomerHidden = computed(() => {
  const status = order.value?.status?.toLowerCase() || ''
  const hiddenStatuses: string[] = [
    ORDER_STATUS.STARTED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.CANCEL_REQUESTED,
    ORDER_STATUS.ARRIVED_AND_CANCELLED,
  ]
  const missingCustomer =
    !order.value?.customer?.full_name &&
    !order.value?.customer?.name &&
    !order.value?.customer?.phone

  return hiddenStatuses.includes(status) || missingCustomer || !orderChangeAllowed.value
})

const statusVariant = computed(() => {
  const s = order.value?.status?.toLowerCase()
  if (s === 'completed') return 'success'
  if (s === 'ongoing' || s === 'started' || s === 'confirmed' || s === 'reached_customer_place')
    return 'brand'
  if (s === 'arrived_and_cancelled' || s === 'cancel_requested') return 'danger'
  return 'neutral'
})

const orderStatusLabel = computed(() => {
  const status = order.value?.status?.toLowerCase() || ''
  switch (status) {
    case 'cancel_requested':
      return 'Cancellation Requested'
    case 'reached_customer_place':
      return 'Reached Customer Place'
    case 'arrived_and_cancelled':
      return 'Arrived & Cancelled'
    case 'cancelled':
      return 'Cancelled'
    case 'completed':
      return 'Completed'
    case 'started':
      return 'Started'
    case 'ongoing':
      return 'Ongoing'
    case 'confirmed':
      return 'Confirmed'
    default:
      return order.value?.status ?? 'Unknown'
  }
})

const paymentStatusVariant = computed(() => {
  const s = order.value?.payment?.status?.toLowerCase() ?? ''
  return s === 'paid' ? 'success' : 'warning'
})

const amountPaid = computed(() => {
  if (!order.value) return '—'
  if (order.value.payment?.amount_paid != null) return `₹${order.value.payment.amount_paid}`
  if (order.value.cod_collected_amount != null) return `₹${order.value.cod_collected_amount}`
  if (order.value.total != null) return `₹${order.value.total}`
  return '—'
})

const tipAmount = computed(() => {
  const tip = order.value?.payment?.tip ?? order.value?.tip
  if (tip != null) return `₹${tip}`
  return '—'
})

const paymentReference = computed(() => order.value?.payment?.reference || '—')

/** Parses old remark-based breakdown for backward compat: "COD ₹500 | UPI ₹0 | Tip ₹50" */
const parsedPaymentRemark = computed(() => {
  const remark = order.value?.payment?.remark
  if (!remark) return null
  const codMatch = remark.match(/COD ₹(\d+(?:\.\d+)?)/)
  const upiMatch = remark.match(/UPI ₹(\d+(?:\.\d+)?)/)
  const tipMatch = remark.match(/Tip ₹(\d+(?:\.\d+)?)/)
  if (!codMatch && !upiMatch && !tipMatch) return null
  return {
    cod: codMatch ? parseFloat(codMatch[1]) : null,
    upi: upiMatch ? parseFloat(upiMatch[1]) : null,
    tip: tipMatch ? parseFloat(tipMatch[1]) : null,
  }
})

const canCancel = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return (
    (s === ORDER_STATUS.CONFIRMED ||
      s === ORDER_STATUS.ONGOING ||
      s === ORDER_STATUS.REACHED_CUSTOMER_PLACE) &&
    isBookingDateToday.value
  )
})

const canEditOrder = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return s === ORDER_STATUS.STARTED
})

const isSelfieStep = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return (
    (s === ORDER_STATUS.ONGOING || s === ORDER_STATUS.REACHED_CUSTOMER_PLACE) &&
    !order.value?.arrival_selfie
  )
})

const setupPhotos = computed(() => {
  if (!order.value?.setup_photos) return []
  return Array.isArray(order.value.setup_photos)
    ? order.value.setup_photos.filter((p: { url?: string }) => !!p?.url)
    : order.value.setup_photos
      ? [order.value.setup_photos]
      : []
})

const proofImages = computed(() => {
  if (!order.value?.payment?.proof) return []
  return Array.isArray(order.value.payment.proof)
    ? order.value.payment.proof.filter((p: { url?: string }) => !!p?.url)
    : order.value.payment.proof
      ? [order.value.payment.proof]
      : []
})

const assignedTrips = computed(() => order.value?.trips ?? [])

const showAssignedTripInfo = computed(() => {
  if (!assignedTrips.value.length || !order.value) return false
  const status = order.value.status?.toLowerCase() || ''
  return !['completed', 'cancelled', 'arrived_and_cancelled', 'cancel_requested'].includes(status)
})

const isBookingDateToday = computed(() => {
  if (!scheduleDate.value) return false
  return formatISTDateShort(scheduleDate.value) === getTodayIST()
})

const bookingDateStatus = computed(() => {
  if (!scheduleDate.value) return 'unknown'
  const bookingDate = formatISTDateShort(scheduleDate.value)
  const today = getTodayIST()
  if (bookingDate === today) return 'today'
  return bookingDate > today ? 'future' : 'past'
})

const isBookingDateFuture = computed(() => bookingDateStatus.value === 'future')

const bookingDateRestrictionMessage = computed(() => {
  if (!scheduleDate.value) return ''
  const formatted = formatISTDate(scheduleDate.value)
  if (bookingDateStatus.value === 'future') {
    return `This order is scheduled for ${formatted}. Status changes are only allowed on the scheduled date.`
  }
  if (bookingDateStatus.value === 'past') {
    return `This order was scheduled for ${formatted}. Edits and updates are no longer allowed.`
  }
  return ''
})

watch(
  order,
  value => {
    const status = value?.payment?.status?.toLowerCase() ?? ''
    const allowedStatuses = [
      'pending',
      'paid',
      'partial',
      'unpaid',
      'conflict',
      'failed',
      'refunded',
    ] as const
    paymentStatus.value = allowedStatuses.includes(status as any) ? (status as PaymentStatus) : ''
  },

  { immediate: true }
)

// ── Methods ────────────────────────────────────────────────────────────────

async function handleRefresh(event?: CustomEvent): Promise<void> {
  await fetchOrder(orderId)
  if (event?.target && typeof (event.target as HTMLIonRefresherElement).complete === 'function') {
    ;(event.target as HTMLIonRefresherElement).complete()
  }
}

async function presentConfirm(header: string, message: string) {
  const alert = await alertController.create({
    header,
    message,
    mode: 'ios',
    buttons: [
      { text: 'No', role: 'cancel' },
      { text: 'Yes', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  return role === 'confirm'
}

async function promptSetupPhotoUpload(): Promise<void> {
  await handleCaptureSetupPhoto()
}

function ensureTodayEditable(): boolean {
  if (!order.value) return false
  if (!isBookingDateToday.value) {
    showError('Only today\u2019s orders can be updated today.')
    return false
  }
  return true
}

async function handleMainAction() {
  if (!ensureTodayEditable()) return
  const s = order.value?.status?.toLowerCase()

  if (s === 'confirmed') {
    // Confirmed -> Ongoing (Start travel)
    const confirmed = await presentConfirm(
      'Start travel',
      'Are you sure you want to start moving to the customer location?'
    )
    if (!confirmed) return
    await advanceStatus()
  } else if (s === 'ongoing') {
    // Ongoing -> Reached Customer Place
    const confirmed = await presentConfirm(
      'Reached Customer Place',
      'Have you reached the customer location and want to begin arrival verification?'
    )
    if (!confirmed) return
    await advanceStatus()
  } else if (s === 'reached_customer_place') {
    if (!order.value?.arrival_selfie) {
      const confirmed = await presentConfirm(
        'Take Selfie',
        'Are you ready to take the arrival selfie and upload setup photos?'
      )
      if (!confirmed) return

      await handleUploadSelfie()
    } else if (setupPhotos.value.length === 0) {
      await promptSetupPhotoUpload()
    } else {
      if (!order.value?.verification?.otp_sent_at) {
        const otp = await generateOtp()
        if (otp) {
          const toast = await toastController.create({
            message: 'Service OTP generated. Ask the customer for the code.',
            duration: 2500,
            color: 'success',
            position: 'top',
          })
          await toast.present()
        }
      }
      showOtpInput.value = true
    }
  } else if (s === 'started') {
    router.push({ name: 'OrderPayment', params: { id: orderId } })
  } else {
    // Started -> Completed (Complete Service)
    const confirmed = await presentConfirm(
      'Complete Service',
      'Have you finished all services? This will mark the order as completed.'
    )
    if (!confirmed) return
    await advanceStatus()
  }
}

async function handleUploadSelfie() {
  if (!ensureTodayEditable()) return
  const uploaded = await uploadSelfie()
  if (uploaded) {
    showSuccess('Selfie uploaded successfully')
    if (order.value?.status.toLowerCase() === 'reached_customer_place') {
      if (setupPhotos.value.length === 0) {
        const toast = await toastController.create({
          message: 'Now take setup photos using the camera.',
          duration: 2500,
          color: 'warning',
          position: 'top',
        })
        await toast.present()
      } else {
        showOtpInput.value = true
      }
    }
  }
}

async function handleSavePaymentStatus() {
  if (!ensureTodayEditable()) return
  if (!order.value) return
  if (
    !paymentStatus.value ||
    !['paid', 'partial', 'unpaid', 'conflict'].includes(paymentStatus.value)
  ) {
    showError('Please choose Paid, Partial, Unpaid, or Conflict before saving payment status.')
    return
  }

  await updateOrderDetails({ payment: { status: paymentStatus.value as PaymentStatus } })
  if (!error.value) {
    showSuccess('Payment status updated successfully')
  }
}

function triggerProofInput() {
  if (!ensureTodayEditable()) return
  proofInput.value?.click()
}

async function handleCaptureSetupPhoto() {
  if (!ensureTodayEditable()) return
  const uploaded = await captureAndUploadSetupPhoto()
  if (uploaded) {
    showSuccess('Setup photo uploaded successfully')
  }
}

async function handleCapturePaymentProof() {
  if (!ensureTodayEditable()) return
  const uploaded = await captureAndUploadPaymentProof()
  if (uploaded) {
    showSuccess('Payment proof captured successfully')
  }
}

async function handleVerifyOtp() {
  if (!ensureTodayEditable()) return
  if (otpValue.value.length !== 6) return

  const confirmed = await presentConfirm(
    'Verify OTP',
    'Are you sure you want to verify the OTP and start the service?'
  )
  if (!confirmed) return

  // Requirement: Transition to 'started' using OTP
  // We use advanceStatus here because it calls the status update endpoint which handles OTP verification and state transition in one go.
  await advanceStatus(undefined, otpValue.value)
  if (!error.value) {
    showOtpInput.value = false
    otpValue.value = ''
    const toast = await toastController.create({
      message: 'Service started successfully!',
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
  }
}

function handleEditOrder() {
  if (!order.value) return
  router.push({ name: 'OrderEdit', params: { id: orderId } })
}

function handleUpgradeOrder(item: OrderProduct) {
  if (!item) return
  openUpgradeModal(item)
}

function openGallery(url: string) {
  activeImageUrl.value = url
  showGallery.value = true
}

function getSelectedServiceItems(item: Readonly<OrderProduct>) {
  return (
    item.selected_package_items || (item as any).services || (item as any).package_services || []
  )
}

function getSelectedOptions(item: Readonly<OrderProduct>) {
  return item.selected_options || (item as any).options || []
}

function getSelectedFreeItems(item: Readonly<OrderProduct>) {
  return item.selected_free_items || (item as any).free_products || []
}

function openCancelModal() {
  if (!ensureTodayEditable()) return
  showCancelModal.value = true
  otpValue.value = ''
}

async function handleCompletionProofChange(event: Event) {
  if (!ensureTodayEditable()) return
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const uploaded = await uploadCompletionProof(files)
  if (uploaded) {
    showSuccess('Payment proof uploaded successfully')
  }
  if (proofInput.value) {
    proofInput.value.value = ''
  }
}

async function handleCancel() {
  if (!ensureTodayEditable()) return
  if (!cancelReason.value.trim()) {
    const toast = await toastController.create({
      message: 'Please provide a reason for cancellation.',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  // API Trigger
  await cancelAfterArrival(cancelReason.value)

  if (!error.value) {
    showCancelModal.value = false
    cancelReason.value = ''
    otpValue.value = ''
    const toast = await toastController.create({
      message: 'Cancellation request submitted',
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
  }
}

async function openUpgradeModal(item: OrderProduct) {
  selectedItem.value = item
  showUpgradeModal.value = true
  isFetchingUpgrades.value = true
  try {
    const prods = await getUpgradableProducts(item.product_id)
    upgradableProducts.value = prods
  } catch (err) {
    console.error('Failed to fetch upgrades', err)
  } finally {
    isFetchingUpgrades.value = false
  }
}

async function handleUpgrade(newProduct: any) {
  if (!selectedItem.value || !order.value) return

  await upgradeProduct({
    order_product_id: selectedItem.value.order_product_id || '',
    new_product_id: String(newProduct._id || newProduct.id),
  })

  showUpgradeModal.value = false
  if (!error.value) {
    const toast = await toastController.create({
      message: `${newProduct.title || newProduct.name} added to order!`,
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
  }
}

async function navigateToLocation() {
  if (!order.value) return
  const addr = order.value.delivery_address || order.value.address
  if (!addr || !addr.latitude || !addr.longitude) {
    showError('Coordinates not available for this address.')
    return
  }
  await openNavigationMenu(
    Number(addr.latitude),
    Number(addr.longitude),
    order.value.customer?.full_name || 'Customer'
  )
}

async function copyAddress() {
  if (!fullAddress.value) return

  const text = fullAddress.value
  try {
    // 1. Try modern API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      showSuccess('Address copied to clipboard')
      return
    }

    // 2. Fallback for non-secure / older mobile contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      showSuccess('Address copied')
    } else {
      throw new Error('Fallback copy failed')
    }
  } catch (err) {
    console.error('Copy failed', err)
    showError('Failed to copy address')
  }
}

function handleOrderUpdated(event: Event): void {
  const customEvent = event as CustomEvent<{ order_id: string }>
  if (customEvent.detail?.order_id === orderId) {
    fetchOrder(orderId)
  }
}

onMounted(() => {
  window.addEventListener('homswag:order-updated', handleOrderUpdated)
  fetchOrder(orderId)
})

onIonViewWillEnter(() => {
  fetchOrder(orderId)
})

onUnmounted(() => {
  window.removeEventListener('homswag:order-updated', handleOrderUpdated)
})
</script>

<style scoped>
/* ── Page background ─────────────────────────────────────────────────────── */
.order-page-content {
  --background: #f2f3f8;
}

/* ── States ──────────────────────────────────────────────────────────────── */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70vh;
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}
.error-icon { font-size: 44px; color: var(--color-danger); margin-bottom: 12px; }

/* ── Body Layout ─────────────────────────────────────────────────────────── */
.order-content {
  padding: 12px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-top-actions {
  padding: 12px 16px 4px;
}

.edit-order-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 13px 14px;
  border-radius: 16px;
  border: 1.5px solid rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.06);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.edit-order-btn:active {
  background: rgba(99, 102, 241, 0.12);
  border-color: var(--color-brand);
}

.edit-order-btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.edit-order-btn-label {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand);
  text-align: left;
}

.edit-order-btn-arrow {
  font-size: 16px;
  color: var(--color-brand);
  opacity: 0.6;
  flex-shrink: 0;
}

/* ── Action Footer ───────────────────────────────────────────────────────── */
.action-footer {
  position: sticky;
  bottom: 0;
  padding: 12px 14px max(12px, env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.main-actions { display: flex; flex-direction: column; gap: 8px; }

.primary-action-btn-custom, .primary-action-btn {
  --background: var(--color-brand);
  --box-shadow: 0 6px 20px rgba(124, 58, 237, 0.28);
  font-weight: 800;
}

.cancel-btn { margin-top: 4px; }

.date-restriction-tip, .date-tip {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
  padding: 8px;
  background: var(--color-surface);
  border-radius: 8px;
}

.error-banner {
  padding: 10px 12px;
  background: var(--color-danger-pale);
  color: var(--color-danger);
  border-radius: 10px;
  font-size: 13px;
}

/* ── OTP Modal ───────────────────────────────────────────────────────────── */
.otp-modal { --border-radius: 32px 32px 0 0; }
.otp-drawer-content { padding: 28px 20px; display: flex; flex-direction: column; gap: 28px; }
.otp-icon-wrapper {
  width: 56px; height: 56px; border-radius: 18px;
  background: var(--color-brand-pale); color: var(--color-brand);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto; font-size: 28px;
}
.otp-header { text-align: center; }
.otp-header h3 { margin: 12px 0 6px; font-size: 20px; font-weight: 800; color: var(--color-text); }
.otp-header p { margin: 0; font-size: 13px; color: var(--color-text-muted); line-height: 1.5; }
.otp-input-section { display: flex; justify-content: center; }
.otp-footer { display: flex; flex-direction: column; gap: 10px; }

/* ── Cancel Modal ────────────────────────────────────────────────────────── */
.cancel-modal { --border-radius: 28px 28px 0 0; }
.cancel-container { padding: 6px 4px 20px; display: flex; flex-direction: column; gap: 22px; }
.cancel-warning { text-align: center; }

/* ── Upgrade Modal ───────────────────────────────────────────────────────── */
.upgrade-modal { --border-radius: 32px 32px 0 0; }
.upgrade-modal-content {
  padding: 0 0 max(24px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  height: 100%;
}
.upgrade-drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-border);
  margin: 12px auto 0;
  flex-shrink: 0;
}
.upgrade-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 14px;
  flex-shrink: 0;
}
.upgrade-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.upgrade-header-copy { flex: 1; min-width: 0; }
.upgrade-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}
.upgrade-subtitle {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upgrade-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  cursor: pointer;
}
.upgrade-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.upgrade-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 48px 12px;
  color: var(--color-text-muted);
  font-size: 14px;
}
.upgrade-loading-spinner {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.upgrade-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  text-align: center;
  color: var(--color-text-muted);
}
.upgrade-empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--color-surface);
  color: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-bottom: 4px;
}
.upgrade-empty h4 { margin: 0; font-size: 16px; font-weight: 700; color: var(--color-text); }
.upgrade-empty p  { margin: 4px 0 0; font-size: 13px; line-height: 1.5; }
.upgrade-list { display: flex; flex-direction: column; gap: 10px; }
.upgrade-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px;
  border: 1.5px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-background);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.upgrade-item:active {
  border-color: var(--color-brand);
  background: rgba(99, 102, 241, 0.04);
}
.upgrade-item:disabled { opacity: 0.5; pointer-events: none; }
.upgrade-item-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.upgrade-item-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.upgrade-item-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.upgrade-item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upgrade-item-price {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-brand);
}
.upgrade-item-select {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-brand);
  white-space: nowrap;
  flex-shrink: 0;
}
.select-chevron { font-size: 13px; }
.warning-icon-wrapper {
  width: 48px; height: 48px; border-radius: 14px;
  background: var(--color-danger-pale); color: var(--color-danger);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px; font-size: 24px;
}
.cancel-warning h3 { margin: 0; font-size: 18px; font-weight: 800; color: var(--color-text); }
.cancel-warning p { margin: 6px 0 0; font-size: 13px; color: var(--color-text-muted); line-height: 1.5; }
.cancel-form-section { display: flex; flex-direction: column; gap: 6px; }
.form-label-group { display: flex; align-items: center; gap: 6px; }
.form-label-group svg { color: var(--color-brand); font-size: 14px; }
.form-label { font-size: 13px; font-weight: 700; color: var(--color-text); }
.modern-textarea {
  width: 100%; padding: 12px 14px; border-radius: 12px;
  border: 1px solid var(--color-border); background: var(--color-background);
  color: var(--color-text); font-family: inherit; font-size: 13px;
  resize: none; transition: border-color 0.2s;
  box-sizing: border-box;
}
.modern-textarea:focus { outline: none; border-color: var(--color-brand); }
.cancel-actions { display: flex; flex-direction: column; gap: 8px; }

/* ── Payment Modal ───────────────────────────────────────────────────────── */
.payment-modal { --border-radius: 28px 28px 0 0; }
.payment-modal-toolbar { --background: transparent; }
.payment-modal-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 800; color: var(--color-text); }
.payment-modal-title-icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--color-brand-pale); color: var(--color-brand);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.payment-dialog-body { display: flex; flex-direction: column; gap: 20px; padding-bottom: max(20px, env(safe-area-inset-bottom)); }
.pdb-bill-banner {
  background: linear-gradient(135deg, var(--color-brand) 0%, color-mix(in srgb, var(--color-brand) 80%, #000) 100%);
  border-radius: 16px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px; color: #fff;
}
.pdb-bill-row { display: flex; align-items: center; justify-content: space-between; }
.pdb-bill-row--sub { font-size: 12px; opacity: 0.75; }
.pdb-bill-label { font-size: 13px; font-weight: 600; opacity: 0.9; }
.pdb-bill-amount { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
.pdb-bill-divider { height: 1px; background: rgba(255,255,255,0.2); margin: 2px 0; }
.pdb-section { display: flex; flex-direction: column; gap: 8px; }
.pdb-section-label { margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--color-text-muted); padding-left: 2px; }
.pdb-optional { font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 0.7; }
.pdb-list { background: var(--color-surface); border-radius: 14px; overflow: hidden; --ion-item-background: transparent; --ion-item-border-color: var(--color-border); padding: 0; }
.pdb-item { --padding-start: 10px; --padding-end: 10px; --inner-padding-end: 0; --min-height: 52px; --border-color: var(--color-border); font-size: 14px; }
.pdb-item--textarea { --min-height: auto; align-items: flex-start; padding-top: 10px; }
.pdb-item-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 10px; flex-shrink: 0; }
.pdb-icon-cash  { background: #e8f5e9; color: #2e7d32; }
.pdb-icon-upi   { background: #e3f2fd; color: #1565c0; }
.pdb-icon-tip   { background: #fce4ec; color: #c62828; }
.pdb-icon-ref   { background: var(--color-brand-pale); color: var(--color-brand); }
.pdb-icon-proof { background: #f3e5f5; color: #7b1fa2; }
.pdb-item-label { font-size: 14px; font-weight: 600; color: var(--color-text); margin: 0; }
.pdb-amount-input { text-align: right; font-size: 17px; font-weight: 700; max-width: 90px; --placeholder-color: var(--color-text-muted); }
.pdb-total { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--color-brand); border-radius: 12px; color: #fff; font-size: 13px; font-weight: 600; }
.pdb-total strong { font-size: 20px; font-weight: 800; }
.status-chip-row { display: flex; gap: 8px; }
.status-chip {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 5px; padding: 12px 6px; border-radius: 12px;
  border: 2px solid var(--color-border); background: var(--color-surface);
  color: var(--color-text-muted); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.18s ease;
}
.status-chip svg { font-size: 18px; }
.status-chip--active.status-chip--paid    { border-color: var(--color-success); background: #e8f5e9; color: var(--color-success); }
.status-chip--active.status-chip--unpaid  { border-color: #f59e0b; background: #fffbeb; color: #b45309; }
.status-chip--active.status-chip--conflict { border-color: var(--color-danger); background: var(--color-danger-pale); color: var(--color-danger); }
.pdb-proof-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--color-surface); border-radius: 14px; cursor: pointer; }
.pdb-proof-row:active { background: var(--color-background); }
.pdb-proof-left { display: flex; align-items: center; gap: 10px; }
.pdb-proof-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--color-text); }
.pdb-proof-sub   { margin: 2px 0 0; font-size: 11px; color: var(--color-text-muted); }
.pdb-proof-badge { --border-radius: 6px; font-size: 11px; font-weight: 700; }
.pdb-proof-thumbs { display: flex; gap: 8px; flex-wrap: wrap; }
.pdb-thumb { width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 2px solid var(--color-border); cursor: pointer; }
.pdb-thumb:active { opacity: 0.8; }
.pdb-thumb img { width: 100%; height: 100%; object-fit: cover; }
.pdb-actions { display: flex; flex-direction: column; gap: 8px; }

/* ── Gallery Modal ───────────────────────────────────────────────────────── */
.gallery-modal { --background: rgba(0,0,0,0.95); --width: 100%; --height: 100%; }
.gallery-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
.gallery-header { padding: env(safe-area-inset-top, 12px) 16px 12px; display: flex; justify-content: flex-end; }
.close-btn { --color: #fff; --background: rgba(255,255,255,0.1); --border-radius: 50%; width: 40px; height: 40px; }
.gallery-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; }
.full-image { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }

/* ── Utilities ───────────────────────────────────────────────────────────── */
.ms-auto { margin-left: auto; }
.text-success { color: var(--color-success); }
.text-brand { color: var(--color-brand); }
.text-danger { color: var(--color-danger); }
.spin { animation: spin 1s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.anim-fade-in { animation: fadeIn 0.25s ease both; }

/* ── Completed Payment Summary Card ── */
.completed-summary-card {
  margin: 14px 16px;
  background: var(--color-surface, #fff);
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}
.cs-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
}
.cs-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.cs-header-copy { flex: 1; min-width: 0; }
.cs-header-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.cs-header-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--color-text-muted);
}
.cs-status-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  text-transform: capitalize;
}
.cs-badge-paid { background: rgba(16, 185, 129, 0.12); color: #059669; }
.cs-badge-partial { background: rgba(245, 158, 11, 0.12); color: #b45309; }
.cs-divider {
  height: 1px;
  background: var(--color-border, #f1f1f4);
  margin: 0 18px;
}
.cs-rows {
  padding: 8px 18px;
  display: flex;
  flex-direction: column;
}
.cs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  font-size: 14px;
  border-bottom: 1px solid var(--color-border, #f1f1f4);
}
.cs-row:last-child { border-bottom: none; }
.cs-row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
}
.cs-row-val { font-weight: 700; color: var(--color-text); }
.cs-icon-cash { color: #059669; font-size: 15px; }
.cs-icon-upi  { color: var(--color-brand, #4f46e5); font-size: 15px; }
.cs-icon-tip  { color: #dc2626; font-size: 15px; }
.cs-val-success { color: #059669; }
.cs-val-tip { color: #d97706; }
.cs-tip-note { font-size: 11px; font-weight: 400; opacity: 0.7; }
.cs-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 18px 14px;
  padding: 12px 14px;
  background: rgba(79, 70, 229, 0.07);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-brand, #4f46e5);
}
.cs-total-row strong { font-size: 20px; font-weight: 800; }
</style>
