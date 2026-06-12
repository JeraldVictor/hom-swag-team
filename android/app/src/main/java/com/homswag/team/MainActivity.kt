package com.homswag.partner

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        if (shouldSkipSplash(intent)) {
            setTheme(R.style.AppTheme_NoActionBarNoSplash)
        }
        registerPlugin(AlarmPlugin::class.java)
        super.onCreate(savedInstanceState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        this.intent = intent
    }

    private fun shouldSkipSplash(intent: Intent?): Boolean {
        if (intent == null) return false
        if (intent.getBooleanExtra("skip_splash", false)) return true
        val data = intent.data ?: return false
        return data.scheme == "homswag-partner" && data.path?.startsWith("/navigate") == true
    }
}
