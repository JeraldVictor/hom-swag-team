<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>SOS</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="sos-content">
      <!-- Active SOS banner -->
      <div v-if="activeAlert" class="active-banner" :class="{ 'active-banner--acknowledged': activeAlert.status === 'acknowledged' }">
        <div class="active-banner__pulse" aria-hidden="true" />
        <div class="active-banner__body">
          <p class="active-banner__title">
            {{ activeAlert.status === 'acknowledged' ? 'SOS Acknowledged' : 'SOS Active' }}
          </p>
          <p class="active-banner__sub">
            {{
              activeAlert.status === 'acknowledged'
                ? 'A staff member has acknowledged your alert and will contact you shortly.'
                : 'Office staff have been alerted and will call you shortly.'
            }}
          </p>
        </div>
        <ion-button
          fill="outline"
          color="danger"
          size="small"
          :disabled="isResolving"
          @click="handleResolve"
        >
          <ion-spinner v-if="isResolving" name="crescent" slot="start" />
          Cancel SOS
        </ion-button>
      </div>

      <!-- Main SOS button -->
      <div class="sos-center">
        <div class="sos-ring sos-ring--outer" aria-hidden="true" />
        <div class="sos-ring sos-ring--inner" aria-hidden="true" />
        <button
          class="sos-btn"
          :class="{ 'sos-btn--active': !!activeAlert }"
          :disabled="isTriggering || !!activeAlert"
          aria-label="Trigger SOS alert"
          @click="handleTrigger"
        >
          <Icon icon="lucide:siren" class="sos-btn__icon" aria-hidden="true" />
          <span class="sos-btn__label">{{ activeAlert ? (activeAlert.status === 'acknowledged' ? 'Acknowledged' : 'SOS Active') : 'SOS' }}</span>
        </button>
      </div>

      <!-- Instructions -->
      <div class="sos-instructions">
        <p class="sos-instructions__title">How it works</p>
        <div class="sos-instructions__list">
          <div class="sos-step">
            <div class="sos-step__num">1</div>
            <p class="sos-step__text">Tap the SOS button above when you need immediate assistance.</p>
          </div>
          <div class="sos-step">
            <div class="sos-step__num">2</div>
            <p class="sos-step__text">Office staff receive an instant alert with your location.</p>
          </div>
          <div class="sos-step">
            <div class="sos-step__num">3</div>
            <p class="sos-step__text">A staff member will call you back within minutes.</p>
          </div>
          <div class="sos-step">
            <div class="sos-step__num">4</div>
            <p class="sos-step__text">Tap "Cancel SOS" once the situation is resolved.</p>
          </div>
        </div>
      </div>

      <!-- Optional message -->
      <div v-if="!activeAlert" class="sos-message-section">
        <label class="form-label">Add a message (optional)</label>
        <textarea
          v-model="message"
          class="form-textarea"
          placeholder="Briefly describe the situation..."
          rows="3"
        />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonSpinner,
  onIonViewWillEnter, onIonViewDidLeave,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'
import { triggerSos, getLatestSos, resolveSos } from '@/shared/api'
import { useToast } from '@/shared/composables'
import type { SosAlert } from '@/shared/models'

const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { user } = storeToRefs(authStore)
const { userType } = storeToRefs(userTypeStore)
const { showSuccess, showError } = useToast()

const activeAlert = ref<SosAlert | null>(null)
const isTriggering = ref(false)
const isResolving = ref(false)
const message = ref('')

// Poll interval for status updates while an SOS is active
let pollInterval: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL_MS = 5_000

function startPolling(): void {
  if (pollInterval) return
  pollInterval = setInterval(async () => {
    if (!activeAlert.value) {
      stopPolling()
      return
    }
    const latest = await getLatestSos()
    if (!latest || latest.status === 'resolved') {
      // Staff resolved it — clear the active state
      activeAlert.value = null
      stopPolling()
    } else {
      // Keep the alert in sync (e.g. status changed to acknowledged)
      activeAlert.value = latest
    }
  }, POLL_INTERVAL_MS)
}

function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Start/stop polling whenever activeAlert changes
watch(activeAlert, (alert) => {
  if (alert && alert.status !== 'resolved') {
    startPolling()
  } else {
    stopPolling()
  }
})

