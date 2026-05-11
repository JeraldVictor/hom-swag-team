<script setup lang="ts">
import { alertController, loadingController, toastController } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  generateServiceOtp,
  getOrder,
  updateOrder,
  verifyServiceOtp,
} from '@/shared/api/orders.service'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import type { Order } from '@/shared/models'

interface CartItem {
  product_id: string
  quantity: number
  title: string
  price: number
  image?: string
  selected_options?: {
    product_option_id: string
    title: string
    price: number
  }[]
  selected_package_items?: string[]
}

const route = useRoute()
const router = useRouter()
const orderId = String(route.params.id)

const order = ref<Order | null>(null)
const isLoading = ref(true)
const isVerifying = ref(false)
const showOtpModal = ref(false)
const otpValue = ref('')

const newCartItems = ref<CartItem[]>([])

const oldSubtotal = computed(() => order.value?.subtotal || 0)
const deliveryFee = computed(() => order.value?.delivery_fee || 0)
const discountTotal = computed(() => order.value?.discount_total || 0)
const surgeAmount = computed(() => order.value?.booking_info?.surge_amount || 0)
const oldTotal = computed(() => order.value?.total || 0)

const newSubtotal = computed(() => {
  return newCartItems.value.reduce((sum, item) => {
    const optionsTotal = (item.selected_options || []).reduce((s, o) => s + o.price, 0)
    return sum + (item.price + optionsTotal) * item.quantity
  }, 0)
})

const newTotal = computed(() => {
  return newSubtotal.value + deliveryFee.value + surgeAmount.value - discountTotal.value
})

const priceDifference = computed(() => newTotal.value - oldTotal.value)

