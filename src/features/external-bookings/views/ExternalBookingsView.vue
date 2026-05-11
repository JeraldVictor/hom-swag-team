<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>External Rides</ion-title>
        <ion-buttons slot="end">
          <AppButton variant="clear" icon-only icon="lucide:plus" @click="openCreateModal" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Info banner -->
      <div class="info-banner anim-fade-in">
        <Icon icon="lucide:car" class="info-banner__icon" aria-hidden="true" />
        <p class="info-banner__text">
          Log rides taken via Uber/Ola for platform orders to get reimbursed.
        </p>
      </div>

      <!-- Loading skeleton -->
      <template v-if="isLoading && bookings.length === 0">
        <div class="list">
          <div v-for="n in 3" :key="n" class="skeleton">
            <div class="skeleton__top" />
            <div class="skeleton__mid" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && bookings.length === 0">
        <div class="empty-state anim-fade-in">
          <div class="empty-state__icon-wrap">
            <Icon icon="lucide:car-taxi-front" class="empty-state__icon" aria-hidden="true" />
          </div>
          <p class="empty-state__title">No external rides logged</p>
          <p class="empty-state__text">Tap + to log a ride for today's orders.</p>
          <AppButton variant="outline" @click="openCreateModal" class="mt-16">
            Log First Ride
          </AppButton>
        </div>
      </template>

      <!-- Bookings list -->
      <template v-else>
        <div class="list">
          <div v-for="booking in bookings" :key="booking.id ?? booking._id" class="booking-card anim-fade-in">
            <div class="booking-card__header">
              <div>
                <p class="booking-card__customer">
                  {{ booking.customer_name || 'External Ride' }}
                  <span v-if="booking.order_number" class="order-tag">#{{ booking.order_number }}</span>
                </p>
                <p class="booking-card__meta">
                  {{ formatDate(booking.service_date || booking.created_at) }}
                  <span v-if="booking.provider"> · {{ booking.provider }}</span>
                </p>
              </div>
              <AppBadge :text="statusLabel(booking.status)" :variant="statusVariant(booking.status)" size="sm" />
            </div>
            
            <div class="booking-card__footer">
               <p class="booking-card__amount">
                <Icon icon="lucide:indian-rupee" aria-hidden="true" />
                {{ (booking.cost || 0).toLocaleString('en-IN') }}
              </p>
              
              <div class="booking-card__actions">
                <AppButton variant="outline" size="sm" icon="lucide:navigation" @click.stop="openRideSelector(booking)">
                  Re-book
                </AppButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- Reusable Ride Selection Modal -->
    <RideSelectorModal
      v-model:is-open="showRideModal"
      :order-id="String(selectedBooking?.order_id?._id || selectedBooking?.order_id?.id || '')"
      :customer-name="selectedBooking?.customer_name || 'Customer'"
      :destination="{ 
        lat: selectedBooking?.drop ? selectedBooking.drop[1] : 0, 
        lng: selectedBooking?.drop ? selectedBooking.drop[0] : 0 
      }"
      @booked="(p: string) => showSuccess(`Ride booked via ${p}`)"
    />

    <!-- Create Modal (Order Selection -> Cost Entry) -->
    <ion-modal 
      :is-open="showForm" 
      @didDismiss="closeModal" 
      :initial-breakpoint="0.85" 
      :breakpoints="[0, 0.85, 1]"
      :handle="true"
      class="ride-modal"
    >
      <ion-content class="ion-padding-bottom">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="modal-header__top">
            <h2 class="modal-title">{{ step === 1 ? 'Select Order' : 'Ride Details' }}</h2>
            <AppButton variant="clear" icon-only icon="lucide:x" @click="closeModal" />
          </div>
          <div class="step-indicator">
            <div class="step-dots">
              <div class="step-dot" :class="{ active: step >= 1 }" />
              <div class="step-dot" :class="{ active: step >= 2 }" />
            </div>
            <span class="step-text">Step {{ step }} of 2</span>
          </div>
        </div>

        <!-- Step 1: Select Order -->
        <div v-if="step === 1" class="order-selection anim-slide-up">
          <div class="search-hint">
             <Icon icon="lucide:search" />
             <span>Pick an active order for today</span>
          </div>
          
          <div v-if="isOrdersLoading" class="ion-padding text-center">
            <ion-spinner name="crescent" color="primary" />
          </div>
          
          <div v-else-if="todayOrders.length === 0" class="empty-orders">
            <Icon icon="lucide:package-search" class="empty-orders-icon" />
            <p>No active orders found for today.</p>
            <ion-button fill="outline" shape="round" @click="fetchOrders">Retry</ion-button>
          </div>
          
          <div v-else class="order-grid">
            <div 
              v-for="order in todayOrders" 
              :key="order.id" 
              class="order-card-compact press-feedback"
              @click="selectOrder(order)"
            >
              <div class="order-card-compact__left">
                <div class="order-icon-box">
                  <Icon icon="lucide:shopping-bag" />
                </div>
                <div>
                  <h3 class="order-id">#{{ order.order_number }}</h3>
                  <p class="order-name">{{ order.customer?.full_name }}</p>
                </div>
              </div>
              <Icon icon="lucide:chevron-right" class="arrow-icon" />
            </div>
          </div>
        </div>

        <!-- Step 2: Provider & Cost -->
        <div v-else-if="step === 2" class="form-body anim-slide-up">
          <div class="selected-order-pill" @click="step = 1">
            <Icon icon="lucide:link-2" class="link-icon" />
            <span class="pill-text">#{{ selectedOrder?.order_number }} · {{ selectedOrder?.customer?.full_name }}</span>
            <Icon icon="lucide:pencil" class="edit-icon" />
          </div>

          <div class="form-sections">
            <div class="form-section">
              <label class="form-label">Ride Provider</label>
              <ion-segment v-model="form.provider" mode="ios" class="provider-segment-custom">
                <ion-segment-button value="Uber">
                  <div class="seg-content">
                    <Icon icon="simple-icons:uber" />
                    <ion-label>Uber</ion-label>
                  </div>
                </ion-segment-button>
                <ion-segment-button value="Ola">
                  <div class="seg-content">
                    <div class="ola-dot" />
                    <ion-label>Ola</ion-label>
                  </div>
                </ion-segment-button>
                <ion-segment-button value="Other">
                  <div class="seg-content">
                    <Icon icon="lucide:more-horizontal" />
                    <ion-label>Other</ion-label>
                  </div>
                </ion-segment-button>
              </ion-segment>
            </div>

            <div class="form-section">
              <label class="form-label">Amount Paid</label>
              <div class="amount-input-box">
                <span class="currency-symbol">₹</span>
                <input 
                  v-model.number="form.cost" 
                  type="number" 
                  placeholder="0" 
                  inputmode="numeric"
                  class="native-amount-input"
                />
              </div>
            </div>

            <div class="form-section">
              <label class="form-label">Notes</label>
              <textarea 
                v-model="form.service_description" 
                placeholder="Ex: Traffic was high, extra fare..." 
                rows="3"
                class="native-textarea"
              />
            </div>
          </div>

          <div class="form-actions ion-padding">
            <p v-if="error" class="form-error-bubble anim-shake">
              <Icon icon="lucide:alert-circle" />
              {{ error }}
            </p>
            
            <AppButton expand="block" size="lg" :loading="isSubmitting" @click="handleSubmit" class="confirm-btn-custom">
              Confirm & Save
            </AppButton>
            <AppButton variant="clear" @click="step = 1" style="margin-top: 12px;">
              Back to Order Selection
            </AppButton>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton,
  IonContent, IonRefresher, IonRefresherContent, IonModal, IonSpinner,
  IonLabel, IonSegment, IonSegmentButton,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Geolocation } from '@capacitor/geolocation'