async function handleTrigger(): Promise<void> {
  if (!user.value || !userType.value) return
  isTriggering.value = true
  try {
    // Try to get current location for the alert
    let latitude: number | undefined
    let longitude: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      )
      latitude = pos.coords.latitude
      longitude = pos.coords.longitude
    } catch {
      // Location unavailable — proceed without it
    }

    activeAlert.value = await triggerSos({
      requester_id: String(user.value.id),
      requester_type: userType.value as 'beautician' | 'rider',
      latitude,
      longitude,
      message: message.value || undefined,
    })
    message.value = ''
    showSuccess('SOS triggered — office staff have been alerted')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to trigger SOS')
  } finally {
    isTriggering.value = false
  }
}

async function handleResolve(): Promise<void> {
  if (!activeAlert.value) return
  isResolving.value = true
  try {
    const alertId = (activeAlert.value as any)._id || (activeAlert.value as any).id
    if (!alertId) {
      console.warn('[SosView] No alert ID found for resolution', activeAlert.value)
      activeAlert.value = null
      return
    }
    await resolveSos(String(alertId))
    activeAlert.value = null
    showSuccess('SOS resolved and marked as safe')
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to cancel SOS')
  } finally {
    isResolving.value = false
  }
}

onMounted(async () => {
  // Check if there's an active SOS from a previous session
  const latest = await getLatestSos()
  if (latest && latest.status !== 'resolved') {
    activeAlert.value = latest
  }
})

// Re-check status every time the user navigates back to this view
onIonViewWillEnter(async () => {
  const latest = await getLatestSos()
  if (!latest || latest.status === 'resolved') {
    activeAlert.value = null
  } else {
    activeAlert.value = latest
  }
})

// Stop polling when the user navigates away (Ionic keeps views alive in the stack)
onIonViewDidLeave(() => {
  stopPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.sos-content {
  --background: var(--color-background);
}

/* Active banner */
.active-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  padding: 14px 16px;
  background: var(--color-error-bg);
  border: 2px solid var(--color-error);
  border-radius: var(--radius-xl);
}

.active-banner--acknowledged {
  background: #fefce8;
  border-color: #ca8a04;
}

.active-banner--acknowledged .active-banner__title,
.active-banner--acknowledged .active-banner__sub {
  color: #854d0e;
}

.active-banner--acknowledged .active-banner__pulse {
  background: #ca8a04;
}

.active-banner__pulse {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-error);
  flex-shrink: 0;
  animation: pulse 1.2s ease-in-out infinite;
}

.active-banner__body { flex: 1; }

.active-banner__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 800;
  color: var(--color-error-text);
}

.active-banner__sub {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  opacity: 0.85;
}

/* SOS button center */
.sos-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0 32px;
}

.sos-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid var(--color-error);
  opacity: 0.2;
  animation: ring-pulse 2s ease-out infinite;
}

.sos-ring--outer {
  width: 200px;
  height: 200px;
  animation-delay: 0.4s;
}

.sos-ring--inner {
  width: 160px;
  height: 160px;
}

.sos-btn {
  position: relative;
  z-index: 1;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.sos-btn:active:not(:disabled) {
  transform: scale(0.95);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.35);
}

.sos-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.sos-btn--active {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
}

.sos-btn__icon {
  font-size: 36px;
  color: #fff;
}

.sos-btn__label {
  font-size: var(--font-size-sm);
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Instructions */
.sos-instructions {
  margin: 0 16px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 16px;
}

.sos-instructions__title {
  margin: 0 0 12px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.sos-instructions__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sos-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sos-step__num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-brand-pale);
  color: var(--color-brand);
  font-size: var(--font-size-sm);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sos-step__text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  padding-top: 2px;
}

/* Message section */
.sos-message-section {
  margin: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-textarea {
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
  resize: vertical;
}

.form-textarea:focus { border-color: var(--color-brand); }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

@keyframes ring-pulse {
  0% { transform: scale(0.9); opacity: 0.3; }
  70% { transform: scale(1.1); opacity: 0; }
  100% { transform: scale(1.1); opacity: 0; }
}
</style>
