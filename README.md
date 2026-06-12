# HomSwag Partner

A mobile-first field worker app built with Ionic + Vue 3 + Capacitor for iOS and Android. Also runs as a PWA.

## Setup

```bash
pnpm install
pnpm dev
```

## Development Proxy

The Vite dev server proxies `/api/*` requests to the local BFF, eliminating CORS issues during development:

| Dev URL | Proxied to |
|---------|-----------|
| `http://localhost:5173/api/...` | `http://localhost:3000/bff/field/...` |

The `/api` prefix is stripped and replaced with `/bff/field` before forwarding. This means `VITE_BFF_API_URL` should be set to `/api` in `.env.local` when running against a local BFF instance.

> In production builds the proxy is not active — the app communicates directly with the BFF URL configured via `VITE_BFF_API_URL`.

## Commands

```bash
pnpm build         # Type-check + build
pnpm test:unit     # Vitest unit tests
pnpm test:e2e      # Cypress e2e tests
pnpm lint          # ESLint
ionic cap run android -l --external # Run on Android device with live reload
ionic cap run android --external --mode prod # Run on Android device on PRODUCTION BUILD
```

## Feature Flags

Runtime feature flags are defined in `src/shared/lib/feature-flags.ts` and driven by Vite environment variables. Import the `FEATURES` object wherever conditional behaviour is needed:

```ts
import { FEATURES } from '@/shared/lib/feature-flags'

if (FEATURES.maps) {
  // render map UI
}
```

| Flag | Env variable | Description |
|------|-------------|-------------|
| `FEATURES.maps` | `VITE_FEATURE_MAPS` | Enables the Google Maps JavaScript API and all map UI. |
| `FEATURES.directions` | `VITE_FEATURE_DIRECTIONS` | Enables Directions API route rendering. Automatically `false` when `maps` is disabled. |

Set the corresponding variable to `'true'` in `.env.local` (development) or `.env.prod` (production) to enable a flag. Any other value (including the default `'false'`) disables it.

## Project Structure

```
src/
├── core/router/        # Route definitions
├── features/           # Feature modules
│   ├── auth/           # Login (outside tabs)
│   ├── home/           # Home tab + TabsLayout shell + 404 page
│   ├── orders/         # Beautician orders
│   ├── trips/          # Rider trips (list + detail)
│   ├── leave/          # Leave requests, OT requests, and weekly off requests
│   ├── profile/        # User profile
│   ├── sessions/       # Active login sessions management
│   ├── calendar/       # Monthly calendar with leave and holiday events (fetched from BFF)
│   ├── reimbursements/ # Travel reimbursement requests (both roles)
│   ├── external-bookings/ # External bookings (beautician only)
│   ├── leaderboard/    # Leaderboard (both roles, visibility controlled by BFF)
│   ├── trip-fees/      # Trip fees report (rider only)
│   └── sos/            # SOS emergency alert (both roles)
└── shared/
    ├── api/            # BFF API service functions
    ├── components/ui/  # Shared UI primitives
    ├── composables/    # Cross-feature composables
    ├── lib/            # Axios client, storage, websocket
    ├── models/         # TypeScript domain types
    └── stores/         # Pinia stores (auth, ui, userType)
```

## App Store

The app store (`src/shared/stores/app.ts`) manages the app's boot lifecycle state via Pinia.

| Member | Type | Description |
|--------|------|-------------|
| `isOnline` | `Ref<boolean>` | Whether the device currently has an internet connection. Kept in sync with `useNetwork` via a watcher in `App.vue`. |
| `permissionsGranted` | `Ref<boolean>` | Whether all required runtime permissions have been granted. |
| `bootPhase` | `Ref<BootPhase>` | Current boot phase — `'booting'`, `'needs-permissions'`, or `'ready'`. |
| `isReady` | `ComputedRef<boolean>` | `true` when `bootPhase === 'ready'`. |
| `setOnline(online)` | `(boolean) => void` | Updates `isOnline`. |
| `setPermissionsGranted(granted)` | `(boolean) => void` | Updates `permissionsGranted`. |
| `setBootPhase(phase)` | `(BootPhase) => void` | Advances the boot phase. |

**`BootPhase`** — `'booting' | 'needs-permissions' | 'ready'`

`App.vue` drives the boot sequence using this store:

1. **`booting`** (initial) — a full-screen boot splash (HomSwag logo + spinning loader) is shown while network and permissions are checked silently. If the device is offline, `NoInternetView` is rendered instead until the user taps "Try Again" and connectivity is restored.
2. **`needs-permissions`** — network is confirmed but one or more required permissions are missing; `PermissionSplashView` is rendered.
3. **`ready`** — all checks passed; `restoreSession()` has run and the normal `<ion-router-outlet>` is rendered.

## Auth Store

The auth store (`src/shared/stores/auth.ts`) manages authentication state, tokens, and user identity via Pinia.

### Public API

| Member | Type | Description |
|--------|------|-------------|
| `accessToken` | `Ref<string \| null>` | Current access token (reactive). |
| `refreshToken` | `Ref<string \| null>` | Current refresh token (reactive). |
| `user` | `Ref<UserProfile \| null>` | Authenticated user profile (reactive). |
| `isAuthenticated` | `ComputedRef<boolean>` | `true` when an access token is present. |
| `restoreSession()` | `() => Promise<boolean>` | Hydrates auth state from persistent storage. Called during the app boot sequence (inside `finishBoot()` in `App.vue`) after network and permissions are confirmed. Returns `true` if a valid session was found. |
| `login(authResponse)` | `(AuthResponse) => Promise<void>` | Persists tokens and user profile from a verify-OTP response. Validates `user_type` — throws and clears storage if the type is not `'rider'` or `'beautician'`. |
| `setUserProfile(profile)` | `(UserProfile) => Promise<void>` | Updates the stored user profile in both state and storage. Use after fetching the full profile from `GET /profile`. |
| `logout()` | `() => Promise<void>` | Clears all auth state from memory and storage. Attempts best-effort server-side token revocation via `POST /auth/logout` first — local session is always cleared regardless of server response. |
| `refreshTokens()` | `() => Promise<void>` | Exchanges the current refresh token for a new token pair via `POST /auth/refresh`. Updates both state and storage. |

## WebSocket Service

The WebSocket service (`src/shared/lib/websocket.service.ts`) manages a persistent, authenticated connection to the BFF real-time endpoint. Import the singleton:

```ts
import webSocketService from '@/shared/lib/websocket.service'
```

Authentication is performed by appending the access token as a `?token=` query parameter. The service reconnects automatically on connection loss using exponential backoff (1 s initial, 30 s max).

### Public API

| Member | Signature | Description |
|--------|-----------|-------------|
| `connect(token)` | `(string) => void` | Opens the WebSocket connection, authenticating with the given access token. Resets backoff state. |
| `disconnect()` | `() => void` | Closes the connection and cancels any pending reconnect. |
| `isConnected` | `boolean` (getter) | `true` when the socket is in the `OPEN` ready state. |
| `emitLocation(coords)` | `(Coordinates) => void` | Sends a `{ type: 'location', latitude, longitude }` message. No-op if not connected. |
| `send(payload)` | `(Record<string, unknown>) => void` | Sends any arbitrary JSON payload. No-op if not connected. |
| `onMessage(listener)` | `(MessageListener) => () => void` | Registers a listener for inbound server messages (parsed as `WsMessage`). Returns an unsubscribe function — call it in `onUnmounted` to avoid leaks. |

### Listening for inbound messages

```ts
import { onMounted, onUnmounted } from 'vue'
import webSocketService from '@/shared/lib/websocket.service'
import type { WsMessage } from '@/shared/models/location.model'

const unsubscribe = webSocketService.onMessage((msg: WsMessage) => {
  if (msg.type === 'ping') webSocketService.send({ type: 'pong' })
})

onUnmounted(unsubscribe)
```

## Location Models

