# HomSwagTeam

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
│   ├── leave/          # Leave requests
│   └── profile/        # User profile
└── shared/
    ├── api/            # BFF API service functions
    ├── components/ui/  # Shared UI primitives
    ├── composables/    # Cross-feature composables
    ├── lib/            # Axios client, storage, websocket
    ├── models/         # TypeScript domain types
    └── stores/         # Pinia stores (auth, ui, userType)
```

## Auth Store

The auth store (`src/shared/stores/auth.ts`) manages authentication state, tokens, and user identity via Pinia.

### Public API

| Member | Type | Description |
|--------|------|-------------|
| `accessToken` | `Ref<string \| null>` | Current access token (reactive). |
| `refreshToken` | `Ref<string \| null>` | Current refresh token (reactive). |
| `user` | `Ref<UserProfile \| null>` | Authenticated user profile (reactive). |
| `isAuthenticated` | `ComputedRef<boolean>` | `true` when an access token is present. |
| `restoreSession()` | `() => Promise<boolean>` | Hydrates auth state from persistent storage. Call once on app boot (e.g. `App.vue` `onMounted`) before the router resolves. Returns `true` if a valid session was found. |
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

## Shared Composables

| Composable | Location | Description |
|------------|----------|-------------|
| `useDrawer` | `src/shared/composables/useDrawer.ts` | Global drawer open/close state. Exposes `isDrawerOpen`, `openDrawer()`, `closeDrawer()`, and `toggleDrawer()`. Shared between `TabsLayout` (opener) and `AppDrawer` (consumer) via a module-level ref — no prop drilling required. |
| `useGeolocation` | `src/shared/composables/useGeolocation.ts` | Reactive GPS wrapper around `@capacitor/geolocation`. Handles permission requests, one-shot position fetches, and continuous position watching. Each position update is automatically emitted over the WebSocket connection for real-time admin tracking. |
| `useGoogleMaps` | `src/shared/composables/useGoogleMaps.ts` | Manages a Google Maps instance bound to a DOM element. Handles API loading, map initialization, named marker management, and route rendering via the Directions API. |
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
| `AppDrawer` | `src/shared/components/ui/AppDrawer.vue` | Slide-in navigation drawer. Reads open/close state from `useDrawer`. Displays a user avatar (photo or initials), role label, role-conditional nav items (Home, Orders/Trips, Leave), a secondary Profile item, and a logout button. Active state highlights the current route and any nested child routes (e.g. `/trips/123` highlights the Trips item). Controlled entirely via `useDrawer` — no props required. |
| `GoogleMapView` | `src/shared/components/ui/GoogleMapView.vue` | Reusable Google Maps component. Wraps `useGoogleMaps` and handles loading/error states internally. Supports pickup, drop, and live-position markers, optional driving route rendering, and automatic bounds fitting. Emits `map-ready` once the map is initialized and `map-error` on failure. Renders a static "Map unavailable" fallback when `FEATURES.maps` is `false`. |
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

## App Shell

The main app shell (`TabsLayout`) wraps all authenticated routes and provides:

- **Header** — app title ("HomSwag"), a menu button (top-left), and a notification bell with an unread badge (top-right).
- **Bottom tab bar** — tabs are shown conditionally based on user role (`isBeautician` / `isRider` from the `userTypeStore`).

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
| `/profile` | `ProfileView` | User profile |
| `/error` | `ErrorView` | Error page |
| `/:pathMatch(.*)` | `PageNotFoundView` | 404 catch-all |

### Navigation Guard

A global `beforeEach` guard in `src/core/router/index.ts` enforces authentication:

- Routes under `/` (the `TabsLayout` shell) are marked `requiresAuth: true`.
- If a user navigates to a protected route without a stored access token, they are redirected to `/login`.
- If an authenticated user navigates to `/login`, they are redirected to `/home`.

The guard reads the access token directly from storage (via `Storage_Service`) rather than the Pinia auth store, so it works correctly on hard reloads before `App.vue`'s `restoreSession()` has run.

## Native

```bash
ionic cap run ios -l --external
ionic cap run android -l --external
npx cap open android
```
