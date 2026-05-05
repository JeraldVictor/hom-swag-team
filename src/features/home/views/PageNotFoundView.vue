<template>
  <ion-page>
    <ion-content class="not-found-content">
      <div class="not-found-container">
        <img
          src="@/shared/images/404.png"
          alt="Page not found"
          class="not-found-illustration"
        />
        <h1 class="not-found-title">Page not found</h1>
        <p class="not-found-subtitle">The page you're looking for doesn't exist or has been moved.</p>
        <button class="not-found-btn" @click="goHome">Go to Home</button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome(): void {
  router.replace('/home')
}
</script>

<style scoped>
.not-found-content {
  --background: var(--color-background);
}

.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 24px;
  text-align: center;
  gap: 16px;
}

.not-found-illustration {
  width: 220px;
  height: auto;
  object-fit: contain;
  margin-bottom: 8px;
}

.not-found-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.not-found-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-muted);
  max-width: 280px;
  line-height: 1.6;
}

.not-found-btn {
  margin-top: 8px;
  padding: 14px 32px;
  background: var(--color-brand);
  color: #fff;
  border: none;
  border-radius: var(--radius-xl);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
  transition: opacity 0.15s ease;
}

.not-found-btn:active {
  opacity: 0.8;
}
</style>
