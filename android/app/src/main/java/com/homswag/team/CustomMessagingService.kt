package com.homswag.partner

import android.app.NotificationChannel
import android.app.KeyguardManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.RemoteMessage
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService

class CustomMessagingService : MessagingService() {

    companion object {
        private const val TAG = "CustomMessagingService"
        /** Notification ID used for the FullScreenIntent heads-up notification.
         *  Must be cancelled by RingtoneActivity on launch so the tray entry is
         *  removed as soon as the full-screen UI appears. */
        const val RINGTONE_NOTIFICATION_ID = 1001
        private const val FULL_SCREEN_CHANNEL_ID = "homswag_fullscreen_alerts_v2"

        /** All notification types that should trigger the native ringtone alarm
         *  UI instead of a standard Android notification. */
        private val HIGH_PRIORITY_TYPES = setOf(
            "ringtone_alert",
            "order_assigned",
            "order_status_changed",
            "trip_assigned",
            "trip_status_changed",
        )
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"]?.lowercase() ?: ""
        val channelId = data["channelId"]

        Log.d(TAG, "onMessageReceived: type=$type, channelId=$channelId")

        val isRingtoneType = HIGH_PRIORITY_TYPES.any { type.contains(it) }
        val isRingtoneChannel = channelId != null && channelId == "homswag_ringtone"

        if (isRingtoneType || isRingtoneChannel) {
            // Check if the main app activity is visible. If so, App.vue handles
            // the alert with GlobalAlertBox and AlarmPlugin audio.
            if (isAppInForeground()) {
                Log.d(TAG, "MainActivity is visible — skipping native full-screen notification")
                return
            }
            Log.d(TAG, "High-priority match — launching RingtoneActivity with notification fallback")
            showRingtoneNotification(data)
        } else {
            Log.d(TAG, "Standard priority — delegating to Capacitor default handling")
            super.onMessageReceived(remoteMessage)
        }
    }

    private fun isAppInForeground(): Boolean {
        return MainActivity.isVisible
    }

    private fun showRingtoneNotification(data: Map<String, String>) {
        val body  = data["body"]  ?: "You have a new important notification."

        // 1. FullScreenIntent (RingtoneActivity) — the automatic native popup/alarm.
        val ringtoneIntent = Intent(this, RingtoneActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            for ((key, value) in data) {
                putExtra(key, value)
            }
        }

        try {
            AlertForegroundService.start(this, data)
            Log.d(TAG, "Foreground alert service started")
        } catch (e: Exception) {
            Log.w(TAG, "Foreground alert service failed to start", e)
        }

        try {
            startActivity(ringtoneIntent)
            Log.d(TAG, "RingtoneActivity launched directly from FCM service")
        } catch (e: Exception) {
            Log.w(TAG, "Direct RingtoneActivity launch failed; relying on notification fallback", e)
        }

        if (!shouldPostFullScreenNotification()) {
            Log.d(TAG, "Device is unlocked/interactive — foreground service notification is enough")
            return
        }

        // 2. ContentIntent (MainActivity) — when the user explicitly clicks
        // the notification tray, open the relevant detail screen. The ringtone
        // activity already handled the alarm UI, so do not trigger GlobalAlertBox again.
        val deepLink = buildNavigateDeepLink(data)

        val mainIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            this.data = Uri.parse(deepLink)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("skip_splash", true)
            for ((key, value) in data) {
                putExtra(key, value)
            }
        }

        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val fullScreenPendingIntent = PendingIntent.getActivity(this, 1, ringtoneIntent, pendingFlags)
        val contentPendingIntent    = PendingIntent.getActivity(this, 2, mainIntent, pendingFlags)

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Ensure the channel exists (safe to call if already created).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = Uri.parse("android.resource://$packageName/${R.raw.alert}")
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            val channel = NotificationChannel(
                FULL_SCREEN_CHANNEL_ID,
                "High Priority Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full-screen incoming trip and order alerts"
                setSound(soundUri, audioAttributes)
                enableVibration(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, FULL_SCREEN_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("HomSwag Alert")
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        Log.d(TAG, "Posting FullScreenIntent notification (id=$RINGTONE_NOTIFICATION_ID)")
        notificationManager.notify(RINGTONE_NOTIFICATION_ID, notification)
    }

    private fun shouldPostFullScreenNotification(): Boolean {
        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager

        val isLocked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            keyguardManager.isDeviceLocked || keyguardManager.isKeyguardLocked
        } else {
            @Suppress("DEPRECATION")
            keyguardManager.isKeyguardLocked
        }

        return isLocked || !powerManager.isInteractive
    }

    private fun buildNavigateDeepLink(data: Map<String, String>): String {
        val orderId = data["order_id"] ?: data["orderId"]
        if (!orderId.isNullOrBlank()) {
            return "homswag-partner://navigate/orders/${Uri.encode(orderId)}"
        }

        val tripId = data["trip_id"] ?: data["tripId"]
        if (!tripId.isNullOrBlank()) {
            return "homswag-partner://navigate/trips/${Uri.encode(tripId)}"
        }

        return "homswag-partner://navigate/notifications"
    }
}
