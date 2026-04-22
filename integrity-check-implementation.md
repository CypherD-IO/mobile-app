# Mobile App — Integrity Integration Guide

> **Audience:** an engineer (or agent) implementing app integrity from scratch in `cyd-mobile-app`. Assume no existing integrity code. This is a complete reference — everything needed to integrate cleanly with the `cyd-arch` backend as it's deployed today.

---

## 1. Context (brief)

**The threat we're defending against:** someone downloads our APK/IPA, decompiles it, swaps recipient addresses in transfer code, repackages as "CypherD MOD v4.20" on Telegram. Victims install thinking it's our app. Their funds drain to the attacker. "App integrity" is how the server says *"only the real, untampered app running on a real device can talk to me."*

**The architecture per platform:**

| Platform | Mechanism | Trust anchor | One-time vs per-auth |
|---|---|---|---|
| Android | Google Play Integrity API | Google signs tokens tying the app binary to Play Store's canonical copy | Per-auth: generate a new token each time |
| iOS | Apple App Attest | Apple signs a certificate tying a Secure Enclave key to a real iPhone | Two-phase: attest **once** per install, then **assert** for every auth |
| dApp (web) | (Not covered here — uses Cloudflare Turnstile, a separate initiative) | — | — |

**When the mobile app actually needs integrity:** only at **auth-time**, not on every API request. That means: first auth after install, JWT refresh, explicit sign-out-then-sign-in, and after the user deletes the wallet. All other API calls carry the cached JWT and never touch integrity. Apple's own docs say "assert per request" but operationally for our app it's "assert per auth session."

**Core mental model for iOS (the non-obvious part):**

The Secure Enclave is a separate chip on the iPhone's SoC. It generates keys that **cannot be read by iOS, the app, or even Apple.** The OS can only ask the Enclave "sign this hash with key X" and receive a signature back.

- `DCAppAttestService.generateKey()` → Enclave creates a key, returns a **`keyId` string** (opaque handle, not the private key). **Storing `keyId` in AsyncStorage is safe** — it's a reference, not a secret.
- `DCAppAttestService.attestKey(keyId, hash)` → **contacts Apple's servers**, Apple returns a signed blob certifying "this keyId was born in a real Secure Enclave on a real iPhone running our app." Rate-limited.
- `DCAppAttestService.generateAssertion(keyId, hash)` → **no Apple round-trip.** Enclave signs the hash with the stored key and increments an internal monotonic counter.

On the backend, we stored the public key during attestation. For each subsequent assertion, we verify the signature using the stored public key and confirm the counter strictly increased. The private key never leaves the Enclave, but we can verify every signature came from the same device.

**Android is simpler** — no long-lived key binding. Every login generates a fresh Play Integrity token via `IntegrityManager.requestIntegrityToken(nonce)`, send it to the backend, done. Google handles the "is this a real app on a real device" question each time.

---

## 2. Backend contract

### 2.1 Endpoints

Base URL: your `v1/authentication` path (confirm with backend team; probably prefixed per environment).

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/v1/authentication/integrity-token-nonce` | Get a single-use nonce. **Call before every integrity payload construction.** | None |
| `POST` | `/v1/authentication/verify-message/integrity/:address` | Submit signed message + integrity. Returns a fresh session JWT. Primary auth endpoint. | None (integrity IS the auth) |
| `POST` | `/v1/authentication/refresh/integrity` | Refresh an expired JWT. Body is *just* the `IntegrityDto` (no `signature` wrapper). | `JwtRefreshGuard` (refresh token cookie / header) |

There are a few more integrity-protected endpoints for Coinbase / SIWE / Tron / Solana auth flows, but all of them take the same integrity payload shape. The mobile app currently only hits the first two.

### 2.2 Nonce endpoint

```http
GET /v1/authentication/integrity-token-nonce
```

**Response:**
```
"dGVzdC1ub25jZS1iYXNlNjQ="     // base64 string, typically 22-44 chars
```

**Backend behaviour:**
- Generates a cryptographically-random nonce
- Stores it in Redis under key `INTEGRITY_TOKEN_NONCE:{nonce}` with TTL 5 minutes
- Returns the nonce as a plain string (JSON-encoded)

**Rules:**
- Each nonce is single-use. After the server verifies integrity using this nonce, it's marked `used: true` in Redis. A subsequent request with the same nonce returns 401 `"Nonce already used"` or `"Assertion challenge already used"`.
- Don't cache the nonce client-side. Fetch fresh for every attestation/assertion.
- If the nonce expires before you use it (5min), you'll get 401 `"Invalid or expired nonce"` — fetch a new one and retry once.

### 2.3 Integrity payload shape

The `integrity` field that goes in auth request bodies:

```typescript
interface IntegrityDto {
  // REQUIRED — the platform-specific token
  token: string;
  //   Android: Play Integrity token (JWS)
  //   iOS first-time: attestation (base64 CBOR)
  //   iOS subsequent: assertion (base64 CBOR)

