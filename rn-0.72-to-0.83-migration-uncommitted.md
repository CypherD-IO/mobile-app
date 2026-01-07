# RN 0.72 → 0.83 Migration — Uncommitted Changes Summary

This file summarizes **all currently uncommitted changes** in this repo related to upgrading React Native from **0.72.x → 0.83.0**. It includes:

- **What changed** (file-by-file)
- **Why it changed** (upgrade / compatibility reasons)
- **Issues we hit** during the migration
- **Hotfixes / workarounds applied so far**

> Scope note: Large lockfiles (`package-lock.json`, `ios/Podfile.lock`, `Gemfile.lock`) are summarized at a high level rather than line-by-line.

---

## High-level outcomes

- **React Native upgraded** to `0.83.0` and **React** to `19.2.0` (see `package.json`).
- **Android build system** updated to the RN 0.83 template: **AGP 8.x**, **Gradle 9**, Kotlin plugin modernization, and **New Architecture enabled**.
- **iOS AppDelegate** migrated to the modern RN template (`RCTAppDelegate`), **New Architecture enabled**, deployment target bumped, and project settings updated (incl. C++ standard).
- **Flipper removed** (RN 0.83 no longer supports it) and debugging flow moved to React Native DevTools.
- **Camera/QR scanning migrated** away from deprecated packages (`react-native-qrcode-scanner` / `react-native-camera`) to **`react-native-vision-camera`**.
- **Intercom made “best-effort”** (prevent app boot crashes): runtime wrapper + Metro alias to a shim + native initialization temporarily disabled + patch-package fix.
- Multiple “RN 0.83 strictness” fixes: **circular-dependency avoidance**, Metro resolver hardening, and Hermes/global polyfills.

---

## Uncommitted file list (by category)

### Tooling / dependencies
- `package.json`
- `package-lock.json` (large)
- `babel.config.js`
- `metro.config.js`
- `react-native.config.js`
- `shim.js`
- `.eslintignore` *(new)*

### Android native
- `android/build.gradle`
- `android/settings.gradle`
- `android/gradle.properties`
- `android/gradle/wrapper/gradle-wrapper.properties`
- `android/app/build.gradle`
- `android/app/src/main/java/com/cypherd/androidwallet/MainActivity.kt` *(new; replaces `.java`)*
- `android/app/src/main/java/com/cypherd/androidwallet/MainApplication.kt` *(new; replaces `.java`)*
- Removed:
  - `android/app/src/main/java/com/cypherd/androidwallet/MainActivity.java`
  - `android/app/src/main/java/com/cypherd/androidwallet/MainApplication.java`
  - `android/app/src/*/java/com/cypherd/androidwallet/ReactNativeFlipper.java` (debug + release)

### iOS native
- `ios/Podfile`
- `ios/Podfile.lock` (large)
- `ios/Cypherd/AppDelegate.h`
- `ios/Cypherd/AppDelegate.mm` *(migrated template; replaces `.m`)*
- `ios/Cypherd/Info.plist`
- `ios/Cypherd.xcodeproj/project.pbxproj`
- `ios/Dynamic.swift`
- Removed:
  - `ios/Cypherd/AppDelegate.m`

### Ruby / CocoaPods tooling
- `Gemfile`
- `Gemfile.lock` (large)

### App code (TypeScript / JS)
- `index.js`
- `src/shims/intercom.ts` *(new)*
- `src/core/intercom.ts` *(new)*
- `src/constants/chainBackendNames.ts` *(new)*
- `src/types/barcode.ts` *(new)*

Changed app files:
- `src/components/initializeAppProvider/index.tsx`
- `src/components/v2/ActivityDetailsModal.tsx`
- `src/components/walletConnectListener/index.tsx`
- `src/constants/server.tsx`
- `src/containers/DebitCard/CardV2/index.tsx`
- `src/containers/DebitCard/CardV2/signup/application/countryTemporarilyUnsupported.tsx`
- `src/containers/DebitCard/bridgeCard/transactionDetails.tsx`
- `src/containers/OnBoarding/WalletConnectStatus.tsx`
- `src/containers/OnBoarding/trackWallet.tsx`
- `src/containers/Options/index.tsx`
- `src/containers/Portfolio/components/HeaderBar.tsx`
- `src/containers/Portfolio/index.tsx`
- `src/containers/Qrcode/QRScanner.tsx`
- `src/containers/SendTo/index.tsx`
- `src/containers/TokenOverview/overview.tsx`
- `src/containers/utilities/analyticsUtility.ts`
- `src/core/Keychain.tsx`
- `src/core/skipApi.ts`
- `src/core/util.tsx`
- `src/hooks/useGasService/index.tsx`
- `src/hooks/useInitializer/index.tsx`
- `src/hooks/useTransactionManager/index.tsx`
- `src/models/defi.interface.ts`
- `src/reducers/hdwallet_reducer.tsx`

