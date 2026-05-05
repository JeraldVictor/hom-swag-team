<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <!-- Beautician: Orders tab -->
        <ion-tab-button v-if="isBeautician" tab="orders" href="/tabs/orders">
          <ion-icon :icon="briefcaseOutline" />
          <ion-label>Orders</ion-label>
        </ion-tab-button>

        <!-- Rider: Trips tab -->
        <ion-tab-button v-if="isRider" tab="trips" href="/tabs/trips">
          <ion-icon :icon="carOutline" />
          <ion-label>Trips</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="leave" href="/tabs/leave">
          <ion-icon :icon="calendarOutline" />
          <ion-label>Leave</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="personOutline" />
          <ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/vue'
import {
  homeOutline,
  briefcaseOutline,
  carOutline,
  calendarOutline,
  personOutline,
} from 'ionicons/icons'
import { useUserTypeStore } from '@/shared/stores'
import { storeToRefs } from 'pinia'

const userTypeStore = useUserTypeStore()
const { isBeautician, isRider } = storeToRefs(userTypeStore)
</script>
