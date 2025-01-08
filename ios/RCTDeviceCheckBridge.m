#import "RCTDeviceCheckBridge.h"
#import <DeviceCheck/DeviceCheck.h>
#import <CommonCrypto/CommonDigest.h>

// Helper method to generate SHA256 hash
@interface NSData (SHA256)
- (NSData *)SHA256Hash;
@end

@implementation NSData (SHA256)
- (NSData *)SHA256Hash {
    unsigned char hash[CC_SHA256_DIGEST_LENGTH];
    CC_SHA256(self.bytes, (CC_LONG)self.length, hash);
    return [NSData dataWithBytes:hash length:CC_SHA256_DIGEST_LENGTH];
}
@end

@implementation RCTDeviceCheckBridge

RCT_EXPORT_MODULE(DeviceCheckBridge);

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

RCT_EXPORT_METHOD(generateToken:(NSString *)keyId
                  clientData:(NSString *)clientData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 14.0, *)) {
        DCAppAttestService *service = [DCAppAttestService sharedService];
        
        if (service.isSupported) {
            // Generate a new key
            [service generateKeyWithCompletionHandler:^(NSString * _Nullable generatedKeyId, NSError * _Nullable error) {
                if (error) {
                    reject(@"error", @"Failed to generate key", error);
                    return;
                }
                // Convert client data string to data
                NSData *clientDataHash = [[clientData dataUsingEncoding:NSUTF8StringEncoding] SHA256Hash];
                
                // Generate attestation
                [service attestKey:generatedKeyId clientDataHash:clientDataHash completionHandler:^(NSData * _Nullable attestationObject, NSError * _Nullable error) {
                    if (error) {
                        reject(@"error", @"Failed to generate attestation", error);
                        return;
                    }
                    
                    // Convert attestation to base64 string
                    NSString *attestationString = [attestationObject base64EncodedStringWithOptions:0];
                    
                    // Return both keyId and attestation
                    NSDictionary *result = @{
                        @"keyId": generatedKeyId,
                        @"attestation": attestationString
                    };
                    
                    resolve(result);
                }];
            }];
        } else {
            reject(@"error", @"App Attest not supported on this device", nil);
        }
    } else {
        reject(@"error", @"App Attest requires iOS 14.0 or later", nil);
    }
}

@end
