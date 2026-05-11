<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="$emit('update:isOpen', false)"
    :initial-breakpoint="0.65"
    :breakpoints="[0, 0.65, 0.9]"
    handle-behavior="cycle"
    class="ride-selector-modal"
  >
    <div class="modal-wrapper">
      <div class="modal-header-premium">
        <div class="header-content">
          <h3>Book your Ride</h3>
          <p>Select a provider for {{ customerName || 'your customer' }}</p>
        </div>
        
        <div class="route-summary">
          <div class="route-dot start"></div>
          <div class="route-line"></div>
          <div class="route-dot end"></div>
          <span class="route-text">Current Location &rarr; Destination</span>
        </div>
      </div>
      
      <div class="ride-grid ion-padding">
        <div 
          v-for="(provider, idx) in providers" 
          :key="provider.id"
          class="ride-card anim-pop-in" 
          :style="{ '--delay': (0.1 + idx * 0.05) + 's' }" 
          @click="handleBook(provider.id)"
        >
          <div class="ride-card__glass"></div>
          <div class="ride-card__icon" :class="provider.id.toLowerCase().replace(' ', '')">
            <template v-if="provider.id === 'Ola'">
              <div class="ola-dot"></div>
            </template>
            <Icon v-else :icon="provider.icon" />
          </div>
          <div class="ride-card__info">
            <span class="brand">{{ provider.id }}</span>
            <span class="type">{{ provider.type }}</span>
          </div>
        </div>
      </div>

      <div v-if="isOpening" class="loading-overlay">
        <div class="loader-glass">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>Opening ride app...</p>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonModal, IonSpinner } from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { Geolocation } from '@capacitor/geolocation'
import { createExternalBooking } from '@/shared/api'

interface Props {
  isOpen: boolean
  orderId: string
  customerName: string
  destination: { lat: number; lng: number }
}

const props = defineProps<Props>()
const emit = defineEmits(['update:isOpen', 'booked'])

const isOpening = ref(false)

const providers = [
  { id: 'Uber', icon: 'simple-icons:uber', type: 'Cab / Auto' },
  { id: 'Ola', icon: '', type: 'Cabs' },
  { id: 'Namma Yatri', icon: 'lucide:navigation-2', type: 'Auto' },
  { id: 'Rapido', icon: 'lucide:bike', type: 'Bike / Auto' },
  { id: 'Google Maps', icon: 'lucide:map', type: 'Navigation' },
  { id: 'Other', icon: 'lucide:more-horizontal', type: 'Generic' }
]

async function handleBook(providerId: string) {
  isOpening.value = true
  
  try {
    const { lat, lng } = props.destination
    
    // 1. Get current location for tracking & pickup intent
    let pickup: { latitude: number; longitude: number } | undefined = undefined
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
      pickup = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
    } catch (e) {
      console.warn('Geo failed', e)
    }

    // 2. Auto-log external booking (silent)
    try {
      await createExternalBooking({
        provider: providerId,
        cost: 0,
        order_id: props.orderId,
        customer_name: props.customerName,
        service_date: new Date().toISOString().split('T')[0],
        pickup_location: pickup,
        drop_location: { latitude: lat, longitude: lng },
        service_description: `Booked via ${providerId}`
      })
    } catch (e) {
       console.error('Silent log failed', e)
    }

    // 3. Open Intent
    if (providerId === 'Uber') {
      window.open(`uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}`, '_system')
    } else if (providerId === 'Ola') {
      window.open(`olacabs://booking?lat=${lat}&lng=${lng}`, '_system')
    } else if (providerId === 'Namma Yatri') {
      const pLat = pickup?.latitude || ''
      const pLng = pickup?.longitude || ''
      window.open(`nammayatri://book?pickupLat=${pLat}&pickupLng=${pLng}&dropLat=${lat}&dropLng=${lng}`, '_system')
    } else if (providerId === 'Rapido') {
      window.open(`rapido://booking`, '_system')
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_system')
    }

    emit('booked', providerId)
    
    // Brief delay for UX before closing
    setTimeout(() => {
      isOpening.value = false
      emit('update:isOpen', false)
    }, 1000)

  } catch (err) {
    console.error('Ride booking failed', err)
    isOpening.value = false
  }
}
</script>

<style scoped>
.ride-selector-modal {
  --border-radius: 40px 40px 0 0;
  --height: auto;
  --background: transparent;
}

.modal-wrapper {
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(245,247,250,0.95) 100%);
  backdrop-filter: blur(20px);
  border-radius: 40px 40px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
  position: relative;
  border-top: 1px solid rgba(255,255,255,0.8);
}

.modal-header-premium {
  padding: 16px 24px 20px;
}

.handle-bar {
  width: 36px;
  height: 4px;
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
  margin: 0 auto 20px;
}

.header-content h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.header-content p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.route-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px 16px;
  background: rgba(0,0,0,0.03);
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.05);
}

.route-dot { width: 8px; height: 8px; border-radius: 50%; }
.route-dot.start { background: #000; box-shadow: 0 0 8px rgba(0,0,0,0.2); }
.route-dot.end { background: #666; }
.route-line { flex: 1; height: 2px; background: repeating-linear-gradient(90deg, #ccc 0, #ccc 4px, transparent 4px, transparent 8px); }
.route-text { font-size: 11px; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }

.ride-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 8px 24px 32px;
}

.ride-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.ride-card__glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
  pointer-events: none;
}

.ride-card:active {
  transform: scale(0.94);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.ride-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
}

.ride-card__info {
  display: flex;
  flex-direction: column;
}

.ride-card__info .brand {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
}

.ride-card__info .type {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
}

.ride-card__icon.uber { background: #000; color: #fff; }
.ride-card__icon.ola { background: linear-gradient(135deg, #d7ff13 0%, #b8db00 100%); color: #000; }
.ride-card__icon.nammayatri { background: linear-gradient(135deg, #ff8c00 0%, #ff5e00 100%); color: #fff; }
.ride-card__icon.rapido { background: linear-gradient(135deg, #ffde00 0%, #ffcc00 100%); color: #000; }
.ride-card__icon.googlemaps { background: linear-gradient(135deg, #4285F4 0%, #34a853 100%); color: #fff; }
.ride-card__icon.other { background: #f0f0f0; color: #666; }

.ola-dot {
  width: 20px;
  height: 20px;
  background: #000;
  border-radius: 50%;
  border: 3px solid #fff;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loader-glass {
  background: rgba(255,255,255,0.9);
  padding: 32px;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.8);
}

.loader-glass p {
  margin-top: 16px;
  font-weight: 800;
  color: #000;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 12px;
}

.anim-pop-in {
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: var(--delay);
}

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
