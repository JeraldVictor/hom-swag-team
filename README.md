# HomSwagTeam

A mobile-first field worker app built with Ionic + Vue 3 + Capacitor, targeting iOS and Android from a single codebase. It also runs as a Progressive Web App in the browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | Vue 3 (Composition API, `<script setup>`) |
| Mobile UI | Ionic Vue 8 |
| Routing | Ionic Vue Router + Vue Router 4 |
| Native Runtime | Capacitor 8 |
| Language | TypeScript (strict) |
| Build | Vite 5 |
| Package Manager | pnpm |
| Unit Tests | Vitest + @vue/test-utils |
| E2E Tests | Cypress |
| Linting | ESLint (vue3-essential + typescript) |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

---

## Common Commands

```bash
pnpm test:unit     # Run unit tests (Vitest, watch mode)
pnpm test:e2e      # Run Cypress e2e tests
pnpm lint          # Run ESLint
```

---

## Capacitor / Native Commands

```bash
# Run on iOS with live reload (requires Mac + Xcode)
ionic cap run ios -l --external

# Run on Android with live reload
ionic cap run android -l --external

# Open Android project in Android Studio
npx cap open android

# Run Android project directly
npx cap run android
```

---

## Project Structure

```
src/
├── main.ts                  # App entry point
├── App.vue                  # Root component
├── core/
│   └── router/index.ts      # Route definitions
├── features/                # Feature modules (each with their own views/)
│   ├── home/views/          # Home screen
│   ├── auth/views/          # Login
│   ├── orders/views/        # Order list + detail (beautician)
│   ├── trips/views/         # Trip list + detail (rider)
│   ├── leave/views/         # Leave requests
│   └── profile/views/       # User profile
├── shared/
│   └── models/              # Domain model types (see below)
└── theme/variables.css      # Ionic CSS custom property overrides
tests/
├── unit/                    # Vitest unit tests
└── e2e/                     # Cypress specs, fixtures, and support
```

---

## Routes

| Path | Name | View | Role |
|---|---|---|---|
| `/` | — | redirects to `/home` | — |
| `/home` | `Home` | `features/home/views/HomeView.vue` | all |
| `/auth/login` | `Login` | `features/auth/views/LoginView.vue` | all |
| `/orders` | `Orders` | `features/orders/views/OrdersView.vue` | beautician |
| `/orders/:id` | `OrderDetail` | `features/orders/views/OrderDetailView.vue` | beautician |
| `/trips` | `Trips` | `features/trips/views/TripsView.vue` | rider |
| `/trips/:id` | `TripDetail` | `features/trips/views/TripDetailView.vue` | rider |
| `/leave` | `Leave` | `features/leave/views/LeaveView.vue` | all |
| `/profile` | `Profile` | `features/profile/views/ProfileView.vue` | all |

---

## Feature Public APIs

Each feature module exposes a public API via its `index.ts` barrel. Other features and the router should import from the feature root, not from internal paths:

```ts
import { LoginView } from '@/features/auth'
import { HomeView } from '@/features/home'
import { OrdersView, OrderDetailView } from '@/features/orders'
import { TripsView, TripDetailView } from '@/features/trips'
import { LeaveView } from '@/features/leave'
import { ProfileView } from '@/features/profile'
```

---

## Shared Domain Models

All domain types are exported from a single barrel entry point:

```ts
import type { UserProfile, Order, Trip, ... } from '@/shared/models'
```

### Auth (`auth.model.ts`)

| Type | Description |
|---|---|
| `OtpRequestBody` | Request body for `POST /auth/otp/request` — contains `phone` |
| `OtpVerifyBody` | Request body for `POST /auth/otp/verify` — contains `phone` + `otp` |
| `TokenPair` | Access/refresh token pair returned after authentication |
| `AuthResponse` | Full auth response — extends `TokenPair` with `user: UserProfile` |
| `RefreshTokenBody` | Request body for `POST /auth/refresh` |
| `LogoutBody` | Request body for `POST /auth/logout` |

### User (`user.model.ts`)

| Type | Description |
|---|---|
| `UserType` | `'rider'` or `'beautician'` — discriminates field worker roles |
| `UserProfile` | Authenticated field worker profile (returned by `GET /profile`) |

### Order (`order.model.ts`)

| Type | Description |
|---|---|
| `OrderStatus` | `'Confirmed' \| 'Ongoing' \| 'Started' \| 'Completed'` — drives beautician timeline |
| `OrderAddress` | Customer address embedded in an order |
| `OrderCustomer` | Customer info embedded in an order |
| `Order` | Service booking assigned to a beautician |

### Trip (`trip.model.ts`)

| Type | Description |
|---|---|
| `TripKanbanState` | Six-step progression for a rider's trip — drives rider timeline |
| `Trip` | Logistics entity representing a rider's journey from pickup to drop |

### Leave Request (`leave-request.model.ts`)

| Type | Description |
|---|---|
| `LeaveStatus` | `'requested' \| 'approved' \| 'rejected'` |
| `LeaveDuration` | `'full_day' \| 'first_half' \| 'second_half'` |
| `LeaveRequest` | Leave application submitted by a beautician or rider |
| `LeaveRequestBody` | Request body for `POST /leaves` |

### Location (`location.model.ts`)

| Type | Description |
|---|---|
| `Coordinates` | Latitude/longitude pair |
| `LocationPayload` | Location update sent to `POST /location` and over WebSocket |

### Product (`product.model.ts`)

| Type | Description |
|---|---|
| `Product` | A service or physical product in the HomSwag catalogue |

### Pagination (`pagination.model.ts`)

| Type | Description |
|---|---|
| `PaginatedResponse<T>` | Generic wrapper for paginated BFF API list responses |

---

## Dark Mode

Dark mode follows the system preference via `@ionic/vue/css/palettes/dark.system.css`. Always-on and class-based dark mode imports are available but commented out in `main.ts`.
