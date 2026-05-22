<script setup lang="ts">
import { useGlobalAlerts } from '@/shared/composables/useGlobalAlerts'
import { Icon } from '@iconify/vue'

const { activeAlerts, viewAlert, dismissAlert } = useGlobalAlerts()
</script>

<template>
  <div v-if="activeAlerts.length > 0" class="global-alert-overlay">
    <div
      v-for="alert in activeAlerts"
      :key="alert.id"
      class="alert-box"
      :class="alert.type === 'trip_assigned' ? 'alert-trip' : 'alert-order'"
    >
      <div class="alert-icon-wrap">
        <Icon 
          :icon="alert.type === 'trip_assigned' ? 'lucide:car' : 'lucide:briefcase'" 
          class="alert-icon pulse-anim" 
        />
      </div>
      
      <div class="alert-content">
        <h3 class="alert-title">{{ alert.title }}</h3>
        <p class="alert-body">{{ alert.body }}</p>
      </div>

      <div class="alert-actions">
        <button class="btn-dismiss" @click="dismissAlert(alert.id)">Dismiss</button>
        <button class="btn-view" @click="viewAlert(alert.id, alert.type, alert.data)">
          View Details
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  gap: 1rem;
}

.alert-box {
  background: var(--ion-background-color, #ffffff);
  border-radius: 20px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.25rem;
  animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  border-top: 5px solid var(--ion-color-primary, #3880ff);
}

.alert-trip {
  border-top-color: var(--ion-color-secondary, #3dc2ff);
}
.alert-order {
  border-top-color: var(--ion-color-primary, #3880ff);
}

.alert-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light, #f4f5f8);
}

.alert-icon {
  font-size: 36px;
  color: var(--ion-color-primary, #3880ff);
}
.alert-trip .alert-icon {
  color: var(--ion-color-secondary, #3dc2ff);
}

.alert-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ion-text-color, #000);
}

.alert-body {
  margin: 0;
  font-size: 1rem;
  color: var(--ion-color-medium, #92949c);
  line-height: 1.4;
}

.alert-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.5rem;
}

.btn-dismiss, .btn-view {
  flex: 1;
  padding: 0.875rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  outline: none;
}

.btn-dismiss:active, .btn-view:active {
  transform: scale(0.96);
}

.btn-dismiss {
  background: var(--ion-color-light, #f4f5f8);
  color: var(--ion-text-color, #000);
}

.btn-view {
  background: var(--ion-color-primary, #3880ff);
  color: var(--ion-color-primary-contrast, #fff);
}
.alert-trip .btn-view {
  background: var(--ion-color-secondary, #3dc2ff);
  color: var(--ion-color-secondary-contrast, #fff);
}

@keyframes slide-up-fade {
  0% {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.pulse-anim {
  animation: pulse-icon 1.5s infinite;
}

@keyframes pulse-icon {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
</style>