### Patch-package hotfixes
- `patches/@intercom+intercom-react-native+9.4.0.patch` *(new)*
- `patches/react-native-css-interop+0.2.1.patch` *(new)*
- Removed:
  - `patches/react-native-camera+4.2.1.patch`

---

## File-by-file changes (what + why)

## Tooling & config

### `package.json`
- **Core upgrade**:
  - `react-native`: `^0.72.4` → `0.83.0`
  - `react`: `^18.2.0` → `19.2.0`
- **Removed deprecated camera stack**:
  - Removed `react-native-camera`
  - Removed `react-native-qrcode-scanner`
  - Removed `deprecated-react-native-prop-types` (was previously used to patch camera)
- **Added new QR scanner stack**:
  - Added `react-native-vision-camera`
- **Upgraded multiple RN ecosystem deps** to versions compatible with RN 0.83 (examples visible in diff):
  - `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-share`, `lottie-react-native`, etc.
- **Intercom upgraded**:
  - `@intercom/intercom-react-native`: `^6.8.1` → `^9.4.0` (still treated as best-effort due to compatibility risk)
- **Dev tooling updated**:
  - Added RN 0.83 toolchain packages: `@react-native/babel-preset`, `@react-native/metro-config`, `@react-native/typescript-config`, `@react-native-community/cli`
  - Node engine: `>=18` → `>=20`
  - Pin `typescript` to `5.0.4`
  - Added `zod` (new devDependency)
- **Scripts updated**:
  - `start` now runs Metro (`react-native start`) instead of launching both platforms.
  - Added `start:ios` / `start:ios:max` / `start:all` convenience scripts.
  - iOS scripts now specify `--terminal 'Terminal'` for consistent dev behavior.

### `package-lock.json`
- Large dependency graph update reflecting the RN 0.83 upgrade and associated dependency bumps.

### `babel.config.js`
- Migrated preset:
  - `module:metro-react-native-babel-preset` → `module:@react-native/babel-preset` (RN 0.83 default)
- Removed plugins that are now handled by the RN preset.
- Kept explicit transforms still needed by this repo (nativewind JSX transform, runtime helpers, etc.).

### `metro.config.js`
- Updated to RN 0.83 Metro config (`@react-native/metro-config`).
- **Hardened resolver** for RN 0.83 strictness:
  - Filters out `svg` from `assetExts` when treated as source.
  - Adds `resolverMainFields: ['react-native', 'browser', 'main', 'module']` to avoid Metro picking TS sources in some node_modules packages.
  - Adds `blockList` patterns to prevent resolving `.ts` source/test files inside `node_modules`.
- **Polyfill/compat module aliases**:
  - Keeps `extraNodeModules` mapping for node/core-ish deps used by crypto/web3 libraries.
- **Temporary Intercom kill-switch**:
  - Aliases `@intercom/intercom-react-native` → `src/shims/intercom.ts` to prevent early native module evaluation from crashing the app (see Issues/Hotfixes).

### `react-native.config.js`
- Adds `dependencies['lottie-ios']` with `ios: null`, `android: null` to **disable autolinking** for `lottie-ios`.
  - Rationale: `lottie-react-native` manages its own `lottie-ios` version; autolinking can cause version conflicts.

### `shim.js`
- Adds **Hermes/RN 0.83 global polyfills**:
  - `global.base64ToArrayBuffer`
  - `global.arrayBufferToBase64`
- The polyfills are defensive and return empty values instead of throwing to avoid startup-time crashes from module evaluation.

### `.eslintignore` *(new)*
- Ignores `src/proto-generated/**` from linting.

---

## Android changes (RN 0.83 template alignment)

