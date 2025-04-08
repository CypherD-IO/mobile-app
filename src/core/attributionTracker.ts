import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';
import { intercomAnalyticsLog } from '../containers/utilities/analyticsUtility';

// Process attribution data from deep links or other sources
const processAttributionData = (params: any) => {
  if (!params) return;

  // Check if this is a first-time install or re-attribution
  const isFirstSession = params['+is_first_session'] || false;

  // Collect all relevant attribution data
  const attributionData = {
    // Install attribution
    is_first_session: isFirstSession,

    // UTM parameters
    utm_source: params?.utm_source || '',
    utm_medium: params?.utm_medium || '',
    utm_campaign: params?.utm_campaign || '',
    utm_content: params?.utm_content || '',
    utm_term: params?.utm_term || '',

    // Custom parameters
    influencer: params?.influencer || '',
    ref: params?.ref || '',

    // Device info
    platform: Platform.OS,
    os_version: Platform.Version,
  };

  console.log('Processed attribution data:', attributionData);

  // Log to Firebase
  logAttributionToFirebase(attributionData, isFirstSession);
};

// Send attribution data to Firebase
const logAttributionToFirebase = (
  attributionData: any,
  isFirstSession: boolean,
) => {
  // Set user properties for acquisition source
  if (attributionData.utm_source) {
    void analytics().setUserProperty(
      'acquisition_source',
      attributionData.utm_source,
    );
  }
  if (attributionData.utm_campaign) {
    void analytics().setUserProperty(
      'acquisition_campaign',
      attributionData.utm_campaign,
    );
  }
  if (attributionData.influencer) {
    void analytics().setUserProperty(
      'acquisition_influencer',
      attributionData.influencer,
    );
  }

  // Log install attribution event if this is a first session
  if (isFirstSession) {
    void analytics().logEvent('app_install_attribution', attributionData);
    console.log('Logged first session attribution to Firebase');
    void intercomAnalyticsLog('app_install_attribution', attributionData);
  } else {
    // Otherwise log as a re-engagement
    void analytics().logEvent('app_re_engagement', attributionData);
    console.log('Logged re-engagement attribution to Firebase');
    void intercomAnalyticsLog('app_re_engagement', attributionData);
  }
};

// For tracking conversion events (purchase, signup, etc.)
export const trackConversionEvent = async (
  eventName: string,
  eventData: any,
) => {
  try {
    // Log to Firebase
    void analytics().logEvent(eventName, eventData);
    console.log(`Logged ${eventName} event to Firebase`);
  } catch (error) {
    console.error(`Failed to log event ${eventName}:`, error);
  }
};
