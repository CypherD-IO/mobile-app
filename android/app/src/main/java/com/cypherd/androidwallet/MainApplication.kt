package com.cypherd.androidwallet

import android.app.Application
import com.cypherd.CustomPreventScreenshotPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.views.text.ReactFontManager
import com.facebook.soloader.SoLoader
import com.intercom.reactnative.IntercomModule

class MainApplication : Application(), ReactApplication {

  /**
   * The ReactNativeHost instance that manages the React Native runtime.
   * Uses [DefaultReactNativeHost] to configure packages, developer support, and architecture settings.
   */
  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        
        /**
         * Enables developer support (e.g., dev menu, hot reloading) in debug builds.
         */
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        /**
         * Returns the list of React Native packages to be loaded.
         * Includes autolinked packages plus custom manually-added packages.
         */
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here:
              add(CustomPreventScreenshotPackage())
              add(InstallReferrerPackage())
            }

        /**
         * Returns the name of the main JS module (entry point).
         */
        override fun getJSMainModuleName(): String = "index"

        /**
         * Returns whether the New Architecture (Fabric + TurboModules) is enabled.
         */
        override val isNewArchEnabled: Boolean
          get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

        /**
         * Returns whether the Hermes JavaScript engine is enabled.
         */
        override val isHermesEnabled: Boolean
          get() = BuildConfig.IS_HERMES_ENABLED
      }

  /**
   * Called when the application is first created. Initializes custom fonts,
   * SoLoader, New Architecture (if enabled), Flipper, and Intercom.
   */
  override fun onCreate() {
    super.onCreate()

    // Register custom fonts for use in React Native
    ReactFontManager.getInstance().apply {
      addCustomFont(this@MainApplication, "Manrope", R.font.manrope)
      addCustomFont(this@MainApplication, "CydFont", R.font.cydfont)
      addCustomFont(this@MainApplication, "Cypher Nord", R.font.nord)
      addCustomFont(this@MainApplication, "New York", R.font.newyork)
    }

    // Initialize SoLoader for loading native libraries
    SoLoader.init(this, /* native exopackage */ false)

    // Load the New Architecture native entry point if enabled
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load()
    }

    // Initialize Flipper for debugging in debug builds
    ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)

    // Initialize Intercom for customer messaging
    IntercomModule.initialize(
      this,
      "android_sdk-60866bc5b6b0e244ea48a178cb454791b75dff7a",
      BuildConfig.INTERCOM_APP_KEY
    )
  }
}