# Tech Stack

## Core Frameworks & Libraries
- **Vue 3.5** (Composition API with `<script setup>`) — UI framework
- **@aejkatappaja/phantom-ui** — UI component library
- **Ionic Vue 8** (`@ionic/vue`) — Mobile UI component library
- **Ionic Vue Router** (`@ionic/vue-router`) — Routing with Ionic navigation stack
- **Vue Router 4** — Underlying router
- **Capacitor 8** — Native mobile runtime (iOS/Android)
- **Pinia 3** — State management
- **Axios 1** — HTTP client (wrapped in `src/shared/lib/api.ts`)
- **Firebase 12 + Capacitor Firebase Messaging** — FCM push notifications
- **Socket.IO Client 4** — realtime client dependency available for server event streams
- **TypeScript 5.9** (strict mode) — Language

## Icons
- **@iconify/vue 5** — Icon component (`<Icon icon="lucide:*" />`)
- **@iconify-json/lucide** — Lucide icon collection (bundled, no CDN)

## Capacitor Plugins
- `@capacitor/preferences` — Persistent key-value storage (wrapped by `Storage_Service`)
- `@capacitor-community/camera-preview` — Native camera preview support
- `@capacitor-community/native-audio` — Native alert/audio playback
- `@capacitor/camera` — Camera access
- `@capacitor/geolocation` — GPS location (used by `useLocationTracker` and `LocationService`)
- `@capacitor/local-notifications` — Local push notifications
- `@capacitor-firebase/messaging` — Firebase Cloud Messaging
- `@capacitor/app` — App lifecycle events (used by `useLocationTracker` for Android foreground service)
- `@capacitor/background-runner` — Background task runner support
- `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar` — Native shell utilities

## Build & Tooling
- **Vite 5.4+** — Dev server (port 8090) and bundler
- **vue-tsc** — TypeScript type checking for Vue files
- **pnpm** — Package manager (use `pnpm` for all installs, not npm/yarn)
- No Node engine or packageManager is currently pinned in `package.json`; use the workspace active Node version.
- **@vitejs/plugin-legacy** — Legacy browser support
- **@types/google.maps** — TypeScript types for Google Maps JS API

## Testing
- **Vitest 0.34** — Unit testing (jsdom environment, globals enabled)
- **@vue/test-utils 2** — Vue component testing utilities
- **Cypress 13** — End-to-end testing

## Linting & Formatting
- **Biome 2.3+** for linting and formatting (replaces ESLint + Prettier)
- Custom configuration in `biome.json`
- Integrated into pre-commit hooks via `simple-git-hooks`

## Path Aliases
- `@/` maps to `./src/`

## Common Commands

```bash
# Development
pnpm dev              # Start dev server on port 8090

# Build
pnpm build            # Type-check + build for production (outputs to dist/)
pnpm build:dev        # Type-check + build with default Vite mode
pnpm preview          # Preview production build on port 8090

# Testing
pnpm test:unit        # Run unit tests with Vitest (watch mode)
pnpm test:e2e         # Run Cypress e2e tests

# Linting & Formatting
pnpm check            # Run Biome checks (lint + format)
pnpm check:fix        # Run Biome checks and apply automatic fixes
pnpm format           # Format code with Biome
pnpm format:write     # Format and write changes with Biome

# Native
ionic cap run ios -l --external      # Live-reload on iOS
ionic cap run android -l --external  # Live-reload on Android
npx cap open android                 # Open in Android Studio
```

## Dev Proxy

The Vite dev server proxies `/api/*` → `http://localhost:3000/bff/field/*`, eliminating CORS during development. Set `VITE_BFF_API_URL=/api` in `.env.local` when running against a local BFF. In production, `VITE_BFF_API_URL` should be the full BFF URL.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_BFF_API_URL` | Base URL for the BFF API (e.g. `/api` in dev, full URL in prod) |
| `VITE_WS_URL` | WebSocket server URL (e.g. `ws://localhost:3000`; falls back to that default) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |
| `VITE_FEATURE_MAPS` | Set to `'true'` to enable Google Maps UI and API calls |
| `VITE_FEATURE_DIRECTIONS` | Set to `'true'` to enable Directions API route rendering (requires `VITE_FEATURE_MAPS=true`) |

## API Client (`src/shared/lib/api.ts`)

The Axios client handles:
- **JWT Bearer token injection** via request interceptor
- **Proactive token refresh** — refreshes 60 seconds before expiry
- **401 retry** — one automatic retry after a successful token refresh
- **Request queuing** — concurrent requests during a refresh wait for the new token
- **`ApiError`** — typed error class with `status`, `message`, and optional `data`
- **`success: false` handling** — BFF responses with `success: false` are thrown as `ApiError`

## Storage (`src/shared/lib/storage.ts`)

Typed wrapper around `@capacitor/preferences`. Use `Storage_Service` singleton — never import `@capacitor/preferences` directly.

