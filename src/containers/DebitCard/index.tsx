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
import { OnboardingRewardProvider } from '../../contexts/OnboardingRewardContext';

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
  console.log('🔍 DEBIT CARD SCREEN - COMPONENT INITIALIZED');
  const { t } = useTranslation();

  const globalContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { isReadOnlyWallet } = hdWalletContext.state;

  // State to control when UI should render actual content. Until redirect decisions are
  // complete we just show <Loading /> to avoid flash of interim screens like wait-list.
  const [redirectResolved, setRedirectResolved] = useState<boolean>(false);
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

  // Ensure we invoke navigation.reset only once per mount to avoid double navigation flashes
  const hasRedirected = React.useRef<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      // Return early on the very first focus to avoid immediate redirect that causes double navigation
      // if (!isInitialFocusHandled.current) {
      //   isInitialFocusHandled.current = true;
      //   setLoading(false);
      //   return;
      // }
      let isMounted = true;
      let isLoading = false;

      const checkCardApplicationStatus = async () => {
        console.log(
          'C H E C K I N G  C A R D  A P P L I C A T I O N  S T A T U S',
        );
        if (isLoading || !isMounted) return;

        if (!isReadOnlyWallet) {
          try {
            isLoading = true;
            setLoading(true);

            let currentCardProfile = cardProfile;

            if (!currentCardProfile) {
              currentCardProfile = await refreshProfile();
            }

            // If provider is still undefined we cannot make decisions – mark resolved
            if (!provider) {
              if (isMounted) {
                setLoading(false);
                setRedirectResolved(true);
              }
              return;
            }

            console.log(
              'C U R R E N T  C A R D  P R O F I L E :',
              currentCardProfile,
            );
            console.log(
              'P R O V I D E R :',
              has(currentCardProfile, provider as string),
            );

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

              console.log(
                'I S  C A R D  A P P L I C A T I O N  C O M P L E T E D :',
                isCardApplicationCompleted,
              );

              if (isCardApplicationCompleted && !hasRedirected.current) {
                hasRedirected.current = true;
                console.log('[DebitCard] redirect ➜ CARD_SCREEN');
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.CARD_SCREEN,
                      params: { cardProvider: provider },
                    },
                  ],
                });
              } else if (shouldCheckApplication(currentCardProfile)) {
                console.log('🔍 DEBIT CARD SCREEN - CHECKING APPLICATION');
                await checkApplication(provider as CardProviders);
                // No navigation here; mark resolved so UI can render loader/next screen
                if (isMounted && !hasRedirected.current) {
                  setRedirectResolved(true);
                }
              } else {
                if (!hasRedirected.current) {
                  hasRedirected.current = true;
                  console.log('[DebitCard] redirect ➜ KYC_VERIFICATION_INTRO');
                  props.navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: screenTitle.KYC_VERIFICATION_INTRO,
                      },
                    ],
                  });
                }
              }
            } else {
              const isReferralCodeApplied = await getReferralCode();
              if (isReferralCodeApplied && !hasRedirected.current) {
                hasRedirected.current = true;
                console.log('[DebitCard] redirect ➜ ENTER_REFERRAL_CODE');
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.ENTER_REFERRAL_CODE,
                      params: { referralCodeFromLink: isReferralCodeApplied },
                    },
                  ],
                });
              } else if (!isReferralCodeApplied && !hasRedirected.current) {
                hasRedirected.current = true;
                console.log('[DebitCard] redirect ➜ CARD_APPLICATION_WELCOME');
                props.navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: screenTitle.CARD_APPLICATION_WELCOME,
                    },
                  ],
                });
              }

              // Reached end without redirect (edge-case)
              if (isMounted && !hasRedirected.current) {
                setRedirectResolved(true);
              }
            }
          } catch (error) {
            Sentry.captureException(error);
          } finally {
            if (isMounted) {
              setLoading(false);
              if (!hasRedirected.current) {
                setRedirectResolved(true);
              }
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

  if (loading || !redirectResolved) {
    return <Loading />;
  }

  return (
    <OnboardingRewardProvider>
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
    </OnboardingRewardProvider>
  );
}
