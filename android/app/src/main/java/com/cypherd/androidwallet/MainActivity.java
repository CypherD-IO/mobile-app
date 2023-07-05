package com.cypherd.androidwallet;
import android.os.Bundle;
import com.facebook.react.ReactActivity;
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
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Fix: https://github.com/invertase/react-native-firebase/issues/3469#issuecomment-614990736
      SplashScreen.show(this, R.id.lottie);
      SplashScreen.setAnimationFinished(true);
      super.onCreate(savedInstanceState);
 }
}
