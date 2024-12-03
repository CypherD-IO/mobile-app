import React, { useCallback, useContext, useEffect, useState } from 'react';
import useInitializer from '../../hooks/useInitializer';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { Linking, Platform } from 'react-native';

import { GlobalModalType, PinPresentStates } from '../../constants/enum';
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
import { CyDText } from '../../styles/tailwindStyles';
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

import {
  requestUserPermission,
  showNotification,
} from '../../notification/pushNotification';

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
  const [discordToken, setDiscordToken] = useState<string>('');

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

  const RenderNavStack = useCallback(() => {
    if (ethereum.address === undefined) {
      if (pinAuthentication || pinPresent === PinPresentStates.NOTSET) {
        return (
          <Loading
            loadingText={t('INJECTIVE_UPDATE_LOADING_TEXT_WALLET_CREATION')}
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
    // {
    //   ethereum.address === undefined ? (
    //     pinAuthentication || pinPresent === PinPresentStates.NOTSET ? (
    //       // reomve in the next build
    //       <Loading
    //         loadingText={t('INJECTIVE_UPDATE_LOADING_TEXT_WALLET_CREATION')}
    //       />
    //     ) : (
    //       <PinAuthRoute
    //         setPinAuthentication={setPinAuthentication}
    //         initialScreen={
    //           pinPresent === PinPresentStates.TRUE
    //             ? C.screenTitle.PIN_VALIDATION
    //             : C.screenTitle.SET_PIN
    //         }
    //       />
    //     )
    //   ) : ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_ ? (
    //     hdWallet.state.reset ? (
    //       <OnBoardingStack initialScreen={C.screenTitle.ENTER_KEY} />
    //     ) : (
    //       <OnBoardingStack />
    //     )
    //   ) : !isReadOnlyWallet && !isAuthenticated ? (
    //     <Loading />
    //   ) : (
    //     children
    //   );
    // }
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
        <RenderNavStack />
      </WalletConnectV2Provider>
    </>
  );
};
