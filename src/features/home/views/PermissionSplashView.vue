<template>
  <div class="perm-splash">
    <!-- Logo / branding -->
    <div class="perm-splash__header">
      <img
        :src="logo"
        alt="HomSwag"
        class="perm-splash__logo"
      />
      <h1 class="perm-splash__app-name">HomSwag Team</h1>
    </div>

    <!-- Intro copy -->
    <div class="perm-splash__intro">
      <p class="perm-splash__subtitle">
        To give you the best experience, HomSwag needs a few permissions before you get started.
      </p>
    </div>

    <!-- Permission list -->
    <div class="perm-splash__list" role="list">
      <div
        v-for="perm in permissions"
        :key="perm.key"
        class="perm-splash__item"
        role="listitem"
      >
        <!-- Icon -->
        <div
          class="perm-splash__item-icon"
          :class="`perm-splash__item-icon--${statusClass(perm.key)}`"
          aria-hidden="true"
        >
          <Icon :icon="perm.icon" class="perm-splash__icon" />
        </div>

        <!-- Text -->
        <div class="perm-splash__item-text">
          <span class="perm-splash__item-name">{{ perm.label }}</span>
          <span class="perm-splash__item-desc">{{ perm.description }}</span>
        </div>

        <!-- Status badge -->
        <div class="perm-splash__item-status" :aria-label="`${perm.label}: ${statusLabel(perm.key)}`">
          <Icon
            v-if="statusClass(perm.key) === 'granted'"
            icon="lucide:check-circle"
            class="perm-splash__status-icon perm-splash__status-icon--granted"
          />
          <Icon
            v-else-if="statusClass(perm.key) === 'denied'"
            icon="lucide:x-circle"
            class="perm-splash__status-icon perm-splash__status-icon--denied"
          />
          <Icon
            v-else-if="statusClass(perm.key) === 'loading'"
            icon="lucide:loader-circle"
            class="perm-splash__status-icon perm-splash__status-icon--loading spinning"
          />
          <Icon
            v-else
            icon="lucide:circle"
            class="perm-splash__status-icon perm-splash__status-icon--idle"
          />
        </div>
      </div>
    </div>

    <!-- Denied warning -->
    <div v-if="hasDenied" class="perm-splash__warning" role="alert">
      <Icon icon="lucide:alert-triangle" class="perm-splash__warning-icon" aria-hidden="true" />
      <p class="perm-splash__warning-text">
        Some permissions were denied. Please open
        <strong>Settings → HomSwag</strong> and enable them, then tap Continue.
      </p>
    </div>

    <!-- CTA -->
    <div class="perm-splash__footer">
      <button
        v-if="!requested"
        class="perm-splash__btn perm-splash__btn--primary"
        :disabled="isLoading"
        @click="handleRequest"
      >
        <Icon
          v-if="isLoading"
          icon="lucide:loader-circle"
          class="perm-splash__btn-icon spinning"
          aria-hidden="true"
        />
        {{ isLoading ? 'Requesting…' : 'Grant Permissions' }}
      </button>

      <button
        v-else
        class="perm-splash__btn perm-splash__btn--primary"
        :disabled="isLoading || statuses.location !== 'granted'"
        @click="handleContinue"
      >
        {{ statuses.location === 'granted' ? 'Continue' : 'Location required' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { usePermissions } from '@/shared/composables/usePermissions'
import type { PermissionState } from '@/shared/composables/usePermissions'
import logo from '@/shared/images/HomSwagLogo.png'

const emit = defineEmits<{
  (e: 'granted'): void
}>()

const { statuses, isLoading, requestAll } = usePermissions()

const requested = ref(false)
const activeKey = ref<string | null>(null)

// ---------------------------------------------------------------------------
// Permission definitions
// ---------------------------------------------------------------------------

const permissions = [
  {
    key: 'location' as const,
    label: 'Location',
    icon: 'lucide:map-pin',
    description: 'Required for tracking trips and orders in real time.',
  },
  {
    key: 'camera' as const,
    label: 'Camera',
    icon: 'lucide:camera',
    description: 'Used to capture photos for orders and profile.',
  },
  {
    key: 'notifications' as const,
    label: 'Notifications',
    icon: 'lucide:bell',
    description: 'Keeps you updated on new orders, trips, and alerts.',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PermKey = 'location' | 'camera' | 'notifications'

function statusClass(key: PermKey): 'granted' | 'denied' | 'loading' | 'idle' {
  if (activeKey.value === key && isLoading.value) return 'loading'
  const s: PermissionState = statuses.value[key]
  if (s === 'granted') return 'granted'
  if (s === 'denied') return 'denied'
  return 'idle'
}

function statusLabel(key: PermKey): string {
  const map: Record<string, string> = {
    granted: 'Granted',
    denied: 'Denied',
    loading: 'Requesting…',
    idle: 'Not yet requested',
  }
  return map[statusClass(key)] ?? 'Unknown'
}

const hasDenied = computed(() =>
  permissions.some((p) => statuses.value[p.key] === 'denied'),
)

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleRequest() {
  for (const perm of permissions) {
    activeKey.value = perm.key
    // Small delay so the user sees the loading state per item
    await new Promise((r) => setTimeout(r, 200))
  }
  activeKey.value = null
  await requestAll()
  requested.value = true
}

function handleContinue() {
  // Location is required — only proceed if it was granted
  if (statuses.value.location !== 'granted') return
  emit('granted')
}
</script>

<style scoped>
.perm-splash {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-background);
  padding: var(--spacing-8) var(--spacing-6) var(--spacing-6);
  overflow-y: auto;
}

/* ── Header ── */
.perm-splash__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.perm-splash__logo {
  width: 72px;
  height: 72px;
  object-fit: contain;
  border-radius: var(--radius-xl);
}

.perm-splash__app-name {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0;
}

/* ── Intro ── */
.perm-splash__intro {
  max-width: 320px;
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.perm-splash__subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.6;
}

/* ── Permission list ── */
.perm-splash__list {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.perm-splash__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
}

/* Item icon bubble */
.perm-splash__item-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-brand-pale);
}

.perm-splash__item-icon--granted {
  background: var(--color-success-bg);
}

.perm-splash__item-icon--denied {
  background: var(--color-error-bg);
}

.perm-splash__item-icon--loading {
  background: var(--color-info-bg);
}

.perm-splash__icon {
  width: 22px;
  height: 22px;
  color: var(--color-brand);
}

.perm-splash__item-icon--granted .perm-splash__icon {
  color: var(--color-success);
}

.perm-splash__item-icon--denied .perm-splash__icon {
  color: var(--color-error);
}

.perm-splash__item-icon--loading .perm-splash__icon {
  color: var(--color-info);
}

/* Item text */
.perm-splash__item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.perm-splash__item-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.perm-splash__item-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.4;
}

