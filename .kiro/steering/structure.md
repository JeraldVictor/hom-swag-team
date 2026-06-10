# Project Structure

Feature-based architecture. Each feature is self-contained with its own views, components, composables, and store. Shared infrastructure lives in `src/shared/` and `src/core/`.

```
src/
├── main.ts                        # App entry — Vue, IonicVue, Pinia, router, CSS imports
├── App.vue                        # Root — boot sequence (network → permissions → session restore); NoInternetView overlay; PermissionSplashView; ion-router-outlet when ready
├── vite-env.d.ts                  # Vite environment type declarations
│
├── core/
│   ├── router/
│   │   └── index.ts               # All route definitions + beforeEach auth guard + offline guard
│   └── theme/
│       ├── index.ts               # Design token constants (TypeScript, as const)
│       └── variables.css          # CSS custom properties + Ionic variable overrides
│
├── shared/
│   ├── api/                       # BFF API service functions (one file per resource)
│   │   ├── auth.service.ts        # requestOtp, verifyOtp, refreshToken, logoutApi
│   │   ├── calendar.service.ts    # getCalendar(startDate, endDate)
│   │   ├── complaints.service.ts  # getComplaints
│   │   ├── dashboard.service.ts   # getDashboard → DashboardData (today_earnings, month_earnings, leave_balance, etc.)
│   │   ├── external-bookings.service.ts  # getExternalBookings, createExternalBooking, uploadExternalBookingProof
│   │   ├── leaderboard.service.ts # getLeaderboard(period?) — riders see top 3 only
│   │   ├── leave-requests.service.ts  # getLeaveRequests, createLeaveRequest, cancelLeaveRequest, getLeaveBalance
│   │   ├── location.service.ts    # getTrackingStatus, pushLocation
│   │   ├── menu.service.ts        # getMenu (beautician-restricted)
│   │   ├── notifications.service.ts  # getNotifications, markNotificationRead, markAllNotificationsRead
│   │   ├── orders.service.ts      # getOrders, getOrder, updateOrderStatus, generateServiceOtp, verifyServiceOtp, upload ArrivalSelfie, uploadCompletionProof, getPaymentLink, updateSelfRideStatus, updateOrder
│   │   ├── ot-requests.service.ts # getOtRequests, createOtRequest, cancelOtRequest
│   │   ├── products.service.ts    # getProducts, getProductById
│   │   ├── profile.service.ts     # getProfile, updateProfile, uploadProfilePhoto, uploadProfileDocument, deleteProfileDocument
│   │   ├── reimbursements.service.ts  # getReimbursements, createReimbursement, uploadReimbursementProof, cancelReimbursement
│   │   ├── sessions.service.ts    # getSessions, revokeSession
│   │   ├── sos.service.ts         # triggerSos, getLatestSos, resolveSos
│   │   ├── support.service.ts     # createSupportTicket, getSupportTickets
│   │   ├── trip-fees.service.ts   # getTripFeesReport(params?) — rider earnings breakdown
│   │   ├── trips.service.ts       # getTrips, getTrip, updateTripStatus, confirmCustomerLocation, updateRiderSelfRideStatus; normalizes GeoJSON coordinates
│   │   ├── weekly-off.service.ts  # getWeeklyOffRequests, createWeeklyOffRequest, cancelWeeklyOffRequest
│   │   └── index.ts               # Barrel export
│   │
│   ├── components/
│   │   └── ui/                    # Generic, stateless UI primitives
│   │       ├── AppAvatar.vue
│   │       ├── AppBadge.vue
│   │       ├── AppButton.vue
│   │       ├── AppCard.vue
│   │       ├── AppDrawer.vue      # Slide-in nav drawer (reads useDrawer, no props)
│   │       ├── AppImage.vue
│   │       ├── AppInput.vue
│   │       ├── AppLabel.vue
│   │       ├── AppLoadingSpinner.vue
│   │       ├── GoogleMapView.vue  # Google Maps component; props: height, center, zoom, pickup, drop, livePosition, showRoute; emits: map-ready, map-error; feature-flag gated via FEATURES.maps
│   │       ├── PlacesSearchInput.vue  # Google Places Autocomplete input; supports lat/lng direct entry; emits: place-selected
│   │       └── index.ts           # Barrel export
│   │
│   ├── composables/               # Cross-feature composables
│   │   ├── useApi.ts              # Wraps async calls with isLoading/error state
│   │   ├── useCamera.ts           # Camera capture with @capacitor/camera
│   │   ├── useDateTime.ts         # Date/time formatting helpers
│   │   ├── useDialog.ts           # Confirmation dialog helper
│   │   ├── useDirections.ts       # Directions/routing helpers
│   │   ├── useDrawer.ts           # Global drawer open/close (module-level ref)
│   │   ├── useGeolocation.ts      # Reactive GPS state, permission requests, position watching, WebSocket emission
│   │   ├── useGoogleMaps.ts       # Google Maps instance management: init, markers, route drawing (Routes API v2 + fetch), bounds fitting; renders routes via Polyline
│   │   ├── useLocationTracker.ts  # Polling location tracker (60s default); checks BFF tracking status; Android foreground service; exports module-level singleton `locationTracker`
│   │   ├── useNetwork.ts          # Reactive navigator.onLine state; exports `getIsOnline()` for use outside components (used by router guard and App.vue)
│   │   ├── useNotifications.ts    # Push notification management
│   │   ├── usePermissions.ts      # Manages location/camera/notifications permissions; checkAll(), requestAll(), individual request helpers; web/PWA always returns 'granted'
│   │   ├── usePlacesSearch.ts     # Google Places Autocomplete with debouncing and lat/lng parsing
│   │   ├── useToast.ts            # showToast, showSuccess, showError, showWarning
│   │   ├── useTracking.ts         # High-level orchestrator: permission → WebSocket → GPS watch → emit over WS + REST
│   │   └── index.ts               # Barrel export
│   │
│   ├── stores/                    # Global Pinia stores
│   │   ├── app.ts                 # Boot lifecycle (booting → needs-permissions → ready), isOnline, permissionsGranted
│   │   ├── auth.ts                # Tokens, user profile, login/logout/refresh/restoreSession; starts/stops locationTracker on login/logout; setUserProfile() for profile sync
│   │   ├── ui.ts                  # activeTab, isLoading, toastQueue
│   │   ├── userType.ts            # Derives isBeautician/isRider from auth store
│   │   └── index.ts               # Barrel export
│   │
│   ├── models/                    # TypeScript interfaces and types
│   │   ├── auth.model.ts          # OtpRequestBody, OtpVerifyBody, AuthResponse, TokenPair, etc.
│   │   ├── calendar.model.ts      # CalendarEvent, CalendarDay interfaces
│   │   ├── complaint.model.ts     # Complaint interfaces
│   │   ├── dashboard.model.ts     # DashboardData (today_earnings, month_earnings, week_earnings, today_count, month_count, leave_balance)
│   │   ├── external-booking.model.ts  # ExternalBooking, ExternalBookingBody interfaces
│   │   ├── leaderboard.model.ts   # LeaderboardData, LeaderboardEntry, LeaderboardPeriod interfaces
│   │   ├── leave-request.model.ts # LeaveRequest, LeaveBalance, LeaveType, LeaveDuration interfaces
│   │   ├── location.model.ts      # Coordinates, WsMessage, PlaceResult interfaces
│   │   ├── notification.model.ts  # Notification, NotificationsResponse interfaces
│   │   ├── order.model.ts         # Order, OrderStatus, UpdateOrderStatusBody, VerifyServiceOtpBody interfaces
│   │   ├── ot-request.model.ts    # OtRequest, OtRequestCreateBody interfaces
│   │   ├── pagination.model.ts    # PaginatedResponse, PaginationMeta interfaces
│   │   ├── product.model.ts       # Product, ProductOption interfaces
│   │   ├── reimbursement.model.ts # Reimbursement, ReimbursementBody interfaces
│   │   ├── session.model.ts       # Session interfaces
│   │   ├── sos.model.ts           # SosAlert, SosTriggerBody interfaces
│   │   ├── support.model.ts       # SupportTicket, SupportBody interfaces
│   │   ├── trip-fees.model.ts     # TripFeesReport interfaces
│   │   ├── trip.model.ts          # Trip, RawTrip, TripKanbanState interfaces; GeoJSON normalization
│   │   ├── user.model.ts          # UserType ('rider'|'beautician'), UserProfile, ProfileDocument interfaces
│   │   ├── weekly-off.model.ts    # WeeklyOffRequest, WeeklyOffCreateBody interfaces
│   │   └── index.ts               # Barrel export
│   │
│   ├── lib/                       # Core utilities
│   │   ├── api.ts                 # Axios client — JWT injection, proactive refresh, 401 retry, ApiError
│   │   ├── datetime.ts            # IST-aware date/time utils (date-fns v3): formatDate, formatTime, formatRelative, todayISO, etc.
│   │   ├── feature-flags.ts       # FEATURES object: maps, directions — driven by VITE_FEATURE_MAPS, VITE_FEATURE_DIRECTIONS env vars
│   │   ├── google-maps.ts         # Lazy Google Maps JS API loader with Places library; auth error detection; retry support
│   │   ├── location.service.ts    # LocationService class wrapping @capacitor/geolocation; clamps watch interval to 30s max; auto-POSTs to BFF on each position update
│   │   ├── storage.ts             # Typed @capacitor/preferences wrapper (STORAGE_KEYS, Storage_Service)
│   │   ├── upload.service.ts      # UploadService class with uploadFile() and multipartUpload() with progress callbacks
│   │   ├── websocket.service.ts   # WebSocketService class with exponential backoff reconnection (1s → 30s); emitLocation(), send(), onMessage(); exports singleton webSocketService
│   │   └── index.ts               # Barrel export
│   │
│   └── images/                    # Static image assets
│       ├── HomSwagLogo.png
│       └── HomSwagLogoWhite.png
│
└── features/
    ├── auth/
    │   ├── views/
    │   │   └── LoginView.vue      # Two-step OTP login (phone → OTP)
    │   ├── components/
    │   │   └── OtpInput.vue       # 6-box OTP input (auto-advance, paste, backspace nav)
    │   ├── composables/
    │   │   └── useLogin.ts        # Manages login flow state and API calls
    │   └── index.ts
    │
    ├── home/
    │   ├── views/
    │   │   ├── TabsLayout.vue         # Authenticated shell — 5 tabs (Home, Orders/Trips, Calendar, Profile) + AppDrawer
    │   │   ├── HomeView.vue           # Full dashboard: KPI strip, today's orders/trips, next-up card, earnings overview, leave balance, quick actions, complaints alert
    │   │   ├── NoInternetView.vue     # Full-screen offline overlay with retry button; shown by App.vue when !isOnline
    │   │   ├── PermissionSplashView.vue  # Permission request screen (location/camera/notifications); shown by App.vue on first launch
    │   │   ├── ErrorView.vue          # Generic error page
    │   │   └── PageNotFoundView.vue   # 404 page
    │   └── index.ts
    │
    ├── orders/                    # Beautician orders (implemented)
    │   ├── views/
    │   │   ├── OrdersView.vue         # List with skeleton, pull-to-refresh, empty/error states
    │   │   └── OrderDetailView.vue    # Status advancement, OTP generate/verify, cancel-after-arrival
    │   ├── components/
    │   │   └── OrderCard.vue          # Order summary card for list view
    │   ├── composables/
    │   │   ├── useOrders.ts           # fetchOrders, refresh; wraps getOrders API
    │   │   └── useOrderDetail.ts      # fetchOrder, advanceStatus, cancelAfterArrival, generateOtp, verifyOtp
    │   └── index.ts
    │
    ├── trips/                     # Rider trips (implemented)
    │   ├── views/
    │   │   ├── TripsView.vue          # List with skeleton, pull-to-refresh, empty/error states
    │   │   └── TripDetailView.vue     # Kanban state advancement, map view
    │   ├── components/
    │   │   ├── TripCard.vue           # Trip summary card for list view
    │   │   └── TripStatusBadge.vue    # Kanban state badge component
    │   ├── composables/
    │   │   ├── useTrips.ts            # fetchTrips, refresh; wraps getTrips API
    │   │   └── useTripDetail.ts       # fetchTrip, advanceStatus; isInProgress, isCompleted computed; kanban state machine
    │   └── index.ts
    │
    ├── leave/                     # Leave management (implemented)
    │   ├── views/
    │   │   ├── LeaveView.vue          # Leave requests with balance card; paid/sick/LOP
    │   │   ├── OtRequestsView.vue     # Overtime request management
    │   │   └── WeeklyOffView.vue      # Recurring week-off request management
    │   ├── composables/
    │   │   ├── useLeave.ts            # Leave request state and API calls
    │   │   ├── useOtRequests.ts       # OT request state and API calls
    │   │   └── useWeeklyOff.ts        # Weekly off state and API calls
    │   └── index.ts
    │
    ├── calendar/                  # Leave calendar (implemented)
    │   ├── views/
    │   │   └── CalendarView.vue       # Monthly grid with colour-coded leave/holiday dots; selected-date cards; upcoming events panel
    │   └── index.ts
    │
    ├── profile/                   # User profile (implemented)
    │   ├── views/
    │   │   └── ProfileView.vue        # View: personal info, documents/KYC grid, account links; Edit modal: photo upload, personal details, emergency contact, document upload; role-specific document slots
    │   └── index.ts
    │
    ├── notifications/             # In-app notifications (implemented)
    │   ├── views/
    │   │   └── NotificationsView.vue
    │   └── index.ts
    │
    ├── complaints/                # Complaints (implemented, beautician only)
    │   ├── views/
    │   │   └── ComplaintsView.vue
    │   └── index.ts
    │
    ├── sessions/                  # Active sessions (implemented)
    │   ├── views/
    │   │   └── SessionsView.vue
    │   └── index.ts
    │
    ├── support/                   # Support & feedback (implemented)
    │   ├── views/
    │   │   └── SupportView.vue
    │   └── index.ts
    │
    ├── external-bookings/         # External bookings (implemented, beautician only)
    │   ├── views/
    │   │   └── ExternalBookingsView.vue
    │   └── index.ts
    │
    ├── reimbursements/            # Travel reimbursements (implemented)
    │   ├── views/
    │   │   └── ReimbursementsView.vue
    │   └── index.ts
    │
    ├── leaderboard/               # Performance leaderboard (implemented)
    │   ├── views/
    │   │   └── LeaderboardView.vue
    │   └── index.ts
    │
    ├── sos/                       # SOS emergency alerts (implemented)
    │   ├── views/
    │   │   └── SosView.vue
    │   └── index.ts
    │
    └── trip-fees/                 # Trip fees report (implemented, rider only)
        ├── views/
        │   └── TripFeesView.vue
        └── index.ts
```

