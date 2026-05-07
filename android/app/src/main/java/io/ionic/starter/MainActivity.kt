package io.ionic.starter

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(LocationServicePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
