<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <Icon icon="lucide:house" class="tab-icon" />
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <!-- Beautician: Orders tab -->
        <ion-tab-button v-if="isBeautician" tab="orders" href="/tabs/orders">
          <Icon icon="lucide:briefcase" class="tab-icon" />
          <ion-label>Orders</ion-label>
        </ion-tab-button>

        <!-- Rider: Trips tab -->
        <ion-tab-button v-if="isRider" tab="trips" href="/tabs/trips">
          <Icon icon="lucide:car" class="tab-icon" />
          <ion-label>Trips</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="leave" href="/tabs/leave">
          <Icon icon="lucide:calendar" class="tab-icon" />
          <ion-label>Leave</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile">
          <Icon icon="lucide:user" class="tab-icon" />
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
  IonLabel,
  IonRouterOutlet,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useUserTypeStore } from '@/shared/stores'
import { storeToRefs } from 'pinia'

const userTypeStore = useUserTypeStore()
const { isBeautician, isRider } = storeToRefs(userTypeStore)
</script>

<style scoped>
.tab-icon {
  font-size: 24px;
  margin-bottom: 2px;
}
</style>