## Routing

All routes are defined in `src/core/router/index.ts`. The `TabsLayout` shell wraps all authenticated routes under `path: '/'` with `meta: { requiresAuth: true }`.

| Path | View | Auth required |
|------|------|:---:|
| `/` | → redirects to `/login` | — |
| `/login` | `LoginView` | No |
| `/home` | `HomeView` (inside TabsLayout) | Yes |
| `/orders` | `OrdersView` | Yes |
| `/orders/:id` | `OrderDetailView` | Yes |
| `/trips` | `TripsView` | Yes |
| `/trips/:id` | `TripDetailView` | Yes |
| `/leave` | `LeaveView` | Yes |
| `/ot-requests` | `OtRequestsView` | Yes |
| `/weekly-off` | `WeeklyOffView` | Yes |
| `/calendar` | `CalendarView` | Yes |
| `/profile` | `ProfileView` | Yes |
| `/notifications` | `NotificationsView` | Yes |
| `/complaints` | `ComplaintsView` | Yes |
| `/sessions` | `SessionsView` | Yes |
| `/support` | `SupportView` | Yes |
| `/external-bookings` | `ExternalBookingsView` | Yes |
| `/reimbursements` | `ReimbursementsView` | Yes |
| `/leaderboard` | `LeaderboardView` | Yes |
| `/sos` | `SosView` | Yes |
| `/trip-fees` | `TripFeesView` | Yes |
| `/error` | `ErrorView` | No |
| `/page-not-found` | `PageNotFoundView` | No |
| `/:pathMatch(.*)` | → redirects to `/page-not-found` | — |

