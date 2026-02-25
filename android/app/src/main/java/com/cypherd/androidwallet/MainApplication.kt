package com.cypherd.androidwallet

import android.app.Application
import android.util.Log
import cl.json.ShareApplication
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
import com.facebook.react.views.text.ReactFontManager
import com.facebook.soloader.SoLoader
import com.google.firebase.FirebaseApp
import com.intercom.reactnative.IntercomModule

/**
 * Android Application entry-point.
 *
 * NOTE:
 * This file previously ended up with TWO copies of `MainApplication` (and even a second `package`
 * declaration) during the RN 0.83 migration, which breaks Kotlin compilation.
 *
 * This version keeps:
 * - RN template host setup (DefaultReactNativeHost + DefaultReactHost)
 * - New Architecture initialization (when enabled)
 * - Custom font registration (app-specific)
 * - Manual packages that are app-specific (InstallReferrer, PreventScreenshot)
 * - Intercom init (guarded so failures don't crash startup)
 */
class MainApplication : Application(), ReactApplication, ShareApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here.
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

    // Initialize SoLoader for native libraries.
    SoLoader.init(this, OpenSourceMergedSoMapping)

    // Firebase (Android) initialization.
    //
    // On iOS we explicitly call `[FIRApp configure]` in `AppDelegate.mm`.
    // On Android, Firebase normally auto-initializes via `google-services.json` + the
    // `com.google.gms.google-services` Gradle plugin (and `FirebaseInitProvider`).
    //
    // However, when the auto-init path fails (misconfigured json, plugin not applied, or a manifest
    // merge issue), `@react-native-firebase/app` throws at runtime:
    // "No Firebase App '[DEFAULT]' has been created".
    //
    // Initializing here makes startup deterministic and matches iOS behavior.
    try {
      val app = FirebaseApp.initializeApp(this)
      if (app == null) {
        Log.e(
          TAG,
          "FirebaseApp.initializeApp returned null. Check android/app/google-services.json package_name matches applicationId (com.cypherd.androidwallet) and that the google-services Gradle plugin is applied.",
        )
      } else {
        Log.i(TAG, "Firebase initialized: ${app.name}")
      }
    } catch (t: Throwable) {
      Log.e(TAG, "Firebase initialization failed; app may crash when RN Firebase is accessed.", t)
    }

    // If you opted-in for the New Architecture, load the native entry point for this app.
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }

    // Register custom fonts used throughout the app.
    // Guarded so a font packaging issue doesn't crash startup.
    try {
      ReactFontManager.getInstance().addCustomFont(this, "Manrope", R.font.manrope)
      ReactFontManager.getInstance().addCustomFont(this, "CydFont", R.font.cydfont)
      ReactFontManager.getInstance().addCustomFont(this, "Cypher Nord", R.font.nord)
      // NOTE:
      // JS uses NativeWind/Tailwind `font-gambetta` which maps to the family name "Gambetta"
      // (see `tailwind.config.js` -> theme.extend.fontFamily.gambetta).
      //
      // On Android, React Native only resolves custom fonts by the *exact* family name it's given.
      // If we register Gambetta under a different name (e.g. "New York"), the font will silently
      // fall back to the default typeface and appear "not applied".
      ReactFontManager.getInstance().addCustomFont(this, "Gambetta", R.font.gambetta)

      // Backwards-compatible alias: keep the previous registration name if any screen still
      // references it.
      ReactFontManager.getInstance().addCustomFont(this, "New York", R.font.gambetta)
    } catch (t: Throwable) {
      Log.e(TAG, "Failed to register custom fonts; continuing startup.", t)
    }

    // Intercom initialization (uses INTERCOM_ANDROID_SDK_KEY from .env).
    try {
      val sdkKey = BuildConfig.INTERCOM_ANDROID_SDK_KEY
      val appId = BuildConfig.INTERCOM_APP_KEY
      if (sdkKey.isNotBlank() && appId.isNotBlank()) {
        IntercomModule.initialize(this, sdkKey, appId)
      } else {
        Log.w(TAG, "Skipping Intercom initialization: missing INTERCOM_ANDROID_SDK_KEY and/or INTERCOM_APP_KEY")
      }
    } catch (t: Throwable) {
      Log.e(TAG, "Failed to initialize Intercom; continuing startup.", t)
    }
  }

  private companion object {
    private const val TAG = "MainApplication"
  }

  /**
   * react-native-share FileProvider authority.
   *
   * This must match the provider entry in `AndroidManifest.xml`:
   * `${applicationId}.provider`
   *
   * Ref: https://react-native-share.github.io/react-native-share/docs/install
   */
  override fun getFileProviderAuthority(): String = BuildConfig.APPLICATION_ID + ".provider"
}