TypeScript interfaces for location and WebSocket messaging live in `src/shared/models/location.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `Coordinates` | `interface` | A latitude/longitude pair — `{ latitude: number, longitude: number }`. |
| `LocationPayload` | `interface` | Extends `Coordinates` with `timestamp` (Unix ms) and optional `accuracy` (metres). Sent to `POST /location` and emitted over WebSocket. |
| `PlaceResult` | `interface` | A resolved place from Google Places Autocomplete — `{ placeId, address, coordinates }`. |
| `WsMessageType` | `type` | Union of inbound WebSocket message type strings: `'location' \| 'location_update' \| 'ping' \| 'pong'`. |
| `WsMessage` | `interface` | Inbound WebSocket message shape. Has a required `type: WsMessageType` and optional fields `userId`, `latitude`, `longitude`, `timestamp`, plus an index signature for additional server-defined keys. |

## Auth Models

TypeScript interfaces for the authentication flow live in `src/shared/models/auth.model.ts`.

| Interface | Description |
|-----------|-------------|
| `OtpRequestBody` | Request body for `POST /auth/otp/request` — `{ phone: string }` |
| `OtpRequestResponse` | Response from `POST /auth/otp/request` — `{ new_user: boolean, otp?: string \| null }`. `otp` is only present in non-production environments. |
| `OtpVerifyBody` | Request body for `POST /auth/otp/verify` — `{ phone, otp }` |
| `AuthResponse` | Response from `POST /auth/otp/verify` — `{ accessToken, refreshToken, get_profile, user: { id, name, phone, user_type } }`. `get_profile: true` signals the client should immediately fetch the full profile. |
| `RefreshTokenBody` | Request body for `POST /auth/refresh` — `{ refresh_token: string }` |
| `TokenPair` | Response from `POST /auth/refresh` — `{ accessToken, refreshToken }` |
| `LogoutBody` | Request body for `POST /auth/logout` — `{ refresh_token: string }` |

> Token fields use camelCase (`accessToken`, `refreshToken`) to match the OpenAPI spec.

## User Models

TypeScript interfaces for field worker identity live in `src/shared/models/user.model.ts`.

**`UserType`** — `'rider' | 'beautician'`

Discriminates between the two field worker roles. Derived from the `user_type` field in the auth response.

**`UserProfile`**

Full profile for an authenticated field worker. Returned by `GET /profile` and embedded in `AuthResponse`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Unique user identifier. |
| `name` | `string` | Display name. |
| `phone` | `string` | Phone number used for OTP login. |
| `user_type` | `UserType` | Role — `'rider'` or `'beautician'`. |
| `photo?` | `{ url: string }` | Profile photo URL. |
| `email?` | `string` | Optional email address. |
| `date_of_birth?` | `string` | Date of birth — ISO 8601 date string (`YYYY-MM-DD`). |
| `address?` | `string` | Residential address. |
| `emergency_contact_name?` | `string` | Emergency contact name. |
| `emergency_contact_phone?` | `string` | Emergency contact phone number. |
| `documents?` | `ProfileDocument[]` | Uploaded KYC and role-specific documents. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |

**`ProfileDocument`**

A single uploaded document attached to a user profile (KYC, role-specific credentials, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Document type key (e.g. `'aadhaar'`, `'driving_license'`). |
| `label` | `string` | Human-readable display label. |
| `url?` | `string` | URL of the uploaded file (image or PDF). |
| `mime_type?` | `string` | MIME type of the uploaded file (e.g. `'image/jpeg'`, `'application/pdf'`). |
| `uploaded_at?` | `string` | ISO 8601 date-time string of when the document was uploaded. |
| `verified?` | `boolean` | Verification status set by office staff. |

## Shared Composables

| Composable | Location | Description |
|------------|----------|-------------|
| `useDrawer` | `src/shared/composables/useDrawer.ts` | Global drawer open/close state. Exposes `isDrawerOpen`, `openDrawer()`, `closeDrawer()`, and `toggleDrawer()`. Shared between `TabsLayout` (opener) and `AppDrawer` (consumer) via a module-level ref — no prop drilling required. |
| `useGeolocation` | `src/shared/composables/useGeolocation.ts` | Reactive GPS wrapper around `@capacitor/geolocation`. Handles permission requests, one-shot position fetches, and continuous position watching. Each position update is automatically emitted over the WebSocket connection for real-time admin tracking. |
| `useGoogleMaps` | `src/shared/composables/useGoogleMaps.ts` | Manages a Google Maps instance bound to a DOM element. Handles API loading, map initialization, named marker management, and route rendering via the Directions API. |
| `useNetwork` | `src/shared/composables/useNetwork.ts` | Reactive network connectivity state. Tracks whether the device has an active internet connection via `navigator.onLine` and the `online`/`offline` window events. Works on iOS and Android without a native plugin. Also exports `getIsOnline()` for use outside components. |
| `usePermissions` | `src/shared/composables/usePermissions.ts` | Manages the three required runtime permissions (Location, Camera, Notifications). Exposes reactive `statuses`, `allGranted`, and `isLoading` refs, plus `checkAll()` (silent check) and `requestAll()` (prompts the user). On web/PWA all permissions are treated as granted automatically. |
| `useTracking` | `src/shared/composables/useTracking.ts` | High-level tracking orchestrator for riders and beauticians. Requests location permission, connects the WebSocket (using the stored access token), starts a GPS watch, and emits each position update over the socket. Call `startTracking()` when a trip/order begins and `stopTracking()` when it ends. Auto-cleans up on component unmount. |

### `useGeolocation`

```ts
import { useGeolocation } from '@/shared/composables'

const {
  currentPosition, // Readonly<Ref<Coordinates | null>>
  isLoading,       // Readonly<Ref<boolean>>
  error,           // Readonly<Ref<string | null>>
  isWatching,      // Readonly<Ref<boolean>>
  requestPermission,   // () => Promise<string>
  getCurrentPosition,  // () => Promise<Coordinates | null>
  startWatching,       // (intervalMs?: number) => Promise<void>
  stopWatching,        // () => Promise<void>
} = useGeolocation()
```

| Member | Type | Description |
|--------|------|-------------|
| `currentPosition` | `Readonly<Ref<Coordinates \| null>>` | Latest GPS coordinates, or `null` if not yet acquired. |
| `isLoading` | `Readonly<Ref<boolean>>` | `true` while a position fetch or permission request is in progress. |
| `error` | `Readonly<Ref<string \| null>>` | Error message from the last failed operation, or `null`. |
| `isWatching` | `Readonly<Ref<boolean>>` | `true` when a continuous position watch is active. |
| `requestPermission()` | `() => Promise<string>` | Requests location permission from the device. Returns the permission status string (e.g. `'granted'`, `'denied'`). |
| `getCurrentPosition()` | `() => Promise<Coordinates \| null>` | Fetches the current position once and updates `currentPosition`. Returns `null` on failure. |
| `startWatching(intervalMs?)` | `(number?) => Promise<void>` | Starts a continuous position watch. Each update sets `currentPosition` and emits the coordinates over the WebSocket connection. No-op if already watching. |
| `stopWatching()` | `() => Promise<void>` | Stops the active position watch and clears the watch ID. |

### `useGoogleMaps`

```ts
import { useGoogleMaps } from '@/shared/composables'

const {
  mapRef,      // Ref<HTMLElement | null> — bind to <div ref="mapRef">
  isLoaded,    // Readonly<Ref<boolean>>
  error,       // Readonly<Ref<string | null>>
  map,         // Ref<google.maps.Map | null>
  initMap,     // (options?: google.maps.MapOptions) => Promise<void>
  setMarker,   // (id: string, options: MapMarkerOptions) => google.maps.Marker | null
  removeMarker,// (id: string) => void
  panTo,       // (coords: Coordinates, zoom?: number) => void
  drawRoute,   // (origin: Coordinates, destination: Coordinates) => Promise<boolean>
  clearRoute,  // () => void
  fitBounds,   // (coordsList: Coordinates[]) => void
} = useGoogleMaps()
```

Manages a Google Maps instance bound to a DOM element. Handles API script loading, map initialization, named marker management, and route rendering via the Directions API.

| Member | Type | Description |
|--------|------|-------------|
| `mapRef` | `Ref<HTMLElement \| null>` | Bind to the map container `<div>` in the template. |
| `isLoaded` | `Readonly<Ref<boolean>>` | `true` once the Maps API is loaded and the map is initialized. |
| `error` | `Readonly<Ref<string \| null>>` | Error message if initialization or route drawing failed, otherwise `null`. |
| `map` | `Ref<google.maps.Map \| null>` | The underlying `google.maps.Map` instance. Mutable — callers can replace or interact with the map directly. |
| `initMap(options?)` | `(MapOptions?) => Promise<void>` | Loads the Maps API (if not already loaded) and initializes the map on the bound element. Merges provided options with sensible defaults (zoom 14, no POI/transit labels, greedy gesture handling). |
| `setMarker(id, options)` | `(string, MapMarkerOptions) => Marker \| null` | Adds a named marker to the map. If a marker with the same `id` already exists, its position and title are updated in place. Supports optional custom color (SVG pin) and BOUNCE animation. Returns `null` if the map is not yet initialized. |
| `removeMarker(id)` | `(string) => void` | Removes the named marker from the map and cleans up the reference. |
| `panTo(coords, zoom?)` | `(Coordinates, number?) => void` | Pans the map to the given coordinates. Optionally sets the zoom level. |
| `drawRoute(origin, destination)` | `(Coordinates, Coordinates) => Promise<boolean>` | Draws a driving route between two coordinates using the Directions API. Renders a brand-purple polyline (`#7C3AED`). Reuses an existing `DirectionsRenderer` if one is active. Returns `true` on success, `false` on failure. |
| `clearRoute()` | `() => void` | Removes the currently rendered route polyline from the map. |
| `fitBounds(coordsList)` | `(Coordinates[]) => void` | Adjusts the map viewport to fit all provided coordinates with 60 px padding. |

### `useTracking`

High-level composable that orchestrates real-time location tracking. It requests location permission, connects the WebSocket, starts a GPS watch, and emits each position update over the socket. Designed to be called at the start/end of a trip or order.

```ts
import { useTracking } from '@/shared/composables'

const {
  currentPosition, // Readonly<Ref<Coordinates | null>>
  isTracking,      // Readonly<Ref<boolean>>
  isConnected,     // Readonly<Ref<boolean>>
  error,           // Readonly<Ref<string | null>>
  startTracking,   // (intervalMs?: number) => Promise<void>
  stopTracking,    // () => Promise<void>
} = useTracking()
```

| Member | Type | Description |
|--------|------|-------------|
| `currentPosition` | `Readonly<Ref<Coordinates \| null>>` | Latest GPS coordinates, or `null` if not yet acquired. |
| `isTracking` | `Readonly<Ref<boolean>>` | `true` while a GPS watch is active. |
| `isConnected` | `Readonly<Ref<boolean>>` | `true` while the WebSocket connection is open. |
| `error` | `Readonly<Ref<string \| null>>` | Error message from the last failed operation, or `null`. |
| `startTracking(intervalMs?)` | `(number?) => Promise<void>` | Requests location permission, connects the WebSocket (using the stored access token), and starts a GPS watch. Each position update is emitted over the socket. Defaults to a 10-second interval. No-op if already tracking. |
| `stopTracking()` | `() => Promise<void>` | Stops the GPS watch and disconnects the WebSocket. No-op if not tracking. |

The composable registers an `onUnmounted` hook that calls `stopTracking()` automatically, so there is no need to call it manually in most cases.

### `useNetwork`

Reactive network connectivity state backed by `navigator.onLine` and the browser's `online`/`offline` window events. Uses a module-level singleton so all callers share the same reactive state. Works correctly on iOS and Android — the Capacitor WebView fires the standard browser events without requiring a native plugin.

```ts
import { useNetwork, getIsOnline } from '@/shared/composables/useNetwork'

// Inside a component
const { isOnline } = useNetwork()

// Outside a component (store, router guard, etc.)
const online = getIsOnline()
```

| Member | Type | Description |
|--------|------|-------------|
| `isOnline` | `Readonly<Ref<boolean>>` | `true` when the device has an active internet connection. Reactive — updates automatically when connectivity changes. |

**`getIsOnline()`** — standalone function that reads the current online state without registering any lifecycle hooks. Safe to call in stores, router guards, or any non-component context.

Event listeners are added on the first component mount and removed when the last consumer unmounts, so there is no listener leak regardless of how many components use the composable simultaneously.

### `usePermissions`

Manages the three required runtime permissions — Location, Camera, and Notifications — using the Capacitor plugin APIs. Uses a fresh instance per call (not a singleton), so it is typically called once in `App.vue` during boot and once in `PermissionSplashView`.

```ts
import { usePermissions } from '@/shared/composables/usePermissions'

const {
  statuses,              // Readonly<Ref<PermissionStatuses>>
  allGranted,            // Readonly<Ref<boolean>>
  isLoading,             // Readonly<Ref<boolean>>
  checkAll,              // () => Promise<void>
  requestAll,            // () => Promise<void>
  requestLocation,       // () => Promise<PermissionState>
  requestCamera,         // () => Promise<PermissionState>
  requestNotifications,  // () => Promise<PermissionState>
} = usePermissions()
```

