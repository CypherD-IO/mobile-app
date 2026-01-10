package com.cypherd.androidwallet

import android.app.Application
import android.util.Log
import com.cypherd.CustomPreventScreenshotPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.views.text.ReactFontManager
import com.intercom.reactnative.IntercomModule

/**
 * Application entry-point for Android.
 *
 * React Native 0.83+ uses the "New Architecture" by default. This template aligns with the modern
 * React Native startup path using [ReactHost] and [loadReactNative].
 *
 * IMPORTANT:
 * - We keep custom packages manually registered here because they are app-local.
 * - We keep custom font registration here because it impacts text rendering across the app.
 * - We initialize Intercom here to preserve existing production behavior.
 */
class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here.
          add(CustomPreventScreenshotPackage())
          add(InstallReferrerPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()

    // Register custom fonts used throughout the app.
    // Keep this guarded so a single font packaging issue does not crash startup.
    try {
      ReactFontManager.getInstance().addCustomFont(this, "Manrope", R.font.manrope)
      ReactFontManager.getInstance().addCustomFont(this, "CydFont", R.font.cydfont)
      ReactFontManager.getInstance().addCustomFont(this, "Cypher Nord", R.font.nord)
      ReactFontManager.getInstance().addCustomFont(this, "New York", R.font.newyork)
    } catch (t: Throwable) {
      Log.e(TAG, "Failed to register custom fonts; continuing startup.", t)
    }

    // Intercom initialization (existing behavior from legacy MainApplication.java).
    try {
      IntercomModule.initialize(
        this,
        "android_sdk-60866bc5b6b0e244ea48a178cb454791b75dff7a",
        BuildConfig.INTERCOM_APP_KEY,
      )
    } catch (t: Throwable) {
      Log.e(TAG, "Failed to initialize Intercom; continuing startup.", t)
    }

    // React Native runtime initialization.
    loadReactNative(this)
  }

  private companion object {
    private const val TAG = "MainApplication"
  }
}

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