import { Icon } from '@iconify/vue'
import { getExternalBookings, createExternalBooking, getOrders } from '@/shared/api'
import { useToast } from '@/shared/composables'
import { AppBadge, AppButton } from '@/shared/components/ui'
import { formatISTDateShort } from '@/shared/lib/datetime'
import type { Order } from '@/shared/models'
import RideSelectorModal from '@/shared/components/business/RideSelectorModal.vue'

const route = useRoute()
const { showSuccess, showError } = useToast()

const bookings = ref<any[]>([])
const todayOrders = ref<Order[]>([])
const isLoading = ref(false)
const isOrdersLoading = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const showForm = ref(false)
const showRideModal = ref(false)
const step = ref(1)
const selectedOrder = ref<Order | null>(null)
const selectedBooking = ref<any>(null)

const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  provider: 'Uber',
  cost: undefined as number | undefined,
  service_description: '',
  order_id: '',
})

function openCreateModal(): void {
  resetForm()
  showForm.value = true
  fetchOrders()
}

function closeModal(): void {
  showForm.value = false
}

function resetForm(): void {
  step.value = 1
  selectedOrder.value = null
  form.value = {
    provider: 'Uber',
    cost: undefined,
    service_description: '',
    order_id: '',
  }
  error.value = null
}

async function fetchOrders(): Promise<void> {
  isOrdersLoading.value = true
  try {
    const istToday = formatISTDateShort(new Date().toISOString())
    const res = await getOrders(1, 50, undefined, istToday)
    todayOrders.value = res.data.filter(o => {
      const s = o.status?.toLowerCase()
      return s !== 'completed' && s !== 'cancelled'
    })
  } catch (err) {
    console.error('Failed to fetch orders', err)
  } finally {
    isOrdersLoading.value = false
  }
}

