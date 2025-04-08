import React, { useCallback, useContext, useEffect, useState } from 'react';
import useInitializer from '../../hooks/useInitializer';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { Linking, Platform } from 'react-native';
import {
  CypherDeclineCodes,
  GlobalModalType,
  PinPresentStates,
} from '../../constants/enum';
import PinAuthRoute from '../../routes/pinAuthRoute';
import * as C from '../../../src/constants/index';
import OnBoardingStack from '../../routes/onBoarding';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
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

import {
  requestUserPermission,
  showNotification,
} from '../../notification/pushNotification';
import { usePortfolioRefresh } from '../../hooks/usePortfolioRefresh';

export const InitializeAppProvider = ({
  children,
}: {
  navigationRef: any;
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
  } = useInitializer();
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
  const { ethereum } = hdWallet.state.wallet;
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

        setPinAuthentication(await setPinAuthenticationStateValue());
        setPinPresent(await setPinPresentStateValue());
      }
    };

    void initializeApp();
  }, []);

  useEffect(() => {
    if (referrerData?.ref) {
      console.log('Referral code found in install referrer:', referrerData.ref);
      void setReferralCodeAsync(referrerData.ref);

      if (isAuthenticated && ethereum?.address) {
        showModal('success', {
          title: t('REFERRAL_CODE_FOUND'),
          description: t('REFERRAL_CODE_APPLIED', { code: referrerData.ref }),
          onSuccess: () => {
            hideModal();
          },
        });
      }
    }
  }, [referrerData, isAuthenticated, ethereum?.address]);

  useEffect(() => {
    if (ethereum.address) {
      void getHosts(
        setForcedUpdate,
        setTamperedSignMessageModal,
        setUpdateModal,
        setShowDefaultAuthRemoveModal,
      );
    }
  }, [ethereum.address]);

  useEffect(() => {
    if (ethereum.address === undefined && pinAuthentication) {
      void loadExistingWallet(hdWallet.dispatch, hdWallet.state);
    }
  }, [pinAuthentication]);

  useEffect(() => {
    const discordTokenFromUrl = initialUrl?.split('discordToken=')[1];
    if (isAuthenticated && ethereum?.address && discordTokenFromUrl) {
      setDiscordToken(discordTokenFromUrl);
      setIsJoinDiscordModalVisible(true);
      updateUrl('https://app.cypherhq.io');
    }
  }, [isAuthenticated, ethereum?.address, initialUrl]);

  // Handle attribution data
  useEffect(() => {
    if (referrerData) {
      console.log('Attribution data received:', referrerData);

      // Log attribution data to Firebase Analytics
      if (analytics) {
        // For Android: Full attribution data available
        if (Platform.OS === 'android') {
          const installAttribution = {
            utm_source: referrerData.utm_source,
            utm_medium: referrerData.utm_medium,
            utm_campaign: referrerData.utm_campaign,
            utm_content: referrerData.utm_content,
            utm_term: referrerData.utm_term,
            ref: referrerData.ref,
            install_referrer: referrerData.install_referrer,
          };

          void analytics().logEvent('install_attribution', installAttribution);

          // Save referral code to AsyncStorage if present
          if (referrerData.ref) {
            void setReferralCodeAsync(referrerData.ref);
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
    if (ethereum.address === undefined) {
      if (pinAuthentication || pinPresent === PinPresentStates.NOTSET) {
        return (
          <Loading
          // loadingText={t('INJECTIVE_UPDATE_LOADING_TEXT_WALLET_CREATION')}
          />
        );
      } else {
        return (
          <PinAuthRoute
            setPinAuthentication={setPinAuthentication}
            initialScreen={
              pinPresent === PinPresentStates.TRUE
                ? C.screenTitle.PIN_VALIDATION
                : C.screenTitle.SET_PIN
            }
          />
        );
      }
    } else {
      if (ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
        return <OnBoardingStack />;
      } else {
        if (!isReadOnlyWallet && !isAuthenticated) {
          return <Loading />;
        }
        return children;
      }
    }
  }, [
    ethereum.address,
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
