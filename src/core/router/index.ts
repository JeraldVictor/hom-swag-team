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
    meta: { requiresAuth: true },
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

// ---------------------------------------------------------------------------
// Navigation guard — protect authenticated routes
// ---------------------------------------------------------------------------

/**
 * Before each navigation:
 * - If the route requires auth and no token is in storage → redirect to /login
 * - If the user is already authenticated and navigates to /login → redirect to /home
 *
 * We read directly from storage here (not the Pinia store) because the guard
 * runs before App.vue's onMounted restoreSession() completes on a hard reload.
 */
router.beforeEach(async (to) => {
  // Lazy import to avoid circular dependency at module load time
  const { Storage_Service, STORAGE_KEYS } = await import('@/shared/lib/storage')
  const accessToken = await Storage_Service.getString(STORAGE_KEYS.accessToken)
  const isAuthenticated = !!accessToken

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !isAuthenticated) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && isAuthenticated) {
    return { name: 'Home' }
  }
})

export default router
