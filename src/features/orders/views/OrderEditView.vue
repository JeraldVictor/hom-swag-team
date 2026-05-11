<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
  IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  IonFooter, loadingController, toastController, alertController
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { AppButton, AppBadge } from '@/shared/components/ui'
import PackageSelectionModal from '../components/PackageSelectionModal.vue'
import { getOrder, updateOrder } from '@/shared/api/orders.service'
import { getProducts } from '@/shared/api/products.service'
import { getMenu } from '@/shared/api/menu.service'
import { Storage_Service, STORAGE_KEYS } from '@/shared/lib/storage'
import type { Order, Product, MainMenu, ProductOption } from '@/shared/models'

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
const menus = ref<MainMenu[]>([])
const activeMenuId = ref<string>('all')
const searchQuery = ref('')
const products = ref<Product[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)

// Package selection modal state
const selectionModal = reactive({
  isOpen: false,
  productId: ''
})

// Local cart state - maps product_id to cart item
const cartMap = reactive<Record<string, CartItem>>({})

const cartItems = computed(() => Object.values(cartMap))

const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const optionsTotal = (item.selected_options || []).reduce((s, o) => s + o.price, 0)
    return sum + ((item.price + optionsTotal) * item.quantity)
  }, 0)
})

const totalQuantity = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

async function saveToStorage() {
  const allEdits = await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits) || {}
  allEdits[orderId] = cartItems.value
  await Storage_Service.setJSON(STORAGE_KEYS.pendingOrderEdits, allEdits)
}

async function loadFromStorage() {
  const allEdits = await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits) || {}
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
  const allEdits = await Storage_Service.getJSON<Record<string, any>>(STORAGE_KEYS.pendingOrderEdits) || {}
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
          selected_options: p.selected_options?.map(o => ({
            product_option_id: o.product_option_id,
            title: o.title,
            price: o.price || 0
          })),
          selected_package_items: p.selected_package_items
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
  const pid = String(product._id || product.id)
  
  // If it's a package or has options, show selection modal
  if (product.type === 'package' || (product.options && product.options.length > 0)) {
    selectionModal.productId = pid
    selectionModal.isOpen = true
  } else {
    // Regular product without options
    addToCart(product)
  }
}

function onSelectionConfirm(data: { product: Product, selectedOptions: ProductOption[], selectedPackageItems: string[] }) {
  const pid = String(data.product._id || data.product.id)
  const existing = cartMap[pid]

  if (existing) {
    existing.quantity++
  } else {
    cartMap[pid] = {
      product_id: pid,
      quantity: 1,
      title: data.product.name || data.product.title || '',
      price: data.product.min_price,
      image: data.product.image_url || (data.product.images?.[0]?.url),
      selected_options: data.selectedOptions.map(o => ({
        product_option_id: String(o._id || o.id || o.product_option_id),
        title: o.title,
        price: o.price
      })),
      selected_package_items: data.selectedPackageItems
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
      image: product.image_url || (product.images?.[0]?.url)
    }
  }
  saveToStorage()
}

function removeFromCart(productId: string) {
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
        }
      }
    ]
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
            variant="danger" 
            size="sm"
            @click="handleDiscard"
          >
            Discard
          </AppButton>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar class="search-toolbar">
        <ion-searchbar 
          v-model="searchQuery" 
          placeholder="Search products..."
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

      <div v-else class="product-list">
        <div v-for="product in products" :key="product._id || product.id" class="product-item anim-fade-in">
          <div class="product-image-container">
            <img :src="product.image_url || (product.images?.[0]?.url) || 'https://placehold.co/200x200?text=Product'" class="product-img" />
            <div v-if="product.restrictions?.beautician_only" class="pro-only-tag">
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
              <div v-if="getCartQuantity(String(product._id || product.id)) > 0" class="qty-control-mini">
                <button @click="removeFromCart(String(product._id || product.id))" class="mini-btn">
                  <Icon icon="lucide:minus" />
                </button>
                <span class="mini-qty">{{ getCartQuantity(String(product._id || product.id)) }}</span>
                <button @click="handleAddClick(product)" class="mini-btn">
                  <Icon icon="lucide:plus" />
                </button>
              </div>
              <AppButton v-else variant="primary" size="sm" icon="lucide:plus" @click="handleAddClick(product)">
                Add
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <Transition name="slide-up">
      <ion-footer v-if="cartItems.length > 0" class="cart-footer-pos">
        <div class="cart-summary-card" @click="handleGoToPreview">
          <div class="cart-summary-left">
            <div class="cart-badge">
              <Icon icon="lucide:shopping-cart" />
              <span class="badge-count">{{ totalQuantity }}</span>
            </div>
            <div class="cart-price-info">
              <span class="cart-total-label">Total Amount</span>
              <span class="cart-total-value">₹{{ subtotal }}</span>
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
.search-toolbar {
  --padding-top: 8px;
  --padding-bottom: 8px;
}

.custom-searchbar {
  --border-radius: 12px;
  --box-shadow: none;
  --background: var(--color-background);
  padding: 0 16px;
}

.menu-tabs {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 8px;
}

ion-segment-button {
  --indicator-color: var(--color-brand);
  --color-checked: var(--color-brand);
  font-weight: 600;
  text-transform: none;
  min-width: 100px;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  padding-bottom: 100px;
}

.product-item {
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  min-height: 110px;
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
  top: 4px;
  left: 4px;
  background: rgba(245, 158, 11, 0.9);
  color: white;
  padding: 2px;
  border-radius: 4px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.package-tag {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: var(--color-brand);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.product-info {
  padding: 10px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.product-name {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.4;
  word-wrap: break-word;
  white-space: normal;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.price-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.product-base-price {
  font-size: 13px;
  color: var(--color-text-muted);
  text-decoration: line-through;
}

.product-min-price {
  font-size: 17px;
  font-weight: 800;
  color: var(--color-brand);
}

.product-duration {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 2px;
}

.product-actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

.qty-control-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 2px;
}

.mini-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: white;
  color: var(--color-text);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  cursor: pointer;
}

.mini-qty {
  font-size: 14px;
  font-weight: 700;
}

.cart-footer-pos {
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: transparent;
  pointer-events: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.cart-summary-card {
  pointer-events: auto;
  background: var(--color-brand);
  color: white;
  padding: 12px 20px;
  border-radius: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 12px 32px rgba(var(--color-brand-rgb), 0.4);
  cursor: pointer;
  transition: transform 0.2s;
}

.cart-summary-card:active {
  transform: scale(0.97);
}

.cart-summary-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-badge {
  position: relative;
  width: 44px;
  height: 44px;
  background: rgba(255,255,255,0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.badge-count {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-danger);
  color: white;
  font-size: 10px;
  font-weight: 800;
  width: 20px;
  height: 20px;
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

.cart-total-label {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cart-total-value {
  font-size: 20px;
  font-weight: 800;
}

.cart-summary-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
}

.arrow-icon {
  font-size: 18px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  color: var(--color-text-muted);
  text-align: center;
}

.empty-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: 20px;
  color: var(--color-border);
}

.empty-state h3 {
  margin: 0 0 8px;
  color: var(--color-text);
  font-weight: 800;
}

.empty-state p {
  margin: 0 0 24px;
  font-size: 14px;
}

.spin {
  font-size: 40px;
  margin-bottom: 16px;
  animation: spin 1s linear infinite;
  color: var(--color-brand);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease-out;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100px);
  opacity: 0;
}

.anim-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
