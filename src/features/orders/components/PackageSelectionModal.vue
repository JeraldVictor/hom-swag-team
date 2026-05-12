<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getProduct } from '@/shared/api/products.service'
import type { Product, ProductOption } from '@/shared/models'

const props = defineProps<{
  productId: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'confirm',
    data: {
      product: Product
      selectedOptions: ProductOption[]
      selectedPackageItems: { product_id: string; title: string }[]
      selectedFreeItems: { product_id: string; title: string }[]
    }
  ): void
}>()

const product = ref<Product | null>(null)
const isLoading = ref(true)
const selectedOptionIds = ref<string[]>([])
const selectedPackageItemIds = ref<string[]>([])
const packageItemDetails = ref<Product[]>([])
const selectedFreeItemIds = ref<string[]>([])

const freeProducts = computed(() => product.value?.free_products ?? [])
const freeProductLimits = computed(
  () =>
    product.value?.free_product_limits ?? {
      is_unlimited: true,
      min_qty: undefined,
      max_qty: undefined,
    }
)
const isFreeSelectionRequired = computed(
  () => freeProducts.value.length > 0 && !freeProductLimits.value.is_unlimited
)

const packageSelectionType = computed<'fixed' | 'limit' | 'choose_any'>(() => {
  const cfg = product.value?.package_config
  if (!cfg || product.value?.type !== 'package') return 'fixed'
  if (cfg.selection_type) return cfg.selection_type
  if (cfg.choose_any && (cfg.min_selection ?? 0) > 0) return 'choose_any'
  if ((cfg.min_selection ?? 0) > 0) return 'limit'
  return 'fixed'
})

const packageSelectionMax = computed(() => {
  const cfg = product.value?.package_config
  if (!cfg) return undefined
  return cfg.max_selection ?? cfg.min_selection
})

const packageSelectionLabel = computed(() => {
  if (packageSelectionType.value === 'fixed') return 'Fixed Items'

  const min = product.value?.package_config?.min_selection ?? 0
  const max = packageSelectionMax.value ?? min
  if (packageSelectionType.value === 'choose_any') {
    return min === max ? `Choose ${min} Services` : `Choose ${min}-${max} Services`
  }

  return min === max ? `Select exactly ${min} Services` : `Select ${min}-${max} Services`
})

const packageSelectionOverflow = computed(() => {
  const max = packageSelectionMax.value
  return max != null && selectedPackageItemIds.value.length >= max
})

const freeSelectionLabel = computed(() => {
  if (!isFreeSelectionRequired.value) return 'Included'
  const min = freeProductLimits.value.min_qty ?? 0
  const max = freeProductLimits.value.max_qty
  if (min && max && min === max) return `Choose ${min} free item${min > 1 ? 's' : ''}`
  if (min && max) return `Choose ${min}-${max} free items`
  if (min) return `Choose at least ${min}`
  if (max) return `Choose up to ${max}`
  return 'Choose free items'
})

async function fetchDetails() {
  try {
    isLoading.value = true
    const data = await getProduct(props.productId)
    product.value = data

    const packageServiceIds = (data.package_config?.services ?? []).map(service =>
      String((service as any)._id ?? service)
    )

    // Auto-select fixed package items if not "choose_any"
    if (data.type === 'package' && !data.package_config?.choose_any && packageServiceIds.length) {
      selectedPackageItemIds.value = [...packageServiceIds]
    }

    if (data.free_products?.length && (data.free_product_limits?.is_unlimited ?? true)) {
      selectedFreeItemIds.value = data.free_products.map(fp => String(fp._id || fp.product_id))
    }

    // Fetch details for package services to show names
    if (data.type === 'package' && packageServiceIds.length) {
      const details = await Promise.all(
        packageServiceIds.map(id => getProduct(id).catch(() => null))
      )
      packageItemDetails.value = details.filter((d): d is Product => d !== null)
    }
  } catch (err) {
    console.error('Failed to fetch product details', err)
  } finally {
    isLoading.value = false
  }
}

