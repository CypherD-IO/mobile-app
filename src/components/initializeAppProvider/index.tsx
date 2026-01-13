import React, { useCallback, useContext, useEffect, useState } from 'react';
import useInitializer from '../../hooks/useInitializer';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { Alert, Linking, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {
  setUpdateReminderSnoozeUntil,
  setReferralCodeAsync,
} from '../../core/asyncStorage';
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
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { t } from 'i18next';
import { CyDSafeAreaView, CyDText } from '../../styles/tailwindComponents';
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
import { get } from 'lodash';

import {
  requestUserPermission,
  showNotification,
} from '../../notification/pushNotification';
import { usePortfolioRefresh } from '../../hooks/usePortfolioRefresh';
import { screenTitle } from '../../constants';
import PinAuthRoute from '../../routes/pinAuthRoute';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

interface UseInitializerReturn {
  exitIfJailBroken: () => Promise<void>;
  fetchRPCEndpointsFromServer: (globalDispatch: any) => Promise<any>;
  loadActivitiesFromAsyncStorage: () => Promise<void>;
  isDeviceBiometricEnabled: () => Promise<boolean>;
  pinAlreadySetStatus: () => Promise<PinPresentStates>;
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
}

export const InitializeAppProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    exitIfJailBroken,
    fetchRPCEndpointsFromServer,
    loadActivitiesFromAsyncStorage,
    pinAlreadySetStatus,
    isDeviceBiometricEnabled,
    loadExistingWallet,
    getHosts,
    checkForUpdatesAndShowModal,
    checkAPIAccessibility,
  } = useInitializer() as UseInitializerReturn;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pinAuthenticated, setPinAuthenticated] = useState(false);
  const [pinSetStatus, setPinSetStatus] = useState(PinPresentStates.NOTSET);
  const [showDefaultAuthRemoveModal, setShowDefaultAuthRemoveModal] =
    useState<boolean>(false);
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const [updateModal, setUpdateModal] = useState<boolean>(false);
  const [forcedUpdate, setForcedUpdate] = useState<boolean>(false);
  const [tamperedSignMessageModal, setTamperedSignMessageModal] =
    useState<boolean>(false);
  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );
  const solanaAddress = get(hdWallet, 'state.wallet.solana.address', undefined);
  const address =
    ethereumAddress && ethereumAddress.trim().length > 0
      ? ethereumAddress
      : solanaAddress;
  const isAuthenticated = globalContext.globalState.isAuthenticated;

  const { showModal, hideModal } = useGlobalModalContext();
  const [isJoinDiscordModalVisible, setIsJoinDiscordModalVisible] =
    useState<boolean>(false);
  const { url: initialUrl, updateUrl } = useInitialIntentURL();
  const { referrerData } = useInstallReferrer();
  const [discordToken, setDiscordToken] = useState<string>('');
  usePortfolioRefresh();

  // State to track if wallet data is still loading
  const [walletLoading, setWalletLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeApp = async () => {
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

      try {
        const isAPIAccessible = await checkAPIAccessibility();
        console.log('isAPIAccessible >>>>>>>> ::::::: ', isAPIAccessible);

        if (isAPIAccessible) {
          await exitIfJailBroken();
          void fetchRPCEndpointsFromServer(globalContext.globalDispatch);
          void loadActivitiesFromAsyncStorage();
          await requestUserPermission();
        }
      } catch (e) {
        // If init throws, we currently end up on Loading forever. Log loudly so we can see it.
        Sentry.captureException(e);
      } finally {
        setTimeout(() => {
          SplashScreen.hide();
        }, SPLASH_SCREEN_TIMEOUT);
      }
    };

    void initializeApp();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void checkForUpdatesAndShowModal(setUpdateModal);
    }
  }, [isAuthenticated]);

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
      if (analytics()) {
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

          void logAnalyticsToFirebase(
            AnalyticEvent.INSTALL_ATTRIBUTION,
            installAttribution,
          );

          // Save referral code to AsyncStorage if present
          if (referrerData.referral) {
            void setReferralCodeAsync(referrerData.referral);
          }
        }
        // For iOS: Only attribution token available, needs server-side resolution
        else if (Platform.OS === 'ios' && referrerData.attribution_token) {
          void logAnalyticsToFirebase(
            AnalyticEvent.IOS_ATTRIBUTION_TOKEN_RECEIVED,
            {
              attribution_token: referrerData.attribution_token,
              requires_server_resolution: true,
            },
          );

          // Note: Server needs to resolve the token and communicate back to the app
          // for any referral code handling
        }
      }
    }
  }, [referrerData, analytics]);

  useEffect(() => {
    if (address) {
      void getHosts(
        setForcedUpdate,
        setTamperedSignMessageModal,
        setUpdateModal,
        setShowDefaultAuthRemoveModal,
      );
    }
  }, [address]);

  useEffect(() => {
    const setPinAuthenticationState = async () => {
      try {
        const isEmulator = await DeviceInfo.isEmulator();

        // Requirement: On iOS Simulator we should skip PIN/biometric gating and go straight
        // to onboarding. We do that by taking the "no-auth-required" branch:
        // (biometricEnabled && pinSetStatus === FALSE) => allows loading existing wallet and then onboarding.
        if (Platform.OS === 'ios' && isEmulator) {
          setBiometricEnabled(true);
          setPinSetStatus(PinPresentStates.FALSE);
          return;
        }

        const isDeviceBiometricEnabledValue = await isDeviceBiometricEnabled();
        setBiometricEnabled(isDeviceBiometricEnabledValue);

        const pinAlreadySetStatusValue = await pinAlreadySetStatus();
        setPinSetStatus(pinAlreadySetStatusValue);
      } catch (e) {
        // Secure default: if we fail to determine PIN presence, require validation rather than bypass.
        Sentry.captureException(e);
        setBiometricEnabled(false);
        setPinSetStatus(PinPresentStates.TRUE);
      }
    };
    if (!ethereumAddress && !solanaAddress) {
      void setPinAuthenticationState();
    }
  }, [ethereumAddress, solanaAddress]);

  useEffect(() => {
    if (
      (biometricEnabled && pinSetStatus === PinPresentStates.FALSE) ||
      pinAuthenticated
    ) {
      void loadExistingWallet(hdWallet.dispatch, hdWallet.state).finally(() => {
        setWalletLoading(false);
      });
    }
  }, [biometricEnabled, pinAuthenticated, pinSetStatus]);

  const RenderNavStack = useCallback(() => {
    if (
      walletLoading &&
      biometricEnabled &&
      pinSetStatus === PinPresentStates.FALSE
    ) {
      console.log('loading the loading component 407');
      return <Loading />;
    }

    if (
      (biometricEnabled && pinSetStatus === PinPresentStates.FALSE) ||
      pinAuthenticated
    ) {
      if (ethereumAddress ?? solanaAddress) {
        if (!isAuthenticated) {
          console.log(
            'loading the loading component because of not authenticated',
          );
          return <Loading />;
        }
        return (
          <CyDSafeAreaView edges={['bottom']} className='flex-1 bg-n0'>
            {children}
          </CyDSafeAreaView>
        );
      } else {
        return (
          <CyDSafeAreaView edges={['bottom']} className='flex-1 bg-black'>
            <OnBoardingStack />
          </CyDSafeAreaView>
        );
      }
    } else {
      if (pinSetStatus === PinPresentStates.NOTSET) {
        console.log('loading the loading component because of pin not set');
        return <Loading />;
      } else if (pinSetStatus === PinPresentStates.TRUE) {
        return (
          <PinAuthRoute
            setPinAuthentication={setPinAuthenticated}
            initialScreen={screenTitle.PIN_VALIDATION}
          />
        );
      } else if (pinSetStatus === PinPresentStates.FALSE) {
        return (
          <PinAuthRoute
            setPinAuthentication={setPinAuthenticated}
            initialScreen={screenTitle.SET_PIN}
          />
        );
      }
    }
  }, [
    walletLoading,
    ethereumAddress,
    solanaAddress,
    biometricEnabled,
    pinSetStatus,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (updateModal) {
      const title = t<string>('NEW_UPDATE');
      const message = !forcedUpdate
        ? t<string>('NEW_UPDATE_MSG')
        : t<string>('NEW_MUST_UPDATE_MSG');

      const goToStore = () => {
        analytics().logEvent('update_now', {}).catch(Sentry.captureException);
        setUpdateModal(false);
        if (Platform.OS === 'android') {
          void Linking.openURL('market://details?id=com.cypherd.androidwallet');
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
      };

      const laterAction = () => {
        setUpdateModal(false);
        logAnalyticsToFirebase(AnalyticEvent.UPDATE_LATER, {});
        // Snooze for 24 hours
        const snoozeUntil = Date.now() + 24 * 60 * 60 * 1000;
        void setUpdateReminderSnoozeUntil(snoozeUntil);
      };

      // Show system alert instead of custom dialog
      if (forcedUpdate) {
        Alert.alert(
          title,
          message,
          [{ text: t('UPDATE'), onPress: goToStore }],
          { cancelable: false },
        );
      } else {
        Alert.alert(title, message, [
          { text: t('LATER'), onPress: laterAction, style: 'cancel' },
          { text: t('UPDATE'), onPress: goToStore },
        ]);
      }
    }
  }, [updateModal, forcedUpdate]);

  useEffect(() => {
    if (!tamperedSignMessageModal) return;

    // Use platform-native alerts instead of `react-native-popup-dialog` to avoid
    // dependency churn and BackHandler API mismatches on newer RN versions.
    Alert.alert(
      t<string>('SOMETHING_WENT_WRONG'),
      t<string>('CONTACT_CYPHERD_SUPPORT'),
      [
        {
          text: t('CLOSE'),
          style: 'destructive',
          onPress: () => {
            RNExitApp.exitApp();
          },
        },
        {
          text: t('CONTACT_TEXT'),
          onPress: () => {
            void Intercom.present();
            sendFirebaseEvent(hdWallet, 'support');
            setTamperedSignMessageModal(false);
          },
        },
      ],
      { cancelable: false },
    );
  }, [tamperedSignMessageModal, hdWallet]);

  return (
    <>
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
