<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
  IonFooter, IonLabel, IonList, IonItem, IonCheckbox, IonRadioGroup, IonRadio,
  IonSpinner
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { AppButton, AppBadge } from '@/shared/components/ui'
import { getProduct } from '@/shared/api/products.service'
import type { Product, ProductOption } from '@/shared/models'

const props = defineProps<{
  productId: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', data: { 
    product: Product, 
    selectedOptions: ProductOption[], 
    selectedPackageItems: string[] 
  }): void
}>()

const product = ref<Product | null>(null)
const isLoading = ref(true)
const selectedOptionIds = ref<string[]>([])
const selectedPackageItemIds = ref<string[]>([])
const packageItemDetails = ref<Product[]>([])

async function fetchDetails() {
  try {
    isLoading.value = true
    const data = await getProduct(props.productId)
    product.value = data
    
    // Auto-select fixed package items if not "choose_any"
    if (data.type === 'package' && !data.package_config?.choose_any && data.package_config?.services) {
      selectedPackageItemIds.value = [...data.package_config.services]
    }

    // Fetch details for package services to show names
    if (data.type === 'package' && data.package_config?.services?.length) {
       const details = await Promise.all(
         data.package_config.services.map(id => getProduct(id).catch(() => null))
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

  // Check Package Limits
  if (product.value.type === 'package' && product.value.package_config?.choose_any) {
    const count = selectedPackageItemIds.value.length
    const { min_selection, max_selection } = product.value.package_config
    if (min_selection && count < min_selection) return false
    if (max_selection && count > max_selection) return false
  }

  return true
})

function handleConfirm() {
  if (!product.value || !canConfirm.value) return

  const selectedOptions = (product.value.options || []).filter(opt => 
    selectedOptionIds.value.includes(String(opt._id || opt.id || opt.product_option_id))
  )

  emit('confirm', {
    product: product.value,
    selectedOptions,
    selectedPackageItems: selectedPackageItemIds.value
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
    if (limits && !limits.is_unlimited && limits.max_selection && selectedOptionIds.value.length >= limits.max_selection) {
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
    const limits = product.value?.package_config
    if (limits?.max_selection && selectedPackageItemIds.value.length >= limits.max_selection) {
       if (limits.max_selection === 1) {
         selectedPackageItemIds.value = [id]
       }
       return
    }
    selectedPackageItemIds.value.push(id)
  }
}

function isOptionSelected(id: string) {
  return selectedOptionIds.value.includes(id)
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
            <AppBadge v-if="product.package_config?.choose_any" variant="info">
              Choose {{ product.package_config.min_selection === product.package_config.max_selection ? product.package_config.min_selection : `${product.package_config.min_selection}-${product.package_config.max_selection}` }}
            </AppBadge>
            <AppBadge v-else variant="success">Fixed Items</AppBadge>
          </div>
          
          <ion-list lines="none">
            <ion-item 
              v-for="item in packageItemDetails" 
              :key="String(item._id || item.id)"
              class="selection-item"
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
                <p>+ ₹{{ opt.price }}</p>
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
