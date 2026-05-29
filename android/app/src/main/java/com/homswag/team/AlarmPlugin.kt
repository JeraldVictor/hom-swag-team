package com.homswag.team

import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * AlarmPlugin — plays a looping audio file on the Android ALARM stream.
 *
 * USAGE_ALARM bypasses Do-Not-Disturb and silent mode so the ringtone is
 * always audible when an in-app alert overlay is shown.
 */
@CapacitorPlugin(name = "AlarmPlugin")
class AlarmPlugin : Plugin() {

    private var mediaPlayer: MediaPlayer? = null

    @PluginMethod
    fun playRingtone(call: PluginCall) {
        activity.runOnUiThread {
            try {
                releasePlayer()

                val afd = context.assets.openFd("public/audio/alert.wav")
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setLegacyStreamType(AudioManager.STREAM_ALARM)
                            .build()
                    )
                    setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                    isLooping = true
                    prepare()
                    start()
                }
                afd.close()
                call.resolve()
            } catch (e: Exception) {
                call.reject("AlarmPlugin.playRingtone failed: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun stopRingtone(call: PluginCall) {
        activity.runOnUiThread {
            releasePlayer()
            call.resolve()
        }
    }

    private fun releasePlayer() {
        mediaPlayer?.let {
            try {
                if (it.isPlaying) it.stop()
            } catch (_: Exception) {}
            it.release()
        }
        mediaPlayer = null
    }

    override fun handleOnDestroy() {
        releasePlayer()
        super.handleOnDestroy()
    }
}
