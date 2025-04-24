import { useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsyncStorageKeys } from '../../constants/data';
import analytics from '@react-native-firebase/analytics';
import { intercomAnalyticsLog } from '../../containers/utilities/analyticsUtility';

// Define the attribution data interfaces for each platform
interface InstallReferrerData {
  // Common fields
  platform?: string;

  // Android fields
  install_referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  referral?: string;
  install_version?: string;
  referrer_click_timestamp_seconds?: number;
  install_begin_timestamp_seconds?: number;
  google_play_instant?: boolean;
  channel?: string;
  influencer?: string;

  // iOS fields
  attribution_token?: string;
  requires_server_resolution?: boolean;
  attribution_error?: string;
  os_version?: string;
  campaign_name?: string;
}

/**
 * Hook to fetch install referrer data
 *
 * Android provides direct attribution data including UTM parameters,
 * while iOS provides an attribution token that requires server-side resolution.
 */
export const useInstallReferrer = () => {
  const [referrerData, setReferrerData] = useState<InstallReferrerData | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const { InstallReferrerModule, AdAttributionModule } = NativeModules;

  const fetchReferrerData = async () => {
    try {
      console.log('in fetchReferrerData');
      console.log('AttributionModule:', AdAttributionModule);
      // Check if we've already fetched and stored the referrer data
      const storedData = await AsyncStorage.getItem(
        AsyncStorageKeys.PROCESSED_REFERRER_CODE,
      );

      if (storedData) {
        // If we've already processed the referrer data, use the stored data
        const parsedData = JSON.parse(storedData);
        setReferrerData(parsedData);
        // Log campaign name and token if available
        if (parsedData.campaign_name) {
          console.log('Campaign Name:', parsedData.campaign_name);
        }
        if (parsedData.attribution_token) {
          console.log('Attribution Token:', parsedData.attribution_token);
        }
        setLoading(false);
        return;
      }

      // Platform-specific attribution data collection
      let attributionData: InstallReferrerData | null = null;

      if (Platform.OS === 'android' && InstallReferrerModule) {
        // For Android, get the install referrer details including UTM parameters
        attributionData =
          await InstallReferrerModule.getInstallReferrerDetails();
        console.log('Android attribution data:', attributionData);
      } else if (Platform.OS === 'ios' && AdAttributionModule) {
        console.log('Fetching iOS attribution data...');
        // For iOS, get the attribution token that requires server-side resolution
        attributionData =
          await AdAttributionModule.getAttributionReferralCode();
        console.log(
          'iOS attribution token received:',
          attributionData?.attribution_token
            ? 'Yes (requires server resolution)'
            : 'No',
        );

        // Log campaign name and token if available
        if (attributionData?.campaign_name) {
          console.log('Campaign Name:', attributionData.campaign_name);
        }
        if (attributionData?.attribution_token) {
          console.log('Attribution Token:', attributionData.attribution_token);
        }
      }

      if (attributionData) {
        // Store the attribution data in AsyncStorage
        await AsyncStorage.setItem(
          AsyncStorageKeys.PROCESSED_REFERRER_CODE,
          JSON.stringify(attributionData),
        );

        // Update state with the attribution data
        setReferrerData(attributionData);
      }
    } catch (err) {
      console.error('Error fetching install referrer:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReferrerData();
  }, []);

  return { referrerData, loading, error };
};
