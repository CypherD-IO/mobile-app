import { ActivityContext, HdWalletContext } from '../../core/util';
import React, { useContext, useEffect, useState } from 'react';
import WebView from 'react-native-webview';
import AppImages from '../../../assets/images/appImages';
import { ChainBackendNames } from '../../constants/server';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import { GlobalContextDef, GlobalContext } from '../../core/globalContext';
import Loading from '../../components/v2/loading';
import { CyDImage, CyDView } from '../../styles/tailwindStyles';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { ActivityReducerAction, ActivityStatus, ActivityType, SardinePayTransaction } from '../../reducers/activity_reducer';
import { genId } from '../utilities/activityUtilities';
import analytics from '@react-native-firebase/analytics';
import { hostWorker } from '../../global';

const javaScriptFunction = `
document.addEventListener("processed", function(data) {
  const detail = data.detail;
  const message = detail ? JSON.stringify(detail) : "";
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(message);
});

document.addEventListener("expired", function(data) {
  const detail = data.detail;
  const message = detail ? JSON.stringify(detail) : "";
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(message);
});

document.addEventListener("declined", function(data) {
  const detail = data.detail;
  const message = detail ? JSON.stringify(detail) : "";
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(message);
});

`;

export default function SardinePay ({ route }) {
  const hdWallet = useContext<any>(HdWalletContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const [uri, setUri] = useState<string | undefined>(undefined);
  const [error, setError] = useState<boolean>(false);
  const activityContext = useContext<any>(ActivityContext);

  const handleOrder = (orderData: any) => {
    if (orderData.status) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { assetType, network, orderId, assetQuantity, quote_id, trade_id, total } = orderData.status === 'processed' ? orderData.data : orderData;
      const activityData: SardinePayTransaction = {
        id: genId(),
        status: orderData.status === 'processed' ? ActivityStatus.INPROCESS : ActivityStatus.FAILED,
        type: ActivityType.SARDINEPAY,
        orderId: orderId ?? '',
        quoteId: orderId ? quote_id : '',
        tradeId: trade_id ?? '',
        chainName: network ?? '',
        tokenSymbol: assetType ?? '',
        tokenName: assetType ?? '',
        amount: assetQuantity ?? '',
        amountInUsd: total ?? '',
        datetime: new Date()
      };

      void analytics().logEvent('sardine_pay_success');
      activityContext.dispatch({ type: ActivityReducerAction.POST, value: activityData });
    }
  };

  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const chain = route.params.url;
  const { showModal, hideModal } = useGlobalModalContext();

  let blockchain: string;
  useEffect(() => {
    switch (chain) {
      case ChainBackendNames.AVALANCHE: {
        blockchain = '[{"token":"avax","network":"avalanche"}]';
        break;
      }
      case ChainBackendNames.ETH: {
        blockchain = '[{"token":"eth","network":"ethereum"},{"token":"usdc","network":"ethereum"},{"token":"usdt","network":"ethereum"},{"token":"dai","network":"ethereum"}]';
        break;
      }
      case ChainBackendNames.POLYGON: {
        blockchain = '[{"token":"matic","network":"polygon"}]';
        break;
      }
      case 'ALL': {
        blockchain = '[{"token":"eth","network":"ethereum"},{"token":"usdc","network":"ethereum"},{"token":"usdt","network":"ethereum"},{"token":"dai","network":"ethereum"},{"token":"matic","network":"polygon"},{"token":"avax","network":"avalanche"}]';
        break;
      }
      default: {
        blockchain = chain;
        showModal('state', { type: 'error', title: '\'polygon\', \'ethereum\', \'avalanche\' only supported.', description: 'Support for other chains coming up!', onSuccess: hideModal, onFailure: hideModal });
        break;
      }
    }

    const getClientToken = async () => {
      const token = globalStateContext.globalState.token;
      const config = {
        headers: { Authorization: `Bearer ${String(token)}` }
      };
      let clientToken;
      let userUrl;
      try {
        const { data } = await axios
          .get(`${ARCH_HOST}/v1/authentication/sardine-auth/`, config);
        clientToken = data.clientToken;
        userUrl = data.userUrl;
      } catch (e) {
        Sentry.captureException(e);
        setError(true);
      }

      const constructedUri = new URL(`/?address=${String(ethereum.address)}&supported_tokens=${String(blockchain)}&client_token=${String(clientToken)}`, userUrl).href; // URL prepared from above step
      setUri(constructedUri);
    };

    void getClientToken();
    void analytics().logEvent('inside_sardine_pay');
  }, []);

  if (error) {
    return <CyDView className={'h-full w-full'}>
      <CyDImage source={AppImages.NETWORK_ERROR}></CyDImage>
    </CyDView>;
  }

  if (!uri) {
    return <Loading></Loading>;
  }

  return (<CyDView className={'h-full w-full'}>
    <WebView
      startInLoadingState={true}
      source={{ uri }}
      renderLoading={() => {
        return (<Loading></Loading>);
      }}
      mediaPlaybackRequiresUserAction={false}
      allowInlineMediaPlayback
      allowsBackForwardNavigationGestures
      javaScriptEnabled={true}
      injectedJavaScriptBeforeContentLoaded={javaScriptFunction}
      originWhitelist={['*']}
      onMessage={event => {
        const orderData = JSON.parse(event.nativeEvent.data);
        if (orderData) {
          setTimeout(() => {
            // handle code for order success
            handleOrder(orderData);
          }, 2000);
        }
      }}
    />
  </CyDView>);
};
