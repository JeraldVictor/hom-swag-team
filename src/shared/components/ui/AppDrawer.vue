<template>
  <!-- Backdrop -->
  <Transition name="drawer-backdrop">
    <div
      v-if="isDrawerOpen"
      class="drawer-backdrop"
      aria-hidden="true"
      @click="closeDrawer"
    />
  </Transition>

  <!-- Drawer panel -->
  <Transition name="drawer-slide">
    <nav
      v-if="isDrawerOpen"
      class="drawer"
      role="navigation"
      aria-label="Main menu"
    >
      <!-- ── User profile header ──────────────────────────────────────── -->
      <div class="drawer-profile">
        <!-- Brand logo -->
        <img
          src="@/shared/images/HomSwagLogoWhite.png"
          alt="HomSwag"
          class="drawer-brand-logo"
        />

        <!-- User row -->
        <div class="drawer-profile__user">
          <div class="drawer-avatar">
            <img
              v-if="user?.photo?.url"
              :src="user.photo.url"
              :alt="user.name"
              class="drawer-avatar__img"
            />
            <span v-else class="drawer-avatar__initials">{{ initials }}</span>
          </div>
          <div class="drawer-profile__info">
            <p class="drawer-profile__name">{{ user?.name ?? 'User' }}</p>
            <p class="drawer-profile__role">{{ roleLabel }}</p>
          </div>
        </div>

        <button class="drawer-close-btn" aria-label="Close menu" @click="closeDrawer">
          <Icon icon="lucide:x" />
        </button>
      </div>

      <!-- ── Scrollable nav items ────────────────────────────────────── -->
      <div class="drawer-body">
        <!-- Primary nav -->
        <ul class="drawer-nav" role="list">
          <li v-for="item in primaryItems" :key="item.route">
            <button
              class="drawer-nav__item"
              :class="{ 'drawer-nav__item--active': isActive(item.route) }"
              @click="navigate(item.route)"
            >
              <span class="drawer-nav__icon"><Icon :icon="item.icon" /></span>
              <span class="drawer-nav__label">{{ item.label }}</span>
              <Icon v-if="isActive(item.route)" icon="lucide:chevron-right" class="drawer-nav__chevron" />
            </button>
          </li>
        </ul>

        <!-- Leave section -->
        <div class="drawer-divider" />
        <p class="drawer-section-label">Leave & Time Off</p>
        <ul class="drawer-nav" role="list">
          <li v-for="item in leaveItems" :key="item.route">
            <button
              class="drawer-nav__item"
              :class="{ 'drawer-nav__item--active': isActive(item.route) }"
              @click="navigate(item.route)"
            >
              <span class="drawer-nav__icon"><Icon :icon="item.icon" /></span>
              <span class="drawer-nav__label">{{ item.label }}</span>
              <Icon v-if="isActive(item.route)" icon="lucide:chevron-right" class="drawer-nav__chevron" />
            </button>
          </li>
        </ul>

        <!-- Account section -->
        <div class="drawer-divider" />
        <p class="drawer-section-label">Account</p>
        <ul class="drawer-nav" role="list">
          <li v-for="item in accountItems" :key="item.route">
            <button
              class="drawer-nav__item"
              :class="{ 'drawer-nav__item--active': isActive(item.route) }"
              @click="navigate(item.route)"
            >
              <span class="drawer-nav__icon"><Icon :icon="item.icon" /></span>
              <span class="drawer-nav__label">{{ item.label }}</span>
            </button>
          </li>
        </ul>
      </div>

      <!-- ── Logout button ───────────────────────────────────────────── -->
      <div class="drawer-footer">
        <button class="drawer-sos-btn" @click="navigate('/sos')">
          <Icon icon="lucide:siren" class="drawer-sos-btn__icon" />
          <span>SOS — Get Help Now</span>
        </button>
        <button class="drawer-logout-btn" @click="handleLogout">
          <Icon icon="lucide:log-out" class="drawer-logout-btn__icon" />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/shared/stores/auth'
import { useUserTypeStore } from '@/shared/stores/userType'
import { useDrawer } from '@/shared/composables/useDrawer'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()

const { user } = storeToRefs(authStore)
const { isBeautician, isRider } = storeToRefs(userTypeStore)
const { isDrawerOpen, closeDrawer } = useDrawer()

// ── Derived user info ──────────────────────────────────────────────────────

const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
})

const roleLabel = computed(() => {
  if (isBeautician.value) return 'Beautician'
  if (isRider.value) return 'Rider'
  return ''
})

