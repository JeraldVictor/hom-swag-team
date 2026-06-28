package com.homswag.partner

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.RemoteMessage
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService

class CustomMessagingService : MessagingService() {

    companion object {
        private const val TAG = "CustomMessagingService"
        private const val DEFAULT_CHANNEL_ID = NotificationChannels.GENERAL
        private const val ORDERS_CHANNEL_ID = NotificationChannels.ORDERS
        private const val TRIPS_CHANNEL_ID = NotificationChannels.TRIPS
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data

        if (MainActivity.isVisible) {
            Log.d(TAG, "MainActivity is visible - delegating foreground message")
            super.onMessageReceived(remoteMessage)
            return
        }

        if (data.isEmpty() && remoteMessage.notification == null) {
            super.onMessageReceived(remoteMessage)
            return
        }

        showNotification(remoteMessage)
    }

    private fun showNotification(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val type = data["type"]?.lowercase().orEmpty()
        val channelId = channelIdForType(type)
        val title = remoteMessage.notification?.title
            ?: data["title"]
            ?: fallbackTitleForType(type)
        val body = remoteMessage.notification?.body
            ?: data["body"]
            ?: data["message"]
            ?: "You have a new notification."

        NotificationChannels.ensure(this)

        val contentIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            this.data = Uri.parse(buildNavigateDeepLink(data))
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            putExtra("skip_splash", true)
            for ((key, value) in data) {
                putExtra(key, value)
            }
        }

        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(this, notificationId(data), contentIntent, pendingFlags)

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(stripHtml(body))
            .setStyle(NotificationCompat.BigTextStyle().bigText(stripHtml(body)))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setDefaults(NotificationCompat.DEFAULT_SOUND)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId(data), notification)
    }

    private fun channelIdForType(type: String): String {
        if (type.contains("order") || type.contains("invoice")) return ORDERS_CHANNEL_ID
        if (type.contains("trip")) return TRIPS_CHANNEL_ID
        return DEFAULT_CHANNEL_ID
    }

    private fun fallbackTitleForType(type: String): String {
        return when {
            type.contains("order_assigned") -> "New Order Assigned"
            type.contains("order_status_changed") -> "Order Update"
            type.contains("trip_assigned") -> "New Trip Assigned"
            type.contains("trip_status_changed") -> "Trip Update"
            type.contains("invoice") -> "Invoice Sent"
            else -> "HomSwag"
        }
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

    private fun notificationId(data: Map<String, String>): Int {
        val rawId = data["id"] ?: data["notification_id"] ?: data["notificationId"]
        return rawId?.hashCode()?.and(Int.MAX_VALUE) ?: (System.currentTimeMillis() % Int.MAX_VALUE).toInt()
    }

    private fun stripHtml(value: String): String {
        return value
            .replace(Regex("<[^>]*>"), "")
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .trim()
    }
}
