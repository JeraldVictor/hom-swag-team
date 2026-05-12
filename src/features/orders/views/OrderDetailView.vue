<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" />
        </ion-buttons>
        <ion-title>Order #{{ order?.order_number || '...' }}</ion-title>
        <ion-buttons slot="end">
          <AppButton v-if="order && !isCompleted" variant="clear" icon-only icon="lucide:refresh-cw" @click="handleRefresh" :class="{ 'spin': isLoading }" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
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
        <!-- Hero Section: Customer & Quick Info -->
        <div class="order-hero">
          <div class="customer-profile">
            <div class="customer-avatar">
              {{ customerInitials }}
            </div>
            <div class="customer-info">
              <h2 class="customer-name">{{ order.customer?.full_name || 'Customer' }}</h2>
              <p class="order-id">Order #{{ order.order_number }}</p>
            </div>
            <AppBadge :variant="(statusVariant as any)" class="status-badge">
              {{ order.status }}
            </AppBadge>
          </div>

          <div class="order-meta-grid">
            <div class="meta-item">
              <Icon icon="lucide:calendar" class="meta-icon" />
              <div>
                <p class="meta-label">Date</p>
                <p class="meta-value">{{ formattedDate }}</p>
              </div>
            </div>
            <div class="meta-item">
              <Icon icon="lucide:clock" class="meta-icon" />
              <div>
                <p class="meta-label">Timing</p>
                <p class="meta-value">{{ order.booking_info?.timing || 'Not set' }}</p>
              </div>
            </div>
          </div>

          <div class="hero-actions" v-if="!isCompleted">
            <div class="main-hero-btns">
              <AppButton expand="block" size="lg" icon="lucide:navigation" class="nav-btn-custom" @click="navigateToLocation">
                Navigate
              </AppButton>
              <AppButton v-if="order && !isCompleted" expand="block" size="lg" variant="outline" icon="lucide:car-taxi-front" @click="showRideModal = true">
                Book Ride
              </AppButton>
            </div>
            <div class="dual-btns">
              <AppButton variant="outline" icon="lucide:copy" @click="copyAddress">
                Copy Address
              </AppButton>
              <AppButton variant="outline" icon="lucide:phone" :href="'tel:' + order.customer?.phone">
                Call
              </AppButton>
            </div>
          </div>
        </div>

        <div class="order-content anim-fade-in">
          <!-- Address Section -->
          <div class="content-card">
            <div class="card-header">
              <Icon icon="lucide:map-pin" class="header-icon" />
              <h3>Service Address</h3>
            </div>
            <p class="address-text">{{ fullAddress }}</p>
            <p v-if="order.notes" class="order-notes">
              <Icon icon="lucide:info" />
              <span>Notes: {{ order.notes }}</span>
            </p>
          </div>

          <!-- Items Section -->
          <div class="content-card">
            <div class="card-header">
              <Icon icon="lucide:shopping-bag" class="header-icon" />
              <h3>Services & Items</h3>
              <AppButton 
                v-if="canUpgrade" 
                variant="outline" 
                size="sm" 
                class="ms-auto"
                @click="router.push(`/orders/${orderId}/edit`)"
              >
                Add / Edit Items
              </AppButton>
            </div>
            <div class="line-items">
              <div v-for="item in order.products" :key="item.product_id" class="line-item">
                <div class="item-main">
                  <div class="item-info">
                    <p class="item-title">
                      {{ item.title }}
                      <AppBadge v-if="item.total === 0" variant="success" size="sm" class="ms-2">Free</AppBadge>
                      <AppBadge v-if="item.type === 'package'" variant="info" size="sm" class="ms-2">Package</AppBadge>
                    </p>
                    <p class="item-qty">
                      Qty: {{ item.quantity }}
                      <span v-if="item.price > 0"> × ₹{{ item.price }}</span>
                      <span v-if="item.duration" class="ms-2">
                        <Icon icon="lucide:clock" class="inline-icon" /> {{ item.duration }} min
                      </span>
                    </p>
                  </div>
                  <p class="item-total" v-if="item.total > 0">₹{{ item.total }}</p>
                  <p class="item-total free-text" v-else>FREE</p>
                </div>
                
                <!-- Package Duration Top Level -->
                <div v-if="item.type === 'package' && item.duration" class="package-duration">
                  <Icon icon="lucide:timer" />
                  <span>Total Duration: {{ item.duration }} mins</span>
                </div>

                <!-- Selected Options -->
                <div v-if="item.selected_options?.length" class="item-sub-list">
                  <div v-for="opt in item.selected_options" :key="opt.product_option_id" class="sub-item">
                    <Icon icon="lucide:plus" class="sub-item-icon" />
                    <span>{{ opt.title }}</span>
                    <span v-if="opt.price" class="ms-auto">+₹{{ opt.price }}</span>
                  </div>
                </div>

                <!-- Free Items -->
                <div v-if="item.selected_free_items?.length" class="item-sub-list free-items">
                  <div v-for="free in item.selected_free_items" :key="free.product_id" class="sub-item">
                    <Icon icon="lucide:gift" class="sub-item-icon" />
                    <span>{{ free.title }}</span>
                    <AppBadge variant="success" size="sm" class="ms-auto">Included</AppBadge>
                  </div>
                </div>

                <div v-if="canUpgrade && item.type !== 'package'" class="item-actions">
                  <AppButton variant="outline" size="sm" icon="lucide:arrow-up" @click="openUpgradeModal(item as any)">
                    Upgrade
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="order-summary-footer">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>₹{{ order.subtotal }}</span>
              </div>
              <div v-if="order.discount_total" class="summary-row discount">
                <span>Discount</span>
                <span>-₹{{ order.discount_total }}</span>
              </div>
              <div v-if="order.delivery_fee" class="summary-row">
                <span>Conveyance</span>
                <span>₹{{ order.delivery_fee }}</span>
              </div>
              <div class="summary-row total">
                <span>Total Amount</span>
                <span>₹{{ order.total }}</span>
              </div>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="content-card payment-card">
            <div class="card-header">
              <Icon icon="lucide:credit-card" class="header-icon" />
              <h3>Payment</h3>
              <AppBadge :variant="(paymentStatusVariant as any)" class="ms-auto">
                {{ order.payment_status?.toUpperCase() || 'Pending' }}
              </AppBadge>
            </div>
            <div class="payment-method">
              <p>Method: <strong>{{ order.payment_method?.toUpperCase() || 'COD / UPI' }}</strong></p>
            </div>
            <div class="payment-hint">
              <p>
                Collect cash on delivery or ask the customer to scan the office UPI QR code below.
              </p>
            </div>
            <div v-if="order.office_payment_qr_code?.url" class="qr-code-block">
              <p class="qr-title">Office UPI QR Code</p>
              <img :src="mediaUrl(order.office_payment_qr_code?.url)" alt="Office payment QR code" />
            </div>
          </div>

          <div class="content-card proof-card">
            <div class="card-header">
              <Icon icon="lucide:camera" class="header-icon" />
              <h3>Verification Photos</h3>
            </div>
            <div class="proof-group">
              <div class="proof-entry">
                <div class="proof-label-row">
                  <p class="proof-label">Arrival Selfie</p>
                  <AppButton 
                    v-if="order.status.toLowerCase() === 'ongoing' && !order.arrival_selfie"
                    variant="clear" 
                    size="sm" 
                    icon="lucide:camera"
                    @click="handleUploadSelfie"
                    class="action-btn-sm"
                  >
                    Take Selfie
                  </AppButton>
                </div>
                <div class="proof-preview" v-if="order.arrival_selfie?.url">
                  <img :src="mediaUrl(order.arrival_selfie?.url)" alt="Arrival selfie" />
                </div>
                <p v-else class="proof-empty">No arrival selfie uploaded yet.</p>
              </div>
              <div class="proof-entry">
                <div class="proof-label-row">
                  <p class="proof-label">Payment Proof</p>
                  <div class="proof-actions" v-if="order.status.toLowerCase() === 'started'">
                    <AppButton 
                      variant="clear" 
                      size="sm" 
                      icon="lucide:camera"
                      @click="handleCapturePaymentProof"
                      class="action-btn-sm"
                    >
                      Camera
                    </AppButton>
                    <AppButton 
                      variant="clear" 
                      size="sm" 
                      icon="lucide:upload"
                      @click="proofInput?.click()"
                      class="action-btn-sm"
                    >
                      Upload
                    </AppButton>
                  </div>
                </div>
                <div v-if="proofImages.length" class="proof-list">
                  <div v-for="(image, index) in proofImages" :key="index" class="proof-thumbnail">
                    <img :src="mediaUrl(image.url)" :alt="`Payment proof ${index + 1}`" />
                  </div>
                </div>
                <p v-else class="proof-empty">No payment proof uploaded yet.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="action-footer" v-if="!isCompleted">
          <div v-if="error" class="error-banner">{{ error }}</div>
          <!-- Main Actions -->
          <div class="main-actions">
            <AppButton 
              v-if="nextActionLabel"
              expand="block"
              size="lg"
              :loading="isUpdating"
              :disabled="!isBookingDateToday"
              :icon="isSelfieStep ? 'lucide:camera' : undefined"
              @click="handleMainAction"
              class="primary-action-btn-custom"
            >
              {{ nextActionLabel }}
            </AppButton>
            
            <div class="date-restriction-tip" v-if="!isBookingDateToday && !isCompleted && order" style="text-align: center; color: var(--color-text-muted); font-size: 13px; margin: 8px 0; padding: 8px; background: var(--color-surface); border-radius: 8px;">
              Note: You can only start or update this order on the scheduled date ({{ order.booking_info?.date }}).
            </div>
 
            <AppButton 
              v-if="canCancel && isBookingDateToday"
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

    <!-- Upgrade Modal -->
    <ion-modal :is-open="showUpgradeModal" @didDismiss="showUpgradeModal = false" class="upgrade-modal">
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>Upgrade Service</ion-title>
          <ion-buttons slot="end">
            <AppButton variant="clear" @click="showUpgradeModal = false">Close</AppButton>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div v-if="isFetchingUpgrades" class="modal-loading">
          <ion-spinner name="crescent" />
          <p>Finding better options...</p>
        </div>
        <div v-else-if="upgradableProducts.length === 0" class="modal-empty">
          <Icon icon="lucide:info" />
          <p>No upgrades available for this item.</p>
        </div>
        <div v-else class="upgrade-list">
          <div v-for="p in upgradableProducts" :key="p._id || p.id" class="upgrade-option" @click="handleUpgrade(p)">
            <div class="upgrade-option__info">
              <h4>{{ p.title || p.name }}</h4>
              <p>{{ p.short_description || p.description }}</p>
              <span class="price-diff">Upgrade for +₹{{ (p.base_price || p.price) - (selectedItem?.price || 0) }}</span>
            </div>
            <Icon icon="lucide:chevron-right" />
          </div>
        </div>
      </ion-content>
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
            <ion-label class="form-label">Reason for Cancellation</ion-label>
            <ion-textarea
              v-model="cancelReason"
              placeholder="Provide a detailed reason for cancellation..."
              fill="outline"
              shape="round"
              :rows="4"
              class="cancel-textarea"
              mode="md"
            ></ion-textarea>
          </div>

          <div class="cancel-form-section">
            <ion-label class="form-label">Verification OTP</ion-label>
            <p class="form-hint">Ask the customer for the 6-digit cancellation OTP code.</p>
            <div class="otp-wrapper">
              <OtpInput v-model="otpValue" />
            </div>
          </div>

          <div class="cancel-actions">
            <AppButton
              variant="danger"
              expand="block"
              :disabled="!cancelReason.trim() || otpValue.length < 6"
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
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, toastController } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/shared/composables'
import { useNavigation } from '@/shared/composables/useNavigation'
import { formatISTDate, getTodayIST } from '@/shared/lib/datetime'
import { mediaUrl } from '@/shared/lib/media'
import type { OrderProduct } from '@/shared/models'
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
} = useOrderDetail()