The `beforeEach` guard:
1. Reads the access token directly from `Storage_Service` (not the Pinia store) so it works on hard reloads before `App.vue`'s `restoreSession()` has run.
2. Calls `getIsOnline()` from `useNetwork` — returns `false` (blocks navigation) when the device is offline.

## Conventions

### Feature modules
- Each feature lives in `src/features/<feature-name>/` and is self-contained.
- Features expose a public API via `index.ts` — other features import from `@/features/<name>`, never from internal paths.
- Feature-specific views, components, composables, and stores stay inside the feature folder.
- If logic is needed by more than one feature, move it to `src/shared/`.

### Routing
- Routes are defined in `src/core/router/index.ts`. Each route lazy-imports its view from the feature folder.
- Use `@ionic/vue-router`'s `createRouter` and `createWebHistory`.

### Shared code
- **`src/shared/components/ui/`** — Generic, stateless UI primitives. Import from `@/shared/components/ui`.
- **`src/shared/composables/`** — Cross-feature composables. Import from `@/shared/composables`.
- **`src/shared/stores/`** — Global Pinia stores. Import from `@/shared/stores`.
- **`src/shared/models/`** — All TypeScript types/interfaces. Import from `@/shared/models`.
- **`src/shared/api/`** — BFF API service functions. Import from `@/shared/api`.
- **`src/shared/lib/`** — Core utilities. Import from `@/shared/lib`.

