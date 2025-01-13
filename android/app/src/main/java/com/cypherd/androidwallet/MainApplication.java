package com.cypherd.androidwallet;
import com.cypherd.CustomPreventScreenshotPackage;

import android.app.Application;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.zoontek.rnlocalize.RNLocalizePackage;
import fr.greweb.reactnativeviewshot.RNViewShotPackage;
import com.zoontek.rnpermissions.RNPermissionsPackage;
import org.reactnative.camera.RNCameraPackage;
import io.sentry.react.RNSentryPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.intercom.reactnative.IntercomPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import com.facebook.react.views.text.ReactFontManager;
import java.util.List;
import com.intercom.reactnative.IntercomModule;
import com.lugg.RNCConfig.RNCConfigPackage;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());
          packages.add(new CustomPreventScreenshotPackage());
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }
        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    ReactFontManager fontManager = ReactFontManager.getInstance();
    fontManager.addCustomFont(this, "Manrope-Light", R.font.manrope_light);
    fontManager.addCustomFont(this, "Manrope-Regular", R.font.manrope_regular);
    fontManager.addCustomFont(this, "Manrope-Medium", R.font.manrope_medium);
    fontManager.addCustomFont(this, "Manrope-SemiBold", R.font.manrope_semibold);
    fontManager.addCustomFont(this, "Manrope-Bold", R.font.manrope_bold);
    fontManager.addCustomFont(this, "Manrope-ExtraBold", R.font.manrope_extrabold);
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    IntercomModule.initialize(this, "android_sdk-60866bc5b6b0e244ea48a178cb454791b75dff7a", BuildConfig.INTERCOM_APP_KEY);
  }
}