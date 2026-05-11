<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Travel Reimbursements</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="New reimbursement" @click="showForm = true">
            <Icon icon="lucide:plus" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeleton -->
      <template v-if="isLoading && reimbursements.length === 0">
        <div class="list">
          <div v-for="n in 3" :key="n" class="skeleton">
            <div class="skeleton__top" />
            <div class="skeleton__mid" />
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else-if="!isLoading && reimbursements.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:receipt" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No reimbursements</p>
          <p class="empty-state__text">Upload travel receipts to get reimbursed.</p>
        </div>
      </template>

      <!-- Error state -->
      <template v-else-if="error && reimbursements.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load reimbursements</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchReimbursements">Retry</ion-button>
        </div>
      </template>

      <!-- List -->
      <template v-else>
        <div class="list">
          <div v-for="item in reimbursements" :key="item.id ?? item._id" class="reimb-card">
            <div class="reimb-card__header">
              <div>
                <p class="reimb-card__date">{{ formatDate(item.travel_date) }}</p>
                <p class="reimb-card__type">{{ travelTypeLabel(item.travel_type) }}</p>
              </div>
              <AppBadge :text="statusLabel(item.status)" :variant="statusVariant(item.status)" size="sm" />
            </div>
            <p v-if="item.description" class="reimb-card__desc">{{ item.description }}</p>
            <div class="reimb-card__footer">
              <span class="reimb-card__amount">
                <Icon icon="lucide:indian-rupee" aria-hidden="true" />
                {{ item.amount.toLocaleString('en-IN') }}
              </span>
              <!-- Upload proof if not yet uploaded and status is requested -->
              <ion-button
                v-if="item.status === 'requested' && !item.proof_url"
                fill="outline"
                size="small"
                @click="openProofUpload(item)"
              >
                <Icon icon="lucide:upload" slot="start" />
                Upload Receipt
              </ion-button>
              <span v-if="item.proof_url" class="reimb-card__proof">
                <Icon icon="lucide:check-circle-2" aria-hidden="true" />
                Receipt uploaded
              </span>
            </div>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- New reimbursement modal -->
    <ion-modal :is-open="showForm" @didDismiss="showForm = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>New Reimbursement</ion-title>
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
            <label class="form-label">Travel Date *</label>
            <input v-model="form.travel_date" type="date" class="form-input" :max="todayStr" />
          </div>
          <div class="form-field">
            <label class="form-label">Travel Type *</label>
            <select v-model="form.travel_type" class="form-select">
              <option value="auto">Auto</option>
              <option value="bus">Bus</option>
              <option value="train">Train</option>
              <option value="cab">Cab</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">Amount (₹) *</label>
            <input v-model.number="form.amount" type="number" class="form-input" placeholder="0" min="1" />
          </div>
          <div class="form-field">
            <label class="form-label">Description</label>
            <textarea v-model="form.description" class="form-textarea" placeholder="Brief description of travel..." rows="3" />
          </div>
          <p v-if="submitError" class="form-error">{{ submitError }}</p>
          <ion-button
            expand="block"
            :disabled="isSubmitting || !form.travel_date || !form.amount"
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
import { onIonViewWillEnter } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { onMounted, ref } from 'vue'
import { createReimbursement, getReimbursements } from '@/shared/api'
import { useToast } from '@/shared/composables'
import type { Reimbursement, ReimbursementStatus, ReimbursementType } from '@/shared/models'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'

const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { user } = storeToRefs(authStore)
const { userType } = storeToRefs(userTypeStore)
const { showSuccess, showError } = useToast()

const reimbursements = ref<Reimbursement[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const submitError = ref<string | null>(null)
const showForm = ref(false)

const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  travel_date: todayStr,
  travel_type: 'auto' as ReimbursementType,
  amount: undefined as number | undefined,
  description: '',
})

function statusLabel(status: ReimbursementStatus): string {
  const map: Record<ReimbursementStatus, string> = {
    requested: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  }
  return map[status] ?? status
}

function statusVariant(status: ReimbursementStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'approved' || status === 'paid') return 'success'
  if (status === 'requested') return 'warning'
  if (status === 'rejected') return 'error'
  return 'default'
}

function travelTypeLabel(type: ReimbursementType): string {
  const map: Record<ReimbursementType, string> = {
    auto: 'Auto',
    bus: 'Bus',
    train: 'Train',
    cab: 'Cab',
    other: 'Other',
  }
  return map[type] ?? type
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function openProofUpload(item: Reimbursement): void {
  // TODO: wire up camera/file picker and uploadReimbursementProof
  showError(`Proof upload for reimbursement ${item.id} — coming soon`)
}

async function fetchReimbursements(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    reimbursements.value = await getReimbursements()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load reimbursements'
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (!user.value || !userType.value || !form.value.amount) return
  isSubmitting.value = true
  submitError.value = null
  try {
    const result = await createReimbursement({
      requester_id: String(user.value.id),
      requester_type: userType.value as 'beautician' | 'rider',
      travel_date: form.value.travel_date,
      travel_type: form.value.travel_type,
      amount: form.value.amount,
      description: form.value.description || undefined,
    })
    reimbursements.value.unshift(result)
    showSuccess('Reimbursement request submitted')
    showForm.value = false
    form.value = { travel_date: todayStr, travel_type: 'auto', amount: undefined, description: '' }
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Failed to submit'
    showError(submitError.value)
  } finally {
    isSubmitting.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchReimbursements()
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(fetchReimbursements)
onIonViewWillEnter(() => {
  if (reimbursements.value.length > 0) fetchReimbursements()
})
</script>

<style scoped>
.header-icon { font-size: 22px; }

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.reimb-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reimb-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.reimb-card__date {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.reimb-card__type {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.reimb-card__desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.reimb-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.reimb-card__amount {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text);
}

.reimb-card__proof {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-sm);
  color: var(--color-success-text);
  font-weight: 600;
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

.form-input, .form-select, .form-textarea {
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

.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--color-brand); }
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