const canConfirm = computed(() => {
  if (!product.value) return false

  // Check Option Limits
  if (product.value.option_limits) {
    const count = selectedOptionIds.value.length
    const { min_selection, max_selection, is_unlimited } = product.value.option_limits
    if (min_selection && count < min_selection) return false
    if (!is_unlimited && max_selection && count > max_selection) return false
  }

  // Check free-product limits if selection is required
  if (isFreeSelectionRequired.value) {
    const count = selectedFreeItemIds.value.length
    const { min_qty, max_qty } = freeProductLimits.value
    if (min_qty != null && count < min_qty) return false
    if (max_qty != null && count > max_qty) return false
  }

  // Check Package Limits
  if (product.value.type === 'package' && packageSelectionType.value !== 'fixed') {
    const count = selectedPackageItemIds.value.length
    const min_selection = product.value.package_config?.min_selection ?? 0
    const max_selection = packageSelectionMax.value
    if (min_selection && count < min_selection) return false
    if (max_selection != null && count > max_selection) return false
  }

  return true
})

function handleConfirm() {
  if (!product.value || !canConfirm.value) return

  const selectedOptions = (product.value.options || [])
    .filter(opt =>
      selectedOptionIds.value.includes(String(opt._id || opt.id || opt.product_option_id))
    )
    .map(opt => ({
      ...opt,
      price: opt.price ?? opt.min_price ?? opt.base_price ?? 0,
    }))

  const selectedFreeItems = freeProducts.value
    .filter(fp => selectedFreeItemIds.value.includes(String(fp._id || fp.product_id)))
    .map(fp => ({
      product_id: String(fp._id || fp.product_id),
      title: fp.title,
    }))

  const selectedPackageItems = packageItemDetails.value
    .filter(p => selectedPackageItemIds.value.includes(String(p._id || p.id)))
    .map(p => ({
      product_id: String(p._id || p.id),
      title: p.name || p.title || '',
    }))

  emit('confirm', {
    product: product.value,
    selectedOptions,
    selectedPackageItems,
    selectedFreeItems,
  })
}

onMounted(fetchDetails)

function toggleOption(id: string) {
  const index = selectedOptionIds.value.indexOf(id)
  if (index > -1) {
    selectedOptionIds.value.splice(index, 1)
  } else {
    // Check max limit before adding if not unlimited
    const limits = product.value?.option_limits
    if (
      limits &&
      !limits.is_unlimited &&
      limits.max_selection &&
      selectedOptionIds.value.length >= limits.max_selection
    ) {
      // If max_selection is 1, replace current
      if (limits.max_selection === 1) {
        selectedOptionIds.value = [id]
      }
      return
    }
    selectedOptionIds.value.push(id)
  }
}

function togglePackageItem(id: string) {
  if (!product.value?.package_config?.choose_any) return // Fixed items cannot be toggled

  const index = selectedPackageItemIds.value.indexOf(id)
  if (index > -1) {
    selectedPackageItemIds.value.splice(index, 1)
  } else {
    const maxSelection = packageSelectionMax.value
    if (maxSelection != null && selectedPackageItemIds.value.length >= maxSelection) {
      if (maxSelection === 1) {
        selectedPackageItemIds.value = [id]
        return
      }
      return
    }
    selectedPackageItemIds.value.push(id)
  }
}

function isOptionSelected(id: string) {
  return selectedOptionIds.value.includes(id)
}

function toggleFreeItem(id: string) {
  const index = selectedFreeItemIds.value.indexOf(id)
  if (index > -1) {
    selectedFreeItemIds.value.splice(index, 1)
    return
  }

  const { max_qty, is_unlimited } = freeProductLimits.value
  if (!is_unlimited && max_qty && selectedFreeItemIds.value.length >= max_qty) {
    if (max_qty === 1) {
      selectedFreeItemIds.value = [id]
    }
    return
  }

  selectedFreeItemIds.value.push(id)
}

