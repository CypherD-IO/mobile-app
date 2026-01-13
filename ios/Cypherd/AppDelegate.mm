#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <IntercomModule.h>
#import <Firebase.h>
#import <RNSplashScreen.h>
#import <Cypherd-Swift.h>
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>
#import "RNCConfig.h"

#ifdef FB_SONARKIT_ENABLED
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#import <FlipperKitReactPlugin/FlipperKitReactPlugin.h>

static void InitializeFlipper(UIApplication *application) {
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper = [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc] initWithRootNode:application withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[FlipperKitReactPlugin new]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc] initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
}
#endif

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  // --- React Native (RN 0.83) New Architecture bootstrap ---
  // IMPORTANT:
  // The legacy `RCTBridge` / `RCTRootView` initialization path now throws at runtime when the
  // app is configured for the New Architecture. Use RCTAppDelegate/RCTReactNativeFactory instead.
  self.moduleName = @"Cypherd";
  self.dependencyProvider = [RCTAppDependencyProvider new];
  self.initialProps = @{};

  BOOL didFinish = [super application:application didFinishLaunchingWithOptions:launchOptions];

  // After RN has created the window + root view, attach our splash screen and other SDK init.
  UIView *rootView = self.window.rootViewController.view;

  if (@available(iOS 13.0, *)) {
    rootView.backgroundColor = [UIColor systemBackgroundColor];
  } else {
    rootView.backgroundColor = [UIColor whiteColor];
  }

  // Intercom initialization.
  //
  // Intercom requires TWO values:
  // - SDK key (platform-specific, e.g. "ios_sdk-...")
  // - App ID (shared across platforms)
  NSString *intercomSdkKey = [RNCConfig envFor:@"INTERCOM_IOS_SDK_KEY"];
  NSString *intercomAppId = [RNCConfig envFor:@"INTERCOM_APP_KEY"];
  if (intercomSdkKey != nil && intercomSdkKey.length > 0 &&
      intercomAppId != nil && intercomAppId.length > 0) {
    [IntercomModule initialize:intercomSdkKey withAppId:intercomAppId];
  } else {
    // Missing env should not crash the app; Intercom will simply be disabled.
    NSLog(@"[Intercom] Skipping initialization: missing INTERCOM_IOS_SDK_KEY and/or INTERCOM_APP_KEY");
  }

  Dynamic *t = [Dynamic new];
  UIView *animationUIView = (UIView *)[t createAnimationViewWithRootView:rootView lottieName:@"splash"];
  animationUIView.backgroundColor = [UIColor blackColor];
  [RNSplashScreen showLottieSplash:animationUIView inRootView:rootView];
  [t playWithAnimationView:animationUIView];

  // Define UNUserNotificationCenter
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;

  return didFinish;
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
  completionHandler();
}

// RN 0.83 factory delegate method
- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
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
