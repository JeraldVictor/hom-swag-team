package com.homswag.partner

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import androidx.core.app.NotificationCompat

class AlertForegroundService : Service() {

    companion object {
        private const val TAG = "AlertForegroundService"
        private const val NOTIFICATION_ID = 1002
        private const val CHANNEL_ID = "homswag_alarm_service_v1"
        const val EXTRA_STOP_ALERT_SERVICE = "stop_alert_service"
        const val ACTION_START = "com.homswag.partner.alert.START"
        const val ACTION_STOP = "com.homswag.partner.alert.STOP"

        fun start(context: Context, data: Map<String, String>) {
            val intent = Intent(context, AlertForegroundService::class.java).apply {
                action = ACTION_START
                for ((key, value) in data) {
                    putExtra(key, value)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.startService(Intent(context, AlertForegroundService::class.java).apply {
                action = ACTION_STOP
            })
        }
    }

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopAlarm()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        createChannel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(intent),
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, buildNotification(intent))
        }
        startAlarm()
        return START_NOT_STICKY
    }

    private fun buildNotification(intent: Intent?): android.app.Notification {
        val title = intent?.getStringExtra("title") ?: "HomSwag Alert"
        val body = intent?.getStringExtra("body") ?: "You have a new important notification."

        val viewIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(buildNavigateDeepLink(intent))
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            intent?.extras?.let { putExtras(it) }
            putExtra("skip_splash", true)
            putExtra(EXTRA_STOP_ALERT_SERVICE, true)
        }

        val stopIntent = Intent(this, AlertActionReceiver::class.java).apply {
            action = ACTION_STOP
        }

        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val viewPendingIntent = PendingIntent.getActivity(this, 11, viewIntent, pendingFlags)
        val stopPendingIntent = PendingIntent.getBroadcast(this, 12, stopIntent, pendingFlags)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(viewPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .addAction(0, "Dismiss", stopPendingIntent)
            .addAction(0, "View", viewPendingIntent)
            .build()
    }

    private fun buildNavigateDeepLink(intent: Intent?): String {
        val orderId = intent?.getStringExtra("order_id") ?: intent?.getStringExtra("orderId")
        if (!orderId.isNullOrBlank()) {
            return "homswag-partner://navigate/orders/${Uri.encode(orderId)}"
        }

        val tripId = intent?.getStringExtra("trip_id") ?: intent?.getStringExtra("tripId")
        if (!tripId.isNullOrBlank()) {
            return "homswag-partner://navigate/trips/${Uri.encode(tripId)}"
        }

        return "homswag-partner://navigate/notifications"
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Active HomSwag Alerts",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Keeps urgent order and trip alerts ringing until actioned"
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
        }

        notificationManager.createNotificationChannel(channel)
    }

    private fun startAlarm() {
        if (mediaPlayer?.isPlaying == true) return

        try {
            val ringtoneUri = Uri.parse("android.resource://$packageName/" + R.raw.alert)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@AlertForegroundService, ringtoneUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "Foreground alert audio started")
        } catch (e: Exception) {
            Log.w(TAG, "Custom alert.wav failed, falling back to default alarm ringtone", e)
            try {
                val fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                mediaPlayer = MediaPlayer.create(this, fallback)?.apply {
                    isLooping = true
                    start()
                }
            } catch (e2: Exception) {
                Log.e(TAG, "Fallback alarm audio also failed", e2)
            }
        }

        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? android.os.VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
        vibrator?.let {
            val pattern = longArrayOf(0L, 1000L, 1000L)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                it.vibrate(pattern, 0)
            }
        }
    }

    private fun stopAlarm() {
        mediaPlayer?.let {
            try {
                if (it.isPlaying) it.stop()
            } catch (_: Exception) {}
            it.release()
        }
        mediaPlayer = null
        vibrator?.cancel()
        vibrator = null
    }

    override fun onDestroy() {
        stopAlarm()
        super.onDestroy()
    }
}
