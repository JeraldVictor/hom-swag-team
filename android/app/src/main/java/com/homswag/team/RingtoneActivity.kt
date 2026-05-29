package com.homswag.team

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

        val title = intent.getStringExtra("title") ?: "Incoming Alert"
        val body  = intent.getStringExtra("body")  ?: "You have a new notification."

        findViewById<TextView>(R.id.title).text = title
        findViewById<TextView>(R.id.body).text  = body

        // "Accept / View Details" — open MainActivity which will route the user
        // to the correct screen via the Capacitor deep-link extras.
        findViewById<Button>(R.id.accept_button).setOnClickListener {
            Log.d(TAG, "Accept tapped — launching MainActivity")
            stopAlarm()

            // Build a homswag-team:// deep-link URL so the Capacitor app's
            // App.addListener('appUrlOpen') handler can navigate to the right screen.
            val type    = intent.getStringExtra("type") ?: ""
            val orderId = intent.getStringExtra("order_id") ?: ""
            val tripId  = intent.getStringExtra("trip_id")  ?: ""
            
            // Use the "alert" path so App.vue triggers the GlobalAlertBox for consistency.
            val deepLink = "homswag-team://alert?type=$type&order_id=$orderId&trip_id=$tripId"

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

    override fun onDestroy() {
        super.onDestroy()
        stopAlarm()
    }
}