// ── UI State ───────────────────────────────────────────────────────────────

const { showSuccess, showError } = useToast()
const showRideModal = ref(false)
const showOtpInput = ref(false)
const otpValue = ref('')
const showCancelModal = ref(false)
const cancelReason = ref('')
const showUpgradeModal = ref(false)
const isFetchingUpgrades = ref(false)
const selectedItem = ref<OrderProduct | null>(null)
const upgradableProducts = ref<any[]>([])
const proofInput = ref<HTMLInputElement | null>(null)
const { openNavigationMenu } = useNavigation()

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

const fullAddress = computed(() => {
  if (!order.value) return '...'
  const addr = order.value.delivery_address || order.value.address
  if (!addr) return 'No address provided'
  return [addr.street || addr.line1, addr.landmark, addr.city, addr.pincode]
    .filter(Boolean)
    .join(', ')
})

const statusVariant = computed(() => {
  const s = order.value?.status?.toLowerCase()
  if (s === 'completed') return 'success'
  if (s === 'ongoing' || s === 'started') return 'brand'
  if (s === 'confirmed') return 'info'
  if (s === 'arrived_and_cancelled') return 'danger'
  return 'neutral'
})

const paymentStatusVariant = computed(() => {
  const s = order.value?.payment_status?.toLowerCase()
  return s === 'paid' ? 'success' : 'warning'
})