### `android/build.gradle`
- Bumps build toolchain to match RN 0.83 expectations:
  - `buildToolsVersion`: `35.0.0` → `36.0.0`
  - `compileSdkVersion`: `34` → `36`
  - `targetSdkVersion`: `35` → `36`
  - `minSdkVersion`: `25` → `24` (per comment: RN 0.83 minimum)
  - `ndkVersion`: `23.x` → `27.1.12297006`
  - `kotlinVersion`: `1.8.22` → `2.1.20`
  - `com.android.tools.build:gradle`: `7.4.2` → `8.8.0`
- Notes that `react-native-gradle-plugin` is now applied via `settings.gradle` `pluginManagement` (RN 0.83 style).

### `android/gradle/wrapper/gradle-wrapper.properties`
- Gradle upgraded:
  - `gradle-7.6.3-all.zip` → `gradle-9.0.0-bin.zip`
- Adds `validateDistributionUrl=true`.

### `android/gradle.properties`
- Removes Flipper version pin (Flipper removed).
- Enables **New Architecture**:
  - `newArchEnabled=false` → `true`
- Adds template flags required by AGP 8.x:
  - `android.nonTransitiveRClass=true`
  - `android.nonFinalResIds=true`
- Adds `edgeToEdgeEnabled=false` (template flag kept off until explicit opt-in).

### `android/settings.gradle`
- Migrated to RN 0.83 `pluginManagement` and `com.facebook.react.settings` plugin.
- Uses:
  - `includeBuild("../node_modules/@react-native/gradle-plugin")`
  - `extensions.configure(ReactSettingsExtension) { autolinkLibrariesFromCommand() }`
- Removes manual `include` blocks for many native modules and removes legacy `native_modules.gradle` apply call (autolinking now handled via the new flow).

### `android/app/build.gradle`
- Migrated to Gradle `plugins {}` block and adds:
  - `org.jetbrains.kotlin.android` (needed after moving MainActivity/Application to Kotlin)
- Updates packaging config for AGP 8.x:
  - `packagingOptions { pickFirst ... }` → `packaging { jniLibs { pickFirsts += ... } }`
- Removes Flipper dependencies and adds comments explaining RN 0.83 removal.
- Leaves a note that `native_modules.gradle` is now handled via `settings.gradle` autolink.

### `android/app/src/main/java/.../MainActivity.kt` *(new)*
- Kotlin replacement for `MainActivity.java`.
- Keeps:
  - Splash screen show (`react-native-lottie-splash-screen`)
  - Edge-to-edge window handling (API 30+ vs legacy)
  - New Architecture delegate wiring (`fabricEnabled`)
- Calls `super.onCreate(null)` (matches modern RN template expectations).

### `android/app/src/main/java/.../MainApplication.kt` *(new)*
- Kotlin replacement for `MainApplication.java`.
- Uses RN 0.83 template host wiring:
  - `DefaultReactNativeHost`
  - `ReactHost` via `DefaultReactHost.getDefaultReactHost(...)`
  - `SoLoader.init(this, OpenSourceMergedSoMapping)`
- Keeps manual packages that cannot be autolinked:
  - `CustomPreventScreenshotPackage()`
  - `InstallReferrerPackage()`
- **Intercom init removed** here (see Issues/Hotfixes).

### Removed Android files
- Flipper glue removed: `ReactNativeFlipper.java` (debug + release)
- Legacy Java `MainActivity.java` / `MainApplication.java` removed in favor of Kotlin equivalents.

---

## iOS changes (RN 0.83 template alignment)

### `ios/Cypherd.xcodeproj/project.pbxproj`
- Updates file references: `AppDelegate.m` → `AppDelegate.mm`.
- Sets C++ standard:
  - `CLANG_CXX_LANGUAGE_STANDARD = c++17` → `c++20`
- Adjusts deployment target:
  - `IPHONEOS_DEPLOYMENT_TARGET = 15.0` → `15.1`
- Adds `USE_HERMES = true` in release config (per diff snippet).

### `ios/Cypherd/AppDelegate.h`
- Migrates to modern RN AppDelegate base:
  - from `RCTBridgeDelegate` + manual `UIWindow` property
  - to `RCTAppDelegate` and `UNUserNotificationCenterDelegate`

