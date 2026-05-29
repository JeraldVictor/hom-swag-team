package com.homswag.team

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
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
            Log.d(TAG, "High-priority match — triggering RingtoneActivity via FullScreenIntent")
            showRingtoneNotification(data)
        } else {
            Log.d(TAG, "Standard priority — delegating to Capacitor default handling")
            super.onMessageReceived(remoteMessage)
        }
    }

    private fun showRingtoneNotification(data: Map<String, String>) {
        val title = data["title"] ?: "Incoming Alert"
        val body  = data["body"]  ?: "You have a new important notification."

        // Intent that launches RingtoneActivity (the full-screen alarm UI).
        val ringtoneIntent = Intent(this, RingtoneActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            // Forward all data payload fields so RingtoneActivity can display
            // the correct title/body and pass type+id back to MainActivity.
            for ((key, value) in data) {
                putExtra(key, value)
            }
        }

        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(this, 0, ringtoneIntent, pendingFlags)

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
                // Silence the channel — RingtoneActivity uses ALARM audio directly.
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
            .setFullScreenIntent(pendingIntent, true)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        Log.d(TAG, "Posting FullScreenIntent notification (id=$RINGTONE_NOTIFICATION_ID)")
        notificationManager.notify(RINGTONE_NOTIFICATION_ID, notification)
    }
}
