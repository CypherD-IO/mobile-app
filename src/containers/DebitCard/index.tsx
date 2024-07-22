/**
 * @format
 * @flow
 */
import React, { useContext, useEffect, useState } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { CardProfile } from '../../models/cardProfile.model';
import {
  CardApplicationStatus,
  CardProviders,
  GlobalContextType,
} from '../../constants/enum';
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
import useAxios from '../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import useCardUtilities from '../../hooks/useCardUtilities';
import CardProviderSwitch from '../../components/cardProviderSwitch';
export interface RouteProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    reset: (options: {
      index: number;
      routes: Array<{ name: string; params?: any }>;
    }) => void;
  };
}

export default function DebitCardScreen(props: RouteProps) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();

  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;
  const { getWalletProfile } = useCardUtilities();

  const [loading, setLoading] = useState<boolean>(true);
  const { getWithAuth } = useAxios();

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

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const provider = cardProfile?.provider;

  useEffect(() => {
    if (!isReadOnlyWallet && isFocused) {
      setLoading(true);
      if (cardProfile) {
        setLoading(false);
      } else {
        void refreshProfile();
      }
      if (has(cardProfile, provider as CardProviders)) {
        const cardApplicationStatus =
          get(cardProfile, provider as CardProviders)?.applicationStatus ===
          CardApplicationStatus.COMPLETED;
        if (cardApplicationStatus) {
          props.navigation.reset({
            index: 0,
            routes: [
              {
                name: screenTitle.BRIDGE_CARD_SCREEN,
                params: {
                  cardProvider: provider,
                },
              },
            ],
          });
        } else if (
          get(cardProfile, provider as CardProviders)?.applicationStatus ===
          CardApplicationStatus.CREATED
        ) {
          void checkApplication(provider as CardProviders);
        } else {
          props.navigation.reset({
            index: 0,
            routes: [
              {
                name: screenTitle.CARD_KYC_STATUS_SCREEN,
              },
            ],
          });
        }
      }
    } else {
      setLoading(false);
    }
  }, [isFocused, cardProfile, provider]);

  const checkApplication = async (provider: CardProviders) => {
    try {
      const response = await getWithAuth(`/v1/cards/${provider}/application`);
      if (!response.isError) {
        const { data } = response;
        if (!data.phoneVerified || !data.emailVerfied) {
          props.navigation.reset({
            index: 0,
            routes: [
              {
                name: screenTitle.CARD_SIGNUP_OTP_VERIFICATION_SCREEN,
              },
            ],
          });
        }
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-white'>
      <CardProviderSwitch />
      {isReadOnlyWallet ? (
        <CyDImageBackground
          source={AppImages.READ_ONLY_CARD_BACKGROUND}
          className='h-full items-center justify-center'>
          <CyDText className='text-[20px] text-center font-bold mt-[30%]'>
            {t<string>('TRACK_WALLET_CYPHER_CARD')}
          </CyDText>
        </CyDImageBackground>
      ) : (
        <CardWailtList navigation={props.navigation} />
      )}
    </CyDSafeAreaView>
  );
}
