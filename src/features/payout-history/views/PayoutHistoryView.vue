<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Payout History</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <template v-if="isLoading && entries.length === 0">
        <div class="summary-skeleton" />
        <div class="list">
          <div v-for="n in 4" :key="n" class="entry-skeleton" />
        </div>
      </template>

      <template v-else-if="error && entries.length === 0">
        <div class="empty-state">
          <Icon icon="lucide:wifi-off" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">Could not load payouts</p>
          <p class="empty-state__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchPayouts(true)">Retry</ion-button>
        </div>
      </template>

      <template v-else>
        <div v-if="entries.length > 0" class="summary-card">
          <p class="summary-card__label">{{ roleLabel }} payouts</p>
          <p class="summary-card__amount">{{ formatCurrency(summaryTotal) }}</p>
          <div class="summary-grid">
            <div>
              <span class="summary-grid__label">Previous</span>
              <strong>{{ formatCurrency(summary?.last_month_total ?? lastMonthTotal) }}</strong>
            </div>
            <div>
              <span class="summary-grid__label">Paid Total</span>
              <strong>{{ formatCurrency(summary?.paid_total ?? paidTotal) }}</strong>
            </div>
          </div>
        </div>

        <div v-if="error" class="error-banner" role="alert">
          <Icon icon="lucide:alert-circle" aria-hidden="true" />
          {{ error }}
        </div>

        <div v-if="entries.length === 0" class="empty-state">
          <Icon icon="lucide:wallet-cards" class="empty-state__icon" aria-hidden="true" />
          <p class="empty-state__title">No payout history yet</p>
          <p class="empty-state__text">Paid payouts recorded by admin or staff will appear here.</p>
        </div>

        <div v-else class="list">
          <section v-for="entry in entries" :key="entry.id" class="payout-card">
            <div class="payout-card__header">
              <div>
                <p class="payout-card__month">{{ entry.month_label }}</p>
                <p class="payout-card__meta">{{ statusLabel(entry.status) }}</p>
              </div>
              <div class="payout-card__total">
                <span>Total</span>
                <strong>{{ formatCurrency(entry.total_amount) }}</strong>
              </div>
            </div>

            <div
              v-if="entry.role === 'beautician' && entry.commission_achieved === false"
              class="achievement-note"
            >
              <Icon icon="lucide:circle-alert" aria-hidden="true" />
              Commission target was not achieved. Payout shown as 0.
            </div>

            <div class="component-list">
              <div
                v-for="component in entry.components"
                :key="`${entry.id}-${component.type}`"
                class="component-row"
              >
                <div class="component-row__label">
                  <Icon :icon="componentIcon(component.type)" aria-hidden="true" />
                  <span>{{ component.label }}</span>
                </div>
                <div class="component-row__amount">
                  <strong>{{ formatCurrency(component.amount) }}</strong>
                  <span>{{ componentStatus(component) }}</span>
                </div>
              </div>
            </div>

            <p v-if="entry.paid_at" class="paid-date">
              Paid on {{ formatDate(entry.paid_at) }}
            </p>
          </section>
        </div>

        <ion-infinite-scroll @ionInfinite="loadMore" :disabled="!hasMore">
          <ion-infinite-scroll-content loading-spinner="crescent" loading-text="Loading more payouts..." />
        </ion-infinite-scroll>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { getPayoutHistory } from '@/shared/api'
import type {
  PayoutComponent,
  PayoutComponentType,
  PayoutHistoryEntry,
  PayoutHistorySummary,
  PayoutStatus,
} from '@/shared/models'
import { useUserTypeStore } from '@/shared/stores/userType'

const userTypeStore = useUserTypeStore()
const entries = ref<PayoutHistoryEntry[]>([])
const summary = ref<PayoutHistorySummary | undefined>()
const isLoading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const hasMore = ref(true)
const limit = 10