  // REQUIRED — which platform produced the token
  platform: 'android' | 'iOS';
  //   Server rejects 'web' / 'dapp' at this endpoint with 401

  // iOS REQUIRED — the nonce you got from /integrity-token-nonce
  // (Server rejects iOS without this with 401 "requires challenge and keyId")
  challenge?: string;

  // iOS REQUIRED — base64-encoded Secure Enclave key handle
  keyId?: string;

  // iOS optional — true for assertions, false/omit for attestations
  // (Default: undefined → backend treats as attestation = isAssertion false)
  isAssertion?: boolean;

  // iOS optional — the data that was signed. Defaults to `challenge` on backend
  // if not provided. Only needed if assertion was signed over something richer.
  clientData?: string;

  // Optional — telemetry (not used for auth decisions)
  deviceInfo?: {
    brand?: string;
    manufacturer?: string;
    model?: string;
    deviceId?: string;
    systemVersion?: string;
    appVersion?: string;
    buildNumber?: string;
    bundleId?: string;
    platform?: 'ios' | 'android';
  };
}
```

### 2.4 Full request body — `/verify-message/integrity/:address`

```typescript
{
  // hex-encoded signature of the server's sign-message (separate auth concern)
  signature: string;

  integrity: IntegrityDto;
}
```

### 2.5 Full request body — `/refresh/integrity`

```typescript
// Note: this one is the IntegrityDto directly, not wrapped. Trap for new players.
IntegrityDto
```

### 2.6 Success response

All integrity-protected auth endpoints return `SessionDto`:

```typescript
{
  token: string;           // JWT access token
  refreshToken: string;    // JWT refresh token
  // ... other session fields your auth context cares about
}
```

Mobile app treats this exactly like the non-integrity auth response — store the tokens, use for subsequent API calls.

### 2.7 Failure responses

All failures: HTTP 401 with JSON `{ message: "<reason>", statusCode: 401 }`.

Common failure messages and what they mean for the mobile app:

| Server message | What happened | Mobile recovery |
|---|---|---|
| `"Integrity verification not supported for this platform"` | Sent `platform: 'web'` or `'dapp'` | Bug. Don't send non-mobile platforms. |
| `"iOS integrity verification requires challenge and keyId"` | iOS request missing fields | Bug. Always include both for iOS. |
| `"Device integrity verification failed"` | Generic integrity failure (Play Integrity or attestation specific error got caught and generalized) | Retry once with fresh nonce. If it persists, likely tampered build or bad device state. |
| `"Invalid or expired nonce"` / `"Invalid or expired iOS challenge nonce"` / `"Invalid or expired assertion challenge"` | Nonce not in Redis or 5min expired | Fetch fresh nonce, retry. |
| `"Nonce already used"` / `"Assertion challenge already used"` | Client sent the same nonce twice | Fetch fresh nonce. Suggests a bug in client caching. |
| `"Integrity token expired"` | Android Play Integrity token older than 5min | Means your token took too long between generation and send. Retry with fresh nonce + token. |
| `"Invalid package name in integrity token"` | Android token's `requestPackageName` ≠ `com.cypherd.androidwallet` | Build config mismatch — check applicationId in Gradle. |
| `"Attestation validation failed"` | iOS attestation failed one of Apple's 9 spec steps | See "iOS error handling" below. |
| `"Development AAGUID not accepted in this environment"` | Dev-signed iOS build tried to auth against staging/prod backend | Use a release-signed build for non-local environments. |
| `"No attestation record for this keyId — device must complete attestation first"` | iOS assertion where backend has no stored attestation for this `(address, keyId)` | **Clear stored keyId, fall back to attestation.** (DB wipe, stale keyId, or first assertion after Phase 3a rolled out.) |
| `"Assertion signature verification failed"` | iOS assertion signature didn't verify against stored public key | Shouldn't happen normally. Clear keyId + re-attest as recovery. |
| `"Assertion counter invalid (possible replay)"` | iOS assertion counter ≤ stored | Shouldn't happen normally. Clear keyId + re-attest. |
| `"Mock integrity token rejected in production"` (not the exact wording — any 401 when mock is used in prod) | Trying to use mock token against a prod backend | Don't do that in prod builds. |

**Blanket client policy that covers the recoverable cases:** on a 401 from an integrity-protected auth endpoint:
1. If this was an iOS assertion (`isAssertion: true`) → **clear stored keyId, re-run the flow which will now hit the attestation path.** Single retry.
2. If this was any other scenario and the error mentions nonce expiry or "already used" → **fetch fresh nonce, retry once.**
3. Otherwise → show the existing error modal. User can try again manually.

Do NOT retry on every 401 blindly — infinite retry risks hitting Apple's `attestKey` rate limit or locking the user in a loop.

---

## 3. iOS implementation

### 3.1 Xcode / project setup

**Capability:** enable `App Attest` in Xcode (Signing & Capabilities → + Capability → App Attest). This writes an `Info.plist` entry and adds the DeviceCheck framework to your app ID.

**Entitlement file:** verify that `ios/<AppName>.entitlements` includes:
```xml
<key>com.apple.developer.devicecheck.appattest-environment</key>
<string>production</string>
```
Use `development` for debug builds and `production` for release builds. The string controls which Apple AAGUID you get — Apple rejects `appattestdevelop` AAGUIDs on prod backends (see backend error table).

**Frameworks to link:** `DeviceCheck.framework`, `CommonCrypto` (for SHA-256 helper).

**Minimum iOS version:** 14.0. App Attest is not available on iOS 13 or earlier.

**Physical device required:** App Attest does not work properly in the iOS Simulator. Build + install on a real iPhone for any meaningful testing.

### 3.2 Native module: `RCTDeviceCheckBridge.h`

```objc
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

