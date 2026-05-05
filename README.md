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

## Project Structure

```
src/
├── core/router/        # Route definitions
├── features/           # Feature modules
│   ├── auth/           # Login (outside tabs)
│   ├── home/           # Home tab + TabsLayout shell + 404 page
│   ├── orders/         # Beautician orders
│   ├── trips/          # Rider trips
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

## Shared UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AppDrawer` | `src/shared/components/ui/AppDrawer.vue` | Slide-in navigation drawer. Reads open/close state from `useDrawer`. Displays a user avatar (photo or initials), role label, role-conditional nav items (Home, Orders/Trips, Leave, Profile), secondary items (Help, Settings), and a logout button. Controlled entirely via `useDrawer` — no props required. |

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
