<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>Complaints</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading skeleton -->
      <template v-if="isLoading && complaints.length === 0">
        <div class="complaints-list">
          <div v-for="n in 3" :key="n" class="complaint-skeleton">
            <div class="complaint-skeleton__title" />
            <div class="complaint-skeleton__body" />
          </div>
        </div>
      </template>

      <!-- Empty -->
      <template v-else-if="!isLoading && complaints.length === 0">
        <div class="complaints-empty">
          <Icon icon="lucide:message-circle-off" class="complaints-empty__icon" aria-hidden="true" />
          <p class="complaints-empty__title">No complaints</p>
          <p class="complaints-empty__text">Complaints visible to you will appear here.</p>
        </div>
      </template>

      <!-- Error -->
      <template v-else-if="error && complaints.length === 0">
        <div class="complaints-empty">
          <Icon icon="lucide:wifi-off" class="complaints-empty__icon" aria-hidden="true" />
          <p class="complaints-empty__title">Could not load complaints</p>
          <p class="complaints-empty__text">{{ error }}</p>
          <ion-button fill="outline" size="small" @click="fetchComplaints">Retry</ion-button>
        </div>
      </template>

      <!-- List -->
      <template v-else>
        <div class="complaints-list">
          <div
            v-for="complaint in complaints"
            :key="complaint.id ?? complaint._id"
            class="complaint-card"
          >
            <div class="complaint-card__header">
              <p class="complaint-card__title">{{ complaint.title ?? 'Complaint' }}</p>
              <AppBadge
                v-if="complaint.status"
                :text="complaint.status"
                :variant="statusVariant(complaint.status)"
                size="sm"
              />
            </div>
            <p v-if="complaint.description" class="complaint-card__desc">
              {{ complaint.description }}
            </p>
            <div class="complaint-card__meta">
              <span v-if="complaint.order_number" class="complaint-card__order">
                <Icon icon="lucide:hash" aria-hidden="true" />
                Order {{ complaint.order_number }}
              </span>
              <span v-if="complaint.customer_name" class="complaint-card__customer">
                <Icon icon="lucide:user" aria-hidden="true" />
                {{ complaint.customer_name }}
              </span>
              <span v-if="complaint.created_at" class="complaint-card__date">
                {{ formatDate(complaint.created_at) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getComplaints } from '@/shared/api'
import type { Complaint } from '@/shared/models'

const complaints = ref<Complaint[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function fetchComplaints(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    complaints.value = await getComplaints()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load complaints'
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchComplaints()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    open: 'warning',
    in_progress: 'info',
    resolved: 'success',
    closed: 'default',
  }
  return map[status] ?? 'default'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(fetchComplaints)
</script>

<style scoped>
.complaints-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.complaint-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.complaint-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.complaint-card__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text);
}

.complaint-card__desc {
  margin: 0 0 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.complaint-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.complaint-card__order,
.complaint-card__customer,
.complaint-card__date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* Empty */
.complaints-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 80px 32px;
  text-align: center;
}

.complaints-empty__icon { font-size: 52px; color: var(--color-text-muted); margin-bottom: 8px; }
.complaints-empty__title { margin: 0; font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
.complaints-empty__text { margin: 0; font-size: var(--font-size-base); color: var(--color-text-muted); }

/* Skeleton */
.complaint-skeleton {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.complaint-skeleton__title,
.complaint-skeleton__body {
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--color-border) 25%, var(--color-background) 50%, var(--color-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.complaint-skeleton__title { height: 18px; width: 60%; }
.complaint-skeleton__body  { height: 40px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