#endif
```

### 3.3 Native module: `RCTDeviceCheckBridge.m`

Two exported methods. **Do not combine them into one** — the branching logic belongs in JS, not native, so the intent at each call site is explicit.

```objc
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

#pragma mark - Attestation (one-time key registration per install)

/**
 * Creates a new App Attest key in Secure Enclave and attests it with Apple.
 * Call ONCE per install. Persist the returned keyId; use generateAssertion for
 * all subsequent auths.
 *
 * @param challenge Server-issued nonce (will be SHA256-hashed as clientDataHash)
 *
 * Resolves with:
 *   { keyId: NSString, attestation: NSString (base64) }
 *
 * Rejects with:
 *   "UNSUPPORTED"       device doesn't support App Attest
 *   "VERSION"           iOS < 14
 *   "KEY_GEN_FAILED"    generateKey returned an error
 *   "ATTEST_FAILED"     attestKey returned an error (includes rate-limit errors)
 *   "ATTEST_NIL"        attestation object was nil (should not happen)
 */
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

#pragma mark - Assertion (per-auth signature)

/**
 * Secure Enclave signs clientData with the previously attested key.
 * Fast, local, no Apple round-trip. Counter increments inside Enclave.
 *
 * @param keyId      Previously attested keyId (from AsyncStorage, originally from attestDevice)
 * @param clientData Data to sign (the server-issued challenge, usually)
 *
 * Resolves with:
 *   { assertion: NSString (base64) }
 *
 * Rejects with:
 *   "UNSUPPORTED"       device doesn't support App Attest
 *   "VERSION"           iOS < 14
 *   "INVALID_KEY"       Apple invalidated the key (device reset, OS quirk).
 *                       CALLER MUST clear stored keyId and re-attest.
 *   "ASSERT_FAILED"     generateAssertion returned a different error
 *   "ASSERT_NIL"        assertion object was nil (should not happen)
 */
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
```

### 3.4 iOS — the attestation / assertion CBOR blobs

You don't need to parse or construct CBOR in JS. Treat the blob Apple returns as an opaque base64 string and pass it to the backend. The backend decodes it.

For reference only (the backend handles this):
- **Attestation blob** wraps `{ fmt: "apple-appattest", authData, attStmt: { x5c: [leaf, intermediate], receipt } }` where `x5c` is the Apple cert chain.
- **Assertion blob** wraps `{ signature, authenticatorData }` where `authenticatorData` is 37 bytes (rpIdHash + flags + counter) and `signature` is DER-encoded ECDSA P-256 SHA-256.

### 3.5 iOS error handling decision tree

From the JS layer, when calling `DeviceCheckBridge.generateAssertion(keyId, nonce)`:

```
try:
  result = DeviceCheckBridge.generateAssertion(keyId, nonce)
  → submit to backend
catch err:
  if err.code == "INVALID_KEY":
    clear AsyncStorage keyId
    fetch fresh nonce
    result = DeviceCheckBridge.attestDevice(nonce)
    store new keyId
    → submit to backend
  else if err.code in ("UNSUPPORTED", "VERSION"):
    → show user: "This device does not support integrity verification"
    → fail auth, no retry
  else (ASSERT_FAILED, network, other):
    → show user: "Integrity check failed, please try again"
    → single retry allowed