| Member | Type | Description |
|--------|------|-------------|
| `statuses` | `Readonly<Ref<PermissionStatuses>>` | Current state for each permission (`location`, `camera`, `notifications`). Each value is `'granted' \| 'denied' \| 'prompt' \| 'prompt-with-rationale' \| 'unknown'`. |
| `allGranted` | `Readonly<Ref<boolean>>` | `true` when all three permissions are `'granted'`. |
| `isLoading` | `Readonly<Ref<boolean>>` | `true` while a check or request is in progress. |
| `checkAll()` | `() => Promise<void>` | Reads current permission states without prompting the user. Safe to call on every boot. |
| `requestAll()` | `() => Promise<void>` | Requests each permission in sequence (location → camera → notifications). Used by `PermissionSplashView`. |
| `requestLocation()` | `() => Promise<PermissionState>` | Requests only the location permission. |
| `requestCamera()` | `() => Promise<PermissionState>` | Requests only the camera permission. |
| `requestNotifications()` | `() => Promise<PermissionState>` | Requests only the notifications permission. |

On web/PWA (`Capacitor.isNativePlatform() === false`) all permissions are immediately set to `'granted'` so the splash screen is never shown in a browser context.

### `NoInternetView`

Full-screen offline overlay (`src/features/home/views/NoInternetView.vue`). Renders a centered card with a `wifi-off` icon, a user-facing message, and a "Try Again" button. Pair it with `useNetwork` to gate the app shell behind connectivity.

```vue
<NoInternetView v-if="!isOnline" @retry="checkConnectivity" />
```

**Emits**

| Event | Description |
|-------|-------------|
| `retry` | Fired after an 800 ms debounce when the user taps "Try Again". The parent should re-check `isOnline` and hide the overlay if connectivity has been restored. |

The button shows a spinning `loader-circle` icon and is disabled while the debounce is in progress, preventing rapid repeated taps.

### `PermissionSplashView`

Full-screen permission onboarding screen (`src/features/home/views/PermissionSplashView.vue`). Shown during the app boot sequence when the device is online but one or more required runtime permissions have not yet been granted. Displays the HomSwag logo, a brief explanation, and a list of the three required permissions (Location, Camera, Notifications) with live status indicators.

```vue
<PermissionSplashView @granted="handlePermissionsGranted" />
```

**Emits**

| Event | Description |
|-------|-------------|
| `granted` | Fired when the user taps "Continue" after the permission request flow completes. The parent (`App.vue`) calls `finishBoot()` to restore the session and advance to the `ready` phase. |

Tapping "Grant Permissions" walks through each permission in sequence (with a brief per-item loading state), then switches the button to "Continue". If any permission is denied, a warning banner instructs the user to open device Settings. The "Continue" button is always available after the request flow so users who deny optional permissions are not permanently blocked.

On web/PWA all permissions are treated as granted and the splash is skipped automatically.

**`MapMarkerOptions`**

| Field | Type | Description |
|-------|------|-------------|
| `position` | `Coordinates` | Latitude/longitude for the marker. |
| `title?` | `string` | Tooltip text shown on hover. |
| `label?` | `string` | Custom label (emoji or text) for the marker pin. |
| `color?` | `string` | Hex color for a custom SVG circle pin (e.g. `'#7C3AED'`). |
| `animate?` | `boolean` | If `true`, the marker bounces (`google.maps.Animation.BOUNCE`). |

## Shared UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AppDrawer` | `src/shared/components/ui/AppDrawer.vue` | Slide-in navigation drawer. Reads open/close state from `useDrawer`. Displays a user avatar (photo or initials) and role label in a branded header. Navigation is split into three sections: **Primary** (Home; role-conditional Orders/Complaints/External Bookings for beauticians, Trips/Trip Fees for riders; plus Calendar, Notifications, Leaderboard, Reimbursements for all); **Leave & Time Off** (Leave Requests, OT Requests, Weekly Off); **Account** (Profile, Active Sessions, Support & Feedback). A footer SOS button and logout button are always visible. Active state highlights the current route and any nested child routes. Controlled entirely via `useDrawer` — no props required. |
| `GoogleMapView` | `src/shared/components/ui/GoogleMapView.vue` | Reusable Google Maps component. Wraps `useGoogleMaps` and handles loading/error states internally. Supports pickup, drop, and live-position markers, optional driving route rendering, and automatic bounds fitting. Emits `map-ready` once the map is initialized and `map-error` on failure. Renders a static "Map unavailable" fallback when `FEATURES.maps` is `false`. |
| `NoInternetView` | `src/features/home/views/NoInternetView.vue` | Full-screen offline overlay. Displays a `wifi-off` icon, a message prompting the user to check connectivity, and a "Try Again" button. The button emits a `retry` event after an 800 ms debounce so the parent can re-check connectivity. Intended to be conditionally rendered over the app shell when `useNetwork`'s `isOnline` is `false`. |
| `PlacesSearchInput` | `src/shared/components/ui/PlacesSearchInput.vue` | Address search input backed by Google Places Autocomplete. Supports free-text address search, direct lat/lng coordinate entry, a loading spinner during API calls, and a clear button. Emits the selected `PlaceResult` on selection. Fully keyboard-accessible (Enter selects, Escape clears). |

### `GoogleMapView`

```vue
<GoogleMapView
  height="300px"
  :center="{ latitude: 3.1390, longitude: 101.6869 }"
  :zoom="14"
  :pickup="pickupCoords"
  :drop="dropCoords"
  :live-position="riderCoords"
  :show-route="true"
  @map-ready="onMapReady"
  @map-error="onMapError"
/>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `string` | `'100%'` | CSS height of the map container (e.g. `'300px'`, `'50vh'`). |
| `center` | `Coordinates \| undefined` | — | Initial center coordinates. Falls back to the Maps API default if omitted. |
| `zoom` | `number` | `14` | Initial zoom level. |
| `pickup` | `Coordinates \| null` | `null` | Coordinates for the pickup marker (green pin). Removed when `null`. |
| `drop` | `Coordinates \| null` | `null` | Coordinates for the drop marker (red pin). Removed when `null`. |
| `livePosition` | `Coordinates \| null` | `null` | Coordinates for the live-position marker (purple pin). Removed when `null`. |
| `showRoute` | `boolean` | `false` | When `true`, draws a driving route between `pickup` and `drop` via the Directions API. |

**Emits**

| Event | Payload | Description |
|-------|---------|-------------|
| `map-ready` | `google.maps.Map` | Fired once the map is fully initialized. Use the payload to call Maps API methods directly. |
| `map-error` | `string` | Fired when map initialization fails. Payload is the error message. |

The component automatically fits the viewport to show all active markers (pickup, drop, livePosition) when more than one is present. All marker and route state reacts to prop changes via watchers.

When `FEATURES.maps` is `false` (i.e. `VITE_FEATURE_MAPS` is not set to `'true'`), the component skips map initialization entirely and renders a static "Map unavailable" placeholder instead. No Maps API calls are made and no emits are fired in this state.

### `PlacesSearchInput`

Address search field backed by Google Places Autocomplete. Also accepts raw `lat, lng` coordinate strings as a direct input mode.

```vue
<PlacesSearchInput
  label="Pickup address"
  placeholder="Search address or enter lat, lng"
  icon="lucide:map-pin"
  v-model="pickupAddress"
  @place-selected="onPickupSelected"
/>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Accessible label for the input (used as `aria-label` and listbox label). Required. |
| `placeholder` | `string` | `'Search address or enter lat, lng'` | Input placeholder text. |
| `icon` | `string` | `'lucide:map-pin'` | Lucide icon name rendered on the left side of the input. |
| `modelValue` | `string` | `''` | Pre-filled address string. Supports `v-model`. |

**Emits**

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted on every keystroke — use with `v-model`. |
| `place-selected` | `PlaceResult` | Emitted when the user selects a suggestion or confirms a lat/lng entry. Payload is a `PlaceResult` with `placeId`, `address`, and `coordinates`. |

**Behaviour**

- Typing triggers Google Places Autocomplete predictions after a debounce.
- Entering a string matching `lat, lng` (e.g. `3.1390, 101.6869`) shows a "Use coordinates" option at the top of the dropdown.
- Pressing **Enter** selects the lat/lng result (if present) or the first autocomplete suggestion.
- Pressing **Escape** clears the input and closes the dropdown.
- The clear (×) button appears whenever the input has a value.
- A spinner is shown while autocomplete requests are in flight.
- Depends on `usePlacesSearch` composable and the `PlaceResult` model from `@/shared/models/location.model`.

## Trips Feature (Rider)

The Trips feature (`src/features/trips/`) provides riders with a list of their assigned trips and navigation to trip detail.

### `TripsView`

The main trips list view (`/trips`). On mount it fetches the first page of trips and renders one of four states:

- **Loading skeleton** — shown while the initial fetch is in progress (4 animated shimmer cards).
- **Error state** — shown when the fetch fails with no cached data; includes a Retry button.
- **Empty state** — shown when the rider has no trips.
- **Trip list** — a scrollable list of `TripCard` components, each navigating to `/trips/:id` on tap.

Pull-to-refresh is supported via `<ion-refresher>`.

### `TripCard`

Presentational card component (`src/features/trips/components/TripCard.vue`) that displays a single trip summary.

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `trip` | `Trip` | The trip object to render. |

**Emits**

| Event | Description |
|-------|-------------|
| `click` | Fired when the card is tapped. The parent is responsible for navigation. |

Displays the trip's kanban status badge, formatted start time (IST), pickup and drop addresses (falls back to `lat, lng` if no address string), and a footer that shows the customer name (if available) or the fare amount as a fallback.

### `useTrips`

Composable (`src/features/trips/composables/useTrips.ts`) that manages the rider's trip list state.

```ts
import { useTrips } from '@/features/trips/composables/useTrips'

const { trips, isLoading, error, pagination, fetchTrips, refresh } = useTrips()
```

| Member | Type | Description |
|--------|------|-------------|
| `trips` | `Readonly<Ref<Trip[]>>` | Current list of trips. |
| `isLoading` | `Readonly<Ref<boolean>>` | `true` while a fetch is in progress. |
| `error` | `Readonly<Ref<string \| null>>` | Error message from the last failed fetch, or `null`. |
| `pagination` | `Readonly<Ref<PaginatedResponse meta \| null>>` | Pagination metadata (total, page, limit) from the last response. |
| `fetchTrips(page?, limit?)` | `(number?, number?) => Promise<void>` | Fetches a page of trips (defaults: page 1, limit 20). |
| `refresh()` | `() => Promise<void>` | Re-fetches page 1 — convenience wrapper used by pull-to-refresh. |

