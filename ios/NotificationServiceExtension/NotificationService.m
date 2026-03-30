#import "NotificationService.h"
#import "NotificationServiceExtension-Swift.h"

@interface NotificationService ()
@end

@implementation NotificationService

// Customer.io rich push handler (Swift bridge)
static CioNotificationServicePushHandler* nsHandlerObj = nil;

+ (void)initialize {
  nsHandlerObj = [[CioNotificationServicePushHandler alloc] init];
}

- (void)didReceiveNotificationRequest:(UNNotificationRequest *)request withContentHandler:(void (^)(UNNotificationContent * _Nonnull))contentHandler {
  [nsHandlerObj didReceive:request withContentHandler:contentHandler];
}

- (void)serviceExtensionTimeWillExpire {
  [nsHandlerObj serviceExtensionTimeWillExpire];
}

@end
