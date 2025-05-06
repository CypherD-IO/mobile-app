import { useEffect, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import useAxios from '../../core/HttpRequest';
import {
  getProcessedReferrerCode,
  setProcessedReferrerCode,
} from '../../core/asyncStorage';

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
  const { InstallReferrerModule } = NativeModules;
  const { getWithoutAuth } = useAxios();
  const [referrerData, setReferrerData] = useState<InstallReferrerData | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReferrerData = async () => {
    try {
      // Check if we've already fetched and stored the referrer data
      const storedData = await getProcessedReferrerCode();

      // Currently iOS does not support this feature
      if (Platform.OS === 'ios') {
        setLoading(false);
        return;
      }

      if (storedData) {
        // If we've already processed the referrer data, use the stored data
        const parsedData = JSON.parse(storedData);
        setReferrerData(parsedData);
        setLoading(false);
        return;
      }

      // Platform-specific attribution data collection
      let attributionData: InstallReferrerData | null = null;

      if (Platform.OS === 'android' && InstallReferrerModule) {
        // For Android, get the install referrer details including UTM parameters
        attributionData =
          await InstallReferrerModule.getInstallReferrerDetails();
      }

      if (attributionData) {
        if (attributionData.referral) {
          const attributionDataResponse = await getWithoutAuth(
            `/v1/cards/referral-v2/attribution/${attributionData.referral}`,
          );

          if (!attributionDataResponse.isError) {
            // Merge the data from the API response with existing attributionData
            attributionData = {
              ...attributionData,
              ...attributionDataResponse.data,
            };
          }
        }
        // Store the attribution data in AsyncStorage
        await setProcessedReferrerCode(JSON.stringify(attributionData));

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
