# HomSwag Partner — PROD Deployment & Debug APK Guide

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

## 5. Generate App Icons & Splash Screens

App icons and splash screens are generated from two source images using `@capacitor/assets`.

### 5a. Install the tool (first time only)

```bash
pnpm add -D @capacitor/assets
```

### 5b. Add source images

Place the following files in the `resources/` folder at the project root:

| File | Size | Purpose |
|---|---|---|
| `resources/icon-only.png` | 1024×1024 px | App launcher icon (square, no rounded corners) |
| `resources/splash.png` | 2732×2732 px | Splash screen (logo centered, edges will be cropped) |

> **Tip:** For adaptive icons (Android 8+), also add `icon-foreground.png` and `icon-background.png` at 1024×1024 px. Keep the logo within the center 66% of the canvas.

### 5c. Generate assets

```bash
pnpm exec capacitor-assets generate --android
```

This writes **25 files** directly into `android/app/src/main/res/`:
- Launcher icons in all density buckets (`mipmap-ldpi` → `mipmap-xxxhdpi`), square and round variants
- Splash screens in all portrait and landscape density buckets

### Troubleshooting — sharp native module error

If you see `Cannot find module '../build/Release/sharp-darwin-arm64v8.node'`, rebuild the native binary for Apple Silicon:

```bash
pnpm exec npm rebuild sharp
```

Then re-run the generate command.

---

## 6. Generate a Debug APK (for sharing & testing)

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

## 7. Share the debug APK

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

# 3. Generate icons & splash screens (re-run whenever source images change)
pnpm exec capacitor-assets generate --android

# 4. Sync to Android
pnpm exec cap sync android

# 5. Build debug APK
cd android && ./gradlew assembleDebug && cd ..

# 6. Find the APK
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
| `sharp` native module error | Run `pnpm exec npm rebuild sharp` then retry asset generation |