```

Separately, on a 401 from the backend when `isAssertion: true` was sent, apply the same "clear keyId + re-attest once" recovery — this covers the backend-DB-wiped scenario.

---

## 4. Android implementation

### 4.1 Gradle setup

`android/app/build.gradle`:

```gradle
dependencies {
    implementation 'com.google.android.play:integrity:1.4.0'  // or latest
    // ... existing deps
}
```

**Play Console:** the app must be published (at least to internal testing) in Google Play Console, with the correct `applicationId` linked. Backend validates `requestPackageName` equals `com.cypherd.androidwallet` — so build with that applicationId.

**Google Cloud project:** Play Integrity needs the project linked in Play Console → Setup → App integrity. The backend holds the Google service account credentials that validate tokens. If you deploy to a new environment, coordinate with backend for the credentials rotation.

### 4.2 Native module: `IntegrityModule.java`

```java
package com.cypherd.androidwallet;

import android.util.Log;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.android.play.core.integrity.IntegrityManager;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.IntegrityTokenRequest;
import com.google.android.play.core.integrity.IntegrityTokenResponse;

public class IntegrityModule extends ReactContextBaseJavaModule {

    private final IntegrityManager integrityManager;

    public IntegrityModule(ReactApplicationContext context) {
        super(context);
        this.integrityManager = IntegrityManagerFactory.create(context);
    }

    @Override
    public String getName() {
        return "IntegrityModule";
    }

    /**
     * Produces a Play Integrity token bound to the given server-issued nonce.
     * Every successful login produces a new token.
     *
     * @param nonce server-issued nonce from /integrity-token-nonce
     * @param promise resolves with the token string (JWS), or rejects with an error
     */
    @ReactMethod
    public void getIntegrityToken(String nonce, Promise promise) {
        Log.d("IntegrityModule", "Requesting integrity token");

        IntegrityTokenRequest request = IntegrityTokenRequest.builder()
                .setNonce(nonce)
                .build();

        integrityManager
            .requestIntegrityToken(request)
            .addOnSuccessListener(response -> {
                String token = response.token();
                promise.resolve(token);
            })
            .addOnFailureListener(err -> {
                Log.e("IntegrityModule", "Play Integrity failed: " + err.getMessage());
                promise.reject("INTEGRITY_FAILED", err.getMessage(), err);
            });
    }
}
```

### 4.3 Native module: `IntegrityPackage.java`

```java
package com.cypherd.androidwallet;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class IntegrityPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext context) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new IntegrityModule(context));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext context) {
        return Collections.emptyList();
    }
}
```

Register in `MainApplication.java`:
```java
@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new IntegrityPackage());  // <-- add this line
    return packages;
}
```

### 4.4 Android notes

- **Don't log the nonce** (`Log.d("IntegrityModule", "Requesting integrity token with nonce: " + nonce)`). Backend considers raw nonces sensitive.
- Play Integrity has classic vs standard APIs. Use `IntegrityManager.requestIntegrityToken` (classic) for auth-time checks; `StandardIntegrityManager` is for frequent checks and requires a warmup call. Classic is what our backend expects.
- Timeout: default is ~30s. If the user's network is flaky, the request hangs. Consider wrapping the JS call in `Promise.race` with a timeout if you want faster UX failures.

---

## 5. JavaScript / TypeScript layer

### 5.1 The interface

```typescript
// src/models/integrity.interface.ts
import { DeviceType } from '../constants/enum';

export interface DeviceMetadata {
  brand?: string;
  manufacturer?: string;
  model?: string;
  deviceId?: string;
  systemVersion?: string;
  appVersion?: string;
  buildNumber?: string;
  bundleId?: string;
  platform?: 'ios' | 'android';
}

export interface IIntegrity {
  token: string;
  platform: DeviceType;
  challenge?: string;     // iOS
  keyId?: string;         // iOS
  isAssertion?: boolean;  // iOS
  clientData?: string;    // iOS
  deviceInfo?: DeviceMetadata;
}
```

### 5.2 AsyncStorage helpers for iOS `keyId`

```typescript
// src/core/asyncStorage.tsx (or wherever your AsyncStorage module lives)
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_ATTEST_KEY_ID = 'APP_ATTEST_KEY_ID';

/**
 * Persist the Secure Enclave keyId after a successful attestation.
 * Not a secret — it's a reference handle. Plain AsyncStorage is fine.
 */
