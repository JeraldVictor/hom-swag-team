/**
 * Stores barrel export
 *
 * Re-exports all Pinia store composables from a single entry point.
 * Import stores from '@/stores' rather than individual store files.
 */

export { useAuthStore } from '@/stores/auth'
export { useUiStore } from '@/stores/ui'
export { useUserTypeStore } from '@/stores/userType'
