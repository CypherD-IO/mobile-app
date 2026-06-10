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
