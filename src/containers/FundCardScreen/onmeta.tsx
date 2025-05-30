import {
  ActivityContext,
  getWeb3Endpoint,
  HdWalletContext,
} from '../../core/util';
import React, { useContext, useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import { CyDImage, CyDView } from '../../styles/tailwindComponents';
import { PayModalParams } from '../../types/Browser';
import { GlobalContext } from '../../core/globalContext';
import {
  parseWebviewPayload,
  personalSign,
  sendTransaction,
  signTypedDataCypherD,
} from '../Browser/transaction';
import { Chain, ChainBackendNames } from '../../constants/server';
import { getInjectedJavascript } from '../Browser/injectedJs';
import BottomModal from '../../components/BottomModal';
import PushModal from '../../components/PushModal';
import BottomConfirm from '../../components/BottomConfirm';
import { WEB3METHODS } from '../../constants/web3';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  ActivityReducerAction,
  OnmetaTransaction,
} from '../../reducers/activity_reducer';
import * as Sentry from '@sentry/react-native';
import axios from '../../core/Http';
import AppImages from '../../../assets/images/appImages';
import Loading from '../../components/v2/loading';
import { hostWorker } from '../../global';
import { Linking } from 'react-native';
import MetaWidget from '@onmeta/react-native-sdk';
import { logAnalyticsToFirebase } from '../../core/analytics';

function parseRequest(
  payload: any,
  webviewRef: React.MutableRefObject<any>,
  hdWalletContext: any,
  selectedChain: Chain,
  updateSelectedChain: (chain: any) => void,
  payModal: (payModalParamsLocal: PayModalParams, to: string) => void,
  signModal: (signMessage: any, payload: any, signMessageTitle: any) => void,
  pushModal: (pushModalParamsLocal: any) => void,
  globalContext: any,
) {
  const rpc = getWeb3Endpoint(selectedChain, globalContext);
  // const rpc = 'https://rpc-mumbai.maticvigil.com/'; // onmeta staging hack
  parseWebviewPayload(
    payload,
    webviewRef,
    hdWalletContext,
    selectedChain,
    updateSelectedChain,
    payModal,
    signModal,
    pushModal,
    rpc,
  );
}

