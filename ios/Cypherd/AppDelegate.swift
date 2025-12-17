import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Configure Firebase before anything else
    FirebaseApp.configure()

    // Initialize React Native delegate and factory
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Create the main window
    window = UIWindow(frame: UIScreen.main.bounds)

    // Start React Native with the app module name
    factory.startReactNative(
      withModuleName: "Cypherd",
      in: window,
      launchOptions: launchOptions
    )

    // Initialize Intercom with SDK key and app ID from config
    let intercomAppKey = RNCConfig.env(for: "INTERCOM_APP_KEY") ?? ""
    IntercomModule.initialize("ios_sdk-ed69019e837fc8edd9a6410207514825594cae2b", withAppId: intercomAppKey)

    // Setup Lottie splash screen
    if let rootView = window?.rootViewController?.view {
      setupLottieSplashScreen(rootView: rootView)
    }

    // Configure UNUserNotificationCenter for push notifications
    let center = UNUserNotificationCenter.current()
    center.delegate = self

    return true
  }

  // MARK: - Lottie Splash Screen Setup

  private func setupLottieSplashScreen(rootView: UIView) {
    let dynamic = Dynamic()
    
    // Create the Lottie animation view using the Dynamic helper
    let animationView = dynamic.createAnimationView(rootView: rootView, lottieName: "splash")
    animationView.backgroundColor = UIColor.black

    // Show the Lottie splash screen
    RNSplashScreen.showLottieSplash(animationView, inRootView: rootView)

    // Play the animation - Dynamic.play() will call setAnimationFinished when complete
    dynamic.play(animationView: animationView)
  }

  // MARK: - UNUserNotificationCenterDelegate Methods

  // Called when a notification is delivered to a foreground app
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.sound, .alert, .badge])
  }

  // Called when user taps on a notification
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    RNCPushNotificationIOS.didReceive(response)
    completionHandler()
  }

  // MARK: - Remote Notification Registration

  // Called when device successfully registers for remote notifications
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    RNCPushNotificationIOS.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
  }

  // Called when remote notification registration fails
  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    RNCPushNotificationIOS.didFailToRegisterForRemoteNotificationsWithError(error)
  }

  // Called when a remote notification is received (background fetch)
  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    RNCPushNotificationIOS.didReceiveRemoteNotification(userInfo, fetchCompletionHandler: completionHandler)
  }

  // MARK: - Deep Linking / URL Handling

  // Handle URLs opened via custom URL schemes
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  // Handle Universal Links
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}

// MARK: - ReactNativeDelegate

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
