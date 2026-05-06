<template>
  <div class="no-internet">
    <div class="no-internet__content">
      <!-- Animated icon -->
      <div class="no-internet__icon-wrap" aria-hidden="true">
        <Icon icon="lucide:wifi-off" class="no-internet__icon" />
      </div>

      <h1 class="no-internet__title">No Internet Connection</h1>
      <p class="no-internet__body">
        HomSwag requires an active internet connection to work. Please check your Wi-Fi or mobile
        data and try again.
      </p>

      <button
        class="no-internet__btn"
        :disabled="isChecking"
        aria-label="Retry connection"
        @click="retry"
      >
        <Icon v-if="isChecking" icon="lucide:loader-circle" class="no-internet__btn-icon spinning" />
        <Icon v-else icon="lucide:refresh-cw" class="no-internet__btn-icon" />
        {{ isChecking ? 'Checking…' : 'Try Again' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const isChecking = ref(false)

async function retry() {
  isChecking.value = true
  // Give the browser a moment to re-evaluate connectivity
  await new Promise((resolve) => setTimeout(resolve, 800))
  isChecking.value = false
  emit('retry')
}
</script>

<style scoped>
.no-internet {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  padding: var(--spacing-6);
}

.no-internet__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  gap: var(--spacing-4);
}

.no-internet__icon-wrap {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
  background: var(--color-error-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-2);
  font-size: 48px;
  color: var(--color-error);
}

.no-internet__icon {
  width: 1em;
  height: 1em;
}

.no-internet__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0;
  line-height: 1.2;
}

.no-internet__body {
  font-size: var(--font-size-base);
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.6;
}

.no-internet__btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-full);
  border: none;
  background: var(--color-brand);
  color: #fff;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.no-internet__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-internet__btn-icon {
  font-size: 18px;
  width: 1em;
  height: 1em;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 0.8s linear infinite;
}
</style>
