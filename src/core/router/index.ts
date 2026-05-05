import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  // Default — redirect to login
  {
    path: '/',
    redirect: '/login',
  },

  // ── Auth (no tabs) ──────────────────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/features/auth/views/LoginView.vue'),
  },

  // ── Utility pages (no tabs) ─────────────────────────────────────────────
  {
    path: '/error',
    name: 'Error',
    component: () => import('@/features/home/views/ErrorView.vue'),
  },
  {
    path: '/page-not-found',
    name: 'PageNotFound',
    component: () => import('@/features/home/views/PageNotFoundView.vue'),
  },

  // ── Tabs shell ──────────────────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/features/home/views/TabsLayout.vue'),
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/features/home/views/HomeView.vue'),
      },
      // Orders (beautician)
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/features/orders/views/OrdersView.vue'),
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/features/orders/views/OrderDetailView.vue'),
      },
      // Trips (rider)
      {
        path: 'trips',
        name: 'Trips',
        component: () => import('@/features/trips/views/TripsView.vue'),
      },
      {
        path: 'trips/:id',
        name: 'TripDetail',
        component: () => import('@/features/trips/views/TripDetailView.vue'),
      },
      // Leave requests
      {
        path: 'leave',
        name: 'Leave',
        component: () => import('@/features/leave/views/LeaveView.vue'),
      },
      // Profile
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/features/profile/views/ProfileView.vue'),
      },
    ],
  },

  // ── Catch-all fallback ──────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    redirect: '/page-not-found',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
