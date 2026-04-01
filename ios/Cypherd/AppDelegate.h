#import <UIKit/UIKit.h>
#import <UserNotifications/UNUserNotificationCenter.h>
#import <FirebaseMessaging/FIRMessaging.h>

#import <React-RCTAppDelegate/RCTAppDelegate.h>

@interface AppDelegate : RCTAppDelegate <UNUserNotificationCenterDelegate, FIRMessagingDelegate>
@end
