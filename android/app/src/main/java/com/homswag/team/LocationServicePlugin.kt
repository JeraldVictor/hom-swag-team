package com.homswag.team

import android.content.Intent
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "LocationService")
class LocationServicePlugin : Plugin() {

    @PluginMethod
    fun startForegroundService(call: PluginCall) {
        try {
            val intent = Intent(context, LocationForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to start foreground service", e)
        }
    }

    @PluginMethod
    fun stopForegroundService(call: PluginCall) {
        try {
            val intent = Intent(context, LocationForegroundService::class.java)
            context.stopService(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to stop foreground service", e)
        }
    }
}
