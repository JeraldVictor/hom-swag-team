/**
 * Auth Feature — public API
 *
 * Exports the feature's views, composables, and components.
 * Other features should import from here, not from internal paths.
 */

// Views
export { default as LoginView } from './views/LoginView.vue'

// Composables
export { useLogin } from './composables/useLogin'
export type { LoginStep, UseLoginReturn } from './composables/useLogin'

// Components
export { default as OtpInput } from './components/OtpInput.vue'
