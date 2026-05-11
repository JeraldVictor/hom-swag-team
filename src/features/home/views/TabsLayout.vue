<template>
  <ion-page>
    <!-- Menu drawer — rendered outside ion-tabs so it overlays everything -->
    <AppDrawer />

    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/home">
          <Icon icon="lucide:house" class="tab-icon" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <!-- Beautician: Orders tab -->
        <ion-tab-button v-if="isBeautician" tab="orders" href="/orders">
          <Icon icon="lucide:briefcase" class="tab-icon" />
          <ion-label>Orders</ion-label>
        </ion-tab-button>

        <!-- Rider: Trips tab -->
        <ion-tab-button v-if="isRider" tab="trips" href="/trips">
          <Icon icon="lucide:car" class="tab-icon" />
          <ion-label>Trips</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="calendar" href="/calendar">
          <Icon icon="lucide:calendar-days" class="tab-icon" />
          <ion-label>Calendar</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/profile">
          <Icon icon="lucide:user" class="tab-icon" />
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue'
import { Icon } from '@iconify/vue'
import AppDrawer from '@/shared/components/ui/AppDrawer.vue'
import { useUserTypeStore } from '@/shared/stores'

const userTypeStore = useUserTypeStore()
const { isBeautician, isRider } = storeToRefs(userTypeStore)
</script>

<style scoped>
/* ── Tab bar ─────────────────────────────────────────────────────────────── */

.tab-icon {
  font-size: 24px;
  margin-bottom: 2px;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Slide the tab bar up on mount */
ion-tab-bar {
  animation: slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: 0.1s;
}

/* Active tab icon gets a little bounce */
ion-tab-button.tab-selected .tab-icon {
  transform: scale(1.18) translateY(-2px);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
