import React, { useCallback, useContext, useEffect, useState } from 'react';
import useInitializer from '../../hooks/useInitializer';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { Linking, Platform } from 'react-native';
import {
  CypherDeclineCodes,
  GlobalModalType,
  PinPresentStates,
} from '../../constants/enum';
import OnBoardingStack from '../../routes/onBoarding';
import { HdWalletContext } from '../../core/util';
import { WalletConnectV2Provider } from '../walletConnectV2Provider';
import { SPLASH_SCREEN_TIMEOUT } from '../../constants/timeOuts';
import SplashScreen from 'react-native-lottie-splash-screen';
import DefaultAuthRemoveModal from '../v2/defaultAuthRemoveModal';
import Dialog, {
  DialogButton,
  DialogContent,
  DialogFooter,
} from 'react-native-popup-dialog';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { t } from 'i18next';
import { CyDText } from '../../styles/tailwindComponents';
import { sendFirebaseEvent } from '../../containers/utilities/analyticsUtility';
import Intercom from '@intercom/intercom-react-native';
import RNExitApp from 'react-native-exit-app';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import Loading from '../../containers/Loading';
import messaging from '@react-native-firebase/messaging';
import { useGlobalModalContext } from '../v2/GlobalModal';
import { NotificationEvents } from '../../constants/server';
import JoinDiscordModal from '../v2/joinDiscordModal';
import useInitialIntentURL from '../../hooks/useInitialIntentURL';
import { useInstallReferrer } from '../../hooks/useInstallReferrer';
import { setReferralCodeAsync } from '../../core/asyncStorage';
import { get } from 'lodash';

import {
  requestUserPermission,
  showNotification,
} from '../../notification/pushNotification';
import { usePortfolioRefresh } from '../../hooks/usePortfolioRefresh';
import { screenTitle } from '../../constants';
import PinAuthRoute from '../../routes/pinAuthRoute';

interface UseInitializerReturn {
  initializeSentry: () => void;
  exitIfJailBroken: () => Promise<void>;
  fetchRPCEndpointsFromServer: (globalDispatch: any) => Promise<any>;
  loadActivitiesFromAsyncStorage: () => Promise<void>;
  setPinAuthenticationStateValue: () => Promise<boolean>;
  setPinPresentStateValue: () => Promise<PinPresentStates>;
  loadExistingWallet: (dispatch: any, state?: any) => Promise<void>;
  getHosts: (
    setForcedUpdate: React.Dispatch<React.SetStateAction<boolean>>,
    setTamperedSignMessageModal: React.Dispatch<React.SetStateAction<boolean>>,
    setUpdateModal: React.Dispatch<React.SetStateAction<boolean>>,
    setShowDefaultAuthRemoveModal: React.Dispatch<
      React.SetStateAction<boolean>
    >,
  ) => Promise<void>;
  checkForUpdatesAndShowModal: (
    setUpdateModal: React.Dispatch<React.SetStateAction<boolean>>,
  ) => Promise<void>;
  checkAPIAccessibility: () => Promise<boolean>;
  initializeWeb3Auth: () => Promise<void>;
}

