/**
 * User Type Store
 *
 * Derives the authenticated user's type from Auth_Store and exposes
 * reactive boolean getters for role-based UI branching.
 *
 * Uses Composition API style with defineStore.
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { UserType } from '@/shared/models/user.model'
import { useAuthStore } from '@/shared/stores/auth'

export const useUserTypeStore = defineStore('userType', () => {
  const authStore = useAuthStore()

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * The authenticated user's type, or `null` when not logged in.
   * Derived reactively from Auth_Store so it updates automatically on login/logout.
   */
  const userType = computed<UserType | null>(() => authStore.user?.user_type ?? null)

  /** True when the authenticated user is a beautician. */
  const isBeautician = computed<boolean>(() => userType.value === 'beautician')

  /** True when the authenticated user is a rider. */
  const isRider = computed<boolean>(() => userType.value === 'rider')

  return {
    userType,
    isBeautician,
    isRider,
  }
})
