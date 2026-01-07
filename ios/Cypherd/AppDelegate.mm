#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <IntercomModule.h>
#import <Firebase.h>
#import <RNSplashScreen.h>
#import <Cypherd-Swift.h>
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>
#import <React/RCTLinkingManager.h>
#import "RNCConfig.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  
  self.moduleName = @"Cypherd";
  // React Native (0.77+) expects an app dependency provider when using the new AppDelegate template.
  // This is required for correctly wiring dependencies under the New Architecture (Fabric/TurboModules).
  self.dependencyProvider = [RCTAppDependencyProvider new];
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  BOOL success = [super application:application didFinishLaunchingWithOptions:launchOptions];

  // Intercom initialization is temporarily disabled while stabilizing RN 0.83 + New Architecture.
  // The app also aliases `@intercom/intercom-react-native` to a JS shim in `metro.config.js`
  // to ensure the native module is never accessed during startup.
  // Re-enable after confirming Intercom native compatibility.
  // [IntercomModule initialize:@"ios_sdk-ed69019e837fc8edd9a6410207514825594cae2b" withAppId:[RNCConfig envFor:@"INTERCOM_APP_KEY"]];
  
  // Custom Splash Screen Logic
  if (self.window.rootViewController.view) {
      RCTRootView *rootView = (RCTRootView *)self.window.rootViewController.view;
      
      Dynamic *t = [Dynamic new];
      // `createAnimationViewWithRootView` returns a LottieAnimationView (Swift),
      // but we store it as UIView for splash screen APIs. Keep a typed reference
      // for `playWithAnimationView:` to satisfy the Swift signature.
      UIView *animationUIView = (UIView *)[t createAnimationViewWithRootView:rootView lottieName:@"splash"];
      animationUIView.backgroundColor = [UIColor blackColor];

      [RNSplashScreen showLottieSplash:animationUIView inRootView:rootView];

      // Swift header expects LottieAnimationView*
      [t playWithAnimationView:(LottieAnimationView *)animationUIView];

      [RNSplashScreen setAnimationFinished:true];
  }

  // Define UNUserNotificationCenter
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;

  return success;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

//Called when a notification is delivered to a foreground app.
-(void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge);
}

// Required for the register event.
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
 [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Required for the notification event. You must call the completion handler after handling the remote notification.
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

// Required for the registrationError event.
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
 [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
}

// Required for localNotification event
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler
{
  [RNCPushNotificationIOS didReceiveNotificationResponse:response];
}

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
 return [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                    restorationHandler:restorationHandler];
}

@end
