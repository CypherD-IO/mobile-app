#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CioPushBridge, NSObject)
RCT_EXTERN_METHOD(refreshPushToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
