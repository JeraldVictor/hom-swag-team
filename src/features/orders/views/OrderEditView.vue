<script setup lang="ts">
import { alertController } from '@ionic/vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatISTDate, formatISTDateShort, getTodayIST } from '@/shared/lib/datetime'
import { getMenu } from '@/shared/api/menu.service'
import { getOrder } from '@/shared/api/orders.service'
import { getProducts } from '@/shared/api/products.service'
import { STORAGE_KEYS, Storage_Service } from '@/shared/lib/storage'
import type { MainMenu, Order, Product, ProductOption } from '@/shared/models'

interface CartItem {
  product_id: string
  quantity: number
  title: string
  price: number
  duration?: number
  image?: string
  type?: 'service' | 'package'
  selected_options?: ReadonlyArray<{
    product_option_id: string
    title: string
    price: number
  }>
  selected_package_items?: ReadonlyArray<{
    product_id: string
    title: string
  }>
  selected_free_items?: ReadonlyArray<{
    product_id: string
    title: string
  }>
}

const route = useRoute()
const router = useRouter()
const orderId = String(route.params.id)

const order = ref<Order | null>(null)
const menus = ref<MainMenu[]>([])
const scheduleDate = computed(
  () => order.value?.booking_info?.date ?? order.value?.service_date ?? ''
)
const isBookingDateToday = computed(() => {
  if (!scheduleDate.value) return false
  return formatISTDateShort(scheduleDate.value) === getTodayIST()
})
const orderEditAllowed = computed(() => isBookingDateToday.value)
const scheduleDateFormatted = computed(() =>
  scheduleDate.value ? formatISTDate(scheduleDate.value) : ''
)
const activeMenuId = ref<string>('all')
const searchQuery = ref('')
const products = ref<Product[]>([])
const isLoading = ref(false)

// Package selection modal state
const selectionModal = reactive({
  isOpen: false,
  productId: '',
})

// Local cart state - maps product_id to cart item
const cartMap = reactive<Record<string, CartItem>>({})

const cartItems = computed(() => Object.values(cartMap))

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const optionsTotal = (item.selected_options || []).reduce((s, o) => s + o.price, 0)
    return sum + (item.price + optionsTotal) * item.quantity
  }, 0)
})

const totalQuantity = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