export const InitializeAppProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    initializeSentry,
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
    setPinAuthenticationStateValue,
    setPinPresentStateValue,
    loadExistingWallet,
    getHosts,
    checkForUpdatesAndShowModal,
    checkAPIAccessibility,
    initializeWeb3Auth,
  } = useInitializer() as UseInitializerReturn;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const [pinAuthentication, setPinAuthentication] = useState(false);
  const [pinPresent, setPinPresent] = useState(PinPresentStates.NOTSET);
  const [showDefaultAuthRemoveModal, setShowDefaultAuthRemoveModal] =
    useState<boolean>(false);
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const [updateModal, setUpdateModal] = useState<boolean>(false);
  const [forcedUpdate, setForcedUpdate] = useState<boolean>(false);
  const [tamperedSignMessageModal, setTamperedSignMessageModal] =
    useState<boolean>(false);
  const { isReadOnlyWallet } = hdWallet.state;
  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );
  const solanaAddress = get(hdWallet, 'state.wallet.solana.address', undefined);
  const ethCurrentIndex = get(
    hdWallet,
    'state.wallet.ethereum.currentIndex',
    undefined,
  );
  const solCurrentIndex = get(
    hdWallet,
    'state.wallet.solana.currentIndex',
    undefined,
  );
  const address = ethereumAddress ?? solanaAddress;
  const isAuthenticated = globalContext.globalState.isAuthenticated;

  const { showModal, hideModal } = useGlobalModalContext();
  const [isJoinDiscordModalVisible, setIsJoinDiscordModalVisible] =
    useState<boolean>(false);
  const { url: initialUrl, updateUrl } = useInitialIntentURL();
  const { referrerData } = useInstallReferrer();
  const [discordToken, setDiscordToken] = useState<string>('');
  usePortfolioRefresh();

  useEffect(() => {
    const initializeApp = async () => {
      initializeSentry();

      messaging().onMessage(response => {
        if (response.data?.actionKey === NotificationEvents.THREE_DS_APPROVE) {
          setTimeout(() => {
            showModal(GlobalModalType.THREE_D_SECURE_APPROVAL, {
              data: response.data,
              closeModal: hideModal,
            });
          }, 1000);
        } else if (
          response.data?.actionKey === NotificationEvents.CARD_TXN_UPDATE &&
          (response.data?.declineCode === CypherDeclineCodes.MERCHANT_GLOBAL ||
            response.data?.declineCode === CypherDeclineCodes.MERCHANT_DENIED ||
            response.data?.declineCode ===
              CypherDeclineCodes.NEW_MERCHANT_HIGH_SPEND_RULE)
        ) {
          setTimeout(() => {
            showModal(GlobalModalType.TRANSACTION_DECLINE_HANDLING, {
              data: response.data,
              closeModal: hideModal,
            });
          }, 1000);
        } else {
          void showNotification(response.notification, response.data);
        }
      });

      const isAPIAccessible = await checkAPIAccessibility();
      if (isAPIAccessible) {
        await exitIfJailBroken();
        void fetchRPCEndpointsFromServer(globalContext.globalDispatch);
        void checkForUpdatesAndShowModal(setUpdateModal);
        void loadActivitiesFromAsyncStorage();

        await requestUserPermission();

        setTimeout(() => {
          SplashScreen.hide();
        }, SPLASH_SCREEN_TIMEOUT);
      }
    };

    void initializeApp();
  }, []);

  useEffect(() => {
    if (referrerData?.referral) {
      void setReferralCodeAsync(referrerData.referral);

      if (isAuthenticated && ethereumAddress) {
        showModal('success', {
          title: t('REFERRAL_CODE_FOUND'),
          description: t('REFERRAL_CODE_APPLIED', {
            code: referrerData.referral,
          }),
          onSuccess: () => {
            hideModal();
          },
        });
      }
    }
  }, [referrerData, isAuthenticated, ethereumAddress]);

  useEffect(() => {
    if (referrerData?.referral) {
      void setReferralCodeAsync(referrerData.referral);

      if (isAuthenticated && ethereumAddress) {
        showModal('success', {
          title: t('REFERRAL_CODE_FOUND'),
          description: t('REFERRAL_CODE_APPLIED', {
            code: referrerData.referral,
          }),
          onSuccess: () => {
            hideModal();
          },
        });
      }
    }
  }, [referrerData, isAuthenticated, ethereumAddress]);

  useEffect(() => {
    const setPinAuthenticationState = async () => {
      const pinPresentStateValue = await setPinPresentStateValue();
      const pinAuthenticationStateValue =
        await setPinAuthenticationStateValue();

      setPinPresent(pinPresentStateValue);
      setPinAuthentication(pinAuthenticationStateValue);
    };
    void setPinAuthenticationState();
  }, [solCurrentIndex, ethCurrentIndex]);

  useEffect(() => {
    if (address) {
      void initializeWeb3Auth();
      void getHosts(
        setForcedUpdate,
        setTamperedSignMessageModal,
        setUpdateModal,
        setShowDefaultAuthRemoveModal,
      );
    }
  }, [address]);

  useEffect(() => {
    if (!ethereumAddress && !solanaAddress && pinAuthentication) {
      void loadExistingWallet(hdWallet.dispatch, hdWallet.state);
    }
  }, [pinAuthentication]);

  useEffect(() => {
    const discordTokenFromUrl = initialUrl?.split('discordToken=')[1];
    if (isAuthenticated && ethereumAddress && discordTokenFromUrl) {
      setDiscordToken(discordTokenFromUrl);
      setIsJoinDiscordModalVisible(true);
      updateUrl('https://app.cypherhq.io');
    }
  }, [isAuthenticated, ethereumAddress, initialUrl]);

  // Handle attribution data
  useEffect(() => {
    if (referrerData) {
      // Log attribution data to Firebase Analytics
      if (analytics) {
        // For Android: Full attribution data available
        if (Platform.OS === 'android') {
          const installAttribution = {
            ...(referrerData.utm_source && {
              utm_source: referrerData.utm_source,
            }),
            ...(referrerData.utm_medium && {
              utm_medium: referrerData.utm_medium,
            }),
            ...(referrerData.utm_campaign && {
              utm_campaign: referrerData.utm_campaign,
            }),
            ...(referrerData.utm_content && {
              utm_content: referrerData.utm_content,
            }),
            ...(referrerData.channel && { channel: referrerData.channel }),
            ...(referrerData.influencer && {
              influencer: referrerData.influencer,
            }),
            ...(referrerData.utm_term && { utm_term: referrerData.utm_term }),
            ...(referrerData.referral && { referral: referrerData.referral }),
            ...(referrerData.ref && { ref: referrerData.ref }),
            ...(referrerData.install_referrer && {
              install_referrer: referrerData.install_referrer,
            }),
          };

          void analytics().logEvent('install_attribution', installAttribution);

          // Save referral code to AsyncStorage if present
          if (referrerData.referral) {
            void setReferralCodeAsync(referrerData.referral);
          }
        }
        // For iOS: Only attribution token available, needs server-side resolution
        else if (Platform.OS === 'ios' && referrerData.attribution_token) {
          void analytics().logEvent('ios_attribution_token_received', {
            attribution_token: referrerData.attribution_token,
            requires_server_resolution: true,
          });

          // Note: Server needs to resolve the token and communicate back to the app
          // for any referral code handling
        }
      }
    }
  }, [referrerData, analytics]);

  const RenderNavStack = useCallback(() => {
    if (ethCurrentIndex === -1 && solCurrentIndex === -1) {
      if (pinPresent === PinPresentStates.NOTSET) {
        if (pinAuthentication) {
          return <OnBoardingStack />;
        }
        return <Loading />;
      } else if (pinPresent === PinPresentStates.FALSE) {
        if (pinAuthentication) {
          return <OnBoardingStack />;
        } else {
          return (
            <PinAuthRoute
              setPinAuthentication={setPinAuthentication}
              initialScreen={screenTitle.SET_PIN}
            />
          );
        }
      } else {
        return (
          <PinAuthRoute
            setPinAuthentication={setPinAuthentication}
            initialScreen={screenTitle.PIN_VALIDATION}
          />
        );
      }
    } else {
      if (!ethereumAddress && !solanaAddress) {
        return <OnBoardingStack />;
      } else {
        if (!isReadOnlyWallet && !isAuthenticated) {
          return <Loading />;
        }
        return children;
      }
    }
  }, [
    ethCurrentIndex,
    solCurrentIndex,
    ethereumAddress,
    solanaAddress,
    pinAuthentication,
    pinPresent,
    hdWallet.state.reset,
    isReadOnlyWallet,
    isAuthenticated,
  ]);

  return (
    <>
      <Dialog
        visible={updateModal}
        footer={
          <DialogFooter>
            <DialogButton
              text={t('UPDATE')}
              onPress={() => {
                analytics()
                  .logEvent('update_now', {})
                  .catch(Sentry.captureException);
                setUpdateModal(false);
                if (Platform.OS === 'android') {
                  void Linking.openURL(
                    'market://details?id=com.cypherd.androidwallet',
                  );
                } else {
                  const link =
                    'itms-apps://apps.apple.com/app/cypherd-wallet/id1604120414';
                  Linking.canOpenURL(link).then(
                    supported => {
                      if (supported) {
                        void Linking.openURL(link);
                      }
                    },
                    err => Sentry.captureException(err),
                  );
                }
              }}
            />
            <DialogButton
              text={t('LATER')}
              disabled={forcedUpdate}
              onPress={() => {
                setUpdateModal(false);
                void analytics().logEvent('update_later', {});
              }}
            />
          </DialogFooter>
        }
        width={0.8}
        onTouchOutside={() => {
          !forcedUpdate && setUpdateModal(false);
        }}>
        <DialogContent>
          <CyDText className={'font-bold text-[16px] mt-[20px] text-center'}>
            {t<string>('NEW_UPDATE')}
          </CyDText>
          <CyDText className={'font-bold text-[13px] mt-[20px] text-center'}>
            {!forcedUpdate ? t('NEW_UPDATE_MSG') : t('NEW_MUST_UPDATE_MSG')}
          </CyDText>
        </DialogContent>
      </Dialog>
      <Dialog
        visible={tamperedSignMessageModal}
        footer={
          <DialogFooter>
            <DialogButton
              text={t('CLOSE')}
              onPress={() => {
                RNExitApp.exitApp();
              }}
            />
            <DialogButton
              text={t('CONTACT_TEXT')}
              onPress={() => {
                void Intercom.present();
                sendFirebaseEvent(hdWallet, 'support');
              }}
            />
          </DialogFooter>
        }
        width={0.8}>
        <DialogContent>
          <CyDText className={'font-bold text-[16px] mt-[20px] text-center'}>
            {t<string>('SOMETHING_WENT_WRONG')}
          </CyDText>
          <CyDText className={'font-bold text-[13px] mt-[20px] text-center'}>
            {t<string>('CONTACT_CYPHERD_SUPPORT')}
          </CyDText>
        </DialogContent>
      </Dialog>

      <WalletConnectV2Provider>
        <JoinDiscordModal
          isModalVisible={isJoinDiscordModalVisible}
          setIsModalVisible={setIsJoinDiscordModalVisible}
          discordToken={discordToken}
        />
        <DefaultAuthRemoveModal isModalVisible={showDefaultAuthRemoveModal} />
        {RenderNavStack()}
      </WalletConnectV2Provider>
    </>
  );
};
