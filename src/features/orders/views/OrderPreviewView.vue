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

            <div class="comparison-row" v-if="otherCharges > 0">
              <div class="label">Other Charges</div>
              <div class="old">₹{{ otherCharges }}</div>
              <div class="new">₹{{ otherCharges }}</div>
            </div>
            <div class="comparison-row" v-if="roundingAdjustment !== 0">
              <div class="label">Rounding</div>
              <div class="old">₹{{ roundingAdjustment }}</div>
              <div class="new">₹{{ roundingAdjustment }}</div>
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
          <div class="preview-warning" v-if="minimumOrderWarning || newCartItems.length === 0">
            {{ minimumOrderWarning || 'No service items selected. Add service items before confirming the edit.' }}
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
            <div v-for="item in order.products" :key="item.product_id" class="modern-item-card old">
              <div class="mic-header">
                <div class="mic-title-row">
                  <span class="mic-title">{{ item.title }}</span>
                  <div class="mic-badges">
                    <AppBadge v-if="item.total === 0" variant="success" size="sm">Free</AppBadge>
                    <AppBadge v-if="item.type === 'package'" variant="info" size="sm">Package</AppBadge>
                    <AppBadge v-if="item.beautician_added" variant="secondary" size="sm">
                      <Icon icon="lucide:user-check" class="mic-badge-icon" />
                      Beautician added
                    </AppBadge>
                  </div>
                </div>
                <div class="mic-meta">
                  <span class="mic-price-info">{{ item.quantity }} × ₹{{ item.price }}</span>
                  <span class="mic-total">₹{{ item.total }}</span>
                </div>
                <div v-if="item.duration || item.type" class="mic-attributes">
                  <span v-if="item.duration" class="mic-attr">
                    <Icon icon="lucide:clock" class="mic-icon" /> {{ item.duration }} mins
                  </span>
                  <span v-if="item.type" class="mic-attr">
                    <Icon icon="lucide:layers" class="mic-icon" /> {{ item.type === 'package' ? 'Package item' : 'Service item' }}
                  </span>
                </div>
              </div>

              <div v-if="(item.selected_package_items || item.selected_package_services)?.length" class="mic-sub-section">
                <div class="mic-sub-header">Included Services</div>
                <div class="mic-sub-list">
                  <div
                    v-for="service in item.selected_package_items || item.selected_package_services"
                    :key="service.product_id"
                    class="mic-sub-item"
                  >
                    <Icon icon="lucide:check-circle" class="mic-sub-icon text-success" />
                    <span>{{ service.title }}</span>
                    <span v-if="service.beautician_added" class="mic-added-tag">
                      <Icon icon="lucide:user-check" class="mic-badge-icon" />
                      Beautician added
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="item.selected_options?.length" class="mic-sub-section">
                <div class="mic-sub-header">Add-ons / Options</div>
                <div class="mic-sub-list">
                  <div v-for="opt in item.selected_options" :key="opt.product_option_id" class="mic-sub-item mic-item-row">
                    <div class="mic-item-info">
                      <span class="mic-item-title">{{ opt.title }}</span>
                      <span v-if="opt.beautician_added" class="mic-added-tag mic-added-tag-inline">
                        <Icon icon="lucide:user-check" class="mic-badge-icon" />
                        Beautician added
                      </span>
                    </div>
                    <span class="mic-item-price">₹{{ opt.price ?? 0 }}</span>
                  </div>
                </div>
              </div>

              <div v-if="normalizeFreeItems(item.selected_free_items).length" class="mic-sub-section">
                <div class="mic-sub-header">Free Perks</div>
                <div class="mic-sub-list">
                  <div
                    v-for="free in normalizeFreeItems(item.selected_free_items)"
                    :key="free.product_id || free.free_product_id || free.title"
                    class="mic-sub-item"
                  >
                    <Icon icon="lucide:gift" class="mic-sub-icon text-primary" />
                    <span>{{ free.title }}</span>
                    <span v-if="free.beautician_added" class="mic-added-tag">
                      <Icon icon="lucide:user-check" class="mic-badge-icon" />
                      Beautician added
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="items-column">
            <h4 class="column-header new">New Items</h4>
            <div v-for="item in newCartItems" :key="item.product_id" class="modern-item-card new">
              <div class="mic-header">
                <div class="mic-title-row">
                  <span class="mic-title">{{ item.title }}</span>
                  <div class="mic-badges">
                    <AppBadge v-if="item.total === 0" variant="success" size="sm">Free</AppBadge>
                    <AppBadge v-if="item.type === 'package'" variant="info" size="sm">Package</AppBadge>
                    <AppBadge v-if="item.beautician_added" variant="secondary" size="sm">
                      <Icon icon="lucide:user-check" class="mic-badge-icon" />
                      Beautician added
                    </AppBadge>
                  </div>
                </div>
                <div class="mic-meta">
                  <span class="mic-price-info">{{ item.quantity }} × ₹{{ item.price }}</span>
                  <span class="mic-total">₹{{ (item.price + (item.selected_options || []).reduce((sum, o) => sum + o.price, 0)) * item.quantity }}</span>
                </div>
                <div v-if="item.duration || item.type" class="mic-attributes">
                  <span v-if="item.duration" class="mic-attr">
                    <Icon icon="lucide:clock" class="mic-icon" /> {{ item.duration }} mins
                  </span>
                  <span v-if="item.type" class="mic-attr">
                    <Icon icon="lucide:layers" class="mic-icon" /> {{ item.type === 'package' ? 'Package item' : 'Service item' }}
                  </span>
                </div>
              </div>

              <div class="mic-actions">
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

              <div v-if="item.selected_options?.length" class="mic-sub-section">
                <div class="mic-sub-header">Add-ons / Options</div>
                <div class="mic-sub-list">
                  <div v-for="opt in item.selected_options" :key="opt.product_option_id" class="mic-sub-item mic-item-row">
                    <div class="mic-item-info">
                      <span class="mic-item-title">{{ opt.title }}</span>
                      <span v-if="opt.duration" class="mic-item-meta">{{ opt.duration }} min</span>
                      <span v-if="opt.beautician_added" class="mic-added-tag mic-added-tag-inline">
                        <Icon icon="lucide:user-check" class="mic-badge-icon" />
                        Beautician added
                      </span>
                    </div>
                    <span class="mic-item-price">₹{{ opt.price ?? opt.min_price ?? opt.base_price ?? 0 }}</span>
                  </div>
                </div>
              </div>
              <div v-if="item.selected_package_items?.length" class="mic-sub-section">
                <div class="mic-sub-header">Included Services</div>
                <div class="mic-sub-list">
                  <div v-for="service in item.selected_package_items" :key="service.product_id" class="mic-sub-item">
                    <Icon icon="lucide:check-circle" class="mic-sub-icon text-success" />
                    <span>{{ service.title }}</span>
                    <span v-if="service.beautician_added" class="mic-added-tag">
                      <Icon icon="lucide:user-check" class="mic-badge-icon" />
                      Beautician added
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="normalizeFreeItems(item.selected_free_items).length" class="mic-sub-section">
                <div class="mic-sub-header">Free Perks</div>
                <div class="mic-sub-list">
                  <div
                    v-for="free in normalizeFreeItems(item.selected_free_items)"
                    :key="free.product_id || free.free_product_id || free.title"
                    class="mic-sub-item"
                  >
                    <Icon icon="lucide:gift" class="mic-sub-icon text-primary" />
                    <span>{{ free.title }}</span>
                    <span v-if="free.beautician_added" class="mic-added-tag">
                      <Icon icon="lucide:user-check" class="mic-badge-icon" />
                      Beautician added
                    </span>
                  </div>
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
          :disabled="!canConfirmOrder || isVerifying"
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
import { getProduct } from '@/shared/api/products.service'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import type { Order } from '@/shared/models'

