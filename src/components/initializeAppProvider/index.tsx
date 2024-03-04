import React, { useContext, useEffect, useState } from 'react';
import useInitializer from '../../hooks/useInitializer';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { Linking, Platform } from 'react-native';
import { onMessage, registerForRemoteMessages } from '../../core/push';
import { PinPresentStates } from '../../constants/enum';
import LoadingStack from '../../routes/loading';
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

export const InitializeAppProvider: React.FC<JSX.Element> = ({ children }) => {
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
  const ethereum = hdWallet.state.wallet.ethereum;
  const authToken = globalContext.globalState.token;

  useEffect(() => {
    const initializeApp = async () => {
      initializeSentry();
      await exitIfJailBroken();
      await fetchRPCEndpointsFromServer(globalContext.globalDispatch);
      await checkForUpdatesAndShowModal(setUpdateModal);
      await loadActivitiesFromAsyncStorage();

      if (Platform.OS === 'ios') {
        registerForRemoteMessages();
      } else {
        onMessage();
      }

      setTimeout(() => {
        SplashScreen.hide();
      }, SPLASH_SCREEN_TIMEOUT);

      setPinAuthentication(await setPinAuthenticationStateValue());
      setPinPresent(await setPinPresentStateValue());
    };
    void initializeApp();
  }, []);

  useEffect(() => {
    void getHosts(
      setForcedUpdate,
      setTamperedSignMessageModal,
      setUpdateModal,
      setShowDefaultAuthRemoveModal,
    );
  }, [ethereum.address]);

  useEffect(() => {
    if (ethereum.address === undefined && pinAuthentication) {
      void loadExistingWallet(hdWallet.dispatch, hdWallet.state);
    }
  }, [pinAuthentication]);

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
          <CyDText
            className={
              'font-bold text-[16px] text-primaryTextColor mt-[20px] text-center'
            }>
            {t<string>('NEW_UPDATE')}
          </CyDText>
          <CyDText
            className={
              'font-bold text-[13px] text-primaryTextColor mt-[20px] text-center'
            }>
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
          <CyDText
            className={
              'font-bold text-[16px] text-primaryTextColor mt-[20px] text-center'
            }>
            {t<string>('SOMETHING_WENT_WRONG')}
          </CyDText>
          <CyDText
            className={
              'font-bold text-[13px] text-primaryTextColor mt-[20px] text-center'
            }>
            {t<string>('CONTACT_CYPHERD_SUPPORT')}
          </CyDText>
        </DialogContent>
      </Dialog>

      <WalletConnectV2Provider>
        <DefaultAuthRemoveModal isModalVisible={showDefaultAuthRemoveModal} />
        {ethereum.address === undefined ? (
          pinAuthentication || pinPresent === PinPresentStates.NOTSET ? (
            <LoadingStack />
          ) : pinPresent === PinPresentStates.TRUE ? (
            <PinAuthRoute
              setPinAuthentication={setPinAuthentication}
              initialScreen={C.screenTitle.PIN_VALIDATION}
            />
          ) : (
            <PinAuthRoute
              setPinAuthentication={setPinAuthentication}
              initialScreen={C.screenTitle.SET_PIN}
            />
          )
        ) : ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_ ? (
          hdWallet.state.reset ? (
            <OnBoardingStack initialScreen={C.screenTitle.ENTER_KEY} />
          ) : (
            <OnBoardingStack />
          )
        ) : authToken === undefined ? (
          <LoadingStack />
        ) : (
          children
        )}
      </WalletConnectV2Provider>
    </>
  );
};
