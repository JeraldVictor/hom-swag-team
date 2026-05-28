# Firebase Cloud Messaging (FCM) Setup Guide

This guide walks you through configuring FCM for the HomSwagTeam mobile app and the server so push notifications are delivered even when the app is killed or backgrounded.

---

## Overview

| Layer | What it does |
|---|---|
| **HomSwagTeam (mobile)** | Registers the FCM token with the server on login; handles foreground messages and notification taps via `useFcm` composable |
| **Server** | Stores FCM tokens in MongoDB; sends FCM messages when a notification is created via `NotificationService.sendNotification()` |

---

## 1. Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com).
2. Click **Add project**, give it a name (e.g. `HomSwag`), and follow the wizard.
3. After the project is created, open **Project settings → General**.

---

## 2. Android Configuration

### 2a. Register the Android app in Firebase

1. In the Firebase console click **Add app → Android**.
2. Set the **Android package name** to `com.homswag.team` (matches `capacitor.config.ts`).
3. Download the generated `google-services.json` file.
4. Place the file at:
   ```
   HomSwagTeam/android/app/google-services.json
   ```
   > ⚠️ This file contains API keys. **Do not commit it to a public repository.** Add it to `.gitignore` or manage it via a secrets vault.

5. Make sure the `google-services` Gradle plugin is applied. Open `HomSwagTeam/android/build.gradle` and verify:
   ```groovy
   buildscript {
     dependencies {
       classpath 'com.google.gms:google-services:4.4.1' // or latest
     }
   }
   ```
   And in `HomSwagTeam/android/app/build.gradle`:
   ```groovy
   apply plugin: 'com.google.gms.google-services'
   ```

6. Run Capacitor sync:
   ```bash
   npx cap sync android
   ```

### 2b. AndroidManifest.xml (already done)

The following meta-data entries are already present in `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id"
           android:value="homswag_general" />
<meta-data android:name="com.google.firebase.messaging.default_notification_icon"
           android:resource="@mipmap/ic_launcher" />
```

---

## 3. iOS Configuration

### 3a. Register the iOS app in Firebase

1. In the Firebase console click **Add app → iOS**.
2. Set the **iOS bundle ID** to `com.homswag.team`.
3. Download `GoogleService-Info.plist`.
4. Place the file at:
   ```
   HomSwagTeam/ios/App/App/GoogleService-Info.plist
   ```
   > ⚠️ Do not commit this file to a public repository.

### 3b. APNs configuration (required for iOS push)

FCM uses the Apple Push Notification service (APNs) under the hood on iOS. You must upload your APNs credentials to Firebase.

**Option A — APNs Auth Key (recommended):**
1. Go to [Apple Developer → Certificates, IDs & Profiles → Keys](https://developer.apple.com/account/resources/authkeys/list).
2. Create a new key with the **Apple Push Notifications service (APNs)** capability.
3. Download the `.p8` key file.
4. In the Firebase console go to **Project settings → Cloud Messaging → iOS app configuration**.
5. Under **APNs Authentication Key** click **Upload** and provide:
   - The `.p8` file
   - The Key ID (shown on the Apple Developer portal)
   - Your Apple Team ID

**Option B — APNs Certificate:**
- Generate an APNs certificate via Xcode or the Apple Developer portal, export as `.p12`, and upload to Firebase under **APNs Certificates**.

### 3c. Capacitor iOS setup

Run:
```bash
npx cap sync ios
```

Open the Xcode project and ensure **Push Notifications** and **Background Modes → Remote notifications** capabilities are enabled for the `App` target.

---

## 4. Server Configuration

### 4a. Generate a Firebase service account key

1. In the Firebase console go to **Project settings → Service accounts**.
2. Click **Generate new private key**.
3. Download the JSON file (treat it as a secret).

### 4b. Set the environment variable

Add the following to your server's `.env` file (paste the entire JSON on one line, or use a multi-line secret in your CI/CD system):

```env
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

> If `FCM_SERVICE_ACCOUNT_JSON` is not set the server starts normally and simply skips FCM delivery (graceful no-op).

---

## 5. How it works end-to-end

```
Admin sends notification
        │
        ▼
server/src/services/notification.service.ts
  ├─ Saves notification to MongoDB
  ├─ Emits Socket.IO event (instant, when socket alive)
  └─ Sends FCM to registered device tokens (instant, any app state)

HomSwagTeam/src/shared/composables/useFcm.ts
  ├─ On login: registers FCM token with POST /bff/field/fcm-token
  ├─ Foreground: shows LocalNotification
  ├─ Background / killed: OS shows FCM-delivered notification
  └─ On tap: navigates to /notifications
```

---

## 6. Testing

1. Build and run the app on a physical Android or iOS device (push notifications don't work on simulators).
2. Log in as a beautician or rider — the FCM token is registered automatically.
3. From the admin panel go to **Send Notification** and send a notification to the logged-in field user.
4. You should see the push notification appear in the system tray even if the app is in the background or killed.

To debug token registration check the server logs for:
```
[FCM] tokens found for user, sending push
```

If FCM delivery fails the server logs a warning (`[FCM] Failed to send push notification`) and continues normally.

---

## 7. Files changed / created

| File | Change |
|---|---|
| `HomSwagTeam/src/shared/composables/useFcm.ts` | New — FCM composable |
| `HomSwagTeam/src/App.vue` | Imports and initialises `useFcm` |
| `HomSwagTeam/capacitor.config.ts` | Added `@capacitor-firebase/messaging` reference |
| `HomSwagTeam/android/app/src/main/AndroidManifest.xml` | Added FCM meta-data entries |
| `server/src/models/FcmToken.ts` | New — MongoDB model for device tokens |
| `server/src/lib/fcm.ts` | New — Firebase Admin SDK wrapper |
| `server/src/services/notification.service.ts` | Sends FCM push after Socket.IO emit |
| `server/src/controllers/bff/field.controller.ts` | Added `registerFcmToken` / `unregisterFcmToken` |
| `server/src/routes/bff/field.misc.routes.ts` | Added `POST/DELETE /bff/field/fcm-token` routes |
| `server/src/config/env.config.ts` | Added `FCM_SERVICE_ACCOUNT_JSON` optional env var |