function selectOrder(order: Order): void {
  selectedOrder.value = order
  form.value.order_id = String(order._id || order.id)
  step.value = 2
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    requested: 'Pending',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[status] ?? status
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'default' {
  const s = status?.toLowerCase()
  if (s === 'approved' || s === 'completed') return 'success'
  if (s === 'requested' || s === 'pending') return 'warning'
  if (s === 'rejected' || s === 'cancelled') return 'error'
  return 'default'
}

function formatDate(iso: string): string {
  if (!iso) return 'Today'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

async function fetchBookings(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const res = await getExternalBookings()
    bookings.value = res.map((t: any) => ({
      ...t,
      customer_name: t.order_id?.customer?.full_name || t.order_id?.customer?.name,
      order_number: t.order_id?.order_number,
      provider: t.external_booking_details?.provider,
      cost: t.external_booking_details?.cost,
      status: t.external_booking_details?.reimbursement_status || 'pending',
      service_date: t.created_at,
      pickup: t.pickup_location?.coordinates, // [lng, lat]
      drop: t.drop_location?.coordinates      // [lng, lat]
    }))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load bookings'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  error.value = null
  try {
    let pickup: { latitude: number; longitude: number } | undefined = undefined
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
      pickup = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
    } catch (geoErr) {
      console.warn('Geolocation failed, proceeding without pickup location', geoErr)
    }

    const addr = selectedOrder.value?.delivery_address || selectedOrder.value?.address
    const dropLat = addr?.latitude ? Number(addr.latitude) : undefined
    const dropLng = addr?.longitude ? Number(addr.longitude) : undefined

    await createExternalBooking({
      provider: form.value.provider,
      cost: form.value.cost,
      service_description: form.value.service_description || undefined,
      order_id: form.value.order_id,
      customer_name: selectedOrder.value?.customer?.full_name || 'External',
      service_date: todayStr,
      pickup_location: pickup,
      drop_location: dropLat && dropLng ? {
        latitude: dropLat,
        longitude: dropLng
      } : undefined,
    })
    
    showSuccess('Ride logged successfully')
    showForm.value = false
    fetchBookings()

    if (dropLat && dropLng) {
       if (form.value.provider === 'Uber') {
        window.open(`uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${dropLat}&dropoff[longitude]=${dropLng}`, '_system')
      } else if (form.value.provider === 'Ola') {
        window.open(`olacabs://booking?lat=${dropLat}&lng=${dropLng}`, '_system')
      } else if (form.value.provider === 'Other') {
        // Fallback or generic map
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dropLat},${dropLng}`, '_system')
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to submit'
    showError(error.value)
  } finally {
    isSubmitting.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchBookings()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function openRideSelector(booking: any): void {
  selectedBooking.value = booking
  showRideModal.value = true
}

onMounted(() => {
  fetchBookings()
  if (route.query.order_id) {
    const oid = route.query.order_id as string
    fetchOrders().then(() => {
      const order = todayOrders.value.find(o => String(o.id) === oid)
      if (order) {
        showForm.value = true
        selectOrder(order)
      }
    })
  }
})

onIonViewWillEnter(fetchBookings)
</script>

<style scoped>
.header-icon { font-size: 22px; }

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 16px 16px 0;
  padding: 12px 14px;
  background: var(--color-brand-faint);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-brand-light);
}

.info-banner__icon { font-size: 18px; color: var(--color-brand); flex-shrink: 0; margin-top: 1px; }
.info-banner__text { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5; }

.list { display: flex; flex-direction: column; gap: 12px; padding: 16px; }

.booking-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.booking-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.booking-card__customer { margin: 0; font-size: 16px; font-weight: 800; color: var(--color-text); display: flex; align-items: center; gap: 8px; }
.order-tag { font-size: 10px; background: var(--color-background); padding: 2px 6px; border-radius: 6px; color: var(--color-brand); font-weight: 700; }
.booking-card__meta { margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted); font-weight: 500; }

.booking-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-light);
}

.booking-card__amount { display: flex; align-items: center; gap: 4px; margin: 0; font-size: 16px; font-weight: 800; color: var(--color-text); }

.booking-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ola-dot-xs {
  width: 14px;
  height: 14px;
  background: #000;
  border-radius: 50%;
  border: 2px solid #d7ff13;
}

.booking-card__proof { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-success-text); font-weight: 600; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 80px 40px; text-align: center; }
.empty-state__icon-wrap { width: 80px; height: 80px; background: var(--color-background); border-radius: 30px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.empty-state__icon { font-size: 36px; color: var(--color-text-muted); }
.empty-state__title { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text); }
.empty-state__text { margin: 0; font-size: 15px; color: var(--color-text-muted); line-height: 1.5; }

/* Modal & Form */
.ride-modal { --border-radius: 32px 32px 0 0; }

.modal-header { padding: 24px 24px 16px; background: var(--color-surface); }
.modal-header__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-title { margin: 0; font-size: 24px; font-weight: 900; color: var(--color-text); letter-spacing: -0.5px; }
.close-btn { color: var(--color-text-muted); }

.step-indicator { display: flex; align-items: center; gap: 12px; }
.step-dots { display: flex; gap: 6px; }
.step-dot { width: 24px; height: 6px; border-radius: 3px; background: var(--color-background); transition: all 0.3s ease; }
.step-dot.active { background: var(--color-brand); width: 40px; }
.step-text { font-size: 12px; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

.search-hint { display: flex; align-items: center; gap: 8px; padding: 0 24px 16px; color: var(--color-text-muted); font-size: 14px; font-weight: 600; }

.order-grid { display: flex; flex-direction: column; gap: 10px; padding: 0 20px 32px; }
.order-card-compact { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 16px; 
  background: var(--color-surface); 
  border: 1px solid var(--color-border); 
  border-radius: 20px; 
  transition: all 0.2s ease;
}
.order-card-compact:active { transform: scale(0.97); background: var(--color-background); }
.order-card-compact__left { display: flex; align-items: center; gap: 14px; }
.order-icon-box { width: 44px; height: 44px; background: var(--color-brand-faint); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--color-brand); font-size: 20px; }
.order-id { margin: 0; font-size: 16px; font-weight: 800; color: var(--color-text); }
.order-name { margin: 2px 0 0; font-size: 13px; color: var(--color-text-muted); font-weight: 600; }
.arrow-icon { color: var(--color-text-muted); font-size: 18px; }

.form-body { padding: 0 20px 32px; }
.selected-order-pill { 
  display: flex; 
  align-items: center; 
  gap: 10px; 
  margin-bottom: 24px; 
  padding: 12px 16px; 
  background: var(--color-brand-faint); 
  border-radius: 16px; 
  color: var(--color-brand);
}
.link-icon { font-size: 18px; }
.pill-text { flex: 1; font-size: 13px; font-weight: 700; }
.edit-icon { font-size: 16px; opacity: 0.7; }

.form-sections { display: flex; flex-direction: column; gap: 24px; }
.form-section { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 13px; font-weight: 700; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; padding-left: 4px; }

.provider-segment-custom { --background: var(--color-background); border-radius: 14px; padding: 4px; }
.seg-content { display: flex; align-items: center; gap: 6px; justify-content: center; font-weight: 700; }
.seg-content svg { font-size: 18px; }
.ola-dot { width: 10px; height: 10px; background: #000; border-radius: 50%; }

.amount-input-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: 16px;
  padding: 14px 20px;
  transition: all 0.3s ease;
}
.amount-input-box:focus-within { border-color: var(--color-brand); background: var(--color-surface); box-shadow: 0 0 0 4px var(--color-brand-faint); }
.currency-symbol { font-size: 20px; font-weight: 800; color: var(--color-brand); }
.native-amount-input { flex: 1; border: none; background: transparent; outline: none; font-size: 20px; font-weight: 800; color: var(--color-text); }

.native-textarea {
  width: 100%;
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: 16px;
  padding: 16px;
  outline: none;
  font-size: 15px;
  font-family: inherit;
  transition: all 0.3s ease;
}
.native-textarea:focus { border-color: var(--color-brand); background: var(--color-surface); }

.form-actions { display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }
.form-error-bubble { 
  background: #fef2f2; 
  color: #b91c1c; 
  padding: 12px 16px; 
  border-radius: 12px; 
  font-size: 13px; 
  font-weight: 700; 
  display: flex; 
  align-items: center; 
  gap: 8px;
}
.confirm-btn-custom { 
  --background: linear-gradient(135deg, var(--color-brand) 0%, #4f46e5 100%);
  --background-activated: #4338ca;
  --box-shadow: 0 10px 24px rgba(79, 70, 229, 0.3); 
}

/* Animations */
.anim-fade-in { animation: fadeIn 0.4s ease-out; }
.anim-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.anim-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }

.mt-16 { margin-top: 16px; }
</style>