export default function Onmeta({ route }) {
  const hdWallet = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const ethereum = hdWallet.state.wallet.ethereum;
  const [paybottomConfirm, setPayBottomConfirm] = useState<boolean>(false);
  const [payModalParams, setPayModalParams] = useState<PayModalParams>({});
  const [pushModal, setPushModal] = useState<boolean>(false);
  const [pushModalParams, setPushModalParams] = useState<any>(false);
  const [signModalParams, setSignModalParams] = useState<any>(false);
  const [paybottom, setPayBottom] = useState<boolean>(false);
  const activityRef = useRef<OnmetaTransaction | null>(null);
  const activityContext = useContext<any>(ActivityContext);
  const webviewRef = useRef<any>(null);
  const ometaOperation = String(route.params.operation);
  const chain = String(route.params.url);
  const [uri, setUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState<boolean>(false);
  let chainId: number;
  const pushPermissionURL = `${PORTFOLIO_HOST}/v1/push/permissions`;
  const INJECTED_JAVASCRIPT = getInjectedJavascript(
    ethereum.address,
    hdWallet.state.selectedChain.chain_id,
  );
  const [clientDetails, setClientDetails] = useState({});
  const rpc = getWeb3Endpoint(hdWallet.state.selectedChain, globalContext);

  function processPushPermissionUserChoice(permission: any) {
    setPushModal(false);
    axios
      .post(pushPermissionURL, {
        wallet_address: pushModalParams.wallet_address,
        app_id: pushModalParams.app_id,
        app_name: pushModalParams.app_name,
        reason_message: pushModalParams.reasonMessage,
        app_image: pushModalParams.appImage,
        permission,
      })
      .then(res => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${pushModalParams.payload_id}, "${permission}")`,
        );
      })
      .catch(er => {
        Sentry.captureException(er);
      });
  }

  useEffect(() => {
    switch (chain) {
      case ChainBackendNames.AVALANCHE: {
        chainId = 43114;
        break;
      }
      case ChainBackendNames.ETH: {
        chainId = 1;
        break;
      }
      case ChainBackendNames.POLYGON: {
        chainId = 137;
        break;
      }
      case ChainBackendNames.BSC: {
        chainId = 56;
        break;
      }
      case ChainBackendNames.ARBITRUM: {
        chainId = 42161;
        break;
      }
      default: {
        chainId = 1;
        break;
      }
    }

    const getClientToken = async () => {
      const token = globalContext.globalState.token;
      const config = {
        headers: { Authorization: `Bearer ${String(token)}` },
      };
      let clientToken;
      let userUrl;
      try {
        const { data } = await axios.get(
          `${ARCH_HOST}/v1/authentication/onmeta-auth/`,
          config,
        );
        clientToken = data.clientToken;
        userUrl = data.userUrl;
      } catch (e) {
        Sentry.captureException(e);
        setError(true);
      }
      let constructedUri;
      if (ometaOperation === 'buy') {
        constructedUri = new URL(
          `/?apiKey=${String(
            clientToken,
          )}&offRamp=disabled&onRamp=enabled&walletAddress=${String(
            ethereum.address,
          )}&chainId=${chainId}`,
          userUrl,
        ).href; // URL prepared from above step
      } else {
        constructedUri = new URL(
          `/?apiKey=${String(
            clientToken,
          )}&offRamp=enabled&onRamp=disabled&chainId=${chainId}`,
          userUrl,
        ).href; // URL prepared from above step
      }
      setUri(constructedUri);
      setClientDetails({ clientToken, chainId, uri: constructedUri });
    };

    void getClientToken();
    void logAnalyticsToFirebase(`inside_onmeta_pay_${ometaOperation}`);
  }, []);

  if (error) {
    return (
      <CyDView className={'h-full w-full'}>
        <CyDImage source={AppImages.NETWORK_ERROR} />
      </CyDView>
    );
  }

  if (!clientDetails.clientToken || !clientDetails.uri) {
    return <Loading />;
  }

  const onRampHTMLCode = `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://platform.onmeta.in/onmeta-sdk.js" type="text/javascript"></script>
    </head>
    <body>
      <div id="widget"></div>
      <script>
        let createWidget = new onMetaWidget({
          elementId: "widget",
          apiKey: "${clientDetails.clientToken}",
          isAndroid: "enabled",
          onRamp: "enabled",
          offRamp: "disabled",
          walletAddress: "${ethereum.address}",
          chainId: "${clientDetails.chainId}"
        })
        createWidget.init();
        createWidget.on("ACTION_EVENTS", (data) => {window.ReactNativeWebView.postMessage(JSON.stringify(data))})
      </script>
    </body>
  </html>
  `;

  const onRampEvent = (event: any) => {
    if (event?.nativeEvent?.data) {
      const eventData = JSON.parse(event.nativeEvent.data);
      if (eventData?.data?.type === 'UPI_FAST') {
        void Linking.openURL(eventData.data.link);
      }
    }
  };

  const eventHandler = async (event, data) => {
    switch (event) {
      // example to open the upi apps
      case 'upi-intent': {
        const Linkdata = await JSON.parse(data);
        void Linking.openURL(Linkdata.link);
        break;
      }
      default: {
        // Default code
      }
    }
  };

  return (
    <CyDView className={'h-full w-full bg-n20 pb-[75px]'}>
      {ometaOperation === 'buy' ? (
        <MetaWidget
          queryParams={{
            apiKey: clientDetails.clientToken,
            environment: 'PRODUCTION',
            onRamp: 'enabled',
            offRamp: 'disabled',
            walletAddress: ethereum.address,
          }}
          onEventHandler={eventHandler}
        />
      ) : (
        <>
          <BottomModal
            isModalVisible={paybottom}
            signMessage={signModalParams.signMessage}
            signMessageTitle={signModalParams.signMessageTitle}
            onSignPress={async () => {
              setPayBottom(false);
              if (
                signModalParams.payload.method === WEB3METHODS.PERSONAL_SIGN ||
                signModalParams.payload.method === WEB3METHODS.ETH_SIGN
              ) {
                await personalSign(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  rpc,
                );
              } else if (
                signModalParams.payload.method === WEB3METHODS.SIGN_TYPED_DATA
              ) {
                await signTypedDataCypherD(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  SignTypedDataVersion.V1,
                );
              } else if (
                signModalParams.payload.method ===
                WEB3METHODS.SIGN_TYPED_DATA_V3
              ) {
                await signTypedDataCypherD(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  SignTypedDataVersion.V3,
                );
              } else if (
                signModalParams.payload.method ===
                WEB3METHODS.SIGN_TYPED_DATA_V4
              ) {
                await signTypedDataCypherD(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  SignTypedDataVersion.V4,
                );
              }
            }}
            onCancelPress={() => {
              setPayBottom(false);
              webviewRef.current.reload();
            }}
          />
          <PushModal
            isModalVisible={pushModal}
            modalParams={pushModalParams}
            onAllowPress={() => {
              processPushPermissionUserChoice('ALLOW');
            }}
            onDenyPress={() => {
              processPushPermissionUserChoice('DENY');
            }}
          />
          <BottomConfirm
            isModalVisible={paybottomConfirm}
            modalParams={payModalParams}
            onPayPress={() => {
              setPayBottomConfirm(false);
              if (payModalParams) {
                void sendTransaction(
                  hdWallet,
                  payModalParams.payload,
                  payModalParams.finalGasPrice,
                  payModalParams.gasLimit,
                  webviewRef,
                  activityRef,
                  activityContext,
                  rpc,
                );
              }
            }}
            onCancelPress={() => {
              activityRef.current &&
                activityContext.dispatch({
                  type: ActivityReducerAction.DELETE,
                  value: { id: activityRef.current.id },
                });
              setPayBottomConfirm(false);
              webviewRef.current.reload();
            }}
          />
          {/* <MetaWidget
            queryParams={{
              apiKey: clientDetails.clientToken,
              environment: 'PRODUCTION',
              onRamp: 'disabled',
              offRamp: 'enabled',
              renderLoading: () => {
                return <Loading></Loading>;
              },
              injectedJavaScriptBeforeContentLoaded: INJECTED_JAVASCRIPT,
              mediaPlaybackRequiresUserAction: true,
              javaScriptEnabled: true,
              domStorageEnabled: true,
            }}
            onEventHandler={event => {
              const jsonObj = JSON.parse(event.nativeEvent.data);

              function updateSelectedChain(chain: any) {
                hdWallet.dispatch({
                  type: 'CHOOSE_CHAIN',
                  value: { selectedChain: chain },
                });
              }
              function payModal(
                payModalParamsLocal: PayModalParams,
                to: string,
              ) {
                setPayBottomConfirm(true);
                setPayModalParams(payModalParamsLocal);
                // const activityData: OnmetaTransaction = {
                //   id: genId(),
                //   status: ActivityStatus.PENDING,
                //   type: ActivityType.ONMETA,
                //   transactionHash: '',
                //   fromAddress: ethereum.address,
                //   toAddress: to,
                //   onmetaType: 'sell',
                //   chainName: hdWallet.state.selectedChain.name,
                //   symbol: payModalParamsLocal.networkCurrency,
                //   datetime: new Date(),
                //   amount: String(payModalParamsLocal.totalETH)
                // };

                // activityRef.current = activityData;

                // activityContext.dispatch({ type: ActivityReducerAction.POST, value: activityData });
              }
              function signModal(
                signMessage: any,
                payload: any,
                signMessageTitle: any,
              ) {
                setPayBottom(true);
                setSignModalParams({
                  signMessage,
                  payload,
                  signMessageTitle,
                });
              }
              function pushModal(pushModalParamsLocal: any) {
                setPushModal(true);
                setPushModalParams(pushModalParamsLocal);
              }
              parseRequest(
                jsonObj,
                webviewRef,
                hdWallet,
                hdWallet.state.selectedChain,
                updateSelectedChain,
                payModal,
                signModal,
                pushModal,
                globalContext,
              );
            }}
          /> */}
          <WebView
            source={{
              uri: clientDetails.uri,
            }}
            backgroundColor={'transparent'}
            startInLoadingState
            ref={webviewRef}
            renderLoading={() => {
              return <Loading />;
            }}
            injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
            mediaPlaybackRequiresUserAction={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={{ marginTop: 0 }}
            onMessage={event => {
              const jsonObj = JSON.parse(event.nativeEvent.data);

              function updateSelectedChain(chain: any) {
                hdWallet.dispatch({
                  type: 'CHOOSE_CHAIN',
                  value: { selectedChain: chain },
                });
              }
              function payModal(
                payModalParamsLocal: PayModalParams,
                to: string,
              ) {
                setPayBottomConfirm(true);
                setPayModalParams(payModalParamsLocal);
                // const activityData: OnmetaTransaction = {
                //   id: genId(),
                //   status: ActivityStatus.PENDING,
                //   type: ActivityType.ONMETA,
                //   transactionHash: '',
                //   fromAddress: ethereum.address,
                //   toAddress: to,
                //   onmetaType: 'sell',
                //   chainName: hdWallet.state.selectedChain.name,
                //   symbol: payModalParamsLocal.networkCurrency,
                //   datetime: new Date(),
                //   amount: String(payModalParamsLocal.totalETH)
                // };

                // activityRef.current = activityData;

                // activityContext.dispatch({ type: ActivityReducerAction.POST, value: activityData });
              }
              function signModal(
                signMessage: any,
                payload: any,
                signMessageTitle: any,
              ) {
                setPayBottom(true);
                setSignModalParams({
                  signMessage,
                  payload,
                  signMessageTitle,
                });
              }
              function pushModal(pushModalParamsLocal: any) {
                setPushModal(true);
                setPushModalParams(pushModalParamsLocal);
              }
              parseRequest(
                jsonObj,
                webviewRef,
                hdWallet,
                hdWallet.state.selectedChain,
                updateSelectedChain,
                payModal,
                signModal,
                pushModal,
                globalContext,
              );
            }}
          />
        </>
      )}
    </CyDView>
  );
}
