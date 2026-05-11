<template>
  <ion-page>
    <ion-content class="error-content">
      <div class="error-container">
        <div class="error-icon">
          <Icon icon="lucide:triangle-alert" />
        </div>
        <h1 class="error-title">Something went wrong</h1>
        <p class="error-subtitle">An unexpected error occurred. Please try again or go back home.</p>
        <div class="error-actions">
          <button class="error-btn error-btn--secondary" @click="goBack">Go Back</button>
          <button class="error-btn error-btn--primary" @click="goHome">Go to Home</button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack(): void {
  router.back()
}

function goHome(): void {
  router.replace('/home')
}
</script>

<style scoped>
.error-content {
  --background: var(--color-background);
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 24px;
  text-align: center;
  gap: 16px;
}

.error-icon {
  font-size: 64px;
  color: var(--color-error);
  opacity: 0.7;
  line-height: 1;
}

.error-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.error-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-muted);
  max-width: 280px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.error-btn {
  padding: 14px 28px;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.error-btn:active {
  opacity: 0.8;
}

.error-btn--primary {
  background: var(--color-brand);
  color: #fff;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
}

.error-btn--secondary {
  background: var(--color-border);
  color: var(--color-text);
}
</style>