export async function setAppAttestKeyId(keyId: string): Promise<void> {
  await AsyncStorage.setItem(APP_ATTEST_KEY_ID, keyId);
}

/** Returns the stored keyId, or null if the app has never attested. */
export async function getAppAttestKeyId(): Promise<string | null> {
  return AsyncStorage.getItem(APP_ATTEST_KEY_ID);
}

/** Called when Apple invalidates the key (INVALID_KEY) or backend returns a 401 during assertion. */
export async function clearAppAttestKeyId(): Promise<void> {
  await AsyncStorage.removeItem(APP_ATTEST_KEY_ID);
}
```

> **Why AsyncStorage and not Keychain?** The `keyId` is an opaque reference to a key that lives entirely inside the Secure Enclave and cannot be exported. Reading it off disk gives an attacker nothing useful. Keychain adds complexity (different iOS/Android paths, encryption-at-rest the OS already provides). AsyncStorage is the established pattern for this repo.

### 5.3 The unified integrity hook

```typescript
// src/hooks/useIntegrityService/index.ts
import { NativeModules, Platform } from 'react-native';
import useAxios from '../../core/HttpRequest';
import Config from 'react-native-config';
import { DeviceType } from '../../constants/enum';
import { getDeviceMetadata } from '../../core/util';
import {
  getAppAttestKeyId,
  setAppAttestKeyId,
  clearAppAttestKeyId,
} from '../../core/asyncStorage';
import { IIntegrity } from '../../models/integrity.interface';

const { IntegrityModule, DeviceCheckBridge } = NativeModules;

/**
 * Returns an integrity payload suitable for /verify-message/integrity or /refresh/integrity.
 *
 * iOS:
 *   - First install: attests (DCAppAttestService.generateKey + attestKey), stores keyId
 *   - Subsequent: assertion (DCAppAttestService.generateAssertion) using stored keyId
 *   - Auto-recovers from INVALID_KEY (clear keyId + re-attest once)
 * Android:
 *   - Always generates a fresh Play Integrity token
 *
 * Mock token bypass (non-production only):
 *   If Config.MOCK_INTEGRITY_TOKEN is set AND Config.ENVIROINMENT is staging/development,
 *   returns the mock token directly (skips native call). Matches backend gate of
 *   NODE_ENV != 'production'.
 */
export const useIntegrityService = () => {
  const { getWithoutAuth } = useAxios();

  const fetchNonce = async (): Promise<string> => {
    const r = await getWithoutAuth('/v1/authentication/integrity-token-nonce');
    if (r.isError) throw new Error('Failed to fetch integrity nonce');
    return r.data;
  };

  const attestIos = async (nonce: string): Promise<IIntegrity> => {
    if (!DeviceCheckBridge) throw new Error('DeviceCheckBridge not available');
    const { keyId, attestation } = await DeviceCheckBridge.attestDevice(nonce);
    await setAppAttestKeyId(keyId);
    return {
      token: attestation,
      keyId,
      challenge: nonce,
      platform: DeviceType.IOS,
      isAssertion: false,
      deviceInfo: await getDeviceMetadata(),
    };
  };

  const assertIos = async (keyId: string, nonce: string): Promise<IIntegrity> => {
    if (!DeviceCheckBridge) throw new Error('DeviceCheckBridge not available');
    try {
      const { assertion } = await DeviceCheckBridge.generateAssertion(keyId, nonce);
      return {
        token: assertion,
        keyId,
        challenge: nonce,
        clientData: nonce,
        platform: DeviceType.IOS,
        isAssertion: true,
        deviceInfo: await getDeviceMetadata(),
      };
    } catch (err: any) {
      if (err?.code === 'INVALID_KEY') {
        await clearAppAttestKeyId();
        throw new Error('ATTESTATION_KEY_INVALID');
      }
      throw err;
    }
  };

  const getIntegrityToken = async (): Promise<IIntegrity> => {
    // Mock token for staging/development — matches backend's NODE_ENV != 'production' gate
    if (
      Config.MOCK_INTEGRITY_TOKEN &&
      (Config.ENVIROINMENT === 'staging' || Config.ENVIROINMENT === 'development')
    ) {
      return {
        token: Config.MOCK_INTEGRITY_TOKEN,
        platform: Platform.OS === 'ios' ? DeviceType.IOS : DeviceType.ANDROID,
        deviceInfo: await getDeviceMetadata(),
      };
    }

    const nonce = await fetchNonce();

    if (Platform.OS === 'ios') {
      const storedKeyId = await getAppAttestKeyId();
      try {
        if (storedKeyId) return await assertIos(storedKeyId, nonce);
        return await attestIos(nonce);
      } catch (err: any) {
        // Invalid key → recover by re-attesting once with a FRESH nonce
        // (the previous nonce may have been consumed during the assertion attempt)
        if (err?.message === 'ATTESTATION_KEY_INVALID') {
          const freshNonce = await fetchNonce();
          return await attestIos(freshNonce);
        }
        throw err;
      }
    }

    // Android
    if (!IntegrityModule) throw new Error('IntegrityModule not available');
    const token = await IntegrityModule.getIntegrityToken(nonce);
    return {
      token,
      platform: DeviceType.ANDROID,
      deviceInfo: await getDeviceMetadata(),
    };
  };

  /**
   * Call after a 401 from the integrity endpoint when isAssertion was true.
   * Clears the stored keyId so the next getIntegrityToken() call attests fresh.
   */
  const handleBackendIntegrityRejection = async (): Promise<void> => {
    await clearAppAttestKeyId();
  };

  return { getIntegrityToken, handleBackendIntegrityRejection };
};
```

### 5.4 How to call it from an auth flow

```typescript
// Example: wallet sign-in flow
const { getIntegrityToken, handleBackendIntegrityRejection } = useIntegrityService();
const { postWithoutAuth } = useAxios();

