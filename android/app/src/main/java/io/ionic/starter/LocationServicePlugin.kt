package io.ionic.starter

import android.content.Intent
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
            context.startForegroundService(intent)
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