### `ios/Cypherd/AppDelegate.mm`
- Replaces the old `.m` template with the RN 0.83 style AppDelegate.
- Sets:
  - `self.moduleName = @"Cypherd"`
  - `self.dependencyProvider = [RCTAppDependencyProvider new]` (required for new template / New Architecture wiring)
  - `self.initialProps = @{}`
- Keeps and re-attaches:
  - Firebase initialization (`[FIRApp configure]`)
  - Lottie splash screen wiring via `Dynamic` Swift bridge
  - Push notification delegate methods
  - Deep link routing (`RCTLinkingManager`)
- **Intercom initialization commented out** (explicitly noted as temporary while stabilizing RN 0.83 + New Architecture).

### `ios/Cypherd/AppDelegate.m` *(removed)*
- Old AppDelegate implementation removed entirely (contained old Flipper init, manual root view setup, and Intercom init).

### `ios/Cypherd/Info.plist`
- Adds:
  - `RCTNewArchEnabled = true` (explicitly enables New Architecture on iOS)
- Adjusts `NSAppTransportSecurity` exception domain ordering.
- Moves `com.apple.developer.associated-domains` block (removed earlier in file, re-added at the bottom).
- Keeps `LSMinimumSystemVersion` as `12.0` (present but relocated).

### `ios/Dynamic.swift`
- Updates Lottie types:
  - `AnimationView` → `LottieAnimationView` in method signatures (`createAnimationView`, `play`)
  - This matches modern `lottie-ios` APIs (`4.x`).

### `ios/Podfile`
- Bumps platform:
  - `platform :ios, '15.0'` → `15.1`
- Uses RN 0.83 template helpers:
  - `prepare_react_native_project!`
  - `use_react_native!(..., :new_arch_enabled => true, :app_path => ...)`
  - `use_native_modules!` for autolinking
- Adds modular headers configuration for Firebase-related pods to keep Swift pods/builds working.
- `post_install` updates:
  - Uses the RN 0.83 form of `react_native_post_install(...)`
  - Adds `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` as a build unblocking workaround.
  - Disables `CODE_SIGNING_ALLOWED` for bundle targets (helps avoid CI/local signing failures).

### `ios/Podfile.lock`
- Large update resulting from the RN 0.83 pod graph + updated pod versions (Hermes/new arch, etc.).

---

## App code changes (stability + API migrations)

## App entry / boot flow

### `index.js`
- Adds a **failsafe splash hide**:
  - Schedules `SplashScreen.hide()` ~1.5s after JS bundle starts, with a Sentry-captured error on failure.
- Reason: prevent the app from being stuck behind a native splash if initialization/provider logic never reaches the previous hide path.

### `src/components/initializeAppProvider/index.tsx`
- **Stops importing Intercom at module top-level**.
- Adds robust splash hiding logic:
  - `hideSplashSafely()` helper (logs reason, captures failures to Sentry)
  - A hard timeout (`SPLASH_SCREEN_TIMEOUT`) *and* a `finally` hide on init completion.
  - Ensures `setWalletLoading(false)` happens even if API health check fails.
- Changes support action:
  - `Intercom.present()` → `intercomPresent()` (wrapper).
- Reason: RN 0.83 + TurboModules can throw during native module evaluation; also avoid permanent splash when `/health` is unreachable.

## Intercom safety strategy

### `src/core/intercom.ts` *(new)*
- Introduces an **Intercom wrapper** that:
  - Avoids top-level imports of `@intercom/intercom-react-native`
  - Lazy-loads via `require()` in a try/catch
  - Converts failures into **no-ops** and reports to Sentry / console (dev)
- Exported helpers used by app code:
  - `intercomPresent`
  - `intercomLogEvent`
  - `intercomLoginUserWithUserId`
  - `intercomUpdateUser`

### `src/shims/intercom.ts` *(new)*
- A **complete no-op shim** for `@intercom/intercom-react-native` with minimal compatible surface.
- Used via Metro alias (`metro.config.js`) to fully disable Intercom while isolating startup crashes.