### `TripDetailView`

The trip detail view (`/trips/:id`). Fetches a single trip on mount and renders one of three states:

- **Loading state** — spinner shown while the trip is being fetched.
- **Error state** — shown when the fetch fails; includes a Retry button.
- **Trip content** — full detail layout with a map, trip info card, location override panel, and action buttons.

The view integrates `GoogleMapView` (40 vh map with pickup/drop/live-position markers and an optional driving route), a location override panel backed by `PlacesSearchInput`, and a tracking toggle that appears while the trip is in the `Trip Started` state. Tracking starts automatically when the trip enters `Trip Started` and stops when it reaches `Trip Completed` or `Completed`.

The header shows a live "Live" badge (pulsing dot) whenever location tracking is active.

**Action button progression**

| Current state | Button label |
|---------------|-------------|
| `Assigned` | Mark as Viewed |
| `Viewed` | Start Trip |
| `Trip Started` | Complete Trip |
| `Trip Completed` | Calculate Fare |
| `Fare Calculated` | Mark Completed |

An "Open in Maps" button is always visible and deep-links to Google Maps with the full origin → destination driving route.

### Trip Models

TypeScript interfaces for the trips feature live in `src/shared/models/trip.model.ts`.

**`TripKanbanState`**

Union type covering all kanban progression states:

```
'requests' | 'Assigned' | 'Viewed' | 'Trip Started' | 'Trip Completed' | 'Fare Calculated' | 'Completed'
```

`'requests'` is an internal/API-returned state used before a trip is assigned to a rider. The remaining states represent the rider's progression through a trip.

**`GeoJsonPoint`**

Raw GeoJSON Point shape as returned by the BFF API. Coordinates are `[longitude, latitude]` (GeoJSON order).

```ts
interface GeoJsonPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}
```

**`RawTrip`**

Raw trip shape as returned by the BFF API. Used only in the service layer for normalization — do not use this type in views or composables.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | `string` | MongoDB document ID. |
| `office_id` | `string` | Office the trip belongs to. |
| `rider_id` | `string` | Assigned rider ID. |
| `order_id` | `object \| string` | Nested order object (when populated) or a bare ID string. Contains `order_number`, `status`, optional `customer`, and optional `booking_info`. |
| `pickup_location` | `GeoJsonPoint` | Raw pickup coordinates. |
| `drop_location` | `GeoJsonPoint` | Raw drop coordinates. |
| `status` | `string` | Raw status string from the API. |
| `trip_number` | `string` | Human-readable trip reference number. |
| `kanban_state` | `TripKanbanState` | Current kanban state. |
| `is_two_way` | `boolean` | Whether the trip is a return journey. |
| `is_self_drive` | `boolean` | Whether the rider is self-driving. |
| `created_at` | `string` | ISO 8601 creation timestamp. |
| `updated_at` | `string` | ISO 8601 last-updated timestamp. |
| `zone_id?` | `string` | Optional zone identifier. |
| `auto_distance_km?` | `number` | Auto-calculated distance in kilometres. |
| `fare?` | `number` | Calculated fare amount. |
| `notes?` | `string` | Optional trip notes. |

**`Trip`**

Normalized trip entity used throughout the app. Produced by normalizing a `RawTrip` in the service layer.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Trip ID (from `_id`). |
| `trip_number` | `string` | Human-readable trip reference number. |
| `kanban_state` | `TripKanbanState` | Current kanban state. |
| `start_time` | `string` | ISO 8601 — derived from `created_at` (API has no dedicated start_time field). |
| `pickup_location` | `Coordinates & { address?: string }` | Pickup coordinates with optional resolved address string. |
| `drop_location` | `Coordinates & { address?: string }` | Drop coordinates with optional resolved address string. |
| `customer_name?` | `string` | Customer name from the nested order. |
| `order_number?` | `string` | Order number from the nested order. |
| `end_time?` | `string` | ISO 8601 trip end time. |
| `fare?` | `number` | Calculated fare amount. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |
| `notes?` | `string` | Optional trip notes. |
| `is_two_way?` | `boolean` | Whether the trip is a return journey. |
| `auto_distance_km?` | `number` | Auto-calculated distance in kilometres. |

**`TripFeeEntry`** and **`TripFeesReport`**

TypeScript interfaces for the trip fees report live in `src/shared/models/trip-fees.model.ts`. Riders use this data to view a breakdown of their earnings and deductions for a given period.

**`TripFeeEntry`** — a single trip's fee breakdown:

| Field | Type | Description |
|-------|------|-------------|
| `trip_id` | `string` | Trip identifier. |
| `trip_number` | `string` | Human-readable trip reference number. |
| `date` | `string` | ISO 8601 date string for the trip. |
| `distance_km?` | `number` | Trip distance in kilometres (optional). |
| `fare` | `number` | Gross fare for the trip. |
| `deduction?` | `number` | Platform fee or other deduction (optional). |
| `net_amount` | `number` | Net payout after deductions. |
| `status?` | `'pending' \| 'paid'` | Payment status (optional). |

**`TripFeesReport`** — aggregated report for a period:

| Field | Type | Description |
|-------|------|-------------|
| `period_label` | `string` | Human-readable label for the period (e.g. "May 2026"). |
| `from_date` | `string` | ISO 8601 start date of the period. |
| `to_date` | `string` | ISO 8601 end date of the period. |
| `total_trips` | `number` | Total number of trips in the period. |
| `total_fare` | `number` | Sum of all gross fares. |
| `total_deductions` | `number` | Sum of all deductions. |
| `total_net` | `number` | Sum of all net payouts. |
| `entries` | `TripFeeEntry[]` | Per-trip fee breakdown entries. |

### `TripStatusBadge`

Presentational badge component (`src/features/trips/components/TripStatusBadge.vue`) that renders a coloured pill for a trip's kanban state.

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `state` | `TripKanbanState` | The kanban state to display. |

Color mapping: `Assigned` → info (blue), `Viewed` → warning (amber), `Trip Started` → brand (purple), `Trip Completed` → success (green), `Fare Calculated` / `Completed` → muted (grey).

### `useTripDetail`

Composable (`src/features/trips/composables/useTripDetail.ts`) that manages a single trip's data and kanban state transitions.

```ts
import { useTripDetail } from '@/features/trips/composables/useTripDetail'

const {
  trip,        // Readonly<Ref<Trip | null>>
  isLoading,   // Readonly<Ref<boolean>>
  error,       // Readonly<Ref<string | null>>
  isUpdating,  // Readonly<Ref<boolean>>
  isInProgress,// Readonly<Ref<boolean>>
  isCompleted, // Readonly<Ref<boolean>>
  fetchTrip,   // (id: string | number) => Promise<void>
  advanceStatus, // () => Promise<void>
} = useTripDetail()
```

| Member | Type | Description |
|--------|------|-------------|
| `trip` | `Readonly<Ref<Trip \| null>>` | The fetched trip, or `null` before load. |
| `isLoading` | `Readonly<Ref<boolean>>` | `true` while the initial fetch is in progress. |
| `error` | `Readonly<Ref<string \| null>>` | Error message from the last failed operation, or `null`. |
| `isUpdating` | `Readonly<Ref<boolean>>` | `true` while a status-advance call is in flight. |
| `isInProgress` | `Readonly<Ref<boolean>>` | `true` when the trip is in `Trip Started` state (tracking should be active). |
| `isCompleted` | `Readonly<Ref<boolean>>` | `true` when the trip is in `Fare Calculated` or `Completed` state. |
| `fetchTrip(id)` | `(string \| number) => Promise<void>` | Fetches the trip by ID and populates `trip`. |
| `advanceStatus()` | `() => Promise<void>` | Advances the trip to the next kanban state via `PATCH /trips/:id/status`. Updates `trip` in place on success. |

**Kanban state progression**: `requests` → `Assigned` → `Viewed` → `Trip Started` → `Trip Completed` → `Fare Calculated` → `Completed`. The `requests` state is API-returned and precedes rider assignment; `advanceStatus()` begins from `Assigned`.

### Trips Service API

Typed wrappers around the BFF trips endpoints (`src/shared/api/trips.service.ts`). All functions normalize the raw API response into the app's `Trip` model.

| Function | Method & Path | Description |
|----------|--------------|-------------|
| `getTrips(page?, limit?)` | `GET /trips` | Fetches the list of trips assigned to the authenticated rider. Handles both plain-array and paginated-envelope responses. |
| `getTrip(id)` | `GET /trips/:id` | Fetches a single trip by ID. |
| `updateTripStatus(id, kanbanState)` | `PATCH /trips/:id/kanban-state` | Advances the trip to the given kanban state. |
| `confirmCustomerLocation(id, body)` | `PATCH /trips/:id/confirm-location` | Confirms the customer's pickup location. `body` accepts `latitude`, `longitude`, and an optional `address` string. |
| `updateRiderSelfRideStatus(id, isSelfRide)` | `PATCH /trips/:id/self-ride` | Sets whether the rider is travelling independently (`is_self_ride`). |

All functions return a `Promise<Trip>` (or `Promise<Trip[]>` for `getTrips`) and throw an `ApiError` on failure.

## Orders Feature (Beautician)

The Orders feature (`src/features/orders/`) provides beauticians with a list of their assigned service orders and navigation to order detail.

### `OrderCard`

Presentational card component (`src/features/orders/components/OrderCard.vue`) that displays a single order summary.

**Props**

| Prop | Type | Description |
|------|------|-------------|
| `order` | `Order` | The order object to render. |

**Emits**

| Event | Description |
|-------|-------------|
| `click` | Fired when the card is tapped. The parent is responsible for navigation. |

Displays the order number (falls back to `id`), a formatted service date, a status badge colour-coded by state (`completed` → success, `ongoing`/`started` → info, `arrived_and_cancelled` → error, all others → warning), the customer name (from `customer.full_name` or `customer.name`), and the service address (from `delivery_address` or `address`, formatted as `street/line1, city`).

### Order Models

