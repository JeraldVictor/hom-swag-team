import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ENV } from '@/shared/lib/env'

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
  {
    path: '/impersonate',
    name: 'Impersonate',
    component: () => import('@/features/auth/views/ImpersonateView.vue'),
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
      // Home / Dashboard
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
        meta: { roles: ['beautician'] },
      },
      {
        path: 'orders/:id/payment',
        name: 'OrderPayment',
        component: () => import('@/features/orders/views/OrderPaymentView.vue'),
        meta: { roles: ['beautician'] },
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/features/orders/views/OrderDetailView.vue'),
        meta: { roles: ['beautician'] },
      },
      {
        path: 'orders/:id/edit',
        name: 'OrderEdit',
        component: () => import('@/features/orders/views/OrderEditView.vue'),
        meta: { roles: ['beautician'] },
      },
      {
        path: 'orders/:id/preview',
        name: 'OrderPreview',
        component: () => import('@/features/orders/views/OrderPreviewView.vue'),
        meta: { roles: ['beautician'] },
      },

      // Trips (rider)
      {
        path: 'trips',
        name: 'Trips',
        component: () => import('@/features/trips/views/TripsView.vue'),
        meta: { roles: ['rider'] },
      },
      {
        path: 'trips/:id',
        name: 'TripDetail',
        component: () => import('@/features/trips/views/TripDetailView.vue'),
        meta: { roles: ['rider'] },
      },

      // Leave requests (both roles)
      {
        path: 'leave',
        name: 'Leave',
        component: () => import('@/features/leave/views/LeaveView.vue'),
      },

      // Calendar (both roles)
      {
        path: 'calendar',
        name: 'Calendar',
        component: () => import('@/features/calendar/views/CalendarView.vue'),
      },

      // Profile (both roles)
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/features/profile/views/ProfileView.vue'),
      },

      // Notifications (both roles)
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/features/notifications/views/NotificationsView.vue'),
      },

      // Complaints (beautician only — guarded in component)
      {
        path: 'complaints',
        name: 'Complaints',
        component: () => import('@/features/complaints/views/ComplaintsView.vue'),
      },

      // Support & Feedback (both roles)
      {
        path: 'support',
        name: 'Support',
        component: () => import('@/features/support/views/SupportView.vue'),
      },

      // OT Requests (both roles) — accessed from Leave section
      {
        path: 'ot-requests',
        name: 'OtRequests',
        component: () => import('@/features/leave/views/OtRequestsView.vue'),
      },

      // Weekly Off Requests (both roles) — accessed from Leave section
      {
        path: 'weekly-off',
        name: 'WeeklyOff',
        component: () => import('@/features/leave/views/WeeklyOffView.vue'),
      },

      // External Bookings (beautician only)
      {
        path: 'external-bookings',
        name: 'ExternalBookings',
        component: () => import('@/features/external-bookings/views/ExternalBookingsView.vue'),
      },

      // Travel Reimbursements (both roles)
      {
        path: 'reimbursements',
        name: 'Reimbursements',
        component: () => import('@/features/reimbursements/views/ReimbursementsView.vue'),
      },

      // Leaderboard (both roles)
      {
        path: 'leaderboard',
        name: 'Leaderboard',
        component: () => import('@/features/leaderboard/views/LeaderboardView.vue'),
      },

      // Monthly payout history (both roles)
      {
        path: 'payouts',
        name: 'PayoutHistory',
        component: () => import('@/features/payout-history/views/PayoutHistoryView.vue'),
      },

      // Monthly target details (beautician only)
      {
        path: 'target-details',
        name: 'TargetDetails',
        component: () => import('@/features/target-details/views/TargetDetailsView.vue'),
      },

      // SOS (both roles)
      {
        path: 'sos',
        name: 'Sos',
        component: () => import('@/features/sos/views/SosView.vue'),
      },

      // Trip Fees Report (rider only)
      {
        path: 'trip-fees',
        name: 'TripFees',
        component: () => import('@/features/trip-fees/views/TripFeesView.vue'),
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
  history: createWebHistory(ENV.BASE_URL),
  routes,
})

// ---------------------------------------------------------------------------
// Navigation guard — protect authenticated routes + block when offline
// ---------------------------------------------------------------------------

router.beforeEach(async to => {
  // Allow navigation to the offline / error utility pages regardless of state
  const alwaysAllowed = ['Error', 'PageNotFound', 'Impersonate']
  if (to.name && alwaysAllowed.includes(to.name as string)) {
    return
  }

  // NOTE: Offline gating is handled by the NoInternetView overlay in App.vue.
  // Do NOT block navigation here — a false navigator.onLine on Android cold
  // start would abort the initial navigation and leave a blank screen.
  // Auth guard
  const { Storage_Service, STORAGE_KEYS } = await import('@/shared/lib/storage')
  const accessToken = await Storage_Service.getString(STORAGE_KEYS.accessToken)
  const isAuthenticated = !!accessToken

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  const roles = to.matched.flatMap(record => {
    const routeRoles = record.meta.roles
    return Array.isArray(routeRoles) ? routeRoles : []
  })
  if (roles.length > 0) {
    const storedUserType = await Storage_Service.getString(STORAGE_KEYS.userType)
    if (!storedUserType || !roles.includes(storedUserType)) {
      return { name: 'Home' }
    }
  }

  if (to.name === 'Login' && isAuthenticated) {
    return { name: 'Home' }
  }
})

export default router
