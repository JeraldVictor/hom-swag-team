/// <reference types="@capacitor/background-runner" />
/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.homswag.team',
  appName: 'HomSwagTeam',
  webDir: 'dist',
  plugins: {
    // Route all XHR / fetch calls through the native HTTP layer.
    // This bypasses WebView CORS restrictions when calling external APIs
    // from a Capacitor Android app (origin: http://localhost).
    CapacitorHttp: {
      enabled: true,
    },
    // Background Runner — polls /notifications when the app is backgrounded
    // and fires a local notification for any new unread items.
    BackgroundRunner: {
      label: 'com.homswag.team.background.notifications',
      src: 'runners/background.runner.js',
      event: 'notificationCheck',
      repeat: true,
      interval: 15,
      autoStart: true,
    },
  },
}

export default config
