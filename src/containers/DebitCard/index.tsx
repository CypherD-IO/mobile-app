/**
 * @format
 * @flow
 */
import React, { useCallback, useContext, useState } from 'react';
import { GlobalContext } from '../../core/globalContext';
import { CardProfile } from '../../models/cardProfile.model';
import {
  CardApplicationStatus,
  CardProviders,
  GlobalContextType,
  CardStatus,
} from '../../constants/enum';
import Loading from '../../components/v2/loading';
import { screenTitle } from '../../constants';
import { HdWalletContext } from '../../core/util';
import {
  CyDImageBackground,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import { get, has } from 'lodash';
import useAxios from '../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import useCardUtilities from '../../hooks/useCardUtilities';
import CardProviderSwitch from '../../components/cardProviderSwitch';
import CardWailtList from './cardWaitList';
import { getReferralCode } from '../../core/asyncStorage';
import { useFocusEffect } from '@react-navigation/native';
import countryMaster from '../../../assets/datasets/countryMaster';

export interface RouteProps {
  navigation: {
    navigate: (screen: string, params?: any, route?: any) => void;
    reset: (options: {
      index: number;
      routes: Array<{ name: string; params?: any }>;
    }) => void;
  };
}

export default function DebitCardScreen(props: RouteProps) {
  const { t } = useTranslation();

  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;
  const { getWalletProfile, isLegacyCardClosed } = useCardUtilities();

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
    if (data) {
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: data,
      });
      return data;
    } else {
      return null;
    }
  };

  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  let provider: CardProviders | undefined = cardProfile?.provider;

  const setCardProvider = () => {
    const hasPc =
      has(cardProfile, CardProviders.PAYCADDY) &&
      !isLegacyCardClosed(cardProfile);
    const hasRc = has(cardProfile, CardProviders.REAP_CARD);

    if (!hasPc && !hasRc) {
      provider = CardProviders.REAP_CARD;
    } else if (hasRc && !hasPc) {
      provider = CardProviders.REAP_CARD;
    } else if (hasPc && !hasRc) {
      provider = CardProviders.PAYCADDY;
    }
  };
  setCardProvider();

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let isLoading = false;

      const checkCardApplicationStatus = async () => {
        if (isLoading || !isMounted) return;

        if (!isReadOnlyWallet) {
          try {
            isLoading = true;
            setLoading(true);

            let currentCardProfile = cardProfile;

            if (!currentCardProfile) {
              currentCardProfile = await refreshProfile();
            }

            if (
              currentCardProfile &&
              has(currentCardProfile, provider as string)
            ) {
              // if hiddencard is not present and the application is completed, then show the card screen
              // if the status is completed and the preferred name is already, then show the card screen
              const isCardApplicationCompleted =
                (get(currentCardProfile, provider)?.applicationStatus ===
                  CardApplicationStatus.COMPLETED &&
                  !get(currentCardProfile, [provider, 'cards'])?.some(
                    card => card.status === CardStatus.HIDDEN,
                  )) ||
                (get(currentCardProfile, provider)?.applicationStatus ===
                  CardApplicationStatus.COMPLETED &&
                  get(currentCardProfile, [provider, 'preferredName']) !==
                    undefined);

              if (isCardApplicationCompleted) {
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.CARD_SCREEN,
                      params: {
                        cardProvider: provider,
                      },
                    },
                  ],
                });
              } else if (
                get(currentCardProfile, [
                  provider as CardProviders,
                  'applicationStatus',
                ]) === CardApplicationStatus.WAITLIST
              ) {
                console.log('waitlist');

                const applicationResponse = await getWithAuth(
                  `/v1/cards/${provider as string}/application`,
                );
                let countryParams = {
                  countryCode: '',
                  countryName: 'your country',
                  countryFlag: '🌍',
                  countryFlagUrl: '',
                };

                if (
                  !applicationResponse.isError &&
                  applicationResponse.data?.country
                ) {
                  const selectedCountry = countryMaster.find(
                    country =>
                      country.Iso2 === applicationResponse.data.country,
                  );
                  if (selectedCountry) {
                    countryParams = {
                      countryCode: applicationResponse.data.country,
                      countryName: selectedCountry.name,
                      countryFlag: selectedCountry.unicode_flag,
                      countryFlagUrl: selectedCountry.flag ?? '',
                    };
                  }
                }

                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.COUNTRY_TEMPORARILY_UNSUPPORTED,
                      params: countryParams,
                    },
                  ],
                });
              } else if (shouldCheckApplication(currentCardProfile)) {
                await checkApplication(provider as CardProviders);
              } else {
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.KYC_VERIFICATION_INTRO,
                    },
                  ],
                });
              }
            } else {
              const isReferralCodeApplied = await getReferralCode();
              if (isReferralCodeApplied) {
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.ENTER_REFERRAL_CODE,
                      params: {
                        referralCodeFromLink: isReferralCodeApplied,
                      },
                    },
                  ],
                });
              } else {
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.CARD_APPLICATION_WELCOME,
                    },
                  ],
                });
              }
            }
          } catch (error) {
            Sentry.captureException(error);
          } finally {
            if (isMounted) {
              setLoading(false);
              isLoading = false;
            }
          }
        } else {
          setLoading(false);
        }
      };

      void checkCardApplicationStatus();

      return () => {
        isMounted = false;
      };
    }, [isReadOnlyWallet, globalContext.globalState.cardProfile]),
  );

  const shouldCheckApplication = (currentCardProfile: CardProfile) => {
    if (provider === CardProviders.REAP_CARD) {
      return (
        get(currentCardProfile, provider as CardProviders)
          ?.applicationStatus === CardApplicationStatus.CREATED
      );
    }
    return (
      get(currentCardProfile, provider as CardProviders)?.applicationStatus ===
      CardApplicationStatus.CREATED
    );
  };

  const checkApplication = async (_provider: CardProviders) => {
    try {
      const response = await getWithAuth(`/v1/cards/${_provider}/application`);
      if (!response.isError) {
        const { data } = response;
        if (!data.emailVerfied) {
          props.navigation.reset({
            index: 0,
            routes: [
              {
                name: screenTitle.EMAIL_VERIFICATION,
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
    <CyDView className='flex-1'>
      <CardProviderSwitch />
      {isReadOnlyWallet && (
        <CyDImageBackground
          source={AppImages.READ_ONLY_CARD_BACKGROUND}
          className='h-full items-center justify-center'>
          <CyDText className='text-[20px] text-center font-bold mt-[30%]'>
            {t<string>('TRACK_WALLET_CYPHER_CARD')}
          </CyDText>
        </CyDImageBackground>
      )}
      {!isReadOnlyWallet && <CardWailtList navigation={props.navigation} />}
    </CyDView>
  );
}