TypeScript interfaces for the orders feature live in `src/shared/models/order.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `OrderStatus` | `type` | Union of order status strings: `'Confirmed' \| 'Ongoing' \| 'Started' \| 'Completed' \| 'started' \| 'ongoing' \| 'completed' \| 'arrived_and_cancelled'`. |
| `OrderAddress` | `interface` | Customer address embedded in an order. |
| `OrderCustomer` | `interface` | Customer information embedded in an order. |
| `OrderBookingInfo` | `interface` | Booking timing and slot info embedded in an order. |
| `Order` | `interface` | A service booking entity assigned to a beautician. |
| `OrderProduct` | `interface` | A product/service line item within an order. |
| `UpdateOrderStatusBody` | `interface` | Request body for `PATCH /orders/:id/status`. |
| `VerifyServiceOtpBody` | `interface` | Request body for `POST /orders/:id/otp/verify`. |

**`Order`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Order ID. |
| `_id?` | `string` | MongoDB document ID (optional, API-returned). |
| `order_number?` | `string` | Human-readable order reference number. |
| `status` | `OrderStatus` | Current order status. |
| `service_date?` | `string` | ISO 8601 date string for the scheduled service date. |
| `booking_info?` | `OrderBookingInfo` | Booking timing, date, surge amount, and slot ID. |
| `customer?` | `OrderCustomer` | Embedded customer info (id, name, phone, email). |
| `address?` | `OrderAddress` | Service address (alternative field name). |
| `delivery_address?` | `OrderAddress` | Service address (preferred field name). |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |
| `notes?` | `string` | Optional order notes. |
| `service_otp?` | `string` | OTP for service start verification. |
| `products?` | `OrderProduct[]` | Products/services included in the order. |
| `invoice?` | `{ id?, invoice_number? }` | Invoice info if available. |

**`UpdateOrderStatusBody`**

Sent to `PATCH /orders/:id/status`.

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'started' \| 'ongoing' \| 'completed' \| 'arrived_and_cancelled'` | New status to set. |
| `status_reason?` | `string` | Optional reason (required for cancellation). |

**`VerifyServiceOtpBody`**

Sent to `POST /orders/:id/otp/verify`.

| Field | Type | Description |
|-------|------|-------------|
| `otp` | `string` | The 6-digit OTP entered by the beautician to start the service. |

### `OrderDetailView`

The order detail view (`/orders/:id`). Fetches a single order on mount and renders one of three states:

- **Loading state** — spinner shown while the order is being fetched.
- **Error state** — shown when the fetch fails; includes a Retry button.
- **Order content** — full detail layout with a status timeline, info card, OTP section, and action buttons.

**Status timeline** — a horizontal step indicator showing the four stages of an order: `Confirmed → Started → Ongoing → Completed`. Completed steps are filled green, the active step is highlighted in brand purple.

**Info card** — displays the order number, service date, customer name (tappable phone link if available), service address, booking timing, and any notes.

**OTP section** — shown when the order is in `Confirmed` state. The beautician can generate a 6-digit service OTP to share with the customer, then enter the customer-confirmed OTP to start the service.

**Action button progression**

| Current status | Button label |
|----------------|-------------|
| `Confirmed` | Start Service |
| `started` / `Started` | Mark Ongoing |
| `ongoing` / `Ongoing` | Complete Service |

A **Cancel After Arrival** button is available when the order is in `Confirmed` or `started` state. Tapping it opens a modal requiring a cancellation reason before confirming.

### `useOrderDetail`

Composable (`src/features/orders/composables/useOrderDetail.ts`) that manages a single order's data and status transitions.

```ts
import { useOrderDetail } from '@/features/orders/composables/useOrderDetail'

const {
  order,            // Readonly<Ref<Order | null>>
  isLoading,        // Readonly<Ref<boolean>>
  isUpdating,       // Readonly<Ref<boolean>>
  isGeneratingOtp,  // Readonly<Ref<boolean>>
  isVerifyingOtp,   // Readonly<Ref<boolean>>
  error,            // Readonly<Ref<string | null>>
  nextActionLabel,  // ComputedRef<string | null>
  isCompleted,      // ComputedRef<boolean>
  fetchOrder,       // (id: string | number) => Promise<void>
  advanceStatus,    // (reason?: string) => Promise<void>
  cancelAfterArrival, // (reason: string) => Promise<void>
  generateOtp,      // () => Promise<string | null>
  verifyOtp,        // (otp: string) => Promise<boolean>
} = useOrderDetail()
```

| Member | Type | Description |
|--------|------|-------------|
| `order` | `Readonly<Ref<Order \| null>>` | The fetched order, or `null` before load. |
| `isLoading` | `Readonly<Ref<boolean>>` | `true` while the initial fetch is in progress. |
| `isUpdating` | `Readonly<Ref<boolean>>` | `true` while a status-update call is in flight. |
| `isGeneratingOtp` | `Readonly<Ref<boolean>>` | `true` while an OTP generation request is in flight. |
| `isVerifyingOtp` | `Readonly<Ref<boolean>>` | `true` while an OTP verification request is in flight. |
| `error` | `Readonly<Ref<string \| null>>` | Error message from the last failed operation, or `null`. |
| `nextActionLabel` | `ComputedRef<string \| null>` | Label for the primary action button based on current status, or `null` when no further action is available. |
| `isCompleted` | `ComputedRef<boolean>` | `true` when the order status is `'Completed'` or `'completed'`. |
| `fetchOrder(id)` | `(string \| number) => Promise<void>` | Fetches the order by ID and populates `order`. |
| `advanceStatus(reason?)` | `(string?) => Promise<void>` | Advances the order to the next status via `PATCH /orders/:id/status`. Updates `order` in place on success. |
| `cancelAfterArrival(reason)` | `(string) => Promise<void>` | Sets the order status to `arrived_and_cancelled` with the provided reason. |
| `generateOtp()` | `() => Promise<string \| null>` | Generates a service OTP via the API and updates `order.service_otp`. Returns the OTP string on success, `null` on failure. |
| `verifyOtp(otp)` | `(string) => Promise<boolean>` | Verifies the customer-entered OTP via the API. Returns `true` on success, `false` on failure. |

**Status progression**: `Confirmed` → `started` → `ongoing` → `completed`. `cancelAfterArrival` can be called from `Confirmed` or `started` states.

## Leave Models

TypeScript interfaces for the leave requests feature live in `src/shared/models/leave-request.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `LeaveType` | `type` | Union of leave category strings: `'paid_leave' \| 'sick_leave' \| 'loss_of_pay' \| 'block_time'`. |
| `LeaveStatus` | `type` | Approval lifecycle states: `'requested' \| 'approved' \| 'rejected'`. |
| `LeaveDuration` | `type` | Duration options: `'full_day' \| 'first_half' \| 'second_half'`. |
| `LeaveRequest` | `interface` | A leave request entity as returned by the BFF API. |
| `LeaveRequestBody` | `interface` | Request body for `POST /leave-requests`. |
| `LeaveBalance` | `interface` | Leave balance summary returned by `GET /leave-balance`. |

**`LeaveRequest`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Leave request ID. |
| `_id?` | `string` | MongoDB document ID (optional, API-returned). |
| `date` | `string` | ISO 8601 date string (YYYY-MM-DD). |
| `leave_type` | `LeaveType` | Category of leave. |
| `duration` | `LeaveDuration` | Full day or half-day selection. |
| `status` | `LeaveStatus` | Current approval state. |
| `reason?` | `string` | Optional reason for the leave request. |
| `start_time?` | `string` | ISO 8601 time — required when `duration` is `first_half` or `second_half`. |
| `end_time?` | `string` | ISO 8601 time — required when `duration` is `first_half` or `second_half`. |
| `requester_type?` | `'beautician' \| 'rider'` | Role of the requester. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |

**`LeaveRequestBody`**

Sent to `POST /leave-requests`. `requester_id` and `requester_type` are injected server-side from the JWT — do not include them in the request body.

| Field | Type | Description |
|-------|------|-------------|
| `date` | `string` | ISO 8601 date string (YYYY-MM-DD). |
| `leave_type` | `LeaveType` | Category of leave. |
| `duration` | `LeaveDuration` | Full day or half-day selection. |
| `reason?` | `string` | Optional reason. |
| `start_time?` | `string` | Required when `duration` is `first_half` or `second_half` — format: `HH:MM AM/PM`. |
| `end_time?` | `string` | Required when `duration` is `first_half` or `second_half` — format: `HH:MM AM/PM`. |

**`LeaveBalance`**

Returned by `GET /leave-balance`. All fields are optional numbers representing remaining days.

| Field | Type | Description |
|-------|------|-------------|
| `paid_leave?` | `number` | Remaining paid leave days. |
| `sick_leave?` | `number` | Remaining sick leave days. |
| `loss_of_pay?` | `number` | Remaining loss-of-pay days. |
| `block_time?` | `number` | Remaining block time. |
| `total_taken?` | `number` | Total leave days taken. |
| `total_available?` | `number` | Total leave days available. |

## OT Request Models

TypeScript interfaces for overtime requests live in `src/shared/models/ot-request.model.ts`. Submitted by beauticians and riders when they work beyond their scheduled hours.

| Type | Kind | Description |
|------|------|-------------|
| `OtRequestStatus` | `type` | Approval lifecycle states: `'requested' \| 'approved' \| 'rejected'`. |
| `OtRequest` | `interface` | An OT request entity as returned by the BFF API. |
| `OtRequestBody` | `interface` | Request body for creating a new OT request. |

**`OtRequest`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | OT request ID. |
| `_id?` | `string` | MongoDB document ID (optional, API-returned). |
| `date` | `string` | ISO 8601 date string (YYYY-MM-DD) — the date overtime was worked. |
| `reason?` | `string` | Optional reason for the overtime. |
| `status` | `OtRequestStatus` | Current approval state. |
| `requester_type?` | `'beautician' \| 'rider'` | Role of the requester. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |

**`OtRequestBody`**

Sent when creating a new OT request.

| Field | Type | Description |
|-------|------|-------------|
| `requester_id` | `string` | ID of the user submitting the request. |
| `requester_type` | `'beautician' \| 'rider'` | Role of the requester. |
| `date` | `string` | ISO 8601 date string (YYYY-MM-DD). |
| `reason?` | `string` | Optional reason. |

## Leave Feature

### `LeaveView`

The main leave requests view (`/leave`). On mount it fetches the user's leave requests and renders one of three states:

- **Loading skeleton** — shown while the initial fetch is in progress (4 animated shimmer cards).
- **Empty state** — shown when the user has no requests of any kind.
- **Request list** — a unified, scrollable list of all request types (leave, OT, weekly off), each card showing a type icon, title, date, optional detail (e.g. duration or hours), status badge, optional reason, and a Cancel button for requests still in `requested` state.

A leave balance card is always displayed at the top of the screen, showing remaining days for Paid Leave, Sick Leave, and Loss of Pay in a responsive grid.

A "My Requests" section label separates the balance card from the list.

Pull-to-refresh is supported via `<ion-refresher>`.

A fixed **+** FAB in the bottom-right corner opens a two-step bottom sheet for submitting a new request:

**Step 1 — pick request type.** A grid of type cards lets the user choose from the available request types (Paid Leave, Sick Leave, Loss of Pay, OT, Weekly Off). Selecting a type advances to step 2.

**Step 2 — fill the form.** A back button returns to step 1. Fields vary by type:

| Field | Shown for | Input | Notes |
|-------|-----------|-------|-------|
| Date | All types | `<input type="date">` | Past dates disabled for leave types; OT allows past dates. |
| Duration | Paid Leave, Sick Leave | Segmented button tabs | Full Day, First Half, Second Half. |
| Reason | All types | `<textarea>` | Optional. |

On successful submission the sheet closes and a success toast is shown. Cancelling a `requested`-state request removes it from the list immediately.

### `useLeave`

Composable (`src/features/leave/composables/useLeave.ts`) that manages leave request state: listing, submitting, cancelling, and fetching the user's leave balance.

```ts
import { useLeave } from '@/features/leave'

