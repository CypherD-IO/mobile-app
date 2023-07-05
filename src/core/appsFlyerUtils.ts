import AsyncStorage from '@react-native-async-storage/async-storage';
import appsFlyer, { UnifiedDeepLinkData } from 'react-native-appsflyer';
import * as Sentry from '@sentry/react-native';
import { AppsFlyerConfiguration } from '../constants/appsFlyer';
import useAxios from './HttpRequest';

function processReferralInAppEvent (deepLinkData: any): void {
  const { getWithAuth, postWithAuth } = useAxios();
  if (deepLinkData.deep_link_sub2) {
    getWithAuth('/v1/referral/tabDetails')
      .then((response) => {
        if (!response.isError) {
          void postWithAuth(
            response.data.referralData?.referralTab?.submitPath,
            { claimCode: deepLinkData.deep_link_sub2 });
        }
      }).catch((error) => {
        Sentry.captureException(error);
      });
  };
}

export function appsFlyerDeepLinkCallback (deeplinkEvent: UnifiedDeepLinkData): void {
  if (deeplinkEvent.status === 'success' && deeplinkEvent.deepLinkStatus === 'FOUND') {
    void appsFlyer.logEvent(deeplinkEvent.data.deep_link_value, deeplinkEvent.data);
    switch (deeplinkEvent.data.deep_link_value) {
      case AppsFlyerConfiguration.userInviteChannel:
        processReferralInAppEvent(deeplinkEvent.data);
        break;
      default:
        Sentry.captureException('Unknown deep link activity');
    }
  }
}

export async function generateUserInviteLink (referralCode: string, address: string, callback: (result: string) => any): Promise<void> {
  // fetch from storage first so same link is used for a single user.
  try {
    const referralLink = await AsyncStorage.getItem(referralCode);
    if (referralLink) {
      callback(referralLink);
      return;
    }
  } catch (error) {
    // Ignore error if the referral link is not present in local storage and continue to generate one.
  }
  appsFlyer.generateInviteLink(
    {
      channel: AppsFlyerConfiguration.userInviteChannel,
      campaign: referralCode,
      deep_link_value: AppsFlyerConfiguration.userInviteChannel,
      deep_link_sub1: address,
      deep_link_sub2: referralCode,
      brandDomain: AppsFlyerConfiguration.brandedDomains[0]
    },
    (link: string) => {
      // Intentionally not waiting on saving link in storage.
      void AsyncStorage.setItem(referralCode, link);
      callback(link);
    },
    () => {
      // Ignoring failures for now
      Sentry.captureException('Failed to fetch/generate user invite link for referral.');
    }
  );
}
