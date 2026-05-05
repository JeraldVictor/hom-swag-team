# HomSwagTeam

A mobile-first field worker app built with Ionic + Vue 3 + Capacitor for iOS and Android. Also runs as a PWA.

## Setup

```bash
pnpm install
pnpm dev
```

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

## Native

```bash
ionic cap run ios -l --external
ionic cap run android -l --external
npx cap open android
```
