package com.homswag.partner

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

object NotificationChannels {
    const val ORDERS = "homswag_orders_default_v5"
    const val TRIPS = "homswag_trips_default_v5"
    const val GENERAL = "homswag_general_default_v5"
    const val JOB_ALERT = "homswag_job_alert_v1"
    const val JOB_DEFAULT = "homswag_job_default_v1"
    const val JOB_SILENT = "homswag_job_silent_v1"

    private val obsoleteChannels = listOf(
        "homswag_ringtone",
        "homswag_fullscreen_alerts_v2",
        "homswag_alarm_service_v1",
        "homswag_orders",
        "homswag_trips",
        "homswag_general",
        "homswag_orders_default_v2",
        "homswag_trips_default_v2",
        "homswag_general_default_v2",
        "homswag_orders_default_v3",
        "homswag_trips_default_v3",
        "homswag_general_default_v3",
        "homswag_orders_default_v4",
        "homswag_trips_default_v4",
        "homswag_general_default_v4",
    )

    fun ensureAll(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        obsoleteChannels.forEach { channelId ->
            notificationManager.deleteNotificationChannel(channelId)
        }

        createChannel(notificationManager, ORDERS, "Orders", "New order and order update notifications")
        createChannel(notificationManager, TRIPS, "Trips", "New trip and trip update notifications")
        createChannel(notificationManager, GENERAL, "General", "General HomSwag notifications")
        createChannel(notificationManager, JOB_ALERT, "Job alerts", "Repeating assigned job alerts", NotificationManager.IMPORTANCE_HIGH)
        createChannel(notificationManager, JOB_DEFAULT, "Job alerts (default)", "Assigned job alerts", NotificationManager.IMPORTANCE_DEFAULT)
        createChannel(notificationManager, JOB_SILENT, "Job alerts (silent)", "Assigned job alerts without sound", NotificationManager.IMPORTANCE_LOW, false)
    }

    fun ensure(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        ensureAll(context)
    }

    private fun createChannel(
        notificationManager: NotificationManager,
        id: String,
        name: String,
        descriptionText: String,
        importance: Int = NotificationManager.IMPORTANCE_DEFAULT,
        soundEnabled: Boolean = true,
    ) {
        val soundUri = if (soundEnabled) {
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        } else {
            null
        }
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build()

        val channel = NotificationChannel(
            id,
            name,
            importance,
        ).apply {
            description = descriptionText
            setSound(soundUri, audioAttributes)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PRIVATE
        }

        notificationManager.createNotificationChannel(channel)
    }
}
