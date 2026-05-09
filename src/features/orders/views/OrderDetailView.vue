<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" />
        </ion-buttons>
        <ion-title>Order #{{ order?.order_number || '...' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="order && !isCompleted" @click="handleRefresh">
            <Icon icon="lucide:refresh-cw" :class="{ 'spin': isLoading }" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="isLoading && !order" class="loading-state">
        <ion-spinner name="crescent" />
        <p>Loading order details...</p>
      </div>

      <div v-else-if="error && !order" class="error-state">
        <Icon icon="lucide:alert-circle" class="error-icon" />
        <h3>Something went wrong</h3>
        <p>{{ error }}</p>
        <ion-button fill="outline" @click="handleRefresh">Retry</ion-button>
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
            <ion-button expand="block" mode="ios" class="nav-btn" @click="navigateToCustomer">
              <Icon icon="lucide:navigation" slot="start" />
              Navigate to Location
            </ion-button>
            <div class="dual-btns">
              <ion-button fill="outline" mode="ios" class="call-btn" :href="'tel:' + order.customer?.phone">
                <Icon icon="lucide:phone" slot="start" />
                Call
              </ion-button>
              <ion-button fill="outline" mode="ios" class="msg-btn" :href="'https://wa.me/' + order.customer?.phone">
                <Icon icon="lucide:message-square" slot="start" />
                WhatsApp
              </ion-button>
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
            </div>
            <div class="line-items">
              <div v-for="item in order.products" :key="item.product_id" class="line-item">
                <div class="item-main">
                  <div class="item-info">
                    <p class="item-title">{{ item.title }}</p>
                    <p class="item-qty">Qty: {{ item.quantity }} × ₹{{ item.price }}</p>
                  </div>
                  <p class="item-total">₹{{ item.total }}</p>
                </div>
                
                <div v-if="canUpgrade" class="item-actions">
                  <ion-button fill="clear" size="small" @click="openUpgradeModal(item as any)">
                    <Icon icon="lucide:trending-up" slot="start" />
                    Upgrade
                  </ion-button>
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
                {{ order.payment_status || 'Pending' }}
              </AppBadge>
            </div>
            <div class="payment-method">
              <p>Method: <strong>{{ order.payment_method || 'Online' }}</strong></p>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="action-footer" v-if="!isCompleted">
          <div v-if="error" class="error-banner">{{ error }}</div>
          
          <!-- OTP Verification Step -->
          <div v-if="showOtpInput" class="otp-verification anim-slide-up">
            <h3>Verify Service OTP</h3>
            <p>Enter the 6-digit code provided by the customer.</p>
            <div class="otp-input-row">
              <input 
                v-model="otpValue" 
                type="number" 
                pattern="[0-9]*" 
                inputmode="numeric" 
                placeholder="000000"
                maxlength="6"
                class="otp-field"
                @keyup.enter="handleVerifyOtp"
              />
            </div>
            <div class="otp-actions">
              <ion-button fill="clear" color="medium" @click="showOtpInput = false">Cancel</ion-button>
              <ion-button :disabled="isVerifyingOtp || otpValue.length < 6" @click="handleVerifyOtp">
                <ion-spinner v-if="isVerifyingOtp" name="crescent" slot="start" />
                Verify & Start
              </ion-button>
            </div>
          </div>

          <!-- Main Actions -->
          <div v-else class="main-actions">
            <ion-button 
              v-if="nextActionLabel"
              expand="block" 
              class="primary-action-btn"
              :disabled="isUpdating"
              @click="handleMainAction"
            >
              <ion-spinner v-if="isUpdating" name="crescent" slot="start" />
              {{ nextActionLabel }}
            </ion-button>
            
            <ion-button 
              v-if="canCancelAfterArrival"
              expand="block" 
              fill="clear" 
              color="danger" 
              class="cancel-btn"
              @click="showCancelModal = true"
            >
              Cancel Order
            </ion-button>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- Upgrade Modal -->
    <ion-modal :is-open="showUpgradeModal" @didDismiss="showUpgradeModal = false" class="upgrade-modal">
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>Upgrade Service</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showUpgradeModal = false">Close</ion-button>
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
            @click="handleCancel"
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
import { useRoute, useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonSpinner, IonModal, toastController,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useOrderDetail } from '../composables/useOrderDetail'
import { AppBadge } from '@/shared/components/ui'
import type { OrderProduct } from '@/shared/models'
import { formatISTDate } from '@/shared/lib/datetime'

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
  cancelAfterArrival,
  verifyOtp,
  upgradeProduct,
  getUpgradableProducts,
  navigateToCustomer,
} = useOrderDetail()

