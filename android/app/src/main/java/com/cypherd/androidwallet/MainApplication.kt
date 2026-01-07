package com.cypherd.androidwallet

import android.app.Application
import com.cypherd.CustomPreventScreenshotPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.facebook.react.views.text.ReactFontManager

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here
                    add(CustomPreventScreenshotPackage())
                    add(InstallReferrerPackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        
        // Register custom fonts
        ReactFontManager.getInstance().addCustomFont(this, "Manrope", R.font.manrope)
        ReactFontManager.getInstance().addCustomFont(this, "CydFont", R.font.cydfont)
        ReactFontManager.getInstance().addCustomFont(this, "Cypher Nord", R.font.nord)
        ReactFontManager.getInstance().addCustomFont(this, "New York", R.font.newyork)
        
        // Initialize SoLoader for native libraries
        SoLoader.init(this, OpenSourceMergedSoMapping)
        
        // New Architecture initialization (if enabled)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }
        
        // Intercom initialization is temporarily disabled while stabilizing RN 0.83 + New Architecture.
        // The app also aliases `@intercom/intercom-react-native` to a JS shim in `metro.config.js`
        // to ensure the native module is never accessed during startup.
        // Re-enable after confirming Intercom native compatibility.
    }
}


