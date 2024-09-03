import * as Sentry from '@sentry/react-native';
import axios from '../../core/Http';
import { hostWorker } from '../../global';
import { get, has } from 'lodash';
import { CardProviders } from '../../constants/enum';
import { CardProfile } from '../../models/cardProfile.model';
import { GlobalContext } from '../../core/globalContext';
import { useContext } from 'react';
import useAxios from '../../core/HttpRequest';
import { getDeveloperMode, getIsRcEnabled } from '../../core/asyncStorage';

export default function useCardUtilities() {
  const { getWithoutAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider ?? CardProviders.REAP_CARD;

  const getProvider = async (profile: CardProfile) => {
    if (hasBothProviders(profile)) {
      return provider ?? CardProviders.REAP_CARD;
    } else if (has(profile, CardProviders.PAYCADDY)) {
      const isRcEnabled = await checkIsRCEnabled();
      if (
        !get(profile, [CardProviders.PAYCADDY, 'cards']) &&
        (isRcEnabled ||
          get(profile, [CardProviders.PAYCADDY, 'isRcUpgradable']))
      ) {
        return CardProviders.REAP_CARD;
      }
      return CardProviders.PAYCADDY;
    }
    return CardProviders.REAP_CARD;
  };

  // returns true if only pc object is there because we need to display apply card for rc
  const hasBothProviders = (profile: CardProfile) => {
    return (
      has(profile, CardProviders.PAYCADDY) &&
      has(profile, CardProviders.REAP_CARD)
    );
  };

  const cardProfileModal = async (profile: CardProfile) => {
    profile.provider = await getProvider(profile);
    return profile;
  };

  const getWalletProfile = async (token: string) => {
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
    const profileUrl = `${ARCH_HOST}/v1/authentication/profile`;
    const config = {
      headers: { Authorization: `Bearer ${String(token)}` },
    };
    try {
      const response = await axios.get(profileUrl, config);
      if (response.data) {
        const { data } = response;
        const tempProfile = await cardProfileModal(data);
        return tempProfile;
      }
    } catch (e) {
      Sentry.captureException(e);
      return e;
    }
  };

  const getPlanData = async (token: string) => {
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
    const profileUrl = `${ARCH_HOST}/v1/cards/plan-data`;
    const config = {
      headers: { Authorization: `Bearer ${String(token)}` },
    };
    try {
      const response = await axios.get(profileUrl, config);
      if (response.data) {
        const { data } = response;
        const planDetails = data;
        return planDetails;
      }
    } catch (e) {
      Sentry.captureException(e);
      return e;
    }
  };

  const checkIsRCEnabled = async () => {
    const isDevMode = await getDeveloperMode();
    const isRcEnabledInAsync = await getIsRcEnabled();
    if (isDevMode && isRcEnabledInAsync !== null) {
      if (isRcEnabledInAsync === 'true') {
        return true;
      }
      return false;
    }
    const response = await getWithoutAuth('/version');
    if (!response.isError) {
      if (response.data.isRcEnabled) {
        return true;
      }
    }
    return false;
  };

  return {
    getProvider,
    hasBothProviders,
    cardProfileModal,
    getWalletProfile,
    checkIsRCEnabled,
    getPlanData,
  };
}