function isFreeItemSelected(id: string) {
  return selectedFreeItemIds.value.includes(id)
}

function isPackageItemSelected(id: string) {
  return selectedPackageItemIds.value.includes(id)
}
</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="emit('close')" class="selection-modal">
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ product?.name || product?.title || 'Select Options' }}</ion-title>
        <ion-buttons slot="end">
          <AppButton variant="clear" @click="emit('close')">Cancel</AppButton>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="isLoading" class="loading-state">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="product" class="modal-body">
        <!-- Package Items Section -->
        <div v-if="product.type === 'package'" class="selection-section">
          <div class="section-header">
            <h3>Package Includes</h3>
            <AppBadge variant="info">{{ packageSelectionLabel }}</AppBadge>
          </div>
          
          <ion-list lines="none">
            <ion-item 
              v-for="item in packageItemDetails" 
              :key="String(item._id || item.id)"
              class="selection-item"
              :disabled="!product.package_config?.choose_any || (packageSelectionOverflow && !isPackageItemSelected(String(item._id || item.id)))"
              @click="togglePackageItem(String(item._id || item.id))"
            >
              <ion-checkbox 
                slot="start" 
                :checked="isPackageItemSelected(String(item._id || item.id))"
                :disabled="!product.package_config?.choose_any"
              ></ion-checkbox>
              <ion-label>
                <h2>{{ item.name || item.title }}</h2>
                <p v-if="item.duration_minutes">{{ item.duration_minutes }} mins</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <div v-if="freeProducts.length" class="selection-section">
          <div class="section-header">
            <h3>Free Items</h3>
            <AppBadge :variant="isFreeSelectionRequired ? 'info' : 'success'">
              {{ freeSelectionLabel }}
            </AppBadge>
          </div>

          <ion-list lines="none">
            <ion-item
              v-for="fp in freeProducts"
              :key="String(fp._id || fp.product_id)"
              class="selection-item"
              @click="isFreeSelectionRequired ? toggleFreeItem(String(fp._id || fp.product_id)) : null"
            >
              <ion-checkbox
                slot="start"
                :checked="isFreeItemSelected(String(fp._id || fp.product_id))"
                :disabled="!isFreeSelectionRequired"
              ></ion-checkbox>
              <ion-label>
                <h2>{{ fp.title }}</h2>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>

        <!-- Product Options Section -->
        <div v-if="product.options?.length" class="selection-section">
          <div class="section-header">
            <h3>Add-ons / Options</h3>
            <AppBadge v-if="product.option_limits?.min_selection" variant="warning">
              Min {{ product.option_limits.min_selection }} Required
            </AppBadge>
          </div>

          <ion-list lines="none">
            <ion-item 
              v-for="opt in product.options" 
              :key="String(opt._id || opt.id || opt.product_option_id)"
              class="selection-item"
              @click="toggleOption(String(opt._id || opt.id || opt.product_option_id))"
            >
              <ion-checkbox 
                slot="start" 
                :checked="isOptionSelected(String(opt._id || opt.id || opt.product_option_id))"
              ></ion-checkbox>
              <ion-label>
                <h2>{{ opt.title }}</h2>
                <p>+ ₹{{ opt.price ?? opt.min_price ?? opt.base_price ?? 0 }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border ion-padding">
      <AppButton 
        expand="block" 
        :disabled="!canConfirm" 
        @click="handleConfirm"
      >
        Add to Cart
      </AppButton>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.selection-modal {
  --height: 80%;
  --border-radius: 24px 24px 0 0;
  align-items: flex-end;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.modal-body {
  padding: 16px;
}

.selection-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}

.selection-item {
  --background: var(--color-background);
  --border-radius: 12px;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.selection-item h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  white-space: normal;
  line-height: 1.4;
}

.selection-item p {
  font-size: 0.85rem;
  margin: 2px 0 0;
}

ion-checkbox {
  --size: 20px;
  --checkbox-background-checked: var(--color-brand);
  --border-color-checked: var(--color-brand);
}
</style>