```ts
import { Storage_Service, STORAGE_KEYS } from '@/shared/lib/storage'

await Storage_Service.setString(STORAGE_KEYS.accessToken, token)
await Storage_Service.getString(STORAGE_KEYS.accessToken)
await Storage_Service.setJSON(STORAGE_KEYS.userProfile, profile)
await Storage_Service.clearAuth()  // clears accessToken, refreshToken, userType, userProfile
```

Available keys: `accessToken`, `refreshToken`, `userType`, `userProfile`, `deviceId`, `onboardingComplete`, `lastActiveTab`, `pushNotificationToken`.

## Date & Time (`src/shared/lib/datetime.ts`)

IST-aware (UTC+5:30) date/time utilities built on **date-fns v4**. All functions accept `string | Date | null | undefined` and return `''` / `false` for null/invalid input — safe to call without guards.

```ts
import {
  todayISO,        // → "2026-05-06"  (YYYY-MM-DD, IST)
  formatDate,      // → "6 May 2026"
  formatDateShort, // → "6 May"
  formatDateLong,  // → "Wednesday, 6 May 2026"
  formatMonthLabel,// formatMonthLabel(2026, 4) → "May 2026"  (month 0-indexed)
  formatISTTime,   // → "3:45 PM"
  formatDateTime,  // → "6 May, 3:45 PM"
  formatRelative,  // → "Just now" | "5m ago" | "2h ago" | "3d ago" | "6 May"
  isDateToday,     // → boolean
  isDateYesterday, // → boolean
  monthStartISO,   // monthStartISO(2026, 4) → "2026-05-01"
  monthEndISO,     // monthEndISO(2026, 4)   → "2026-05-31"
  currentISTHour,  // → 0–23, used for greeting logic
} from '@/shared/lib/datetime'
```

Use `todayISO()` everywhere instead of `new Date().toISOString().split('T')[0]`. Never import `date-fns` directly in components — go through this module.

## Feature Flags (`src/shared/lib/feature-flags.ts`)

Single source of truth for all feature flags, driven by Vite env vars:

```ts
import { FEATURES } from '@/shared/lib/feature-flags'

if (FEATURES.maps) { /* render map UI */ }
if (FEATURES.directions) { /* draw route */ }
```

- `FEATURES.maps` — enables Google Maps JavaScript API and all map UI
- `FEATURES.directions` — enables Directions API route rendering (only meaningful when `maps` is true)

## Google Maps (`src/shared/lib/google-maps.ts`)

Lazy loader for the Google Maps JavaScript API with **Places and Geometry** libraries. Handles auth errors and supports retry. Use `loadGoogleMaps()` before accessing `window.google.maps`. The `useGoogleMaps` composable and `GoogleMapView` component call this automatically.

## Route Rendering (Routes API v2)

The app uses the **Google Routes API (v2)** REST endpoint via `fetch` (integrated in `src/shared/composables/useGoogleMaps.ts`) to compute and draw routes.
- **Travel Mode**: Hardcoded to `TWO_WHEELER` for accurate bike/scooter routing.
- **Polyline Decoding**: Decodes the encoded polyline path using `google.maps.geometry.encoding.decodePath`.
- **Rendering**: Draws the route using a standard `google.maps.Polyline` instead of the deprecated `DirectionsRenderer`.

## WebSocket Service (`src/shared/lib/websocket.service.ts`)

Raw WebSocket client (not Socket.IO) with exponential backoff reconnection (1s initial, doubles, 30s max). Use the exported singleton:

```ts
import { webSocketService } from '@/shared/lib/websocket.service'

webSocketService.connect(accessToken)
webSocketService.emitLocation({ latitude, longitude })
webSocketService.onMessage((msg) => { /* handle inbound */ })
webSocketService.disconnect()
```

## Location Tracking (`src/shared/composables/useLocationTracker.ts`)

GPS polling composable with BFF integration. Use the module-level singleton — never call `useLocationTracker()` directly outside a component:

```ts
import { locationTracker } from '@/shared/composables/useLocationTracker'

await locationTracker.start()  // begins 60s polling interval
locationTracker.stop()         // clears interval and foreground service
locationTracker.isTracking     // reactive boolean
```

Per-tick flow: check `GET /tracking-status` → if `is_enabled: false`, stop interval; if `is_blocked: true`, skip tick → acquire GPS → `POST /location`. HTTP 503 from server also stops the interval; HTTP 422 skips the tick.

On Android, starts a native foreground service when the app moves to background, stops it on foreground return.

## Design Tokens

Tokens are defined in two places that must stay in sync:
- **`src/core/theme/index.ts`** — TypeScript `as const` objects (`colors`, `spacing`, `radius`, `fontSize`, `fontWeight`)
- **`src/core/theme/variables.css`** — CSS custom properties (`--color-*`, `--spacing-*`, `--radius-*`, `--font-size-*`, `--font-weight-*`) + Ionic variable overrides

Always use CSS variables in component styles. Use the TypeScript tokens only when you need values in JS/TS logic.

## Dark Mode

Dark mode is intentionally disabled. The app is locked to light mode only. All dark mode CSS imports are commented out in `main.ts`. Do not re-enable without explicit instruction.
