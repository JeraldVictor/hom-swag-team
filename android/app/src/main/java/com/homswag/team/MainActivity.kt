package com.homswag.partner

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    companion object {
        @Volatile
        var isVisible: Boolean = false
            private set
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        if (shouldSkipSplash(intent)) {
            setTheme(R.style.AppTheme_NoActionBarNoSplash)
        }
        NotificationChannels.ensureAll(this)
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        isVisible = true
    }

    override fun onPause() {
        isVisible = false
        super.onPause()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        this.intent = intent
    }

    private fun shouldSkipSplash(intent: Intent?): Boolean {
        if (intent == null) return false
        if (intent.getBooleanExtra("skip_splash", false)) return true
        val data = intent.data ?: return false
        return data.scheme == "homswag-partner" &&
            (data.host == "navigate" || data.path?.startsWith("/navigate") == true)
    }

}