// ── UI State ───────────────────────────────────────────────────────────────

const showOtpInput = ref(false)
const otpValue = ref('')
const showCancelModal = ref(false)
const cancelReason = ref('')
const showUpgradeModal = ref(false)
const isFetchingUpgrades = ref(false)
const selectedItem = ref<OrderProduct | null>(null)
const upgradableProducts = ref<any[]>([])

// ── Computed ───────────────────────────────────────────────────────────────

const customerInitials = computed(() => {
  const name = order.value?.customer?.full_name || order.value?.customer?.name || '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

const canCancelAfterArrival = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return s === 'confirmed' || s === 'started'
})

// ── Methods ────────────────────────────────────────────────────────────────

async function handleRefresh() {
  await fetchOrder(orderId)
}

async function handleMainAction() {
  const s = order.value?.status?.toLowerCase()
  
  if ((s === 'confirmed' || s === 'started') && !showOtpInput.value) {
    showOtpInput.value = true
  } else {
    await advanceStatus()
  }
}

async function handleVerifyOtp() {
  if (otpValue.value.length !== 6) return
  
  const success = await verifyOtp(otpValue.value)
  if (success) {
    showOtpInput.value = false
    otpValue.value = ''
    const toast = await toastController.create({
      message: 'Service started successfully!',
      duration: 2000,
      color: 'success',
      position: 'top'
    })
    await toast.present()
  }
}

async function handleCancel() {
  await cancelAfterArrival(cancelReason.value || 'Beautician requested cancellation')
  showCancelModal.value = false
  cancelReason.value = ''
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
    new_product_id: String(newProduct._id || newProduct.id)
  })
  
  showUpgradeModal.value = false
  if (!error.value) {
    const toast = await toastController.create({
      message: `${newProduct.title || newProduct.name} added to order!`,
      duration: 2000,
      color: 'success',
      position: 'top'
    })
    await toast.present()
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
  gap: 12px;
}

.nav-btn { --background: var(--color-brand); --border-radius: 14px; font-weight: 700; margin: 0; height: 52px; }
.dual-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.call-btn, .msg-btn { --border-radius: 14px; font-weight: 700; margin: 0; height: 48px; }

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

.address-text { margin: 0; font-size: 15px; line-height: 1.6; color: var(--color-text-secondary); font-weight: 500; }
.order-notes { 
  margin: 16px 0 0; 
  padding: 12px; 
  background: #fffbeb; 
  border-radius: 12px; 
  font-size: 13px; 
  color: #92400e; 
  display: flex; 
  gap: 8px; 
  font-weight: 600;
}

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

.item-actions { margin-top: 8px; display: flex; justify-content: flex-end; }
.item-actions ion-button { --padding-start: 0; --padding-end: 0; height: 32px; font-size: 12px; font-weight: 700; }

.order-summary-footer {
  padding-top: 16px;
  border-top: 2px solid var(--color-background);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; color: var(--color-text-secondary); }
.summary-row.discount { color: var(--color-success); }
.summary-row.total { margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--color-border); font-size: 18px; font-weight: 800; color: var(--color-text); }

.payment-card { display: flex; flex-direction: column; }
.payment-method { font-size: 14px; color: var(--color-text-secondary); }

/* ── Action Footer ───────────────────────────────────────────────────────── */

.action-footer {
  position: sticky;
  bottom: 0;
  padding: 20px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -8px 24px rgba(0,0,0,0.05);
}

.primary-action-btn { --background: var(--color-brand); --border-radius: 16px; height: 56px; font-weight: 800; font-size: 17px; margin: 0; }
.cancel-btn { margin-top: 8px; font-weight: 700; }

.error-banner { 
  margin-bottom: 12px; 
  padding: 10px; 
  background: var(--color-danger-pale); 
  color: var(--color-danger); 
  border-radius: 8px; 
  font-size: 13px; 
  font-weight: 600; 
  text-align: center;
}

.otp-verification { padding: 10px 0; }
.otp-verification h3 { margin: 0; font-size: 18px; font-weight: 800; }
.otp-verification p { margin: 4px 0 20px; font-size: 14px; color: var(--color-text-muted); }

.otp-field {
  width: 100%;
  height: 64px;
  background: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: 16px;
  text-align: center;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 8px;
  outline: none;
  transition: border-color 0.2s;
}
.otp-field:focus { border-color: var(--color-brand); }

.otp-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }

/* ── Modals & Helpers ────────────────────────────────────────────────────── */

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

/* Animations */
.anim-fade-in { animation: fadeIn 0.4s ease-out both; }
.anim-slide-up { animation: slideUp 0.3s ease-out both; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
