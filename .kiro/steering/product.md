# Product

**HomSwagTeam** is a mobile-first field worker app built with Ionic + Vue 3 + Capacitor, targeting iOS and Android via a single codebase. It also runs as a Progressive Web App (PWA).

## Users

The app serves two field worker roles:
- **Beautician** — performs beauty/cleaning services at customer premises. Sees the **Orders** tab.
- **Rider** — transports beauticians and handles logistics. Sees the **Trips** tab.

Role is determined at login from the `user_type` field in the auth response (`'beautician'` | `'rider'`). All role-conditional UI branches off `useUserTypeStore` (`isBeautician`, `isRider`).

## Current State

The app has a solid working foundation with most core features fully implemented.

- **Auth** — Full two-step OTP login flow (phone → 6-digit OTP → token storage → session restore on boot).
- **App shell** — Authenticated tab layout (`TabsLayout`) with 5 tabs: Home, Orders (beautician) or Trips (rider), Calendar, Profile. Slide-in navigation drawer (`AppDrawer`). Each view renders its own `<ion-header>`.
- **Boot lifecycle** — `App.vue` manages a 3-phase boot: network check → permission check → session restore. Shows `NoInternetView` overlay when offline, `PermissionSplashView` when permissions not yet granted.
- **Routing** — All routes defined with auth guard and offline guard. Unauthenticated users redirected to `/login`. Navigation blocked when device is offline.
- **Location tracking** — GPS polling every 60s via `useLocationTracker` singleton; checks BFF tracking status flag before each push; Android foreground service support for background tracking.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (OTP login) | ✅ Complete | Phone + OTP, token storage, session restore |
| App shell (TabsLayout + AppDrawer) | ✅ Complete | 5 tabs: Home, Orders/Trips (role-conditional), Calendar, Profile |
| Boot lifecycle & permissions | ✅ Complete | `useAppStore` boot phases; `PermissionSplashView` for location/camera/notifications; `NoInternetView` overlay |
| Offline detection | ✅ Complete | `useNetwork` composable; router blocks navigation when offline |
| Location tracking | ✅ Complete | `useLocationTracker` singleton; 60s polling; BFF status check; Android foreground service |
| Home dashboard | ✅ Complete | KPI strip (active/completed/earnings); today's orders or trips list with quick actions; next-up card; earnings overview with daily target progress; leave balance; role-specific reminders; complaints alert for beauticians |
| Order Edit (beautician) | ✅ Complete | `OrderEditView` with beautician-restricted catalog, cart management, and OTP verification flow |
| Orders (beautician) | ✅ Complete | `OrdersView` with list, skeleton, pull-to-refresh; `OrderDetailView` with status advancement, OTP generate/verify, cancel-after-arrival; `OrderCard` component; `useOrders` + `useOrderDetail` composables |
| Trips (rider) | ✅ Complete | `TripsView` with list, skeleton, pull-to-refresh; `TripDetailView` with kanban state advancement; `TripCard` + `TripStatusBadge` components; `useTrips` + `useTripDetail` composables |
| Profile | ✅ Complete | View with personal info, documents/KYC grid, account links; edit modal with photo upload, personal details, emergency contact, document upload; role-specific document slots (beautician: portfolio; rider: licence, PUC, insurance, RC book) |
| Leave requests | ✅ Complete | `LeaveView` wired to real API via `useLeave`; paid/sick/LOP; balance card; submit/cancel |
| OT requests | ✅ Complete | `OtRequestsView` via `useOtRequests`; create/cancel overtime entries |
| Weekly off | ✅ Complete | `WeeklyOffView` via `useWeeklyOff`; create/cancel recurring week-off requests |
| Calendar | ✅ Complete | `CalendarView` fetches leaves and holidays; monthly grid with colour-coded dots; event types: paid_leave, sick_leave, loss_of_pay, block_time, holiday |
| Notifications | 🟡 Scaffolded | `NotificationsView` exists, route defined; `notifications.service.ts` implemented |
| Complaints (beautician) | 🟡 Scaffolded | `ComplaintsView` exists, route defined; `complaints.service.ts` implemented; home dashboard shows alert when complaints exist |
| Sessions | 🟡 Scaffolded | `SessionsView` exists, route defined; `sessions.service.ts` implemented; linked from Profile |
| Support & Feedback | 🟡 Scaffolded | `SupportView` exists, route defined; `support.service.ts` implemented; linked from Profile and Home quick actions |
| External Bookings (beautician) | 🟡 Scaffolded | `ExternalBookingsView` exists, route defined; `external-bookings.service.ts` implemented |
| Reimbursements | 🟡 Scaffolded | `ReimbursementsView` exists, route defined; `reimbursements.service.ts` implemented |
| Leaderboard | ✅ Complete | Competitive rankings with Weekly, Monthly, and Yearly views; top 5 unmasked, others masked except self; tracks revenue (excluding hygiene/surge fees) and order counts |
| SOS | 🟡 Scaffolded | `SosView` exists, route defined; `sos.service.ts` implemented (trigger, get latest, resolve) |
| Trip Fees (rider) | 🟡 Scaffolded | `TripFeesView` exists, route defined; `trip-fees.service.ts` implemented |
| Google Maps | ✅ Complete | `GoogleMapView` component + `useGoogleMaps` composable; feature-flag gated via `VITE_FEATURE_MAPS` |
| Places Search | ✅ Complete | `PlacesSearchInput` component + `usePlacesSearch` composable; lat/lng direct entry support |