const {
  requests,     // Readonly<Ref<LeaveRequest[]>>
  balance,      // Readonly<Ref<LeaveBalance | null>>
  isLoading,    // Readonly<Ref<boolean>>
  isSubmitting, // Readonly<Ref<boolean>>
  isCancelling, // Readonly<Ref<string | number | null>>
  error,        // Readonly<Ref<string | null>>
  fetchRequests,
  fetchBalance,
  submitRequest,
  cancelRequest,
} = useLeave()
```

| Member | Type | Description |
|--------|------|-------------|
| `requests` | `Readonly<Ref<LeaveRequest[]>>` | Current list of leave requests (most recent first after a submit). |
| `balance` | `Readonly<Ref<LeaveBalance \| null>>` | Leave balance summary, or `null` before the first fetch. |
| `isLoading` | `Readonly<Ref<boolean>>` | `true` while `fetchRequests` is in progress. |
| `isSubmitting` | `Readonly<Ref<boolean>>` | `true` while a new request is being submitted. |
| `isCancelling` | `Readonly<Ref<string \| number \| null>>` | ID of the request currently being cancelled, or `null`. |
| `error` | `Readonly<Ref<string \| null>>` | Error message from the last failed operation, or `null`. |
| `fetchRequests()` | `() => Promise<void>` | Fetches up to 50 leave requests and populates `requests`. Sets `error` on failure. |
| `fetchBalance()` | `() => Promise<void>` | Fetches the leave balance and populates `balance`. Failures are silently swallowed (non-critical). |
| `submitRequest(body)` | `(LeaveRequestBody) => Promise<LeaveRequest \| null>` | Creates a new leave request via the API. On success, prepends the created request to `requests` and returns it. Returns `null` on failure. |
| `cancelRequest(id)` | `(string \| number) => Promise<boolean>` | Cancels a leave request by ID. On success, removes it from `requests` and returns `true`. Returns `false` on failure. |

## Support Models

TypeScript interfaces for the support/feedback feature live in `src/shared/models/support.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `SupportCategory` | `type` | Union of submission category strings: `'support' \| 'feedback' \| 'bug_report' \| 'other'`. |
| `SupportBody` | `interface` | Request body for `POST /support`. |
| `SupportTicket` | `interface` | A support/feedback submission as returned by the BFF API. |

**`SupportBody`**

Sent to `POST /support`.

| Field | Type | Description |
|-------|------|-------------|
| `category` | `SupportCategory` | Category of the submission. |
| `subject` | `string` | Short subject line. |
| `description` | `string` | Full description of the issue or feedback. |

**`SupportTicket`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Ticket ID. |
| `_id?` | `string` | MongoDB document ID (optional, API-returned). |
| `category` | `SupportCategory` | Category of the submission. |
| `subject` | `string` | Short subject line. |
| `description` | `string` | Full description. |
| `status?` | `string` | Current ticket status (e.g. `'open'`, `'resolved'`). |
| `created_at?` | `string` | ISO 8601 creation timestamp. |

## Profile Service

API service functions for the authenticated user's profile live in `src/shared/api/profile.service.ts`.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getProfile()` | `() => Promise<UserProfile>` | Fetches the authenticated field worker's profile via `GET /profile`. |
| `updateProfile(data)` | `(Partial<UserProfile> & Record<string, unknown>) => Promise<UserProfile>` | Updates the authenticated field worker's profile via `PATCH /profile`. Accepts any subset of `UserProfile` fields plus arbitrary extra keys for API-specific fields. Returns the updated profile. |

## Profile View

`src/features/profile/views/ProfileView.vue` — the authenticated user's profile screen, accessible via the `/profile` route.

### Layout

The view is split into a read-only display page and a full-screen edit bottom sheet (`ion-modal`).

**Read-only page sections:**

| Section | Description |
|---------|-------------|
| Hero | Avatar (photo or initials), display name, role badge, and email. Tapping the avatar opens the edit sheet. |
| Personal Info | Phone, email, date of birth, address, and emergency contact displayed as icon rows. An "Add email, address & more" nudge row appears when both email and address are empty. |
| Documents & KYC | A grid of document cards showing upload/verified status for each document slot. Tapping any card opens the edit sheet. |
| Account | Links to Active Sessions (`/sessions`) and Support & Feedback (`/support`). |

**Edit bottom sheet** (opened via the pencil header button, avatar tap, or any document card):

| Section | Description |
|---------|-------------|
| Profile Photo | Preview with upload (file input, JPG/PNG, max 5 MB) and remove actions. |
| Personal Details | Full name, email, date of birth, address (textarea). |
| Emergency Contact | Contact name and phone number. |
| Documents & KYC | Per-document upload rows (image or PDF, max 10 MB). Each row shows upload/verified status and supports Replace and View actions. |

### Behaviour

- Profile is fetched on `onMounted` and re-fetched on `onIonViewWillEnter` if not yet loaded.
- Pull-to-refresh triggers a fresh `getProfile()` call.
- Saving calls `updateProfile()` via `PATCH /profile` and syncs the result into the auth store via `authStore.setUserProfile()`.
- The edit sheet is controlled by a `showEdit` ref; it closes on `didDismiss` or the × button.

## Notifications Service

API service functions for notifications live in `src/shared/api/notifications.service.ts`.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getNotifications(params?)` | `(params?) => Promise<NotificationsResponse>` | Fetches notifications for the authenticated field worker. Accepts optional `is_read`, `page`, and `limit` query params. |
| `markNotificationRead(id)` | `(string \| number) => Promise<void>` | Marks a single notification as read via `PATCH /notifications/:id/read`. |
| `markAllNotificationsRead()` | `() => Promise<void>` | Marks all notifications as read via `POST /notifications/read-all`. |

### Notification Models

TypeScript interfaces for notifications live in `src/shared/models/notification.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `Notification` | `interface` | A single notification entity as returned by the BFF API. |
| `NotificationsResponse` | `interface` | Paginated response wrapper for a list of notifications. |

**`Notification`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Notification ID. |
| `_id?` | `string` | MongoDB document ID (optional, API-returned). |
| `title` | `string` | Notification title. |
| `body?` | `string` | Notification body text. |
| `message?` | `string` | Alternative message field (some API responses use this instead of `body`). |
| `is_read` | `boolean` | Whether the notification has been read. |
| `type?` | `string` | Notification category/type string. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |
| `reference_id?` | `string` | Optional ID of a related entity (e.g. a trip or order). |
| `reference_type?` | `string` | Type of the related entity (e.g. `'trip'`, `'order'`). |

**`NotificationsResponse`**

| Field | Type | Description |
|-------|------|-------------|
| `data` | `Notification[]` | Array of notification objects. |
| `total?` | `number` | Total number of notifications matching the query. |
| `unread_count?` | `number` | Number of unread notifications. |
| `page?` | `number` | Current page number. |
| `limit?` | `number` | Page size. |

## Home Feature

The Home feature (`src/features/home/views/HomeView.vue`) is the landing tab for all authenticated field workers. It displays a personalised, role-aware dashboard with KPI metrics, upcoming work items, earnings, leave balance, and quick navigation shortcuts.

### `HomeView`

The main home view (`/home`). On mount it fetches the dashboard summary and renders one of two states:

- **Loading skeleton** — shown while the initial fetch is in progress (4 shimmer KPI cards + section shimmers).
- **Dashboard content** — rendered once data is available.

Pull-to-refresh is supported via `<ion-refresher>`.

**Hero section** — displays a time-based greeting ("Good morning / afternoon / evening"), the user's first name, a role badge ("Beautician" or "Rider"), today's date, and the user's avatar (photo or initials fallback).

**KPI strip** — a horizontal row of four metric cards sourced from `DashboardData`:

| Card | Colour | Field | Description |
|------|--------|-------|-------------|
| Active Today | Brand (purple) | `today_count` (active subset) | Orders/trips currently active today. |
| Completed | Success (green) | `today_count` (completed subset) | Orders/trips completed today. |
| Today | Warning (amber) | `today_earnings` | Earnings for today (formatted as ₹, abbreviated). |
| Month | Info (blue) | `month_earnings` | Earnings for the current month (formatted as ₹, abbreviated). |

**Today at a Glance** — a 2×2 grid of tappable cards showing role-specific counts. Beauticians see Upcoming Orders, Completed Orders, In Progress, and This Month totals; riders see the equivalent trip counts. Each card navigates to `/orders` or `/trips`.

**Next up card** — highlights the single most urgent upcoming order (beautician) or trip (rider). Shows the reference number, status badge, customer name, address, and scheduled time. Tapping navigates to the detail view.

**Upcoming list** — a scrollable list of upcoming orders/trips (beyond the "next up" item). Each row shows the reference number, status badge, customer name, and scheduled time. Tapping navigates to the detail view. The section is hidden when the list is empty.

**Earnings overview** — a three-column card showing Today, This Week, and This Month earnings. When a daily target is set in `DashboardData`, a progress bar shows the percentage of the daily target reached.

**Leave balance** — a row of leave-type counters (paid, sick, loss-of-pay, block time) sourced from `DashboardData.leave_balance`. Tapping "Manage" navigates to `/leave`. The section is hidden when no balance data is available.