### Intercom call site updates (multiple files)
Replaces direct Intercom imports/calls with wrapper calls:
- `src/components/v2/ActivityDetailsModal.tsx`
- `src/components/walletConnectListener/index.tsx`
- `src/containers/Options/index.tsx`
- `src/containers/TokenOverview/overview.tsx`
- `src/containers/DebitCard/...` (multiple)
- `src/containers/utilities/analyticsUtility.ts` (`Intercom.logEvent` → `intercomLogEvent`)
- `src/hooks/useInitializer/index.tsx`
- `src/containers/OnBoarding/WalletConnectStatus.tsx`
- `src/reducers/hdwallet_reducer.tsx`
- `src/core/Keychain.tsx` (support button route uses wrapper)

## QR scanning / Camera migration

### `src/types/barcode.ts` *(new)*
- Defines `BarCodeReadEvent` interface to keep the **legacy callback shape** without depending on `react-native-camera` types.

### `src/containers/Qrcode/QRScanner.tsx`
- Replaces `react-native-qrcode-scanner` with `react-native-vision-camera`:
  - Uses `useCameraDevice`, `useCodeScanner`, `Camera.requestCameraPermission()`
  - Adds permission handling with `Alert` and `Linking.openSettings()`
  - Adds scan throttling (`isScanned`) to prevent duplicate scans
  - Keeps overlay UI (scanner background image) via `CyDImageBackground`
  - Preserves legacy callback behavior by mapping scanned codes to `BarCodeReadEvent`
- Reason: old QR scanner stack depended on deprecated camera packages not compatible with RN 0.83.

### `src/containers/*` barcode type import updates
- `BarCodeReadEvent` imports moved from `react-native-camera` → local `src/types/barcode`:
  - `src/containers/OnBoarding/trackWallet.tsx`
  - `src/containers/Portfolio/components/HeaderBar.tsx`
  - `src/containers/Portfolio/index.tsx`
  - `src/containers/SendTo/index.tsx`
  - `src/containers/Qrcode/QRScanner.tsx`

## Circular dependency & Metro strictness fixes

### `src/constants/chainBackendNames.ts` *(new)*
- Extracts `ChainBackendNames` enum out of `src/constants/server.tsx`.
- Rationale noted in-file: RN 0.83/Metro is stricter about module init order; cycles can yield `undefined` exports at runtime.

### `src/constants/server.tsx`
- Imports `ChainBackendNames` from the new file and **re-exports it** for backward compatibility.

### `src/models/defi.interface.ts`
- Changes import to avoid runtime cycles:
  - `import { ChainBackendNames } from '../constants/server'` → `import type { ChainBackendNames } from '../constants/chainBackendNames'`

### `src/reducers/hdwallet_reducer.tsx`
- Avoids circular dependency with `core/util.tsx`:
  - Moves `isAddressSet` logic inline (with comment explaining cycle: util imports context type from reducer).
  - Converts `Chain` import to `import type`.
- Uses Intercom wrapper for login to avoid hard failures.

### `src/core/util.tsx`
- Converts reducer context imports to type-only:
  - `import { ActivityContextDef ... }` → `import type { ... }`
- Reason: reduce runtime coupling / potential cycles under Metro.

## Injective SDK import path fixes

Multiple files update Injective SDK imports from internal `dist/cjs/exports` to the supported entry:
- `src/core/Keychain.tsx`
- `src/core/skipApi.ts`
- `src/hooks/useGasService/index.tsx`
- `src/hooks/useTransactionManager/index.tsx`

Reason: newer bundlers / package `exports` fields + RN 0.83 Metro can break deep imports; using the public `@injectivelabs/sdk-ts/exports` entry is more compatible.

---

## Patch-package hotfixes (current state)

### `patches/@intercom+intercom-react-native+9.4.0.patch`
- Changes iOS native module exported method signatures to use `resolver`/`rejecter` names:
  - `loginUnidentifiedUser(...)` uses `(resolve, reject)` instead of `(successCallback, failureCallback)`
  - `loginUserWithUserAttributes(...)` uses `(resolve, reject)` naming
  - `updateUser(...)` uses `rejecter` naming
- Rationale: align with React Native promise export conventions that RN 0.83 / TurboModules are stricter about. This is intended to prevent native module method signature mismatch crashes.

