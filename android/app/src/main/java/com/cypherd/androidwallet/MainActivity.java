package com.cypherd.androidwallet;
import android.os.Bundle;
import android.view.WindowManager;
import android.os.Build;
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import org.devio.rn.splashscreen.SplashScreen;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "Cypherd";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled());
  }
  
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Native Lottie splash (react-native-lottie-splash-screen)
    // Fix: https://github.com/invertase/react-native-firebase/issues/3469#issuecomment-614990736
    SplashScreen.show(this, R.id.lottie);
    SplashScreen.setAnimationFinished(true);
    
    // Configure edge-to-edge display for proper SafeArea handling
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      // For Android 11+ (API 30+)
      getWindow().setDecorFitsSystemWindows(false);
    } else {
      // For older Android versions
      getWindow().setFlags(
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
      );
    }
    
    super.onCreate(null);
  }
}