**Bike & Documents** (rider only) — two reminder rows linking to `/profile` for Licence & PUC and Insurance document checks.

**Complaints alert** (beautician only) — a warning banner shown when `DashboardData.complaints_count > 0`. Tapping navigates to `/complaints`.

**Quick actions** — a multi-column grid of tappable shortcut buttons. Role-conditional content:

| Button | Route | Roles |
|--------|-------|-------|
| Orders | `/orders` | Beautician only |
| Trips | `/trips` | Rider only |
| Calendar | `/calendar` | All |
| Leave | `/leave` | All |
| Notifications | `/notifications` | All |
| Complaints | `/complaints` | Beautician only |
| Support | `/support` | All |

### Dashboard Models

The `DashboardData` interface lives in `src/shared/models/dashboard.model.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `today_count` | `number` | Total orders/trips scheduled today. |
| `month_count` | `number` | Total orders/trips this month. |
| `today_earnings` | `number` | Earnings for today. |
| `week_earnings` | `number` | Earnings for the current week. |
| `month_earnings` | `number` | Earnings for the current month. |
| `daily_target?` | `number` | Optional daily earnings target (used for the progress bar). |
| `today_trips?` | `Trip[]` | Today's trips for riders (used to derive active/completed/upcoming counts). |
| `leave_balance?` | `LeaveBalance` | Leave balance summary (paid, sick, loss-of-pay, block time). |
| `complaints_count?` | `number` | Number of open complaints visible to the beautician. |

### Dashboard Service

| Function | Signature | Description |
|----------|-----------|-------------|
| `getDashboard()` | `() => Promise<DashboardData>` | Fetches the dashboard summary via `GET /dashboard`. Lives in `src/shared/api/dashboard.service.ts`. |

## App Shell

The main app shell (`TabsLayout`) wraps all authenticated routes and provides:

- **Header** — each individual view is responsible for rendering its own `<ion-header>`. `TabsLayout` itself does not render a shared header.
- **Bottom tab bar** — tabs are shown conditionally based on user role (`isBeautician` / `isRider` from the `userTypeStore`). All roles see a Calendar tab (`/calendar`) in addition to the role-specific Orders/Trips tab.

## Routing

| Path | View | Notes |
|------|------|-------|
| `/` | — | Redirects to `/login` |
| `/login` | `LoginView` | Auth entry point |
| `/home` | `HomeView` | Main home tab |
| `/orders` | `OrdersView` | Beautician orders list |
| `/orders/:id` | `OrderDetailView` | Order detail |
| `/trips` | `TripsView` | Rider trips list |
| `/trips/:id` | `TripDetailView` | Trip detail |
| `/leave` | `LeaveView` | Leave requests |
| `/ot-requests` | `OtRequestsView` | OT requests (both roles) |
| `/weekly-off` | `WeeklyOffView` | Weekly off requests (both roles) |
| `/calendar` | `CalendarView` | Monthly calendar with events |
| `/profile` | `ProfileView` | User profile |
| `/notifications` | `NotificationsView` | In-app notification centre |
| `/complaints` | `ComplaintsView` | Complaints (beautician only) |
| `/sessions` | `SessionsView` | Active login sessions |
| `/support` | `SupportView` | Support & feedback |
| `/external-bookings` | `ExternalBookingsView` | External bookings (beautician only) |
| `/reimbursements` | `ReimbursementsView` | Travel reimbursement requests (both roles) |
| `/leaderboard` | `LeaderboardView` | Leaderboard (both roles, visibility controlled by BFF) |
| `/sos` | `SosView` | SOS emergency alert (both roles) |
| `/trip-fees` | `TripFeesView` | Trip fees report (rider only) |
| `/error` | `ErrorView` | Error page |
| `/:pathMatch(.*)` | `PageNotFoundView` | 404 catch-all |

### Navigation Guard

A global `beforeEach` guard in `src/core/router/index.ts` enforces authentication:

- Routes under `/` (the `TabsLayout` shell) are marked `requiresAuth: true`.
- If a user navigates to a protected route without a stored access token, they are redirected to `/login`.
- If an authenticated user navigates to `/login`, they are redirected to `/home`.

The guard reads the access token directly from storage (via `Storage_Service`) rather than the Pinia auth store, so it works correctly on hard reloads before `App.vue`'s boot sequence has completed.

## Calendar Feature

The Calendar feature (`src/features/calendar/`) gives field workers a monthly view of their leave requests and office holidays.

### `CalendarView`

The main calendar view (`/calendar`). Displays a full-month grid with colour-coded event dots, a selected-date event panel, and an upcoming events panel.

**Month navigation** — chevron buttons step backward and forward one month at a time. A "Today" button in the header resets the view to the current month and selects today's date.

**Calendar grid** — a 7-column grid (Sun–Sat) where each day cell shows:
- The day number, highlighted with a brand-coloured circle when it is today, or a brand-outlined circle when selected.
- Up to three coloured dots, one per distinct event *type* present on that day (deduplicated — multiple paid-leave requests on the same day still show a single amber dot).
- A pale brand background when the cell is selected but not today.

**Legend** — a row of colour-coded labels below the grid:

| Dot colour | Event type |
|------------|------------|
| Amber | Paid Leave |
| Red | Sick Leave |
| Emerald | Holiday |

**Event cards** — tapping any day cell shows event cards for that date below the grid. Each card has a left accent bar, a type icon, a title, a detail line (e.g. "Full Day"), and a status badge (Pending / Approved / Rejected) when applicable. Holiday cards have no status badge. A shimmer skeleton is shown while data loads; an empty-state illustration is shown when the selected date has no events.

**Upcoming events** — up to 10 events from the next 30 days are shown in a separate "Upcoming" section below the selected-date cards.

**Data fetching** — on mount (and on pull-to-refresh) the view calls `getCalendar(start, end)` with the current month's date range. The response contains `leaves` and `holidays` arrays which are mapped into a unified internal `CalEvent` list. The view re-fetches when the displayed month changes. On error the calendar renders empty (non-critical failure).

**Event types** — the internal `EventType` union is `'paid_leave' | 'sick_leave' | 'loss_of_pay' | 'block_time' | 'holiday'`. Types are mapped from the BFF response's `leave_type` field for leaves and inferred as `'holiday'` for holiday entries.

### Calendar Models

TypeScript interfaces for the calendar feature live in `src/shared/models/calendar.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `CalendarEventType` | `type` | Union of displayable event category strings: `'paid_leave' \| 'sick_leave' \| 'ot' \| 'weekly_off'`. (Legacy — `CalendarView` now uses its own inline `EventType` union that includes `'loss_of_pay'`, `'block_time'`, and `'holiday'`.) |
| `CalendarEvent` | `interface` | A single calendar event. Required fields: `date` (YYYY-MM-DD), `type` (`CalendarEventType`), `title`, and `status` (`'requested' \| 'approved' \| 'rejected'`). Optional fields: `id` and `detail` (extra display text, e.g. `"Full Day"`). (Legacy — `CalendarView` uses its own inline `CalEvent` interface where `status` is optional to accommodate holidays.) |
| `CalendarData` | `interface` | BFF response shape from `GET /calendar`. Contains optional `leaves` and `holidays` arrays, plus an index signature for additional server-defined keys. |

## Sessions Feature

The Sessions feature (`src/features/sessions/`) lets authenticated field workers view and manage their active login sessions across devices.

### `SessionsView`

The active sessions view (`/sessions`). On mount it fetches all active sessions and renders one of three states:

- **Loading skeleton** — shown while the initial fetch is in progress (3 animated shimmer rows).
- **Empty state** — shown when no active sessions are found.
- **Session list** — a scrollable list of session cards, each showing the device name (or `client_type` fallback), IP address, and last-active time. The current session is highlighted and cannot be revoked. All other sessions show a revoke button.

Pull-to-refresh is supported via `<ion-refresher>`.

### Session Models

TypeScript interfaces for the sessions feature live in `src/shared/models/session.model.ts`.

**`Session`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Session ID. |
| `_id?` | `string` | MongoDB document ID (optional, API-returned). |
| `device?` | `string` | Human-readable device name. |
| `client_type?` | `string` | Client type string (fallback when `device` is absent). |
| `ip_address?` | `string` | IP address of the session. |
| `user_agent?` | `string` | Raw user-agent string. |
| `is_current?` | `boolean` | `true` when this session matches the current request. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `last_used_at?` | `string` | ISO 8601 timestamp of the most recent activity. |
| `expires_at?` | `string` | ISO 8601 expiry timestamp. |

### Sessions Service

