/* eslint-disable no-prototype-builtins */
/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { CardProfile } from '../../models/cardProfile.model';
import { CardApplicationStatus, CardTypes } from '../../constants/enum';
import Loading from '../../components/v2/loading';
import { useIsFocused } from '@react-navigation/native';
import { screenTitle } from '../../constants';
export interface RouteProps {
  navigation: {
    navigate: (screen: string) => void
  }
}

export default function DebitCardScreen (props: RouteProps) {
  const globalContext = useContext<any>(GlobalContext);
  const isFocused = useIsFocused();
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);

    if (cardProfile) {
      setLoading(false);
    }
    if (cardProfile && !cardProfile?.hasOwnProperty(CardTypes.APTO) && !cardProfile?.hasOwnProperty(CardTypes.SOLID)) {
      props.navigation.navigate(screenTitle.APTO_CARD_SCREEN);
    } else if (cardProfile?.apto && !cardProfile.hasOwnProperty(CardTypes.SOLID)) {
      props.navigation.navigate(screenTitle.APTO_CARD_SCREEN);
    } else if (cardProfile?.solid) {
      if (cardProfile.solid?.applicationStatus === CardApplicationStatus.VERIFICATION_PENDING || cardProfile.solid?.applicationStatus === CardApplicationStatus.VERIFICATION_COMPLETE) {
        props.navigation.navigate(screenTitle.CARD_SIGNUP_OTP_VERIFICATION_SCREEN);
      } else if (cardProfile.solid?.applicationStatus.includes('kyc') || cardProfile.solid?.applicationStatus === CardApplicationStatus.COMPLETION_PENDING) {
        props.navigation.navigate(screenTitle.CARD_KYC_STATUS_SCREEN);
      } else if (cardProfile.solid?.applicationStatus === CardApplicationStatus.COMPLETED) {
        props.navigation.navigate(screenTitle.SOLID_CARD_SCREEN);
      }
    }
  }, [isFocused, globalContext.globalState.cardProfile]);

  return (
    loading
      ? <Loading/>
      : <></>
  );
}
