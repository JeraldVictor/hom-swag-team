<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { onUnmounted, ref, watch } from 'vue'
import { useGlobalAlerts } from '@/shared/composables/useGlobalAlerts'

const { activeAlerts, viewAlert, dismissAlert } = useGlobalAlerts()

// Per-alert countdown timers (seconds remaining).
// Alerts auto-dismiss after AUTO_DISMISS_SECONDS if not acted on.
const AUTO_DISMISS_SECONDS = 60
const countdowns = ref<Record<string, number>>({})
const intervalHandles: Record<string, ReturnType<typeof setInterval>> = {}

function startCountdown(alertId: string) {
  if (intervalHandles[alertId]) return
  countdowns.value[alertId] = AUTO_DISMISS_SECONDS
  intervalHandles[alertId] = setInterval(() => {
    const remaining = (countdowns.value[alertId] ?? 0) - 1
    countdowns.value[alertId] = remaining
    if (remaining <= 0) {
      clearInterval(intervalHandles[alertId])
      delete intervalHandles[alertId]
      dismissAlert(alertId)
    }
  }, 1000)
}

function stopCountdown(alertId: string) {
  if (intervalHandles[alertId]) {
    clearInterval(intervalHandles[alertId])
    delete intervalHandles[alertId]
  }
  delete countdowns.value[alertId]
}

// Start a countdown for every new alert; clean up when an alert is removed.
watch(
  () => activeAlerts.value.map(a => a.id),
  (newIds, oldIds = []) => {
    console.log('[GlobalAlertBox] activeAlerts changed:', newIds)
    const added = newIds.filter(id => !oldIds.includes(id))
    const removed = oldIds.filter(id => !newIds.includes(id))
    added.forEach(startCountdown)
    removed.forEach(stopCountdown)
  },
  { immediate: true }
)

onUnmounted(() => {
  Object.keys(intervalHandles).forEach(id => clearInterval(intervalHandles[id]))
})
</script>

<template>
  <div v-if="activeAlerts.length > 0" class="global-alert-overlay">
    <div
      v-for="alert in activeAlerts"
      :key="alert.id"
      class="alert-box"
      :class="alert.type === 'trip_assigned' ? 'alert-trip' : 'alert-order'"
    >
      <!-- Pulsing ring indicator mimics Uber incoming ride ring -->
      <div class="ring-wrap">
        <div class="ring ring-1" />
        <div class="ring ring-2" />
        <div class="ring ring-3" />
        <div class="icon-circle">
          <Icon
            :icon="alert.type === 'trip_assigned' ? 'lucide:car' : 'lucide:briefcase'"
            class="alert-icon"
          />
        </div>
      </div>

      <div class="alert-content">
        <h3 class="alert-title">{{ alert.title }}</h3>
        <p class="alert-body">{{ alert.body }}</p>
      </div>

      <!-- Countdown arc -->
      <div v-if="countdowns[alert.id] !== undefined" class="countdown-wrap">
        <svg class="countdown-svg" viewBox="0 0 44 44">
          <circle class="countdown-track" cx="22" cy="22" r="18" />
          <circle
            class="countdown-fill"
            cx="22"
            cy="22"
            r="18"
            :style="{
              strokeDashoffset: `${113.1 - (113.1 * (countdowns[alert.id] ?? 0)) / 60}`,
            }"
          />
        </svg>
        <span class="countdown-label">{{ countdowns[alert.id] }}s</span>
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
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  border-radius: 24px;
  padding: 2rem 1.5rem 1.5rem;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.25rem;
  animation: slide-up-fade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  border-top: 4px solid var(--ion-color-primary, #3880ff);
  position: relative;
}

.alert-trip  { --alert-color: var(--ion-color-secondary, #3dc2ff); border-top-color: var(--alert-color); }
.alert-order { --alert-color: var(--ion-color-primary,   #3880ff); border-top-color: var(--alert-color); }

/* ---- Pulsing rings ---- */
.ring-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring {
  position: absolute;
  border-radius: 50%;
  background: color-mix(in srgb, var(--alert-color, #3880ff) 18%, transparent);
  animation: ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.ring-1 { width: 96px;  height: 96px;  animation-delay: 0s;    }
.ring-2 { width: 78px;  height: 78px;  animation-delay: 0.35s; }
.ring-3 { width: 60px;  height: 60px;  animation-delay: 0.7s;  }

@keyframes ring-pulse {
  0%, 100% { transform: scale(1);    opacity: 0.7; }
  50%       { transform: scale(1.18); opacity: 0.2; }
}

.icon-circle {
  position: relative;
  z-index: 1;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--alert-color, #3880ff);
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-icon {
  font-size: 26px;
  color: #fff;
}

/* ---- Text ---- */
.alert-content { width: 100%; }

.alert-title {
  margin: 0 0 0.4rem;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--ion-text-color, #000);
}

.alert-body {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ion-color-medium, #92949c);
  line-height: 1.45;
}

/* ---- Countdown arc ---- */
.countdown-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.countdown-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.countdown-track {
  fill: none;
  stroke: var(--ion-color-light, #e8eaed);
  stroke-width: 3;
}

.countdown-fill {
  fill: none;
  stroke: var(--alert-color, #3880ff);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 113.1;
  transition: stroke-dashoffset 1s linear;
}

.countdown-label {
  position: relative;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--ion-color-medium, #92949c);
}

/* ---- Action buttons ---- */
.alert-actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.btn-dismiss,
.btn-view {
  flex: 1;
  padding: 0.9rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.btn-dismiss:active,
.btn-view:active {
  transform: scale(0.95);
  opacity: 0.85;
}

.btn-dismiss {
  background: var(--ion-color-light, #f4f5f8);
  color: var(--ion-text-color, #000);
}

.btn-view {
  background: var(--alert-color, #3880ff);
  color: #fff;
}

/* ---- Entry animation ---- */
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(48px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
</style>