API service functions for sessions live in `src/shared/api/sessions.service.ts`.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getSessions()` | `() => Promise<Session[]>` | Fetches all active sessions for the authenticated field worker via `GET /sessions`. |
| `revokeSession(id)` | `(string \| number) => Promise<void>` | Revokes a specific session via `DELETE /sessions/:id`. |

## External Bookings Service

API service functions for external bookings live in `src/shared/api/external-bookings.service.ts`. Beauticians use this to log bookings sourced outside the platform (e.g. walk-ins or direct customer calls).

| Function | Signature | Description |
|----------|-----------|-------------|
| `getExternalBookings(params?)` | `({ page?, limit?, status? }?) => Promise<ExternalBooking[]>` | Fetches all external booking requests for the authenticated beautician via `GET /external-bookings`. Supports optional pagination and status filtering. |
| `createExternalBooking(body)` | `(ExternalBookingBody) => Promise<ExternalBooking>` | Submits a new external booking request via `POST /external-bookings`. |
| `uploadExternalBookingProof(id, formData)` | `(string \| number, FormData) => Promise<ExternalBooking>` | Uploads proof (e.g. a photo) for an existing external booking via `POST /external-bookings/:id/proof`. Sends a `multipart/form-data` request. |

Types (`ExternalBooking`, `ExternalBookingBody`) are defined in `src/shared/models/external-booking.model.ts`.

## Reimbursements Feature

The Reimbursements feature (`src/features/reimbursements/`) lets both riders and beauticians submit travel reimbursement requests, track their status, and upload proof receipts.

### `ReimbursementsView`

The reimbursements list view (`/reimbursements`). On mount it fetches all reimbursement requests for the authenticated field worker and renders one of four states:

- **Loading skeleton** — shown while the initial fetch is in progress (3 animated shimmer cards).
- **Error state** — shown when the fetch fails with no cached data; includes a Retry button.
- **Empty state** — shown when the worker has no reimbursement requests.
- **Reimbursement list** — a scrollable list of cards, each showing the travel date, travel type, amount, status badge, optional description, and a receipt-upload button for pending requests without proof.

Pull-to-refresh is supported via `<ion-refresher>`. A `+` button in the header opens the new-reimbursement modal.

**New reimbursement modal** — an inline `<ion-modal>` with a form for travel date, travel type (auto/bus/train/cab/other), amount, and optional description. Submitting prepends the new record to the list and resets the form.

**Proof upload** — the "Upload Receipt" button on a `requested` card without a `proof_url` is wired to `openProofUpload()`. Camera/file-picker integration is stubbed and marked TODO.

### Reimbursement Models

TypeScript interfaces for the reimbursements feature live in `src/shared/models/reimbursement.model.ts`.

| Type | Kind | Description |
|------|------|-------------|
| `ReimbursementStatus` | `type` | Union of status strings: `'requested' \| 'approved' \| 'rejected' \| 'paid'`. |
| `ReimbursementType` | `type` | Union of travel mode strings: `'auto' \| 'bus' \| 'train' \| 'cab' \| 'other'`. |
| `Reimbursement` | `interface` | Full reimbursement record returned by the API (see fields below). |
| `ReimbursementBody` | `interface` | Request body for creating a new reimbursement (see fields below). |

**`Reimbursement`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Reimbursement ID. |
| `_id?` | `string` | MongoDB document ID (optional). |
| `travel_date` | `string` | ISO 8601 date (YYYY-MM-DD) of the travel. |
| `travel_type` | `ReimbursementType` | Mode of transport. |
| `amount` | `number` | Claimed amount in INR. |
| `description?` | `string` | Optional free-text description. |
| `proof_url?` | `string` | URL of the uploaded receipt/photo, present after proof upload. |
| `status` | `ReimbursementStatus` | Current approval status. |
| `reference_id?` | `string` | Related order or trip ID, if applicable. |
| `reference_type?` | `'order' \| 'trip'` | Type of the referenced entity. |
| `requester_type?` | `'beautician' \| 'rider'` | Role of the field worker who submitted the request. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |

**`ReimbursementBody`**

| Field | Type | Description |
|-------|------|-------------|
| `requester_id` | `string` | ID of the authenticated field worker. |
| `requester_type` | `'beautician' \| 'rider'` | Role of the requester. |
| `travel_date` | `string` | ISO 8601 date (YYYY-MM-DD). |
| `travel_type` | `ReimbursementType` | Mode of transport. |
| `amount` | `number` | Claimed amount in INR. |
| `description?` | `string` | Optional description. |
| `reference_id?` | `string` | Optional related order/trip ID. |
| `reference_type?` | `'order' \| 'trip'` | Type of the referenced entity. |

### Reimbursements Service

API service functions for reimbursements live in `src/shared/api/reimbursements.service.ts`.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getReimbursements(params?)` | `({ page?, limit?, status? }?) => Promise<Reimbursement[]>` | Fetches all reimbursement requests for the authenticated field worker via `GET /reimbursements`. Supports optional pagination and status filtering. |
| `createReimbursement(body)` | `(ReimbursementBody) => Promise<Reimbursement>` | Submits a new reimbursement request via `POST /reimbursements`. |
| `uploadReimbursementProof(id, formData)` | `(string \| number, FormData) => Promise<Reimbursement>` | Uploads a receipt or photo for an existing request via `POST /reimbursements/:id/proof`. Sends a `multipart/form-data` request. |
| `cancelReimbursement(id)` | `(string \| number) => Promise<Reimbursement>` | Cancels a pending reimbursement request via `DELETE /reimbursements/:id`. |

## Native

```bash
ionic cap run ios -l --external
ionic cap run android -l --external
npx cap open android
```

## SOS Feature

The SOS feature (`src/features/sos/`) lets any authenticated field worker (beautician or rider) trigger an emergency alert that immediately notifies office staff.

### `SosView`

The SOS screen (`/sos`). On mount it checks for an active SOS from a previous session via `getLatestSos()` — only alerts with status `resolved` are treated as inactive. An `acknowledged` alert is still considered active and will be displayed.

The view renders three sections:

- **Active SOS banner** — shown when an alert is currently active. Displays a pulsing red indicator, a message confirming office staff have been alerted, and a "Cancel SOS" button that calls `resolveSos()`.
- **SOS button** — a large circular red button in the centre of the screen. Disabled while an alert is active or a trigger request is in flight. Tapping calls `triggerSos()`, which first attempts to capture the device's current GPS coordinates (5-second timeout) before sending the alert. Location failure is non-fatal — the alert is sent without coordinates.
- **Instructions panel** — a four-step card explaining how the SOS flow works.
- **Optional message field** — a free-text textarea (hidden when an alert is active) that lets the worker briefly describe the situation before triggering.

**Live status polling**

While an SOS alert is active, the view polls `getLatestSos()` every 5 seconds to keep the displayed status in sync with the server. If the server reports the alert as `resolved` (e.g. staff resolved it remotely), the active banner is cleared automatically. The poll starts when `activeAlert` becomes non-null and stops when it is cleared or the component is unmounted.

**API calls used**

| Function | Description |
|----------|-------------|
| `triggerSos(body)` | `POST /sos` — creates a new SOS alert. Returns a `SosAlert`. |
| `getLatestSos()` | `GET /sos/latest` — fetches the most recent SOS for the authenticated user. Returns `null` when none exists. |
| `resolveSos(id)` | `PATCH /sos/:id/resolve` — marks the alert as resolved. |

All three functions are imported from `@/shared/api`.

### SOS Models

The `SosAlert` interface lives in `@/shared/models`.

**`SosAlert`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | Alert ID. |
| `requester_id` | `string` | ID of the field worker who triggered the alert. |
| `requester_type` | `'beautician' \| 'rider'` | Role of the requester. |
| `status` | `'active' \| 'acknowledged' \| 'resolved'` | Current alert status. |
| `latitude?` | `number` | GPS latitude at the time of trigger (optional). |
| `longitude?` | `number` | GPS longitude at the time of trigger (optional). |
| `message?` | `string` | Optional free-text description provided by the worker. |
| `created_at?` | `string` | ISO 8601 creation timestamp. |
| `updated_at?` | `string` | ISO 8601 last-updated timestamp. |

## Animation System

The global animation system lives in `src/core/theme/animations.css` and is imported once in `main.ts`. It provides reusable keyframes, utility classes, Vue `<Transition>` named classes, and interactive feedback helpers — no per-component duplication needed.

### Keyframes

| Name | Effect |
|------|--------|
| `shimmer` | Horizontal gradient sweep (skeleton loaders) |
| `spin` | Continuous 360° rotation |
| `fade-in` | Opacity 0 → 1 |
| `slide-up` | Fade in + translate up from 16 px |
| `slide-down` | Fade in + translate down from −12 px |
| `slide-in-right` | Fade in + translate in from 20 px right |
| `slide-in-left` | Fade in + translate in from 20 px left |
| `scale-in` | Fade in + scale from 0.92 |
| `scale-in-bounce` | Scale in with a slight overshoot (1.04) |
| `pop-in` | Aggressive scale-in with overshoot (1.08) |
| `pulse-ring` | Expanding ring that fades out (FAB decoration) |
| `progress-fill` | Width 0 → current value (progress bars) |
| `count-up` | Fade in + translate up (stat counters) |
| `hero-entrance` | Subtle scale + translate for hero sections |
| `float` | Gentle vertical bob (−4 px, looping) |
| `wiggle` | ±6° rotation wiggle |

### Entrance utility classes

Apply directly to elements for one-shot entrance animations:

| Class | Animation |
|-------|-----------|
| `.anim-hero` | `hero-entrance` — for page hero sections |
| `.anim-fade-up` | `slide-up` — generic fade + slide up |
| `.anim-fade-in` | `fade-in` — plain opacity fade |
| `.anim-scale-in` | `scale-in` — scale + fade |

### Staggered list / grid

Wrap a list container with `.anim-list` or `.anim-grid` to automatically stagger child entrance animations:

```html
<!-- Slide-up stagger (up to 8 children, then capped) -->
<div class="anim-list">
  <div v-for="item in items" :key="item.id">…</div>
</div>

<!-- Scale-in stagger (up to 6 children, then capped) -->
<div class="anim-grid">
  <div v-for="item in items" :key="item.id">…</div>
</div>
```

### Delay utilities

Override the animation delay on any animated element:

| Class | Delay |
|-------|-------|
| `.anim-delay-0` | 0 s |
| `.anim-delay-1` | 0.05 s |
| `.anim-delay-2` | 0.10 s |
| `.anim-delay-3` | 0.15 s |
| `.anim-delay-4` | 0.20 s |
| `.anim-delay-5` | 0.25 s |
| `.anim-delay-6` | 0.30 s |
| `.anim-delay-7` | 0.35 s |
| `.anim-delay-8` | 0.40 s |

### Interactive feedback

| Class | Effect |
|-------|--------|
| `.press-feedback` | Scale 0.96 + opacity 0.85 on `:active` |
| `.press-feedback--subtle` | Scale 0.98 + opacity 0.9 on `:active` |
| `.press-feedback--strong` | Scale 0.92 + opacity 0.75 on `:active` |
| `.card-interactive` | Scale 0.985 + reduced shadow on `:active` |

### Skeleton shimmer

Replace per-component shimmer definitions with the shared class:

```html
<div class="skeleton-shimmer" style="height: 16px; border-radius: 4px;" />
```

Uses `--color-border` and `--color-background` CSS variables so it automatically adapts to the theme.

### FAB pulse ring

Add `.fab-pulse` to a `position: relative` element to render an expanding ring behind it:

```html
<button class="fab-pulse" style="position: relative; border-radius: 50%;">…</button>
```

### Vue `<Transition>` named classes

Use these names directly in `<Transition name="…">`:

| Name | Effect |
|------|--------|
| `fade` | Opacity only (0.2 s) |
| `fade-up` | Opacity + translate up 12 px (0.25 s) |
| `fade-down` | Opacity + translate down −4 px (0.18 s) |
| `slide-right` | Opacity + translate ±24 px (forward page transition) |
| `scale-up` | Opacity + scale 0.94 (modal / bottom sheet) |

```vue
<Transition name="fade-up">
  <div v-if="show">…</div>
</Transition>
```

### Reduced-motion

All animations and transitions are collapsed to near-instant durations when the user has `prefers-reduced-motion: reduce` set at the OS level. No extra work is needed in components.