const canCancel = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return s === 'confirmed' || s === 'ongoing' || s === 'started'
})

const isSelfieStep = computed(() => {
  return order.value?.status?.toLowerCase() === 'ongoing' && !order.value?.arrival_selfie
})

const proofImages = computed(() => {
  if (!order.value?.proof_of_service) return []
  return Array.isArray(order.value.proof_of_service)
    ? order.value.proof_of_service.filter((p: { url?: string }) => !!p?.url)
    : order.value.proof_of_service
      ? [order.value.proof_of_service]
      : []
})

const isBookingDateToday = computed(() => {
  if (!order.value?.booking_info?.date) return false
  return order.value.booking_info.date === getTodayIST()
})

// ── Methods ────────────────────────────────────────────────────────────────

async function handleRefresh() {
  await fetchOrder(orderId)
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

async function handleMainAction() {
  const s = order.value?.status?.toLowerCase()

  if (s === 'confirmed') {
    // Confirmed -> Ongoing (Start to Customer)
    const confirmed = await presentConfirm(
      'Start to Customer',
      'Are you sure you want to start moving to the customer location?'
    )
    if (!confirmed) return
    await advanceStatus()
  } else if (s === 'ongoing') {
    // Ongoing -> Started (Reached Customer + Selfie + OTP)
    if (!order.value?.arrival_selfie) {
      const confirmed = await presentConfirm(
        'Take Selfie',
        'Are you ready to take the arrival selfie?'
      )
      if (!confirmed) return

      await handleUploadSelfie()
    } else {
      showOtpInput.value = true
    }
  } else if (s === 'started') {
    if (!proofImages.value.length) {
      const confirmed = await presentConfirm(
        'Upload Payment Proof',
        'Upload payment screenshot(s) or take a photo before completing the service.'
      )
      if (!confirmed) return
      // We'll let them use the new buttons in the proof card or trigger upload
      proofInput.value?.click()
      return
    }

    const confirmed = await presentConfirm(
      'Complete Service',
      'Have you finished all services? This will mark the order as completed.'
    )
    if (!confirmed) return
    await advanceStatus()
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
  const uploaded = await uploadSelfie()
  if (uploaded) {
    showSuccess('Selfie uploaded successfully')
    if (order.value?.status.toLowerCase() === 'ongoing') {
      showOtpInput.value = true
    }
  }
}

async function handleCapturePaymentProof() {
  const uploaded = await captureAndUploadPaymentProof()
  if (uploaded) {
    showSuccess('Payment proof captured successfully')
  }
}

async function handleVerifyOtp() {
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

function openCancelModal() {
  showCancelModal.value = true
  otpValue.value = ''
}

async function handleCompletionProofChange(event: Event) {
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
  if (!cancelReason.value.trim()) {
    const toast = await toastController.create({
      message: 'Please provide a reason for cancellation.',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  if (otpValue.value.length !== 6) {
    const toast = await toastController.create({
      message: 'Please enter the 6-digit cancellation OTP.',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  // API Trigger
  await cancelAfterArrival(cancelReason.value, otpValue.value)

  if (!error.value) {
    showCancelModal.value = false
    cancelReason.value = ''
    otpValue.value = ''
    const toast = await toastController.create({
      message: 'Order cancelled successfully',
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

onMounted(() => fetchOrder(orderId))
</script>

<style scoped>
/* ── Layout & Sections ───────────────────────────────────────────────────── */

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}

.error-icon { font-size: 48px; color: var(--color-danger); margin-bottom: 16px; }

.order-hero {
  padding: 24px 20px 32px;
  background: linear-gradient(to bottom, var(--color-surface) 0%, var(--color-background) 100%);
  border-bottom: 1px solid var(--color-border);
}

.customer-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.customer-avatar {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--color-brand-pale);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  box-shadow: 0 8px 16px rgba(var(--color-brand-rgb), 0.1);
}

.customer-info { flex: 1; }
.customer-name { margin: 0; font-size: 22px; font-weight: 800; color: var(--color-text); }
.order-id { margin: 2px 0 0; font-size: 14px; color: var(--color-text-muted); font-weight: 600; }

.status-badge { font-size: 11px; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

.order-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.meta-icon { font-size: 20px; color: var(--color-brand); }
.meta-label { margin: 0; font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; }
.meta-value { margin: 0; font-size: 14px; font-weight: 700; color: var(--color-text); }

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-btn-custom {
  --background: linear-gradient(135deg, var(--color-brand) 0%, #6366f1 100%);
  --background-activated: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  --box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
}

.main-hero-btns {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

.dual-btns { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 12px; 
}

.primary-action-btn-custom {
  --background: linear-gradient(135deg, var(--color-brand) 0%, #4f46e5 100%);
  --box-shadow: 0 10px 24px rgba(79, 70, 229, 0.3);
}

.cancel-btn-custom {
  margin-top: 12px;
}

.item-actions { margin-top: 8px; display: flex; justify-content: flex-end; }

.order-content { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

.content-card {
  padding: 20px;
  background: var(--color-surface);
  border-radius: 24px;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.card-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--color-text); }
.header-icon { font-size: 18px; color: var(--color-brand); }

.proof-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.proof-actions {
  display: flex;
  gap: 8px;
}

.action-btn-sm {
  --padding-start: 12px;
  --padding-end: 12px;
  --height: 32px;
  font-size: 13px;
  font-weight: 700;
  margin: 0;
}

.address-text { margin: 0; font-size: 15px; line-height: 1.6; color: var(--color-text-secondary); font-weight: 500; }

.line-items { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
.line-item { 
  padding-bottom: 16px; 
  border-bottom: 1px dashed var(--color-border);
}
.line-item:last-child { border-bottom: none; padding-bottom: 0; }

.item-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.item-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--color-text); }
.item-qty { margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted); font-weight: 500; }
.item-total { margin: 0; font-size: 15px; font-weight: 800; color: var(--color-text); }

.order-summary-footer {
  padding-top: 16px;
  border-top: 2px solid var(--color-background);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: var(--color-text-secondary); }
.summary-row.total { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--color-border); font-size: 18px; font-weight: 800; color: var(--color-text); }

.action-footer {
  position: sticky;
  bottom: 0;
  padding: 20px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -8px 24px rgba(0,0,0,0.05);
  z-index: 100;
}

/* ── Cancel Modal Styling ─────────────────────────────────────────────────── */

.cancel-modal { --border-radius: 28px 28px 0 0; }

.cancel-container { padding: 8px 4px 24px; display: flex; flex-direction: column; gap: 28px; }

.cancel-warning { text-align: center; }
.warning-icon-wrapper { 
  width: 56px; height: 56px; border-radius: 18px; background: var(--color-danger-pale); 
  color: var(--color-danger); display: flex; align-items: center; justify-content: center; 
  margin: 0 auto 16px; font-size: 28px; 
}
.cancel-warning h3 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text); }
.cancel-warning p { margin: 8px 0 0; font-size: 14px; color: var(--color-text-muted); line-height: 1.5; }

.cancel-form-section { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 14px; font-weight: 700; color: var(--color-text); }
.form-hint { margin: 0; font-size: 13px; color: var(--color-text-muted); }

.cancel-textarea { 
  --padding-start: 16px; --padding-end: 16px; --padding-top: 16px; --padding-bottom: 16px;
  --border-radius: 16px; --border-color: var(--color-border); font-size: 15px;
}

.otp-wrapper { margin-top: 8px; }

.cancel-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

/* ── Modals & Helpers ────────────────────────────────────────────────────── */
.otp-modal { --border-radius: 32px 32px 0 0; }
.otp-drawer-content { padding: 32px 24px; display: flex; flex-direction: column; gap: 32px; }
.otp-icon-wrapper { 
  width: 64px; height: 64px; border-radius: 20px; background: var(--color-brand-pale); 
  color: var(--color-brand); display: flex; align-items: center; justify-content: center; 
  margin: 0 auto; font-size: 32px; 
}
.otp-header { text-align: center; }
.otp-header h3 { margin: 16px 0 8px; font-size: 22px; font-weight: 800; color: var(--color-text); }
.otp-header p { margin: 0; font-size: 14px; color: var(--color-text-muted); line-height: 1.5; }
.otp-input-section { display: flex; justify-content: center; }
.otp-footer { display: flex; flex-direction: column; gap: 12px; }

.upgrade-modal { --height: 70%; --border-radius: 24px 24px 0 0; }

.modal-loading, .modal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.upgrade-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.upgrade-option {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid var(--color-border);
}
.upgrade-option:active { background: var(--color-background); }
.upgrade-option__info { flex: 1; }
.upgrade-option__info h4 { margin: 0; font-size: 16px; font-weight: 700; }
.upgrade-option__info p { margin: 4px 0 8px; font-size: 13px; color: var(--color-text-muted); }
.price-diff { font-size: 12px; font-weight: 700; color: var(--color-success); background: var(--color-success-pale); padding: 4px 8px; border-radius: 6px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.ms-auto { margin-left: auto; }

/* ── Animations ──────────────────────────────────────────────────────────── */
</style>