const roleLabel = computed(() => (userTypeStore.isRider ? 'Rider' : 'Beautician'))
const summaryTotal = computed(
  () => summary.value?.current_month_total ?? entries.value[0]?.total_amount ?? 0
)
const lastMonthTotal = computed(() => entries.value[1]?.total_amount ?? 0)
const paidTotal = computed(() =>
  entries.value.reduce((total, entry) => total + entry.total_amount, 0)
)

function formatCurrency(amount: number): string {
  return `₹${Math.max(0, amount).toLocaleString('en-IN')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status?: PayoutStatus): string {
  if (status === 'paid') return 'Paid'
  if (status === 'processing') return 'Processing'
  if (status === 'failed') return 'Failed'
  return 'Pending payout'
}

function componentStatus(component: PayoutComponent): string {
  if (component.paid_at) return `Paid ${formatDate(component.paid_at)}`
  return statusLabel(component.status)
}

function componentIcon(type: PayoutComponentType): string {
  return type === 'petrol' ? 'lucide:fuel' : 'lucide:badge-indian-rupee'
}

async function fetchPayouts(reset = false): Promise<void> {
  if (isLoading.value) return
  isLoading.value = true
  error.value = null
  try {
    if (reset) {
      page.value = 1
      hasMore.value = true
    }

    const response = await getPayoutHistory({ page: page.value, limit })
    summary.value = response.summary
    entries.value = reset ? response.entries : [...entries.value, ...response.entries]
    hasMore.value = response.hasNextPage
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load payouts'
  } finally {
    isLoading.value = false
  }
}

async function loadMore(event: CustomEvent): Promise<void> {
  if (!hasMore.value) {
    ;(event.target as HTMLIonInfiniteScrollElement).complete()
    return
  }

  page.value += 1
  await fetchPayouts()
  ;(event.target as HTMLIonInfiniteScrollElement).complete()
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchPayouts(true)
  ;(event.target as HTMLIonRefresherElement).complete()
}

onMounted(() => fetchPayouts(true))
onIonViewWillEnter(() => {
  if (entries.value.length === 0) fetchPayouts(true)
})
</script>

<style scoped>
.summary-card {
  margin: 16px;
  padding: 18px;
  border-radius: var(--radius-xl);
  color: #fff;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
}

.summary-card__label {
  margin: 0 0 6px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  opacity: 0.8;
}

.summary-card__amount {
  margin: 0;
  font-size: 34px;
  font-weight: 850;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.summary-grid > div {
  padding: 10px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.14);
}

.summary-grid__label {
  display: block;
  margin-bottom: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  opacity: 0.75;
  text-transform: uppercase;
}

.summary-grid strong {
  font-size: var(--font-size-lg);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 20px;
}

.payout-card {
  padding: 14px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}

.payout-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.payout-card__month {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text);
}

.payout-card__meta {
  margin: 3px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.payout-card__total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.payout-card__total span {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.payout-card__total strong {
  font-size: var(--font-size-lg);
  color: var(--color-success-text);
}

.achievement-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-lg);
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.component-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.component-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.component-row__label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text);
}

.component-row__label svg {
  flex-shrink: 0;
  color: var(--color-brand);
}

.component-row__amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.component-row__amount strong {
  font-size: var(--font-size-base);
  color: var(--color-text);
}

.component-row__amount span {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.paid-date {
  margin: 10px 0 0;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 12px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  color: var(--color-error);
  background: var(--color-error-bg);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 24px 16px;
  padding: 52px 28px;
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  text-align: center;
}

.empty-state__icon {
  font-size: 36px;
  color: var(--color-brand);
}

.empty-state__title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text);
}

.empty-state__text {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.45;
}

.summary-skeleton,
.entry-skeleton {
  border-radius: var(--radius-xl);
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 37%, #eee 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.summary-skeleton {
  height: 150px;
  margin: 16px;
}

.entry-skeleton {
  height: 148px;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
</style>