async function signIn(address: string, signature: string) {
  let integrity = await getIntegrityToken();

  let response = await postWithoutAuth(
    `/v1/authentication/verify-message/integrity/${address}`,
    { signature, integrity },
  );

  // Handle the backend-side "no attestation record" case (Phase 3a edge case)
  if (
    response.isError &&
    response.status === 401 &&
    integrity.isAssertion === true
  ) {
    // Clear the stale keyId, regenerate integrity (will attest fresh), retry once
    await handleBackendIntegrityRejection();
    integrity = await getIntegrityToken();
    response = await postWithoutAuth(
      `/v1/authentication/verify-message/integrity/${address}`,
      { signature, integrity },
    );
  }

  if (response.isError) {
    throw new Error('Auth failed: ' + response.error);
  }

  return response.data; // SessionDto
}
```

### 5.5 JWT refresh flow

```typescript
async function refreshSession() {
  const integrity = await getIntegrityToken();
  const response = await postWithAuth('/v1/authentication/refresh/integrity', integrity);
  //   Note: body is integrity DIRECTLY, not wrapped in { signature, integrity }
  if (response.isError) {
    if (response.status === 401 && integrity.isAssertion === true) {
      await handleBackendIntegrityRejection();
      const fresh = await getIntegrityToken();
      return postWithAuth('/v1/authentication/refresh/integrity', fresh);
    }
    throw new Error('Refresh failed');
  }
  return response.data; // SessionDto
}
```

---

## 6. When to call integrity

Call `getIntegrityToken()` at these points:
- First authentication after a fresh install / wallet creation / wallet import
- JWT refresh (before the access token expires, or on 401 from a protected endpoint)
- Explicit re-authentication after sign-out
- Wallet-delete-and-reonboard

**Do NOT** call it on every API request. The JWT is the proof-of-integrity for subsequent requests — that's what it's for.

---

## 7. Error handling summary

### At the native layer

| Native error code | Meaning | JS recovery |
|---|---|---|
| `UNSUPPORTED` | Device lacks App Attest / Play Integrity hardware | Fail auth, surface to user — can't recover |
| `VERSION` | iOS < 14 | Fail auth, surface — can't recover |
| `KEY_GEN_FAILED` | Secure Enclave `generateKey` error | Retry once with backoff |
| `ATTEST_FAILED` | Apple `attestKey` error (includes rate-limit) | Retry once after a short delay; if persistent, surface |
| `INVALID_KEY` | Key invalidated (iOS specific, from `generateAssertion`) | **Clear keyId → re-attest** |
| `ASSERT_FAILED` | `generateAssertion` misc error | Retry once; if persistent, fall back to re-attest |
| `INTEGRITY_FAILED` | Android Play Integrity error | Retry once; surface if persistent |

### At the HTTP layer (backend returned 401)

| Scenario | Recovery |
|---|---|
| Backend 401 on integrity endpoint, `isAssertion: true` was sent | Clear stored keyId, regenerate integrity (attest flow), retry **once** |
| Backend 401 mentioning nonce (expired / used) | Fetch fresh nonce, retry **once** |
| Backend 401, `isAssertion: false`, other reason | Don't retry blindly — surface to user |
| Any error 3+ times in a row | Show error modal, offer support link, do not loop |

### Don't

- Don't retry on every 401 blindly — risks infinite re-attestation and Apple rate limits
- Don't cache nonces client-side — always fetch fresh
- Don't try to be clever about when assertions can skip the counter-strictly-increasing rule — they can't; that's the replay-protection invariant
- Don't log raw `attestation` / `assertion` blobs in production — they're large and not secrets, but they're noisy

---

## 8. Configuration / environment

### Environment variables consumed by the integrity code

| Var | Platform | Purpose |
|---|---|---|
| `Config.MOCK_INTEGRITY_TOKEN` | both | If set AND env is staging/development, bypass real integrity with this value |
| `Config.ENVIROINMENT` | both | `production` / `staging` / `development`. Gates mock token. (Yes, the spelling is "ENVIROINMENT" — historical) |

### Backend environment requirements (for a new deployment environment)

Coordinate with backend before pointing the mobile app at a new environment:
- `/mobile/integrity` Parameter Store entry set with `googleIntegrityCredentials` (Android) and `appleAppId` (iOS, format `TEAMID.com.cypherd.ioswalletv1`)
- Redis reachable from the backend (for nonce storage)
- DynamoDB Device table exists and backend has write permissions for new `APP_ATTEST:{keyId}` SK pattern

If `appleAppId` is wrong in Parameter Store, every iOS attestation will fail at the rpIdHash check. Verify this value before first deploy.

---

## 9. Testing

### Real devices required

- **iOS:** Simulator's App Attest support is incomplete. Must test on a real iPhone. Both debug-signed and release-signed builds, both environments (`development` and `production` AAGUID entitlement values).
- **Android:** Emulator works for Play Integrity if Play Services are installed, but real devices are more trustworthy. Test both rooted (should fail) and clean devices.

### Test matrix

| Platform | Scenario | Expected |
|---|---|---|
| iOS | Fresh install → first sign-in | `attestDevice` called, keyId stored, backend returns JWT |
| iOS | Sign out → sign in (same install) | `generateAssertion` called with stored keyId, backend returns JWT |
| iOS | Kill and relaunch → sign in | keyId persisted across restarts, assertion works |
| iOS | Clear app data → sign in | No stored keyId, falls back to attestation |
| iOS | Simulated `INVALID_KEY` (stub native) | keyId cleared, re-attestation succeeds in single retry |
| iOS | Backend returns 401 on assertion (simulate backend DB wipe) | keyId cleared, re-attestation + retry succeeds |
| iOS | Airplane mode during attest | Surfaces to user, no keyId cached |
| iOS | Rapid re-attestation (clear data + sign in 10 times) | Watch for `attestKeyExceeded` from Apple; if seen, confirms we're accidentally re-attesting |
| iOS | Development-entitlement build against prod backend | 401 "Development AAGUID not accepted in this environment" |
| Android | Fresh install → sign in | Play Integrity token produced, backend verifies |
| Android | Rooted device | 401 "Device integrity verification failed" |
| Both | Stale nonce (wait 6 min before using) | 401 "Invalid or expired nonce", single retry with fresh nonce succeeds |
| Both | Mock token in staging | 200 (succeeds) |
| Both | Mock token in production | 401 |

### Network inspection

Use Charles / mitmproxy / Proxyman. Verify request shapes:

**First iOS auth:**
```json
POST /v1/authentication/verify-message/integrity/0xabc...
{
  "signature": "0x...",
  "integrity": {
    "token": "<base64 attestation>",
    "keyId": "<base64 keyId>",
    "challenge": "<nonce>",
    "platform": "iOS",
    "isAssertion": false,
    "deviceInfo": { ... }
  }
}
```

**Subsequent iOS auth:**
```json
POST /v1/authentication/verify-message/integrity/0xabc...
{
  "signature": "0x...",
  "integrity": {
    "token": "<base64 assertion>",
    "keyId": "<base64 keyId>",
    "challenge": "<nonce>",
    "clientData": "<nonce>",
    "platform": "iOS",
    "isAssertion": true,
    "deviceInfo": { ... }
  }
}
```

**Android auth:**
```json
POST /v1/authentication/verify-message/integrity/0xabc...
{
  "signature": "0x...",
  "integrity": {
    "token": "<Play Integrity JWS>",
    "platform": "android",
    "deviceInfo": { ... }
  }
}
```

### Backend log signals during testing

When running against a dev/staging backend, watch the backend logs (or ask backend team to share them) for these messages:

| Log | Meaning |
|---|---|
| `"iOS App Attest registered"` | Successful attestation, record stored |
| `"iOS App Attest assertion verified"` | Successful assertion, counter advanced |
| `"Attestation validation failed"` | iOS spec-step failure — details in `error` field |
| `"Play Integrity verification failed"` | Android failure |
| `"Device integrity verification failed"` | Generic outer failure (wraps any of the above) |
| `"Development AAGUID rejected in non-local environment"` | You're sending a dev-signed iOS build against staging/prod |

### DynamoDB verification

After a successful iOS attestation, confirm the record landed:

```bash
aws dynamodb query \
  --table-name arch-development \
  --key-condition-expression 'pk = :pk AND begins_with(sk, :sk)' \
  --expression-attribute-values '{":pk":{"S":"ADDRESS:0xYourTestWallet"},":sk":{"S":"APP_ATTEST:"}}'