async function fetchOrderData() {
  try {
    isLoading.value = true
    const data = await getOrder(orderId)
    order.value = data

    const allEdits =
      (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
    newCartItems.value = allEdits[orderId] || []

    if (newCartItems.value.length === 0 && data.products) {
      // If no edits found, maybe they came here directly or session cleared
      router.replace(`/orders/${orderId}/edit`)
    }
  } catch (err) {
    console.error('Failed to fetch order', err)
  } finally {
    isLoading.value = false
  }
}

async function updateQuantity(productId: string, delta: number) {
  const item = newCartItems.value.find(i => i.product_id === productId)
  if (!item) return

  if (delta === 0) {
    const alert = await alertController.create({
      header: 'Remove Item',
      message: `Are you sure you want to remove ${item.title}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            newCartItems.value = newCartItems.value.filter(i => i.product_id !== productId)
            persistEdits()
          },
        },
      ],
    })
    await alert.present()
    return
  }

  const newQty = item.quantity + delta
  if (newQty > 0) {
    item.quantity = newQty
    persistEdits()
  } else {
    updateQuantity(productId, 0)
  }
}

async function persistEdits() {
  const allEdits =
    (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
  allEdits[orderId] = newCartItems.value
  await Storage_Service.setJSON(STORAGE_KEYS.pendingOrderEdits, allEdits)

  if (newCartItems.value.length === 0) {
    router.replace(`/orders/${orderId}/edit`)
  }
}

async function handleGenerateOtp() {
  const loader = await loadingController.create({ message: 'Generating OTP...' })
  await loader.present()

  try {
    await generateServiceOtp(orderId)
    showOtpModal.value = true
  } catch (_err) {
    const toast = await toastController.create({
      message: 'Failed to generate OTP. Please try again.',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
  } finally {
    await loader.dismiss()
  }
}

async function handleVerifyAndSubmit() {
  if (otpValue.value.length !== 6) return

  isVerifying.value = true
  try {
    // 1. Verify OTP
    await verifyServiceOtp(orderId, { otp: otpValue.value })

    // 2. Submit order changes
    const productsToUpdate = newCartItems.value.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      title: item.title,
      price: item.price,
      total:
        (item.price + (item.selected_options || []).reduce((s, o) => s + o.price, 0)) *
        item.quantity,
      selected_options: item.selected_options,
      selected_package_items: item.selected_package_items,
    }))

    await updateOrder(orderId, { products: productsToUpdate })

    // 3. Cleanup
    const allEdits =
      (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
    delete allEdits[orderId]
    await Storage_Service.setJSON(STORAGE_KEYS.pendingOrderEdits, allEdits)

    showOtpModal.value = false

    const toast = await toastController.create({
      message: 'Order updated and confirmed successfully!',
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
    router.replace(`/orders/${orderId}`)
  } catch (err) {
    console.error('Verification/Update failed', err)
    const toast = await toastController.create({
      message: 'Invalid OTP or update failed. Please try again.',
      duration: 2000,
      color: 'danger',
    })
    await toast.present()
  } finally {
    isVerifying.value = false
  }
}

onMounted(fetchOrderData)
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/orders/${orderId}/edit`"></ion-back-button>
        </ion-buttons>
        <ion-title>Review Order Changes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isLoading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent"></ion-spinner>
        <p>Loading summary...</p>
      </div>

      <div v-else-if="order" class="preview-container anim-fade-in">
        <!-- Summary Card -->
        <div class="summary-card">
          <div class="summary-header">
            <Icon icon="lucide:calculator" class="header-icon" />
            <h3>Order Summary</h3>
          </div>
          
          <div class="comparison-grid">
            <div class="comparison-row header">
              <div class="label">Charge</div>
              <div class="old">Old</div>
              <div class="new">New</div>
            </div>
            
            <div class="comparison-row">
              <div class="label">Subtotal</div>
              <div class="old">₹{{ oldSubtotal }}</div>
              <div class="new">₹{{ newSubtotal }}</div>
            </div>
            
            <div class="comparison-row" v-if="deliveryFee > 0">
              <div class="label">Delivery Fee</div>
              <div class="old">₹{{ deliveryFee }}</div>
              <div class="new">₹{{ deliveryFee }}</div>
            </div>

            <div class="comparison-row" v-if="surgeAmount > 0">
              <div class="label">Surge Amount</div>
              <div class="old">₹{{ surgeAmount }}</div>
              <div class="new">₹{{ surgeAmount }}</div>
            </div>
            
            <div class="comparison-row discount" v-if="discountTotal > 0">
              <div class="label">Discounts</div>
              <div class="old">-₹{{ discountTotal }}</div>
              <div class="new">-₹{{ discountTotal }}</div>
            </div>
            
            <div class="comparison-row total">
              <div class="label">Grand Total</div>
              <div class="old">₹{{ oldTotal }}</div>
              <div class="new highlight">₹{{ newTotal }}</div>
            </div>
          </div>
          
          <div class="diff-banner" :class="priceDifference >= 0 ? 'increase' : 'decrease'">
            <Icon :icon="priceDifference >= 0 ? 'lucide:trending-up' : 'lucide:trending-down'" />
            <span>
              Total {{ priceDifference >= 0 ? 'increased' : 'decreased' }} by 
              <strong>₹{{ Math.abs(priceDifference) }}</strong>
            </span>
          </div>
        </div>

        <!-- Items Comparison -->
        <div class="section-title">
          <Icon icon="lucide:shopping-bag" />
          <span>Product Comparison</span>
        </div>

        <div class="items-comparison">
          <div class="items-column">
            <h4 class="column-header old">Original Items</h4>
            <div v-for="item in order.products" :key="item.product_id" class="item-mini-card old">
              <div class="item-name">{{ item.title }}</div>
              <div class="item-meta">Qty: {{ item.quantity }} × ₹{{ item.price }}</div>
              <!-- Options -->
              <div v-if="item.selected_options?.length" class="sub-items-list">
                <div v-for="opt in item.selected_options" :key="opt.product_option_id" class="sub-item">
                  <Icon icon="lucide:plus" /> {{ opt.title }} (₹{{ opt.price }})
                </div>
              </div>
            </div>
          </div>

          <div class="items-column">
            <h4 class="column-header new">New Items</h4>
            <div v-for="item in newCartItems" :key="item.product_id" class="item-mini-card new">
              <div class="item-name">{{ item.title }}</div>
              <div class="item-meta">₹{{ item.price }}</div>
              
              <!-- Quantity Controls -->
              <div class="qty-control-wrapper">
                <div class="qty-control">
                  <button @click="updateQuantity(item.product_id, -1)" class="qty-btn">
                    <Icon icon="lucide:minus" />
                  </button>
                  <span class="qty-val">{{ item.quantity }}</span>
                  <button @click="updateQuantity(item.product_id, 1)" class="qty-btn">
                    <Icon icon="lucide:plus" />
                  </button>
                </div>
                <button @click="updateQuantity(item.product_id, 0)" class="remove-btn">
                   <Icon icon="lucide:trash-2" />
                </button>
              </div>

              <!-- Options -->
              <div v-if="item.selected_options?.length" class="sub-items-list">
                <div v-for="opt in item.selected_options" :key="opt.product_option_id" class="sub-item">
                  <Icon icon="lucide:plus" /> {{ opt.title }} (₹{{ opt.price }})
                </div>
              </div>
              <!-- Package Items count -->
              <div v-if="item.selected_package_items?.length" class="sub-items-list">
                <div class="sub-item">
                   <Icon icon="lucide:package" /> {{ item.selected_package_items.length }} items selected
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border ion-padding">

      <div class="footer-actions">
        <AppButton 
          variant="outline" 
          expand="block"
          @click="router.back()"
          class="flex-1"
        >
          Modify
        </AppButton>
        <AppButton 
          variant="primary" 
          expand="block"
          @click="handleGenerateOtp"
          class="flex-2"
        >
          Confirm & Verify OTP
        </AppButton>
      </div>
    </ion-footer>

    <!-- OTP Verification Modal -->
    <ion-modal :is-open="showOtpModal" @didDismiss="showOtpModal = false" class="otp-modal">
      <div class="modal-content ion-padding">
        <div class="modal-header">
          <div class="icon-circle">
            <Icon icon="lucide:shield-check" />
          </div>
          <h2>Customer Verification</h2>
          <p>Please enter the 6-digit OTP provided by the customer to confirm these changes.</p>
        </div>

        <div class="otp-input-wrapper">
          <OtpInput 
            :length="6" 
            v-model="otpValue"
            :disabled="isVerifying"
          />
        </div>

        <div class="modal-footer">
          <AppButton 
            expand="block" 
            :loading="isVerifying"
            :disabled="otpValue.length !== 6 || isVerifying"
            @click="handleVerifyAndSubmit"
          >
            Verify & Update Order
          </AppButton>
          <AppButton 
            variant="clear" 
            expand="block" 
            @click="showOtpModal = false"
            :disabled="isVerifying"
          >
            Cancel
          </AppButton>
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<style scoped>
.preview-container {
  padding: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 12px;
  font-weight: 600;
  color: var(--ion-color-step-600);
}

.summary-card {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid var(--color-border);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.summary-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.header-icon {
  font-size: 1.4rem;
  color: var(--color-brand);
}

.comparison-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-border);
}

.comparison-row.header {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  border-bottom-style: solid;
}

.comparison-row.total {
  margin-top: 8px;
  padding-top: 12px;
  border-bottom: none;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
}

.comparison-row .label {
  color: var(--color-text-secondary);
}

.comparison-row .old {
  text-align: right;
  color: var(--color-text-muted);
  text-decoration: line-through;
  font-size: var(--font-size-sm);
}

.comparison-row .new {
  text-align: right;
  font-weight: var(--font-weight-semibold);
}

.comparison-row .new.highlight {
  color: var(--color-brand);
  font-size: var(--font-size-xl);
}

.comparison-row.discount .new {
  color: var(--ion-color-success);
}

.diff-banner {
  margin-top: 20px;
  padding: 12px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-sm);
}

.diff-banner.increase {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.diff-banner.decrease {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.items-comparison {
  display: flex;
  gap: 12px;
}

.items-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.column-header {
  margin: 0 0 8px;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.column-header.old { color: var(--color-text-muted); }
.column-header.new { color: var(--color-brand); }

.item-mini-card {
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  min-height: 80px;
}

.item-mini-card.old {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  opacity: 0.8;
}

.item-mini-card.new {
  background: var(--color-surface);
  border: 1px solid var(--color-brand-light);
}

.item-name {
  font-weight: var(--font-weight-semibold);
  margin-bottom: 4px;
  line-height: 1.2;
}

.item-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: 8px;
}

.qty-control-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 2px;
}

.qty-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
}

.qty-val {
  font-weight: 700;
  font-size: 13px;
  min-width: 14px;
  text-align: center;
}

.remove-btn {
  color: var(--color-danger);
  background: var(--color-danger-bg, #fee2e2);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
}

.sub-items-list {
  margin-top: 4px;
  border-top: 1px solid var(--color-border);
  padding-top: 4px;
}

.sub-item {
  font-size: 10px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

/* OTP Modal Styles */
.otp-modal {
  --height: auto;
}

.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 24px;
}

.icon-circle {
  width: 64px;
  height: 64px;
  background: var(--color-brand-pale);
  color: var(--color-brand);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 20px;
}

.modal-header h2 {
  margin: 0 0 8px;
  font-weight: var(--font-weight-bold);
}

.modal-header p {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  margin: 0 0 24px;
}

.otp-input-wrapper {
  margin-bottom: 32px;
  width: 100%;
}

.modal-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.anim-fade-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