/* Status icon */
.perm-splash__item-status {
  flex-shrink: 0;
}

.perm-splash__status-icon {
  width: 22px;
  height: 22px;
}

.perm-splash__status-icon--granted {
  color: var(--color-success);
}

.perm-splash__status-icon--denied {
  color: var(--color-error);
}

.perm-splash__status-icon--loading {
  color: var(--color-info);
}

.perm-splash__status-icon--idle {
  color: var(--color-border);
}

/* ── Warning ── */
.perm-splash__warning {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  max-width: 400px;
  width: 100%;
  margin-bottom: var(--spacing-4);
}

.perm-splash__warning-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--color-warning);
  margin-top: 2px;
}

.perm-splash__warning-text {
  font-size: var(--font-size-sm);
  color: var(--color-warning-text);
  margin: 0;
  line-height: 1.5;
}

/* ── Footer / CTA ── */
.perm-splash__footer {
  margin-top: auto;
  padding-top: var(--spacing-4);
  width: 100%;
  max-width: 400px;
}

.perm-splash__btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--radius-full);
  border: none;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.perm-splash__btn--primary {
  background: var(--color-brand);
  color: #fff;
}

.perm-splash__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.perm-splash__btn-icon {
  width: 18px;
  height: 18px;
}

/* ── Spinner ── */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 0.8s linear infinite;
}
</style>
