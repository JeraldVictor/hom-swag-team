<template>
  <ion-page>
    <!-- Menu drawer — rendered outside ion-tabs so it overlays everything -->
    <AppDrawer />

    <ion-header :translucent="true">
      <ion-toolbar>
        <!-- Menu button — top left -->
        <ion-buttons slot="start">
          <ion-button
            class="header-icon-btn"
            aria-label="Open menu"
            @click="openMenu"
          >
            <Icon icon="lucide:menu" class="header-icon" />
          </ion-button>
        </ion-buttons>

        <!-- Dynamic title based on active tab -->
        <ion-title class="header-title">{{ pageTitle }}</ion-title>

        <!-- Notification button — top right -->
        <ion-buttons slot="end">
          <ion-button
            class="header-icon-btn"
            aria-label="Notifications"
            @click="openNotifications"
          >
            <div class="notif-wrap">
              <Icon icon="lucide:bell" class="header-icon" />
              <!-- Unread badge — shown when there are notifications -->
              <span v-if="hasNotifications" class="notif-badge" aria-label="Unread notifications" />
            </div>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

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

        <ion-tab-button tab="leave" href="/leave">
          <Icon icon="lucide:calendar" class="tab-icon" />
          <ion-label>Leave</ion-label>
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
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { useUserTypeStore } from '@/shared/stores'
import { storeToRefs } from 'pinia'
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDrawer } from '@/shared/composables'
import AppDrawer from '@/shared/components/ui/AppDrawer.vue'

const userTypeStore = useUserTypeStore()
const { isBeautician, isRider } = storeToRefs(userTypeStore)

const route = useRoute()

// Map route names to display titles
const routeTitles: Record<string, string> = {
  Home: 'Home',
  Orders: 'Orders',
  OrderDetail: 'Order Details',
  Trips: 'Trips',
  TripDetail: 'Trip Details',
  Leave: 'Leave',
  Profile: 'Profile',
}

const pageTitle = computed(() => {
  const name = route.name as string
  return routeTitles[name] ?? 'HomSwag'
})

const { openDrawer } = useDrawer()

// Stub — wire up to a real notifications store when ready
const hasNotifications = ref(false)

function openMenu(): void {
  openDrawer()
}

function openNotifications(): void {
  // TODO: navigate to notifications screen or open sheet
  console.log('open notifications')
}
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────────────────── */

ion-toolbar {
  --background: var(--color-surface);
  --border-color: var(--color-border);
  --padding-start: 4px;
  --padding-end: 4px;
}

.header-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: var(--color-brand);
}

.header-icon-btn {
  --background: transparent;
  --background-activated: transparent;
  --background-hover: transparent;
  --box-shadow: none;
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--color-text);
}

.header-icon {
  font-size: 22px;
}

/* ── Notification badge ──────────────────────────────────────────────────── */

.notif-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  border: 2px solid var(--color-surface);
}

/* ── Tab bar ─────────────────────────────────────────────────────────────── */

.tab-icon {
  font-size: 24px;
  margin-bottom: 2px;
}
</style>
