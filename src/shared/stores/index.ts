/**
 * Shared Stores — barrel export
 *
 * Re-exports all Pinia store composables from a single entry point.
 * Import stores from '@/shared/stores' rather than individual store files.
 */

export { useAuthStore } from './auth'
export { useUiStore } from './ui'
export { useUserTypeStore } from './userType'
