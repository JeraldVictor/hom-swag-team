package com.homswag.partner

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
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
            // Check if app is in foreground. If so, Socket.IO in App.vue handles the UI.
            // Posting a notification here would cause a duplicate card in the drawer.
            if (isAppInForeground()) {
                Log.d(TAG, "App is in foreground — skipping native notification (Socket.IO will handle it)")
                return
            }
            Log.d(TAG, "High-priority match — triggering RingtoneActivity via FullScreenIntent")
            showRingtoneNotification(data)
        } else {
            Log.d(TAG, "Standard priority — delegating to Capacitor default handling")
            super.onMessageReceived(remoteMessage)
        }
    }

    private fun isAppInForeground(): Boolean {
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
        val appProcesses = activityManager.runningAppProcesses ?: return false
        val packageName = packageName
        for (appProcess in appProcesses) {
            if (appProcess.importance == android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
                appProcess.processName == packageName) {
                return true
            }
        }
        return false
    }

    private fun showRingtoneNotification(data: Map<String, String>) {
        val title = data["title"] ?: "Incoming Alert"
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

        // 2. ContentIntent (MainActivity) — when the user explicitly CLICKS the notification tray.
        // We use a deep-link URL so App.vue can handle it and trigger GlobalAlertBox.
        val type    = data["type"] ?: ""
        val orderId = data["order_id"] ?: data["orderId"] ?: ""
        val tripId  = data["trip_id"]  ?: data["tripId"] ?: ""
        val deepLink = "homswag-partner://alert?type=$type&order_id=$orderId&trip_id=$tripId"

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
            val channel = NotificationChannel(
                "homswag_ringtone",
                "High Priority Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming trip and order alerts"
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, "homswag_ringtone")
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
}
