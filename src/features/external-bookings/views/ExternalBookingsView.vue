<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>External Bookings</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Add external booking" @click="showForm = true">
            <Icon icon="lucide:plus" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Info banner -->
      <div class="info-banner">
        <Icon icon="lucide:info" class="info-banner__icon" aria-hidden="true" />
        <p class="info-banner__text">
          Log bookings you sourced independently. Upload proof to get them approved.
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
        <div class="empty-state">
          <Icon icon="lucide:calendar-plus" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No external bookings</p>
          <p class="empty-state__text">Tap + to log a booking you sourced yourself.</p>
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error && bookings.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load bookings</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchBookings">Retry</ion-button>
        </div>
      </template>

      <!-- Bookings list -->
      <template v-else>
        <div class="list">
          <div v-for="booking in bookings" :key="booking.id ?? booking._id" class="booking-card">
            <div class="booking-card__header">
              <div>
                <p class="booking-card__customer">{{ booking.customer_name }}</p>
                <p class="booking-card__meta">
                  {{ formatDate(booking.service_date) }}
                  <span v-if="booking.service_time"> · {{ booking.service_time }}</span>
                </p>
              </div>
              <AppBadge :text="statusLabel(booking.status)" :variant="statusVariant(booking.status)" size="sm" />
            </div>
            <p v-if="booking.service_description" class="booking-card__desc">
              {{ booking.service_description }}
            </p>
            <p v-if="booking.amount" class="booking-card__amount">
              <Icon icon="lucide:indian-rupee" aria-hidden="true" />
              {{ booking.amount.toLocaleString('en-IN') }}
            </p>
            <!-- Upload proof button for approved bookings without proof -->
            <div v-if="booking.status === 'approved' && !booking.proof_url" class="booking-card__actions">
              <ion-button fill="outline" size="small" @click="openProofUpload(booking)">
                <Icon icon="lucide:upload" slot="start" />
                Upload Proof
              </ion-button>
            </div>
            <div v-if="booking.proof_url" class="booking-card__proof">
              <Icon icon="lucide:image" aria-hidden="true" />
              <span>Proof uploaded</span>
            </div>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- New booking modal -->
    <ion-modal :is-open="showForm" @didDismiss="showForm = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Log External Booking</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showForm = false">
              <Icon icon="lucide:x" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="form-content">
        <div class="form-body">
          <div class="form-field">
            <label class="form-label">Customer Name *</label>
            <input v-model="form.customer_name" type="text" class="form-input" placeholder="Customer's full name" />
          </div>
          <div class="form-field">
            <label class="form-label">Customer Phone</label>
            <input v-model="form.customer_phone" type="tel" class="form-input" placeholder="+91 XXXXX XXXXX" />
          </div>
          <div class="form-field">
            <label class="form-label">Service Date *</label>
            <input v-model="form.service_date" type="date" class="form-input" />
          </div>
          <div class="form-field">
            <label class="form-label">Service Time</label>
            <input v-model="form.service_time" type="time" class="form-input" />
          </div>
          <div class="form-field">
            <label class="form-label">Service Description</label>
            <textarea v-model="form.service_description" class="form-textarea" placeholder="What services were performed?" rows="3" />
          </div>
          <div class="form-field">
            <label class="form-label">Amount (₹)</label>
            <input v-model.number="form.amount" type="number" class="form-input" placeholder="0" min="0" />
          </div>
          <div class="form-field">
            <label class="form-label">Address</label>
            <input v-model="form.address" type="text" class="form-input" placeholder="Customer's address" />
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>
          <ion-button
            expand="block"
            :disabled="isSubmitting || !form.customer_name || !form.service_date"
            class="submit-btn"
            @click="handleSubmit"
          >
            <ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
            Submit Request
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonBackButton,
  IonContent, IonRefresher, IonRefresherContent, IonModal, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { getExternalBookings, createExternalBooking } from '@/shared/api'
import { useToast } from '@/shared/composables'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import type { ExternalBooking, ExternalBookingStatus } from '@/shared/models'

const { showSuccess, showError } = useToast()

const bookings = ref<ExternalBooking[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const showForm = ref(false)

const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  customer_name: '',
  customer_phone: '',
  service_date: todayStr,
  service_time: '',
  service_description: '',
  amount: undefined as number | undefined,
  address: '',
})

function statusLabel(status: ExternalBookingStatus): string {
  const map: Record<ExternalBookingStatus, string> = {
    requested: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[status] ?? status
}

function statusVariant(status: ExternalBookingStatus): 'success' | 'warning' | 'error' | 'default' {
  const map: Record<ExternalBookingStatus, 'success' | 'warning' | 'error' | 'default'> = {
    approved: 'success',
    requested: 'warning',
    rejected: 'error',
  }
  return map[status] ?? 'default'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function openProofUpload(booking: ExternalBooking): void {
  // TODO: wire up camera/file picker and uploadExternalBookingProof
  showError(`Proof upload for booking ${booking.id} — coming soon`)
}

async function fetchBookings(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    bookings.value = await getExternalBookings()
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
    const result = await createExternalBooking({
      customer_name: form.value.customer_name,
      customer_phone: form.value.customer_phone || undefined,
      service_date: form.value.service_date,
      service_time: form.value.service_time || undefined,
      service_description: form.value.service_description || undefined,
      amount: form.value.amount,
      address: form.value.address || undefined,
    })
    bookings.value.unshift(result)
    showSuccess('External booking submitted')
    showForm.value = false
    form.value = {
      customer_name: '',
      customer_phone: '',
      service_date: todayStr,
      service_time: '',
      service_description: '',
      amount: undefined,
      address: '',
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

onMounted(fetchBookings)
onIonViewWillEnter(() => {
  if (bookings.value.length > 0) fetchBookings()
})
</script>

<style scoped>
.header-icon { font-size: 22px; }

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 16px 16px 0;
  padding: 12px 14px;
  background: var(--color-info-bg);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-info);
}

.info-banner__icon { font-size: 18px; color: var(--color-info-text); flex-shrink: 0; margin-top: 1px; }

.info-banner__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-info-text);
  line-height: 1.5;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.booking-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.booking-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.booking-card__customer {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.booking-card__meta {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.booking-card__desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.booking-card__amount {
  display: flex;
  align-items: center;
  gap: 3px;
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-success-text);
}

.booking-card__actions { display: flex; }

.booking-card__proof {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-success-text);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.empty-state__icon { font-size: 52px; color: var(--color-text-muted); margin-bottom: 8px; }
.empty-state__title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.empty-state__text { margin: 0; font-size: var(--font-size-base); color: var(--color-text-muted); }

/* Skeleton */
.skeleton {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton__top, .skeleton__mid {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton__top { height: 18px; width: 55%; }
.skeleton__mid { height: 14px; width: 40%; }

/* Form */
.form-content { --padding-bottom: 32px; }

.form-body {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input, .form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-surface);
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}

.form-input:focus, .form-textarea:focus { border-color: var(--color-brand); }
.form-textarea { resize: vertical; }

.submit-btn { --border-radius: var(--radius-xl); margin-top: 4px; }

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
