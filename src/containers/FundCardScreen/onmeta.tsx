/* eslint-disable multiline-ternary */
import {
  ActivityContext,
  getWeb3Endpoint,
  HdWalletContext
} from '../../core/util';
import React, { useContext, useEffect, useRef, useState } from 'react';
import WebView from 'react-native-webview';
import { CyDImage, CyDView } from '../../styles/tailwindStyles';
import { PayModalParams } from '../../types/Browser';
import { GlobalContext } from '../../core/globalContext';
import Web3 from 'web3';
import {
  parseWebviewPayload,
  personal_sign,
  sendTransaction,
  signTypedDataCypherD
} from '../Browser/transaction';
import {
  Chain,
  ChainBackendNames
} from '../../constants/server';
import { getInjectedJavascript } from '../Browser/injectedJs';
import BottomModal from '../../components/BottomModal';
import PushModal from '../../components/PushModal';
import BottomConfirm from '../../components/BottomConfirm';
import { WEB3METHODS } from '../../constants/web3';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  ActivityReducerAction,
  OnmetaTransaction
} from '../../reducers/activity_reducer';
import * as Sentry from '@sentry/react-native';
import axios from '../../core/Http';
import AppImages from '../../../assets/images/appImages';
import Loading from '../../components/v2/loading';
import analytics from '@react-native-firebase/analytics';
import { hostWorker } from '../../global';
import { Linking } from 'react-native';

let web3RPCEndpoint: Web3;

function parseRequest (payload: any, webviewRef: React.MutableRefObject<any>, hdWalletContext: any, selectedChain: Chain,
  updateSelectedChain: (chain: any) => void, payModal: (payModalParamsLocal: PayModalParams, to: string) => void, signModal: (signMessage: any, payload: any, signMessageTitle: any) => void, pushModal: (pushModalParamsLocal: any) => void, globalContext: any) {
  const rpc = getWeb3Endpoint(selectedChain, globalContext);
  // const rpc = 'https://rpc-mumbai.maticvigil.com/'; // onmeta staging hack
  web3RPCEndpoint = new Web3(rpc);
  parseWebviewPayload(payload, webviewRef, hdWalletContext, selectedChain,
    updateSelectedChain, payModal, signModal, pushModal, web3RPCEndpoint);
}

export default function Onmeta ({ route }) {
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
    hdWallet.state.selectedChain.chain_id
  );
  const [clientDetails, setClientDetails] = useState({});

  function processPushPermissionUserChoice (permission: any) {
    setPushModal(false);
    axios
      .post(pushPermissionURL, {
        wallet_address: pushModalParams.wallet_address,
        app_id: pushModalParams.app_id,
        app_name: pushModalParams.app_name,
        reason_message: pushModalParams.reasonMessage,
        app_image: pushModalParams.appImage,
        permission
      })
      .then((res) => {
        webviewRef.current.injectJavaScript(
          `window.ethereum.sendResponse(${pushModalParams.payload_id}, "${permission}")`
        );
      })
      .catch((er) => {
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
      case ChainBackendNames.FANTOM: {
        chainId = 250;
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
        headers: { Authorization: `Bearer ${String(token)}` }
      };
      let clientToken;
      let userUrl;
      try {
        const { data } = await axios.get(
          `${ARCH_HOST}/v1/authentication/onmeta-auth/`,
          config
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
            clientToken
          )}&offRamp=disabled&onRamp=enabled&walletAddress=${String(
            ethereum.address
          )}&chainId=${chainId}`,
          userUrl
        ).href; // URL prepared from above step
      } else {
        constructedUri = new URL(
          `/?apiKey=${String(
            clientToken
          )}&offRamp=enabled&onRamp=disabled&chainId=${chainId}`,
          userUrl
        ).href; // URL prepared from above step
      }
      setUri(constructedUri);
      setClientDetails({ clientToken, chainId, uri: constructedUri });
    };

    void getClientToken();
    void analytics().logEvent(`inside_onmeta_pay_${ometaOperation}`);
  }, []);

  if (error) {
    return (
      <CyDView className={'h-full w-full'}>
        <CyDImage source={AppImages.NETWORK_ERROR}></CyDImage>
      </CyDView>
    );
  }

  if (!clientDetails.clientToken || !clientDetails.uri) {
    return <Loading></Loading>;
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
    const eventData = JSON.parse(event?.nativeEvent?.data);
    if (eventData?.data?.type === 'UPI_FAST') {
      void Linking.openURL(eventData.data.link);
    }
  };

  return (
    <CyDView className={'h-full w-full'}>
      {ometaOperation === 'buy' ? (
        <WebView
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          source={{ html: onRampHTMLCode }}
          renderLoading={() => {
            return <Loading></Loading>;
          }}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures
          scalesPageToFit={true}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={true}
          domStorageEnabled={true}
          onMessage={(event) => { onRampEvent(event); }}
        />
      ) : (
        <>
          <BottomModal
            isModalVisible={paybottom}
            signMessage={signModalParams.signMessage}
            signMessageTitle={signModalParams.signMessageTitle}
            onSignPress={() => {
              setPayBottom(false);
              if (
                signModalParams.payload.method === WEB3METHODS.PERSONAL_SIGN ||
                signModalParams.payload.method === WEB3METHODS.ETH_SIGN
              ) {
                personal_sign(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  web3RPCEndpoint
                );
              } else if (
                signModalParams.payload.method === WEB3METHODS.SIGN_TYPED_DATA
              ) {
                signTypedDataCypherD(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  SignTypedDataVersion.V1
                );
              } else if (
                signModalParams.payload.method ===
                WEB3METHODS.SIGN_TYPED_DATA_V3
              ) {
                signTypedDataCypherD(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  SignTypedDataVersion.V3
                );
              } else if (
                signModalParams.payload.method ===
                WEB3METHODS.SIGN_TYPED_DATA_V4
              ) {
                signTypedDataCypherD(
                  hdWallet,
                  signModalParams.payload,
                  webviewRef,
                  SignTypedDataVersion.V4
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
              payModalParams &&
                sendTransaction(
                  hdWallet,
                  payModalParams.payload,
                  payModalParams.finalGasPrice,
                  payModalParams.gasLimit,
                  webviewRef,
                  web3RPCEndpoint,
                  activityRef,
                  activityContext
                );
            }}
            onCancelPress={() => {
              activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.DELETE, value: { id: activityRef.current.id } });
              setPayBottomConfirm(false);
              webviewRef.current.reload();
            }}
          />
          <WebView
            source={{
              uri: clientDetails.uri
            }}
            startInLoadingState
            ref={webviewRef}
            renderLoading={() => {
              return <Loading></Loading>;
            }}
            injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
            mediaPlaybackRequiresUserAction={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            style={{ marginTop: 0 }}
            onMessage={(event) => {
              const jsonObj = JSON.parse(event.nativeEvent.data);

              function updateSelectedChain (chain: any) {
                hdWallet.dispatch({
                  type: 'CHOOSE_CHAIN',
                  value: { selectedChain: chain }
                });
              }
              function payModal (
                payModalParamsLocal: PayModalParams,
                to: string
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
              function signModal (
                signMessage: any,
                payload: any,
                signMessageTitle: any
              ) {
                setPayBottom(true);
                setSignModalParams({
                  signMessage,
                  payload,
                  signMessageTitle
                });
              }
              function pushModal (pushModalParamsLocal: any) {
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
                globalContext
              );
            }}
          />
        </>
      )}
    </CyDView>
  );
}