// ── Nav items ──────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  icon: string
  route: string
}

/** Primary navigation — shown at the top of the drawer */
const primaryItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { label: 'Home', icon: 'lucide:house', route: '/home' },
  ]

  if (isBeautician.value) {
    items.push({ label: 'Orders', icon: 'lucide:briefcase', route: '/orders' })
    items.push({ label: 'Complaints', icon: 'lucide:message-circle-warning', route: '/complaints' })
    items.push({ label: 'External Bookings', icon: 'lucide:calendar-plus', route: '/external-bookings' })
    items.push({ label: 'Leaderboard', icon: 'lucide:trophy', route: '/leaderboard' })
  }

  if (isRider.value) {
    items.push({ label: 'Trips', icon: 'lucide:car', route: '/trips' })
    items.push({ label: 'Trip Fees', icon: 'lucide:receipt', route: '/trip-fees' })
  }

  items.push({ label: 'Calendar', icon: 'lucide:calendar-days', route: '/calendar' })
  items.push({ label: 'Notifications', icon: 'lucide:bell', route: '/notifications' })
  items.push({ label: 'Reimbursements', icon: 'lucide:receipt-text', route: '/reimbursements' })

  return items
})

/** Leave & time-off section */
const leaveItems: NavItem[] = [
  { label: 'Leave Requests', icon: 'lucide:calendar-off', route: '/leave' },
  { label: 'OT Requests', icon: 'lucide:clock-plus', route: '/ot-requests' },
  { label: 'Weekly Off', icon: 'lucide:calendar-x-2', route: '/weekly-off' },
]

/** Account section */
const accountItems: NavItem[] = [
  { label: 'Profile', icon: 'lucide:user', route: '/profile' },
  { label: 'Support & Feedback', icon: 'lucide:life-buoy', route: '/support' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function isActive(targetRoute: string): boolean {
  return route.path === targetRoute || route.path.startsWith(targetRoute + '/')
}

function navigate(targetRoute: string): void {
  closeDrawer()
  router.push(targetRoute)
}

async function handleLogout(): Promise<void> {
  closeDrawer()
  await authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────────────────────── */

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

/* ── Drawer panel ────────────────────────────────────────────────────────── */

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
  max-width: 85vw;
  background: var(--color-surface);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 32px rgba(0, 0, 0, 0.15);
  border-radius: 0 24px 24px 0;
  overflow: hidden;
}

/* ── Profile header ──────────────────────────────────────────────────────── */

.drawer-profile {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 52px 20px 20px;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  position: relative;
}

.drawer-brand-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  align-self: flex-start;
}

.drawer-profile__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.drawer-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.drawer-avatar__initials {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.drawer-profile__info {
  flex: 1;
  min-width: 0;
}

.drawer-profile__name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-profile__role {
  margin: 2px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 500;
  text-transform: capitalize;
}

.drawer-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.drawer-close-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

/* ── Scrollable body ─────────────────────────────────────────────────────── */

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  -webkit-overflow-scrolling: touch;
}

/* ── Nav list ────────────────────────────────────────────────────────────── */

.drawer-nav {
  list-style: none;
  margin: 0;
  padding: 0 12px;
}

.drawer-nav__item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 13px 14px;
  border: none;
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.drawer-nav__item:active {
  background: var(--color-brand-pale);
  transform: scale(0.97);
}

.drawer-nav__item--active {
  background: var(--color-brand-pale);
  color: var(--color-brand);
  font-weight: 700;
}

.drawer-nav__icon {
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
}

.drawer-nav__label {
  flex: 1;
}

.drawer-nav__chevron {
  font-size: 16px;
  opacity: 0.6;
}

/* ── Divider ─────────────────────────────────────────────────────────────── */

.drawer-divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 24px;
}

.drawer-section-label {
  margin: 4px 26px 2px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

/* ── Footer / logout ─────────────────────────────────────────────────────── */

.drawer-footer {
  padding: 12px 24px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-sos-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border: none;
  border-radius: var(--radius-lg);
  background: #fef2f2;
  color: #dc2626;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  border: 1.5px solid #fca5a5;
}

.drawer-sos-btn:active { opacity: 0.75; }

.drawer-sos-btn__icon { font-size: 20px; }

.drawer-logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-error-bg);
  color: var(--color-error-text);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.drawer-logout-btn:active {
  opacity: 0.75;
}

.drawer-logout-btn__icon {
  font-size: 20px;
}

/* ── Transitions ─────────────────────────────────────────────────────────── */

.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}
</style>
