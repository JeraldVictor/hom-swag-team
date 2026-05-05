/**
 * Trips Feature — public API
 *
 * Exports the feature's views, composables, and components.
 * Other features should import from here, not from internal paths.
 */

// Views
export { default as TripsView } from './views/TripsView.vue'
export { default as TripDetailView } from './views/TripDetailView.vue'

// Components
export { default as TripCard } from './components/TripCard.vue'
export { default as TripStatusBadge } from './components/TripStatusBadge.vue'

// Composables
export { useTrips } from './composables/useTrips'
export { useTripDetail } from './composables/useTripDetail'