```

Expected: one row per keyId, containing `publicKey`, `signCount` (0 after attestation, > 0 after assertions), `environment`, `receipt`, `createdAt`.

---

## 10. Reference

### Apple App Attest
- [Validating apps that connect to your server](https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server) — contains both 9-step attestation and 6-step assertion verification specs (reference for the backend side, helpful context for you)
- [DCAppAttestService](https://developer.apple.com/documentation/devicecheck/dcappattestservice) — native API
- [DCError.invalidKey](https://developer.apple.com/documentation/devicecheck/dcerror/code/invalidkey) — the error code our `INVALID_KEY` maps to

### Google Play Integrity
- [Play Integrity API overview](https://developer.android.com/google/play/integrity)
- [Integrity verdicts](https://developer.android.com/google/play/integrity/verdicts) — what backend checks
- [Classic requests](https://developer.android.com/google/play/integrity/classic) — the API we use

### Backend reference code (if you want to trace what your payload does on the server)
Repo: `cyd-arch`, branch `CYQ-1129` (or wherever this is merged by the time you read it):
- `src/shared/services/authentication/auth.service.ts`
  - `verifyIntegrityToken` (outer routing)
  - `verifyPlayIntegrityToken` (Android)
  - `verifyDeviceCheckToken` (iOS attestation, 9-step spec)
  - `verifyAppAttestAssertion` (iOS assertion, 6-step spec)
- `src/shared/services/authentication/dto/verifySignedMessageIntegrity.dto.ts` — the DTO
- `src/shared/types/app-attest.interface.ts` — the stored record type
- `src/shared/services/db/device-model.service.ts` — `@DynamoKeyPatterns` block at the top documents all SK patterns

### Internal docs
- `docs/integrity-implementation-master.md` — master plan, threat model, quick-status table
- `docs/integrity-check-guide.md` — story-style explainer
- `docs/integrity-tasks/phase-*` — per-phase task specs

---

## 11. Acceptance criteria

Treat these as a final checklist before considering the mobile-side integrity implementation complete.

- [ ] iOS native bridge exposes two methods: `attestDevice(challenge)` and `generateAssertion(keyId, clientData)`. No combined/branching method.
- [ ] `DCErrorInvalidKey` mapped to `INVALID_KEY` error code in native reject.
- [ ] AsyncStorage helpers: `setAppAttestKeyId`, `getAppAttestKeyId`, `clearAppAttestKeyId`.
- [ ] `useIntegrityService` hook:
  - [ ] Returns `{ getIntegrityToken, handleBackendIntegrityRejection }`
  - [ ] iOS branches on stored keyId (attest vs assert)
  - [ ] Auto-recovers from `INVALID_KEY` (single retry)
  - [ ] Handles Android via Play Integrity
  - [ ] Mock token bypass gated to staging/development env
- [ ] Auth flow callers handle backend 401 on assertion via `handleBackendIntegrityRejection` + single retry.
- [ ] `IIntegrity` interface includes: `token`, `platform`, optional `challenge`, `keyId`, `isAssertion`, `clientData`, `deviceInfo`.
- [ ] Android `IntegrityModule` implemented with Play Integrity classic API.
- [ ] No raw nonces logged.
- [ ] No new npm dependencies added (all needed modules already in `package.json`).
- [ ] Xcode project has App Attest capability enabled, entitlement value matches build type.
- [ ] Android build.gradle has Play Integrity dependency.
- [ ] Tested on real iOS device (at least iOS 15 and iOS 17 or higher).
- [ ] Tested on real Android device.
- [ ] Network inspection confirms correct request shapes (attestation first-time, assertion subsequent, Android any time).
- [ ] Backend logs show expected `"iOS App Attest registered"` and `"iOS App Attest assertion verified"` events during testing.
- [ ] DynamoDB query confirms `APP_ATTEST:{keyId}` records land and `signCount` advances across assertions.
