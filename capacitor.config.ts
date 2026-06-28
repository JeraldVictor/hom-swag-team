/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.homswag.partner',
  appName: 'HomSwag Partner',
  webDir: 'dist',
  plugins: {
    // Route all XHR / fetch calls through the native HTTP layer.
    // This bypasses WebView CORS restrictions when calling external APIs
    // from a Capacitor Android app (origin: http://localhost).
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config
