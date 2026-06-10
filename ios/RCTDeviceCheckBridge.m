#import "RCTDeviceCheckBridge.h"
#import <DeviceCheck/DeviceCheck.h>
#import <CommonCrypto/CommonDigest.h>
#import <React/RCTLog.h>

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

+ (BOOL)requiresMainQueueSetup { return NO; }

// One-time key registration per install. Persist returned keyId; use generateAssertion
// for all subsequent auths. Apple rate-limits attestKey — don't loop.
RCT_EXPORT_METHOD(attestDevice:(NSString *)challenge
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 14.0, *)) {
        DCAppAttestService *service = [DCAppAttestService sharedService];
        if (!service.isSupported) {
            reject(@"UNSUPPORTED", @"App Attest not supported on this device", nil);
            return;
        }

        [service generateKeyWithCompletionHandler:^(NSString * _Nullable keyId, NSError * _Nullable kErr) {
            if (kErr) {
                RCTLogError(@"generateKey failed: %@ (code %ld)", kErr.localizedDescription, (long)kErr.code);
                reject(@"KEY_GEN_FAILED", kErr.localizedDescription, kErr);
                return;
            }

            NSData *clientDataHash = [[challenge dataUsingEncoding:NSUTF8StringEncoding] SHA256Hash];

            [service attestKey:keyId
                clientDataHash:clientDataHash
             completionHandler:^(NSData * _Nullable attestation, NSError * _Nullable aErr) {
                if (aErr) {
                    RCTLogError(@"attestKey failed: %@ (code %ld)", aErr.localizedDescription, (long)aErr.code);
                    reject(@"ATTEST_FAILED", aErr.localizedDescription, aErr);
                    return;
                }
                if (!attestation) {
                    reject(@"ATTEST_NIL", @"Attestation object is nil", nil);
                    return;
                }
                resolve(@{
                    @"keyId": keyId,
                    @"attestation": [attestation base64EncodedStringWithOptions:0],
                });
            }];
        }];
    } else {
        reject(@"VERSION", @"App Attest requires iOS 14.0 or later", nil);
    }
}

// Per-auth signature. Fast, local, no Apple round-trip. Counter increments inside Enclave.
// INVALID_KEY means caller MUST clear stored keyId and re-attest.
RCT_EXPORT_METHOD(generateAssertion:(NSString *)keyId
                  clientData:(NSString *)clientData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    if (@available(iOS 14.0, *)) {
        DCAppAttestService *service = [DCAppAttestService sharedService];
        if (!service.isSupported) {
            reject(@"UNSUPPORTED", @"App Attest not supported on this device", nil);
            return;
        }

        NSData *clientDataHash = [[clientData dataUsingEncoding:NSUTF8StringEncoding] SHA256Hash];

        [service generateAssertion:keyId
                    clientDataHash:clientDataHash
                 completionHandler:^(NSData * _Nullable assertion, NSError * _Nullable err) {
            if (err) {
                RCTLogError(@"generateAssertion failed: %@ (code %ld)",
                            err.localizedDescription, (long)err.code);
                if (err.code == DCErrorInvalidKey) {
                    reject(@"INVALID_KEY",
                           @"Key no longer valid — re-attestation required",
                           err);
                } else {
                    reject(@"ASSERT_FAILED", err.localizedDescription, err);
                }
                return;
            }
            if (!assertion) {
                reject(@"ASSERT_NIL", @"Assertion object is nil", nil);
                return;
            }
            resolve(@{ @"assertion": [assertion base64EncodedStringWithOptions:0] });
        }];
    } else {
        reject(@"VERSION", @"App Attest requires iOS 14.0 or later", nil);
    }
}

@end