### `patches/react-native-css-interop+0.2.1.patch`
- Removes `react-native-worklets/plugin` usage in `react-native-css-interop/babel.js` (commented) because this repo is on Reanimated 3.x where worklets are built-in.
- Adds `react-native` and `browser` mappings to multiple `package.json` files inside `react-native-css-interop` to make Metro resolution happier (avoids missing node-core deps by redirecting to RN-friendly polyfills).
- Adds empty `.cache/*` files (android/ios/native/etc.) required by the library’s expected structure.

### Removed patch: `patches/react-native-camera+4.2.1.patch`
- This patch previously moved `ViewPropTypes` import to `deprecated-react-native-prop-types`.
- It’s now removed because `react-native-camera` is no longer part of the app after migrating to `react-native-vision-camera`.

---

## Issues encountered during the migration (from logs + code changes)

### Intercom causing early startup crashes (RN 0.83 + New Architecture)
- RN 0.83 + TurboModules can throw **during module evaluation** if a native module has incompatible method exports.
- Intercom was previously imported at top-level across multiple files and initialized in native code (Android + iOS).
- Net effect: **app could crash before UI renders**.

### App getting stuck on the splash screen
- Previous logic only hid the splash after a successful API health check (`/health`).
- If the API was unreachable or init hung, the splash could remain indefinitely (especially noticeable after RN upgrades).

### Metro 0.83 warnings about package `exports` fields
Observed warnings in Metro logs (examples):
- `rpc-websockets` export resolution mismatch
- `@noble/hashes/*` subpath not listed in exports
- `multiformats` subpath not listed in exports

Metro is falling back to file-based resolution. This is noisy and can become a hard error if packages tighten exports further.

### iOS build/compat friction around pods/framework modules
- Podfile includes a targeted workaround:
  - `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
- This suggests we hit or anticipated the common RN 0.83 + CocoaPods build error around non-modular includes.

### Debugging tooling changes (Flipper removal)
- RN 0.83 removes Flipper support; existing Flipper code had to be removed.

### Device connection timeouts during debug sessions
Metro logs show:
- `[timeout] connection terminated with Device ... after not responding for 60 seconds.`

This is consistent with the app hanging/crashing early during startup while the dev server is running.

---

## Hotfixes / workarounds applied so far

### Intercom “fail closed” strategy (temporary stabilization)
- **Metro alias**: `@intercom/intercom-react-native` → `src/shims/intercom.ts` (`metro.config.js`)
- **Native init disabled**:
  - iOS: `IntercomModule initialize...` commented out in `AppDelegate.mm`
  - Android: Intercom init removed from `MainApplication.kt`
- **JS wrapper**: `src/core/intercom.ts` lazy-loads Intercom and converts failures to no-ops + Sentry breadcrumbs.
- **patch-package**: `patches/@intercom+intercom-react-native+9.4.0.patch` adjusts iOS method exports to match RN expectations.

### Splash screen unblocking
- `index.js` early hide failsafe (~1.5s)
- `InitializeAppProvider` always hides splash (timeout + finally), even if API is down or init errors.

### Metro resolver hardening
- `resolverMainFields` tuned to avoid TS source resolution in `node_modules`.
- `blockList` added to prevent accidental TS/test imports from dependencies.

### QR scanning upgrade path
- Replace deprecated camera stack with `react-native-vision-camera`.
- Introduce local `BarCodeReadEvent` type to avoid dependency on removed camera libs.

### CSS interop build unblockers
- Patch `react-native-css-interop` to avoid an incompatible worklets plugin and add RN/browser mappings for node-ish modules.

---

## What’s still “temporary” / should be revisited

- **Intercom**:
  - Currently effectively disabled (Metro shim + native init commented out).
  - Next step is to remove the Metro alias and re-enable native init **only after** confirming the patched Intercom SDK is stable under RN 0.83 + New Architecture.
- **Metro export warnings**:
  - Packages currently work via fallback resolution, but we should consider upgrading/pinning deps or adjusting imports to reduce future break risk.

---

## Lockfile notes (high level)

### `Gemfile.lock`
- Updated as part of bumping Ruby/CocoaPods requirements for RN 0.83 (`cocoapods ~> 1.16.2`).

### `ios/Podfile.lock`
- Updated for RN 0.83 pods, Hermes/new architecture pods, updated iOS deployment target, and Firebase/modular header changes.

### `package-lock.json`
- Updated for RN 0.83 dependency graph changes (React 19, new RN packages, removal of camera stack, etc.).