async function saveToStorage() {
  const allEdits =
    (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
  allEdits[orderId] = cartItems.value
  await Storage_Service.setJSON(STORAGE_KEYS.pendingOrderEdits, allEdits)
}

async function loadFromStorage() {
  const allEdits =
    (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
  const savedItems = allEdits[orderId]
  if (savedItems && Array.isArray(savedItems)) {
    savedItems.forEach(item => {
      cartMap[item.product_id] = item
    })
    return true
  }
  return false
}

async function clearFromStorage() {
  const allEdits =
    (await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits)) || {}
  delete allEdits[orderId]
  await Storage_Service.setJSON(STORAGE_KEYS.pendingOrderEdits, allEdits)
}

async function fetchOrderData() {
  try {
    isLoading.value = true
    const data = await getOrder(orderId)
    order.value = data

    // Check if we have pending changes in storage
    const hasSaved = await loadFromStorage()

    // If no saved changes, initialize cart from order products
    if (!hasSaved && data.products) {
      data.products.forEach(p => {
        const pid = String(p.product_id)
        cartMap[pid] = {
          product_id: pid,
          quantity: p.quantity,
          title: p.title,
          price: p.price,
          duration: p.duration,
          type: p.type,
          selected_options: p.selected_options?.map(o => ({
            product_option_id: o.product_option_id,
            title: o.title,
            price: o.price ?? o.min_price ?? o.base_price ?? 0,
          })),
          selected_package_items: p.selected_package_items,
          selected_free_items: p.selected_free_items?.map(f => ({
            product_id: f.product_id,
            title: f.title,
          })),
        }
      })
    }
  } catch (err) {
    console.error('Failed to fetch order', err)
  } finally {
    isLoading.value = false
  }
}

async function fetchMenus() {
  try {
    const data = await getMenu()
    menus.value = data.main_menus || []
  } catch (err) {
    console.error('Failed to fetch menus', err)
  }
}

async function fetchProducts() {
  try {
    isLoading.value = true
    const params: any = {
      limit: 100,
      is_active: true,
    }

    if (activeMenuId.value !== 'all') {
      params.main_menu_id = activeMenuId.value
    }

    if (searchQuery.value) {
      params.search_query = searchQuery.value
    }

    const response = await getProducts(params)
    products.value = response.data
  } catch (err) {
    console.error('Failed to fetch products', err)
  } finally {
    isLoading.value = false
  }
}

function handleAddClick(product: Product) {
  if (!orderEditAllowed.value) {
    alertController
      .create({
        header: 'Edit unavailable',
        message: 'This order can only be edited on its scheduled date.',
        buttons: ['OK'],
      })
      .then(alert => alert.present())
    return
  }
  const pid = String(product._id || product.id)

  const requiresSelection =
    product.type === 'package' ||
    (product.options && product.options.length > 0) ||
    (product.free_products?.length &&
      product.free_product_limits &&
      !product.free_product_limits.is_unlimited)

  if (requiresSelection) {
    selectionModal.productId = pid
    selectionModal.isOpen = true
  } else {
    addToCart(product)
  }
}

function onSelectionConfirm(data: {
  product: Product
  selectedOptions: ProductOption[]
  selectedPackageItems: { product_id: string; title: string }[]
  selectedFreeItems: { product_id: string; title: string }[]
}) {
  const pid = String(data.product._id || data.product.id)
  const existing = cartMap[pid]
  const selectedOptions = data.selectedOptions.map(o => ({
    product_option_id: String(o._id || o.id || o.product_option_id),
    title: o.title,
    price: o.price ?? o.min_price ?? o.base_price ?? 0,
  }))

  if (existing) {
    existing.title = data.product.name || data.product.title || ''
    existing.price = data.product.min_price
    existing.duration = data.product.duration_minutes
    existing.type = data.product.type
    existing.image = data.product.image_url || data.product.images?.[0]?.url
    existing.selected_options = selectedOptions
    existing.selected_package_items = data.selectedPackageItems
    existing.selected_free_items = data.selectedFreeItems
  } else {
    cartMap[pid] = {
      product_id: pid,
      quantity: 1,
      title: data.product.name || data.product.title || '',
      price: data.product.min_price,
      duration: data.product.duration_minutes,
      type: data.product.type,
      image: data.product.image_url || data.product.images?.[0]?.url,
      selected_options: selectedOptions,
      selected_package_items: data.selectedPackageItems,
      selected_free_items: data.selectedFreeItems,
    }
  }

  saveToStorage()
  selectionModal.isOpen = false
}

function addToCart(product: Product) {
  const pid = String(product._id || product.id)
  const existing = cartMap[pid]

  if (existing) {
    existing.quantity++
  } else {
    cartMap[pid] = {
      product_id: pid,
      quantity: 1,
      title: product.name || product.title || '',
      price: product.min_price,
      duration: product.duration_minutes,
      type: product.type,
      image: product.image_url || product.images?.[0]?.url,
      selected_free_items: product.free_products?.length
        ? product.free_product_limits && !product.free_product_limits.is_unlimited
          ? []
          : product.free_products.map(fp => ({
              product_id: String(fp._id || fp.product_id),
              title: fp.title,
            }))
        : undefined,
    }
  }
  saveToStorage()
}

function removeFromCart(productId: string) {
  if (!orderEditAllowed.value) return
  const existing = cartMap[productId]
  if (existing) {
    if (existing.quantity > 1) {
      existing.quantity--
    } else {
      delete cartMap[productId]
    }
    saveToStorage()
  }
}

function getCartQuantity(productId: string) {
  return cartMap[productId]?.quantity || 0
}

async function handleGoToPreview() {
  if (!orderEditAllowed.value) return
  if (cartItems.value.length === 0) return
  await saveToStorage()
  router.push(`/orders/${orderId}/preview`)
}

async function handleDiscard() {
  const alert = await alertController.create({
    header: 'Discard Changes?',
    message: 'Are you sure you want to discard all pending changes to this order?',
    buttons: [
      { text: 'No', role: 'cancel' },
      {
        text: 'Yes, Discard',
        role: 'destructive',
        handler: async () => {
          await clearFromStorage()
          for (const key in cartMap) delete cartMap[key]
          await fetchOrderData() // Reload original products
        },
      },
    ],
  })
  await alert.present()
}

onMounted(() => {
  fetchOrderData()
  fetchMenus()
  fetchProducts()
})

watch([activeMenuId, searchQuery], () => {
  fetchProducts()
})
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders"></ion-back-button>
        </ion-buttons>
        <ion-title>Edit Order</ion-title>
        <ion-buttons slot="end">
          <AppButton 
            variant="ghost" 
            size="sm"
            color="danger"
            @click="handleDiscard"
            class="discard-btn"
          >
            Discard
          </AppButton>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="search-toolbar">
        <ion-searchbar 
          v-model="searchQuery" 
          placeholder="Search services..."
          :debounce="500"
          class="custom-searchbar"
        ></ion-searchbar>
      </ion-toolbar>
      <div class="menu-tabs">
        <ion-segment scrollable v-model="activeMenuId" mode="md">
          <ion-segment-button value="all">
            <ion-label>All Items</ion-label>
          </ion-segment-button>
          <ion-segment-button v-for="menu in menus" :key="menu._id" :value="menu._id">
            <ion-label>{{ menu.title }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>
    </ion-header>

    <ion-content>
      <div v-if="isLoading && !products.length" class="loading-state">
        <Icon icon="lucide:loader-2" class="spin" />
        <p>Fetching catalog...</p>
      </div>

      <div v-else-if="!products.length" class="empty-state">
        <div class="empty-icon-wrapper">
          <Icon icon="lucide:package-search" />
        </div>
        <h3>No Products Found</h3>
        <p>Try adjusting your search or category filter.</p>
        <AppButton variant="outline" size="sm" @click="searchQuery = ''; activeMenuId = 'all'">
          Clear Filters
        </AppButton>
      </div>

      <div v-else>
        <div v-if="order && !orderEditAllowed" class="date-restriction-tip" style="margin: 16px; padding: 14px; border-radius: 12px; background: var(--color-surface); color: var(--color-text-muted); text-align: center;">
          This order can only be edited on {{ scheduleDateFormatted }}.
        </div>
        <div class="product-list">
          <div v-for="product in products" :key="product._id || product.id" class="product-item anim-fade-in">
            <div class="product-image-container">
              <img :src="product.image_url || (product.images?.[0]?.url) || 'https://placehold.co/200x200?text=Product'" class="product-img" />
              <div v-if="product.restrictions?.beautician_only" class="pro-only-tag" title="Pro Only">
                <Icon icon="lucide:star" />
              </div>
              <div v-if="product.type === 'package'" class="package-tag">
                Package
              </div>
            </div>
            <div class="product-info">
              <h4 class="product-name">{{ product.name || product.title }}</h4>
              <div class="product-meta">
                <div class="price-container">
                  <span v-if="product.base_price && product.base_price > product.min_price" class="product-base-price">
                    ₹{{ product.base_price }}
                  </span>
                  <span class="product-min-price">₹{{ product.min_price }}</span>
                </div>
                <span v-if="product.duration_minutes" class="product-duration">
                  <Icon icon="lucide:clock" /> {{ product.duration_minutes }}m
                </span>
              </div>
              <div class="product-actions">
                <div v-if="getCartQuantity(String(product._id || product.id)) > 0" class="qty-control-modern">
                  <button @click="removeFromCart(String(product._id || product.id))" class="qty-btn" aria-label="Decrease quantity" :disabled="!orderEditAllowed">
                    <Icon icon="lucide:minus" />
                  </button>
                  <span class="qty-number">{{ getCartQuantity(String(product._id || product.id)) }}</span>
                  <button @click="handleAddClick(product)" class="qty-btn" aria-label="Increase quantity" :disabled="!orderEditAllowed">
                    <Icon icon="lucide:plus" />
                  </button>
                </div>
                <AppButton v-else variant="primary" size="sm" icon="lucide:plus" @click="handleAddClick(product)" class="add-btn-modern" :disabled="!orderEditAllowed">
                  Add
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <Transition name="slide-up">
      <ion-footer v-if="cartItems.length > 0 && orderEditAllowed" class="cart-footer-modern">
        <div class="cart-summary-card" @click="handleGoToPreview">
          <div class="cart-summary-left">
            <div class="cart-icon-wrapper">
              <Icon icon="lucide:shopping-bag" />
              <div class="cart-badge-count">{{ totalQuantity }}</div>
            </div>
            <div class="cart-price-info">
              <span class="cart-label">Est. Total</span>
              <span class="cart-value">₹{{ subtotal }}</span>
            </div>
          </div>
          <div class="cart-summary-right">
            <span>Review Changes</span>
            <Icon icon="lucide:arrow-right" class="arrow-icon" />
          </div>
        </div>
      </ion-footer>
    </Transition>

    <!-- Package & Options Selection Modal -->
    <PackageSelectionModal 
      v-if="selectionModal.isOpen"
      :is-open="selectionModal.isOpen"
      :product-id="selectionModal.productId"
      @close="selectionModal.isOpen = false"
      @confirm="onSelectionConfirm"
    />
  </ion-page>
</template>

<style scoped>
.discard-btn {
  font-weight: 700;
}

.search-toolbar {
  --padding-top: var(--spacing-2);
  --padding-bottom: var(--spacing-2);
}

.custom-searchbar {
  --border-radius: var(--radius-xl);
  --box-shadow: none;
  --background: var(--color-background);
  padding: 0 var(--spacing-4);
}

.menu-tabs {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--spacing-2);
}

ion-segment-button {
  --indicator-color: var(--color-brand);
  --color-checked: var(--color-brand);
  font-weight: 700;
  text-transform: none;
  min-width: 100px;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  padding-bottom: 120px;
}

.product-item {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  min-height: 110px;
  transition: transform 0.2s ease;
}

.product-item:active {
  transform: scale(0.98);
}

.product-image-container {
  position: relative;
  width: 110px;
  min-height: 110px;
  flex-shrink: 0;
  background: var(--color-background);
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pro-only-tag {
  position: absolute;
  top: var(--spacing-1);
  left: var(--spacing-1);
  background: var(--color-warning);
  color: white;
  padding: 4px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.package-tag {
  position: absolute;
  bottom: var(--spacing-1);
  right: var(--spacing-1);
  background: var(--color-brand);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.product-info {
  padding: var(--spacing-3) var(--spacing-4);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-name {
  margin: 0 0 var(--spacing-1);
  font-size: var(--font-size-base);
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.4;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.price-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.product-base-price {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.product-min-price {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-brand);
}

.product-duration {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 2px;
}

.product-actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

.qty-control-modern {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  background: var(--color-background);
  border-radius: var(--radius-lg);
  padding: 4px;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-surface);
  color: var(--color-brand);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: background 0.2s;
}

.qty-btn:active {
  background: var(--color-brand-pale);
}

.qty-number {
  font-size: var(--font-size-base);
  font-weight: 800;
  min-width: 20px;
  text-align: center;
}

.add-btn-modern {
  font-weight: 800;
  --border-radius: var(--radius-lg);
}

.cart-footer-modern {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-5);
  padding-bottom: max(var(--spacing-5), env(safe-area-inset-bottom));
  background: transparent;
  pointer-events: none;
  z-index: 100;
}

.cart-summary-card {
  pointer-events: auto;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-mid) 100%);
  color: white;
  padding: var(--spacing-4) var(--spacing-5);
  border-radius: var(--radius-2xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 12px 32px rgba(124, 58, 237, 0.4);
  cursor: pointer;
}

.cart-summary-card:active {
  transform: scale(0.97);
}

.cart-summary-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.cart-icon-wrapper {
  position: relative;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.cart-badge-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-error);
  color: white;
  font-size: 10px;
  font-weight: 800;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-brand);
}

.cart-price-info {
  display: flex;
  flex-direction: column;
}

.cart-label {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cart-value {
  font-size: var(--font-size-xl);
  font-weight: 800;
}

.cart-summary-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-weight: 700;
  font-size: var(--font-size-base);
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-2xl);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: var(--spacing-4);
  color: var(--color-border);
}

.empty-state h3 {
  margin: 0 0 var(--spacing-2);
  font-weight: 800;
  color: var(--color-text);
}

.empty-state p {
  margin: 0 0 var(--spacing-6);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.spin {
  font-size: 40px;
  margin-bottom: var(--spacing-4);
  animation: spin 1s linear infinite;
  color: var(--color-brand);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(120px);
  opacity: 0;
}

.anim-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