## BFF API

All HTTP traffic goes through a Backend-for-Frontend (BFF). The Axios client (`src/shared/lib/api.ts`) targets `VITE_BFF_API_URL` and prefixes all paths with that base URL. In development, Vite proxies `/api/*` → `http://localhost:3000/bff/field/*`.

Response envelope: `{ success: boolean, message: string, data: T }`. The client throws an `ApiError` for non-2xx responses and `success: false` payloads.

Key BFF endpoints used:
- `POST /location` — push GPS coordinates (used by `useLocationTracker`)
- `GET /tracking-status` — check if tracking is enabled and if worker is blocked (leave/week-off)
- `GET /menu` — beautician-restricted menu for catalog browsing (resolves to /bff/field/menu)
- `GET /products`, `GET /products/:id` — beautician-restricted product catalog (resolves to /bff/field/products)
- `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id`, `PATCH /orders/:id/status` — order management
- `POST /orders/:id/otp/generate`, `POST /orders/:id/otp/verify` — service OTP flow
- `POST /orders/:id/arrival-selfie`, `POST /orders/:id/completion-proof` — photo uploads
- `GET /trips`, `GET /trips/:id`, `PATCH /trips/:id/kanban-state` — trip management
- `GET /dashboard` — home dashboard summary (today_earnings, month_earnings, leave_balance, etc.)
- `GET /profile`, `PATCH /profile`, `POST /profile/photo` — profile management
- `GET /calendar` — fetch leaves and holidays for calendar view
- `GET /leave-requests`, `POST /leave-requests` — leave management
- `GET /ot-requests`, `POST /ot-requests`, `DELETE /ot-requests/:id` — overtime management
- `GET /weekly-off-requests`, `POST /weekly-off-requests`, `DELETE /weekly-off-requests/:id` — week-off management
- `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` — notifications
- `GET /complaints` — complaints visible to beautician
- `GET /sessions`, `DELETE /sessions/:id` — session management
- `POST /support`, `GET /support` — support tickets
- `GET /external-bookings`, `POST /external-bookings` — external bookings
- `GET /reimbursements`, `POST /reimbursements` — reimbursements
- `GET /leaderboard` — leaderboard (beautician only)
- `POST /sos`, `GET /sos/latest`, `PATCH /sos/:id/resolve` — SOS alerts
- `GET /trip-fees` — trip fees report for riders

## Dark Mode

Dark mode is intentionally disabled. The app is locked to light mode only. Dark mode CSS imports are commented out in `main.ts` and `variables.css`.
