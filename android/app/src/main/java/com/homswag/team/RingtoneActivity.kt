package com.homswag.partner

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

class RingtoneActivity : Activity() {

    companion object {
        private const val TAG = "RingtoneActivity"
    }

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Dismiss the FullScreenIntent heads-up notification immediately so the
        // tray does not keep a duplicate entry while the activity is showing.
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .cancel(CustomMessagingService.RINGTONE_NOTIFICATION_ID)
        AlertForegroundService.stop(this)

        // Show over the lock screen and turn the screen on.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager =
                getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContentView(R.layout.activity_ringtone)

        val type = intent.getStringExtra("type")?.lowercase() ?: ""
        val title = intent.getStringExtra("title") ?: titleForType(type)
        val body  = intent.getStringExtra("body")  ?: bodyForType(type)

        findViewById<TextView>(R.id.alert_type).text = labelForType(type)
        findViewById<TextView>(R.id.title).text = title
        findViewById<TextView>(R.id.body).text  = body
        setResourceLabel(type)

        // "Accept / View Details" — open MainActivity directly on the relevant screen.
        findViewById<Button>(R.id.accept_button).setOnClickListener {
            Log.d(TAG, "Accept tapped — launching MainActivity")
            stopAlarm()

            val deepLink = buildNavigateDeepLink()

            val mainIntent = Intent(this, MainActivity::class.java).apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse(deepLink)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("skip_splash", true)
                // Also forward raw extras as a fallback for any existing intent handlers.
                intent.extras?.let { putExtras(it) }
            }
            startActivity(mainIntent)
            overridePendingTransition(0, 0)
            finish()
        }

        // "Dismiss" — stop ringing without opening the app.
        findViewById<Button>(R.id.dismiss_button).setOnClickListener {
            Log.d(TAG, "Dismiss tapped")
            stopAlarm()
            finish()
        }

        startAlarm()
    }

    private fun startAlarm() {
        // --- Audio ---
        try {
            val ringtoneUri =
                Uri.parse("android.resource://$packageName/" + R.raw.alert)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@RingtoneActivity, ringtoneUri)
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setAudioAttributes(attrs)
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "Alarm audio started (custom asset)")
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

        // --- Vibration (repeating 1 s on / 1 s off) ---
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
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
        mediaPlayer?.let { mp ->
            if (mp.isPlaying) mp.stop()
            mp.release()
        }
        mediaPlayer = null

        vibrator?.cancel()
        vibrator = null
    }

    private fun buildNavigateDeepLink(): String {
        val orderId = intent.getStringExtra("order_id") ?: intent.getStringExtra("orderId")
        if (!orderId.isNullOrBlank()) {
            return "homswag-partner://navigate/orders/${Uri.encode(orderId)}"
        }

        val tripId = intent.getStringExtra("trip_id") ?: intent.getStringExtra("tripId")
        if (!tripId.isNullOrBlank()) {
            return "homswag-partner://navigate/trips/${Uri.encode(tripId)}"
        }

        return "homswag-partner://navigate/notifications"
    }

    private fun setResourceLabel(type: String) {
        val resourceLabel = findViewById<TextView>(R.id.alert_resource)
        val orderId = intent.getStringExtra("order_id") ?: intent.getStringExtra("orderId")
        val tripId = intent.getStringExtra("trip_id") ?: intent.getStringExtra("tripId")
        val orderNumber = intent.getStringExtra("order_number") ?: intent.getStringExtra("orderNumber")

        val label = when {
            !orderNumber.isNullOrBlank() -> "Order #$orderNumber"
            !orderId.isNullOrBlank() -> "Order $orderId"
            !tripId.isNullOrBlank() -> "Trip $tripId"
            type.contains("trip") -> "Rider assignment"
            type.contains("order") -> "Beautician assignment"
            else -> null
        }

        if (label.isNullOrBlank()) {
            resourceLabel.visibility = View.GONE
        } else {
            resourceLabel.text = label
            resourceLabel.visibility = View.VISIBLE
        }
    }

    private fun labelForType(type: String): String {
        return when {
            type.contains("trip_assigned") -> "RIDER ASSIGNMENT"
            type.contains("order_assigned") -> "BEAUTICIAN ASSIGNMENT"
            type.contains("trip") -> "TRIP UPDATE"
            type.contains("order") -> "ORDER UPDATE"
            else -> "IMPORTANT ALERT"
        }
    }

    private fun titleForType(type: String): String {
        return when {
            type.contains("trip_assigned") -> "New Rider Assignment"
            type.contains("order_assigned") -> "New Order Assignment"
            type.contains("trip") -> "Trip Update"
            type.contains("order") -> "Order Update"
            else -> "Incoming Alert"
        }
    }

    private fun bodyForType(type: String): String {
        return when {
            type.contains("trip_assigned") -> "A rider trip has been assigned. Open the app to review the details."
            type.contains("order_assigned") -> "A beautician order has been assigned. Open the app to review the details."
            type.contains("trip") -> "A trip assigned to you has been updated."
            type.contains("order") -> "An order assigned to you has been updated."
            else -> "You have a new important notification."
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarm()
    }
}
