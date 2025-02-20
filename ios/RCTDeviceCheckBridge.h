#ifndef RCTDeviceCheckBridge_h
#define RCTDeviceCheckBridge_h

#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#else
#import "RCTBridgeModule.h"
#endif
#import <DeviceCheck/DeviceCheck.h>

@interface RCTDeviceCheckBridge : NSObject <RCTBridgeModule>
@end

#endif /* RCTDeviceCheckBridge_h */