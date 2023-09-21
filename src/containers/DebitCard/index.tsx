/* eslint-disable no-prototype-builtins */
/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { CardProfile } from '../../models/cardProfile.model';
import { CardApplicationStatus, CardProviders } from '../../constants/enum';
import Loading from '../../components/v2/loading';
import { useIsFocused } from '@react-navigation/native';
import { screenTitle } from '../../constants';
import { HdWalletContext } from '../../core/util';
import {
  CyDImageBackground,
  CyDSafeAreaView,
  CyDText,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import { get, has } from 'lodash';
import CardWailtList from './cardWaitList';
export interface RouteProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export default function DebitCardScreen(props: RouteProps) {
  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;
  const isFocused = useIsFocused();
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();

  const handleBackButton = () => {
    props.navigation.navigate(screenTitle.PORTFOLIO_SCREEN);
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    if (!isReadOnlyWallet && isFocused) {
      setLoading(true);
      if (cardProfile) {
        setLoading(false);
      }
      if (
        has(cardProfile, CardProviders.BRIDGE_CARD) ||
        has(cardProfile, CardProviders.PAYCADDY)
      ) {
        const bcApplicationStatus =
          get(cardProfile, CardProviders.BRIDGE_CARD)?.applicationStatus ===
          CardApplicationStatus.COMPLETED;
        const pcApplicationStatus =
          get(cardProfile, CardProviders.PAYCADDY)?.applicationStatus ===
          CardApplicationStatus.COMPLETED;
        if (bcApplicationStatus || pcApplicationStatus) {
          props.navigation.navigate(screenTitle.BRIDGE_CARD_SCREEN, {
            hasBothProviders: bcApplicationStatus && pcApplicationStatus,
            cardProvider: bcApplicationStatus
              ? CardProviders.BRIDGE_CARD
              : CardProviders.PAYCADDY,
          });
        }
      }
    } else {
      setLoading(false);
    }
  }, [isFocused, globalContext.globalState.cardProfile]);

  if (loading) {
    return <Loading />;
  }

  return (
    <CyDView className='flex-1 bg-white'>
      {isReadOnlyWallet ? (
        <CyDImageBackground
          source={AppImages.READ_ONLY_CARD_BACKGROUND}
          className='h-full items-center justify-center'
        >
          <CyDText className='text-[20px] text-center font-bold mt-[30%]'>
            {t<string>('TRACK_WALLET_CYPHER_CARD')}
          </CyDText>
        </CyDImageBackground>
      ) : (
        <CardWailtList navigation={props.navigation} />
      )}
    </CyDView>
  );
}
