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
│   ├── home/           # Home tab + TabsLayout shell
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

## Native

```bash
ionic cap run ios -l --external
ionic cap run android -l --external
npx cap open android
```
