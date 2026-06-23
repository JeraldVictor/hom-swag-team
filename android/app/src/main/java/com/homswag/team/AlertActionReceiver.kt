package com.homswag.partner

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlertActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == AlertForegroundService.ACTION_STOP) {
            AlertForegroundService.stop(context)
        }
    }
}
