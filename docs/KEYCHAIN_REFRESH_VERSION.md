# Keychain Refresh Version

## Overview

`keychainRefreshVersion` is a migration mechanism for re-saving keychain items when the security configuration (ACL, access control, accessible settings) changes. It is stored in AsyncStorage and compared against `currentKeychainRefreshVersion` in `src/core/Keychain.tsx` on each app launch.

This is intentionally separate from `schemaVersion`, which handles wallet derivation logic changes (new chains, HD paths, address generation). `keychainRefreshVersion` only handles keychain security config changes — no wallet regeneration is involved.

## How It Works

1. On app startup, `migrateKeychainIfNeeded()` is called after `loadCyRootData()` in `useInitializer`.
2. It compares the stored `keychainRefreshVersion` (from AsyncStorage) with `currentKeychainRefreshVersion`.
3. If the stored version is behind, it runs each migration step sequentially (version 0 → 1, 1 → 2, etc.).
4. Each migration step can have its own platform guard (e.g., Android-only, iOS-only).
5. The version is persisted **only after all migrations succeed**. If any step fails, the version is not updated and the migration retries on next launch.

## When To Use

Bump `currentKeychainRefreshVersion` when you need to:

- Change the `accessControl` setting in `getPrivateACLOptions()` (e.g., switching between `USER_PRESENCE` and `BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE`)
- Change the `accessible` setting (e.g., switching from `WHEN_UNLOCKED` to `WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- Any other change that requires existing keychain items to be re-saved with updated security options

Do **NOT** use this for:

- Wallet derivation logic changes → use `schemaVersion` instead
- Adding new keychain keys → new keys are saved with current options automatically
- Application-layer encryption changes (e.g., PIN encryption) → handle separately

## How To Add A New Migration

1. Bump `currentKeychainRefreshVersion` in `src/core/Keychain.tsx`:
   ```typescript
   const currentKeychainRefreshVersion = 2; // was 1
   ```

2. Add a new version block inside `migrateKeychainIfNeeded()`:
   ```typescript
   if (storedVersion < 2) {
     // Platform guard if needed
     if (isIOS()) {
       // iOS-specific migration
     }
   }
   ```

3. The migration must follow the **4-phase pattern** to avoid data loss and biometric prompt conflicts:
   - **Phase 1 — Read all values** into memory using `getInternetCredentials` directly with NO `accessControl` option. This avoids triggering biometric prompts during reads.
   - **Phase 2 — Delete old entries** using `resetInternetCredentials`. This is necessary because overwriting via `setInternetCredentials` can corrupt entries if the biometric prompt is canceled mid-write.
   - **Phase 3 — Wait** (1.5s) for Android's BiometricPrompt system to settle. Prior biometric prompts (e.g., from the pin_auth check at startup) can cause new prompts to auto-cancel if they haven't fully cleaned up.
   - **Phase 4 — Re-save** each key with the correct ACL options via `setInternetCredentials`. If save fails, save WITHOUT ACL as a fallback to prevent data loss, then re-throw so the version is not persisted.

4. Do **NOT** persist the version inside your migration block. It is persisted once at the end of `migrateKeychainIfNeeded()` after all steps complete.

## Android Biometric Prompt Caveats

When writing migration code for Android, be aware of these `react-native-keychain` / Android Keystore behaviors:

- **`setInternetCredentials` with biometric ACL triggers a BiometricPrompt** during save — it needs biometric authentication to create the Keystore encryption key.
- **Overwriting an existing entry can corrupt it** if the BiometricPrompt is canceled mid-write. The old encryption key is destroyed but the new data isn't fully written. Always delete first, then save.
- **Rapid BiometricPrompt succession causes cancellations** — Android auto-cancels a new BiometricPrompt if the previous one hasn't fully settled. Add a delay between any biometric activity and the migration save.
- **`accessControl` at retrieval time on Android only configures prompt UI**, not ACL enforcement. The Keystore enforces authentication based on what was set at key creation (save) time.
- **`USER_PRESENCE` on Android does NOT trigger any auth prompt** — it's treated as "device is unlocked, that's sufficient." Use `BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE` for actual biometric/passcode gating.

## Version History

| Version | Date       | Platform | Description |
|---------|------------|----------|-------------|
| 1       | 2026-03-27 | Android  | Fix ACL from `USER_PRESENCE` to `BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE`. `USER_PRESENCE` on Android does not trigger a system auth prompt, leaving keychain items unprotected. |

## Key Design Decisions

- **Platform-agnostic version, platform-specific logic**: The version number advances on all platforms. Migration logic inside each version block uses platform guards. This prevents any platform from getting stuck on an old version.
- **Sequential migrations**: A device on version 0 updating to version 2 runs both migration 1 and migration 2 in order.
- **Fail-safe**: Version is only persisted after all migrations succeed. Partial failures retry on next launch.
- **Data-safe fallback**: If saving with ACL fails, data is saved without ACL to prevent loss. Migration retries on next launch.
- **Idempotent**: Re-saving a keychain item with the same ACL is a no-op in terms of security. Running a migration twice is safe.
