# HomSwagTeam — PROD Deployment & Debug APK Guide

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Android Studio](https://developer.android.com/studio) with the Android SDK installed
- Java 17+ (bundled with Android Studio or via `brew install openjdk@17`)
- Capacitor CLI: included via `devDependencies` (`@capacitor/cli`)

Verify your Android toolchain:

```bash
# Confirm ANDROID_HOME / ANDROID_SDK_ROOT is set
echo $ANDROID_HOME

# Confirm Java version
java -version
```

---

## 1. Set up PROD environment variables

Create a `.env.prod` file at the project root (never commit secrets):

```bash
cp .env .env.prod
```

Edit `.env.prod` with production values:

```env
VITE_BFF_API_URL=https://api.your-production-domain.com/bff
VITE_WS_URL=wss://api.your-production-domain.com
VITE_GOOGLE_MAPS_API_KEY=YOUR_PROD_GOOGLE_MAPS_KEY

# Feature flags
VITE_FEATURE_MAPS=true
VITE_FEATURE_DIRECTIONS=true
```

> **Note:** `.env.prod` should be in `.gitignore` to avoid leaking secrets.

---

## 2. Install dependencies

```bash
pnpm install
```

---

## 3. Build the web app (PROD)

```bash
pnpm vite build --mode prod
```

This outputs the compiled web assets to the `dist/` folder using the `.env.prod` variables.

---

## 4. Sync web assets to Android

```bash
pnpm exec cap sync android
```

This copies `dist/` into the Android project and updates any Capacitor plugins.

---

## 5. Generate a Debug APK (for sharing & testing)

A **debug APK** is signed with a debug key — suitable for internal testing and sharing with QA / stakeholders.

### Option A — via Gradle (command line)

```bash
cd android
./gradlew assembleDebug
```

The APK will be generated at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Option B — via Android Studio (GUI)

1. Open Android Studio and select **Open** → choose the `android/` folder.
2. Wait for Gradle sync to complete.
3. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
4. When the build finishes click **locate** in the notification to find the APK.

---

## 6. Share the debug APK

Once built, share `android/app/build/outputs/apk/debug/app-debug.apk` via:

- Direct file transfer (AirDrop, Slack, email)
- [Firebase App Distribution](https://firebase.google.com/docs/app-distribution) *(recommended for repeated testing cycles)*
- Google Drive / S3 link

> Testers must enable **"Install from unknown sources"** on their Android device before installing.
> Settings → Security (or Apps) → Install unknown apps.

---

## Full command sequence (quick reference)

```bash
# 1. Install deps
pnpm install

# 2. Build web assets for PROD
pnpm vite build --mode prod

# 3. Sync to Android
pnpm exec cap sync android

# 4. Build debug APK
cd android && ./gradlew assembleDebug && cd ..

# 5. Find the APK
open android/app/build/outputs/apk/debug/
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ANDROID_HOME` not set | Add `export ANDROID_HOME=$HOME/Library/Android/sdk` to `~/.zshrc` and restart terminal |
| Gradle build fails | Run `cd android && ./gradlew clean` then retry |
| Web assets not updated | Re-run `pnpm exec cap sync android` after every build |
| App crashes on launch | Check that `.env.prod` API URLs are reachable from the device |
| `versionCode` conflict on device | Uninstall the old APK before installing the new one |