### Component style
- Use Vue 3 `<script setup lang="ts">` syntax. Import only the Ionic components you use (tree-shaking).
- Use `<style scoped>` in components. Global theme overrides go in `src/core/theme/variables.css`.
- Every view must use `<ion-page>` as the root element, with `<ion-header>` and `<ion-content>` as direct children.
- Icons use `@iconify/vue` (`<Icon icon="lucide:*" />`). The `@iconify-json/lucide` collection is bundled.
- Use `onIonViewWillEnter` alongside `onMounted` for data re-fetching — `onMounted` fires on first render, `onIonViewWillEnter` fires on every tab re-entry.

### Imports
- Use the `@/` alias for all imports from `src/` (e.g., `import Foo from '@/shared/components/ui/AppButton.vue'`).
- Prefer barrel imports over deep paths: `import { useToast } from '@/shared/composables'`.

### Storage
- All persistent data goes through `Storage_Service` from `@/shared/lib/storage`. Never import `@capacitor/preferences` directly.
- All storage keys are defined in `STORAGE_KEYS` (same file). Do not use raw string keys.

### API client
- All HTTP calls go through the Axios client exported from `@/shared/lib/api`.
- API service functions live in `src/shared/api/` and return typed data (unwrapping the BFF `{ data }` envelope).
- Errors are typed as `ApiError` (from `@/shared/lib/api`) with `status`, `message`, and optional `data`.

### Location tracking
- Use the `locationTracker` singleton exported from `useLocationTracker.ts` — never create a new instance.
- The auth store starts tracking on login and stops on logout.
- The tracker checks `GET /tracking-status` before each GPS push; stops automatically if `is_enabled: false`; skips tick if `is_blocked: true`.
