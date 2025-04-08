# CypherD Wallet Attribution Tracking

This document describes the native attribution tracking implementation for CypherD Wallet on Android and iOS.

## Overview

The attribution tracking system allows CypherD Wallet to:

1. Capture attribution data when users install the app from marketing campaigns
2. Track UTM parameters and referral codes from store links
3. Log attribution data to Firebase Analytics
4. Navigate users to the appropriate screens (e.g., referral code screen) based on install attribution

## Android Implementation

The Android implementation uses the Google Play Install Referrer API to capture attribution data from Play Store links.

### Key Components

- **InstallReferrerModule.java**: Native module that interfaces with Google's Play Install Referrer API
- **InstallReferrerPackage.java**: Package to register the native module with React Native
- **useInstallReferrer**: React hook to consume and process attribution data

### How It Works

1. When the app is first launched, it retrieves the install referrer information from Google Play
2. The referrer data includes UTM parameters (`utm_source`, `utm_medium`, etc.) and custom parameters (`ref`, `influencer`, etc.)
3. The data is parsed and sent to Firebase Analytics
4. If a referral code (`ref` parameter) is present, the user is navigated to the referral code screen

### Supported URL Parameters

```
https://play.google.com/store/apps/details?id=com.cypherd.androidwallet&utm_source=twitter&utm_medium=social&utm_campaign=summer2024&utm_content=crypto_card&utm_term=defi_wallet&ref=influencer123&influencer=crypto_joe&channel=twitter_spaces
```

## iOS Implementation

The iOS implementation uses Apple's AdServices framework for attribution tracking.

### Key Components

- **AttributionModule.m**: Native module that interfaces with Apple's AdServices framework
- **useInstallReferrer**: Same React hook handles both Android and iOS attribution data

### How It Works

1. When the app is first launched, it retrieves an attribution token using the AdServices framework
2. This token is an encrypted package containing attribution information
3. **Important Note**: The attribution token must be sent to a server for resolution with Apple's API
4. The app marks the token as requiring server-side resolution
5. Server-side resolution is required to get campaign information and map it to UTM parameters

### Server-Side Resolution Required

On iOS, attribution tokens must be sent to your backend server and resolved with Apple's API:

1. App obtains attribution token with `[AAAttribution attributionTokenWithError:]`
2. App sends token to your backend server
3. Server calls Apple's API: `https://api-adservices.apple.com/api/v1/attribution/tokens`
4. Server receives campaign information
5. Server maps campaign ID to your UTM parameters
6. Server communicates back to app (e.g., via push notification) for any required UI updates

### Attribution Token Limitations

The attribution token from AdServices:

- Cannot be decrypted or read directly in the app
- Doesn't directly provide UTM parameters
- Requires server-side resolution to get meaningful attribution data

## React Native Integration

The attribution data is integrated into the app flow using:

1. **useInstallReferrer Hook**: Handles fetching attribution data for both platforms
2. **TabStack**: Uses the `ref` parameter to navigate to the referral screen (Android only)
3. **InitializeAppProvider**: Initializes attribution tracking and logs data to Firebase Analytics

## Platform Differences

There are important differences in how attribution works between platforms:

### Android

- Direct access to all UTM parameters and custom parameters
- Can trigger UI changes immediately based on parameters
- Complete attribution data available in the app

### iOS

- Only provides an attribution token that must be resolved server-side
- Cannot access UTM parameters or custom parameters directly
- Server-to-app communication required for any attribution-based UI changes

## Testing Attribution

### Android Test Links

Test install attribution by creating links with the following format:

```
https://play.google.com/store/apps/details?id=com.cypherd.androidwallet&utm_source=test&utm_campaign=test_campaign&ref=TEST123
```

### iOS Test Links and Server-Side Resolution

For iOS, use App Store links and implement server-side resolution:

```
https://apps.apple.com/us/app/cypherd-wallet/id1604120414?utm_source=test&utm_campaign=test_campaign&ref=TEST123
```

To test the full flow, you'll need:

1. A backend endpoint to receive attribution tokens
2. Integration with Apple's attribution API
3. A way to communicate results back to the app

## Debugging Attribution

- Android: Check logcat for "InstallReferrerModule" tags
- iOS: Check console logs for "AttributionModule" entries
- React Native: The app logs attribution data to the console when received

## Notes

- Attribution data is only available during the first 90 days after installation on Android
- The app should only query for attribution data once after installation
- The attribution data is stored in AsyncStorage to avoid duplicate processing
- For iOS, implement server-side attribution token resolution to get complete attribution data
