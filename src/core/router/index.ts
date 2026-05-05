import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/auth/login',
  },
  // Auth — outside tabs
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('@/features/auth/views/LoginView.vue'),
  },
  // Tabs shell
  {
    path: '/tabs',
    component: () => import('@/features/home/views/TabsLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/tabs/home',
      },
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
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
