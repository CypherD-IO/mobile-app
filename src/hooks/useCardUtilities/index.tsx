import * as Sentry from '@sentry/react-native';
import axios from '../../core/Http';
import { hostWorker } from '../../global';
import { has } from 'lodash';
import { CardProviders } from '../../constants/enum';
import { CardProfile } from '../../models/cardProfile.model';
import { GlobalContext } from '../../core/globalContext';
import { useContext } from 'react';
import useAxios from '../../core/HttpRequest';
import { getDeveloperMode, getIsRcEnabled } from '../../core/asyncStorage';

export default function useCardUtilities() {
  const { getWithoutAuth, getWithAuth } = useAxios();
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider;

  const getProvider = (profile: CardProfile) => {
    if (hasBothProviders(profile)) {
      return provider ?? CardProviders.REAP_CARD;
    } else if (has(profile, CardProviders.REAP_CARD)) {
      return CardProviders.REAP_CARD;
    } else if (has(profile, CardProviders.PAYCADDY)) {
      return CardProviders.PAYCADDY;
    }
  };

  // returns true if only pc object is there because we need to display apply card for rc
  const hasBothProviders = (profile: CardProfile) => {
    return (
      has(profile, CardProviders.PAYCADDY) &&
      !has(profile, [CardProviders.PAYCADDY, 'lastStatementLink']) &&
      has(profile, CardProviders.REAP_CARD)
    );
  };

  const isLegacyCardClosed = (profile: CardProfile) => {
    return (
      has(profile, CardProviders.PAYCADDY) &&
      has(profile, [CardProviders.PAYCADDY, 'lastStatementLink'])
    );
  };

  const cardProfileModal = async (profile: CardProfile) => {
    profile.provider = getProvider(profile);
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

  const getCardSpendStats = async () => {
    const { data, isError } = await getWithAuth('/v1/cards/spend-stats');
    if (isError) {
      return null;
    }
    return data;
  };

  return {
    getProvider,
    hasBothProviders,
    isLegacyCardClosed,
    cardProfileModal,
    getWalletProfile,
    checkIsRCEnabled,
    getPlanData,
    getCardSpendStats,
  };
}
