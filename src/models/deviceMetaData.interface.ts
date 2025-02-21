export interface DeviceMetadata {
  brand?: string; // e.g. "Apple" or "Google"
  manufacturer?: string; // e.g. "Apple" or "Samsung"
  model?: string; // e.g. "iPhone14,5" or "Pixel 6"
  deviceId?: string; // IDFV for iOS, Android ID for Android
  systemVersion?: string; // e.g. "16.0" or "13.0"
  appVersion?: string; // Your app version
  buildNumber?: string; // App build number
  bundleId?: string; // e.g. "com.cypherd.ioswalletv1"
  platform?: 'ios' | 'android'; // Add platform explicitly
}