interface CartItem {
  order_product_id?: string
  product_id: string
  base_product_id?: string
  quantity: number
  title: string
  price: number
  duration?: number
  image?: string
  type?: 'service' | 'package'
  total?: number
  beautician_added?: boolean
  selected_options?: {
    product_option_id: string
    title: string
    price: number
    duration?: number
    min_price?: number
    base_price?: number
    beautician_added?: boolean
  }[]
  selected_package_items?: {
    product_id: string
    title: string
    beautician_added?: boolean
  }[]
  selected_free_items?: {
    product_id?: string
    free_product_id?: string
    title?: string
    beautician_added?: boolean
  }[]
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

function normalizeFreeItem(free: any) {
  return {
    product_id: free.product_id || free.free_product_id || free.order_free_item_id || '',
    free_product_id: free.free_product_id || free.product_id || undefined,
    title: free.title || free.name || free.product_name || 'Free item',
    beautician_added: free.beautician_added ?? false,
  }
}

function normalizeFreeItems(freeItems?: readonly any[] | any[]) {
  return Array.isArray(freeItems) ? freeItems.map(normalizeFreeItem) : []
}

function normalizeCartItem(item: any): CartItem {
  return {
    ...item,
    order_product_id: item.order_product_id,
    base_product_id: item.base_product_id || item.product_id,
    beautician_added: item.beautician_added ?? false,
    selected_free_items: normalizeFreeItems(
      item.selected_free_items || item.selectedFreeItems || item.free_products
    ),
  }
}

function isCustomCategoryProductId(productId: string): boolean {
  return productId.startsWith('ccp_')
}

async function hydrateCartItems(items: CartItem[]): Promise<CartItem[]> {
  return Promise.all(
    items.map(async item => {
      if (!isCustomCategoryProductId(item.product_id) || item.base_product_id) {
        return item
      }

      try {
        const product = await getProduct(item.product_id)
        return {
          ...item,
          base_product_id: product.product_id || String(product._id || product.id),
        }
      } catch (err) {
        console.error('Failed to hydrate custom category product', item.product_id, err)
        return item
      }
    })
  )
}

const oldSubtotal = computed(() => order.value?.subtotal || 0)
const deliveryFee = computed(() => order.value?.delivery_fee || 0)
const discountTotal = computed(() => order.value?.discount_total || 0)
const surgeAmount = computed(() => order.value?.booking_info?.surge_amount || 0)
const convenienceFees = computed(() => order.value?.convenience_fees || 0)
const hygieneFees = computed(() => order.value?.hygiene_fees || 0)
const roundingAdjustment = computed(() => order.value?.rounding || 0)
const oldTotal = computed(() => order.value?.total || 0)

const newSubtotal = computed(() => {
  return newCartItems.value.reduce((sum, item) => {
    const optionsTotal = (item.selected_options || []).reduce((s, o) => s + o.price, 0)
    return sum + (item.price + optionsTotal) * item.quantity
  }, 0)
})

const otherCharges = computed(() => surgeAmount.value + convenienceFees.value + hygieneFees.value)

const preservedCharges = computed(
  () => deliveryFee.value + otherCharges.value + roundingAdjustment.value
)

const newTotal = computed(() => {
  return newSubtotal.value + preservedCharges.value - discountTotal.value
})

const priceDifference = computed(() => newTotal.value - oldTotal.value)

const minimumOrderValue = computed(() => {
  return Number(
    (order.value as any)?.minimum_order_value ?? (order.value as any)?.minimum_cart_value ?? 0
  )
})

const minimumOrderWarning = computed(() => {
  if (minimumOrderValue.value <= 0) return ''
  if (newSubtotal.value < minimumOrderValue.value) {
    return `Selected service items must meet the minimum cart value of ₹${minimumOrderValue.value}.`
  }
  return ''
})

const canConfirmOrder = computed(() => {
  if (newCartItems.value.length === 0 || newSubtotal.value === 0) return false
  if (minimumOrderValue.value > 0 && newSubtotal.value < minimumOrderValue.value) return false
  return true
})

async function fetchOrderData() {
  try {
    isLoading.value = true
    const data = await getOrder(orderId)
    order.value = data

    const allEdits =
      (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
    newCartItems.value = await hydrateCartItems((allEdits[orderId] || []).map(normalizeCartItem))

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

async function ensureCartItemsReadyForSubmit(): Promise<void> {
  newCartItems.value = await hydrateCartItems(newCartItems.value)
  await persistEdits()
}

async function handleGenerateOtp() {
  if (!canConfirmOrder.value) {
    const warningMessage =
      minimumOrderWarning.value ||
      'Please add at least one service item before confirming the edit.'
    const alert = await alertController.create({
      header: 'Unable to Confirm Edit',
      message: warningMessage,
      buttons: ['OK'],
    })
    await alert.present()
    return
  }

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
    await ensureCartItemsReadyForSubmit()

    // 1. Verify OTP
    await verifyServiceOtp(orderId, { otp: otpValue.value })
    // 2. Submit order changes
    const productsToUpdate = newCartItems.value.map(item => {
      const originalItem = order.value?.products?.find(
        p =>
          (item.order_product_id && String(p.order_product_id) === item.order_product_id) ||
          String(p.product_id) === item.product_id
      )
      const originalOptionIds = new Set(
        originalItem?.selected_options?.map(o => String(o.product_option_id)) || []
      )
      const originalFreeIds = new Set(
        originalItem?.selected_free_items?.map(f => String(f.free_product_id)) || []
      )
      const originalPackageIds = new Set(
        originalItem?.selected_package_services?.map(s => String(s.product_id)) || []
      )
      const isNewItem = !originalItem

      return {
        order_product_id: item.order_product_id,
        product_id: item.base_product_id || item.product_id,
        quantity: item.quantity,
        title: item.title,
        price: item.price,
        duration: item.duration,
        beautician_added: item.beautician_added ?? isNewItem,
        total:
          (item.price + (item.selected_options || []).reduce((s, o) => s + o.price, 0)) *
          item.quantity,
        selected_options: item.selected_options?.map(opt => ({
          ...opt,
          beautician_added:
            opt.beautician_added ??
            (originalItem && originalOptionIds.has(opt.product_option_id) ? false : true),
        })),
        selected_package_services: item.selected_package_items?.map(pkg => ({
          product_id: pkg.product_id,
          title: pkg.title,
          beautician_added:
            pkg.beautician_added ??
            (originalItem && originalPackageIds.has(pkg.product_id) ? false : true),
        })),
        selected_free_items: item.selected_free_items?.map(free => ({
          free_product_id: free.product_id || free.free_product_id || '',
          title: free.title || '',
          beautician_added:
            free.beautician_added ??
            (originalItem && originalFreeIds.has(free.product_id || free.free_product_id || '')
              ? false
              : true),
        })),
      }
    })

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

.preview-warning {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--color-warning-pale);
  color: var(--color-warning);
  font-size: 13px;
  line-height: 1.45;
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
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;
  scroll-snap-type: x mandatory;
}

.items-column {
  flex: 0 0 80vw;
  min-width: 260px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-snap-align: start;
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

.modern-item-card {
  background: var(--ion-color-step-50, #f9f9f9);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid var(--ion-color-step-150, #e0e0e0);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modern-item-card.old {
  opacity: 0.8;
  background: var(--color-background);
}

.modern-item-card.new {
  background: var(--color-surface);
  border: 1px solid var(--color-brand-light);
}

.mic-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mic-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 4px;
}

.mic-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--ion-color-step-900, #1a1a1a);
  line-height: 1.2;
}

.mic-badges {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.mic-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.8rem;
  color: var(--ion-color-step-600, #666);
}

.mic-total {
  font-weight: 700;
  color: var(--ion-color-primary);
  font-size: 0.9rem;
}

.mic-attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 1px;
}

.mic-attr {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.75rem;
  color: var(--ion-color-step-500, #888);
}

.mic-icon {
  font-size: 12px;
}

.mic-sub-section {
  border-top: 1px dashed var(--ion-color-step-200, #d0d0d0);
  padding-top: 6px;
}

.mic-sub-header {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ion-color-step-400, #aaa);
  margin-bottom: 4px;
}

.mic-sub-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mic-sub-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--ion-color-step-700, #444);
}

.mic-sub-icon {
  font-size: 12px;
  margin-top: 1px;
}

.mic-item-row {
  justify-content: space-between;
  align-items: center;
}

.mic-item-info {
  display: flex;
  flex-direction: column;
}

.mic-item-title {
  font-weight: 500;
}

.mic-item-meta {
  font-size: 0.7rem;
  color: var(--ion-color-step-500, #888);
}

.mic-item-price {
  font-weight: 600;
  font-size: 0.8rem;
}

.mic-added-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--ion-color-primary, #2563eb);
  font-size: 0.7rem;
  line-height: 1;
}

.mic-added-tag-inline {
  margin-top: 4px;
  display: inline-flex;
}

.mic-badge-icon {
  width: 12px;
  height: 12px;
}

.mic-actions {
  margin-top: 2px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1px;
  min-width: 0;
}

.qty-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  color: var(--color-text);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  cursor: pointer;
}

.qty-val {
  font-weight: 700;
  font-size: 12px;
  min-width: 12px;
  text-align: center;
}

.remove-btn {
  color: var(--color-danger);
  background: var(--color-danger-bg, #fee2e2);
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
}

.footer-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: stretch;
}

.flex-1 { flex: 1 1 0; min-width: 0; }
.flex-2 { flex: 2 1 0; min-width: 0; }

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
