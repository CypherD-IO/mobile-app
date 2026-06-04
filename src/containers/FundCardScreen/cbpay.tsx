/* eslint-disable react-native/no-inline-styles */
import { HdWalletContext } from '../../core/util';
import React, { useContext, useEffect, useState } from 'react';
import WebView from 'react-native-webview';
import { ChainBackendNames } from '../../constants/server';
import * as Sentry from '@sentry/react-native';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import useAxios from '../../core/HttpRequest';
import { t } from 'i18next';

import Loading from '../../components/v2/loading';
import { CyDView } from '../../styles/tailwindComponents';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

export type SupportedBlockchains =
  | 'avalanche-c-chain'
  | 'cosmos'
  | 'ethereum'
  | 'polygon';

export interface GenerateOnRampURLOptions {
  /** One-time session token minted by our backend. */
  sessionToken: string;
  host?: string;
  /** Optional UX presets — safe to pass alongside sessionToken. */
  defaultNetwork?: string;
  defaultAsset?: string;
  presetCryptoAmount?: number;
  presetFiatAmount?: number;
  fiatCurrency?: string;
}

export const generateOnRampURL = ({
  host = 'https://pay.coinbase.com',
  sessionToken,
  ...otherParams
}: GenerateOnRampURLOptions): string => {
  const url = new URL(host);
  url.pathname = '/buy/select-asset';
  url.searchParams.append('sessionToken', sessionToken);

  (Object.keys(otherParams) as Array<keyof typeof otherParams>).forEach(key => {
    const value = otherParams[key];
    if (value !== undefined) {
      url.searchParams.append(String(key), value.toString());
    }
  });
  return url.toString();
};

// previous types and interfaces from https://github.com/coinbase/cbpay-js

export default function CoinbasePay({ route, navigation }) {
  const hdWallet = useContext<any>(HdWalletContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const cosmos = hdWallet.state.wallet.cosmos;
  const chain = route.params.url;
  const addr =
    chain === ChainBackendNames.COSMOS
      ? cosmos.wallets[cosmos.currentIndex].address
      : ethereum.address;
  const { showModal, hideModal } = useGlobalModalContext();
  const [onRampURL, setOnRampURL] = useState<string>('');
  const { postWithAuth } = useAxios();

  useEffect(() => {
    void logAnalyticsToFirebase(AnalyticEvent.INSIDE_COINBASE_PAY);
  }, []);

  let blockchain: string[];
  switch (chain) {
    case ChainBackendNames.AVALANCHE: {
      blockchain = ['avalanche-c-chain'];
      break;
    }
    case ChainBackendNames.COSMOS: {
      blockchain = ['cosmos'];
      break;
    }
    case ChainBackendNames.ETH: {
      blockchain = ['ethereum'];
      break;
    }
    case ChainBackendNames.POLYGON: {
      blockchain = ['polygon'];
      break;
    }
    case 'ALL': {
      blockchain = ['polygon', 'ethereum', 'avalanche-c-chain'];
      showModal('state', {
        type: 'info',
        title: "'polygon', 'ethereum', 'avalanche' only supported.",
        description: 'For COSMOS change the chain to COMSOS and try',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      break;
    }
    default: {
      blockchain = chain;
      showModal('state', {
        type: 'error',
        title: "'polygon', 'ethereum', 'avalanche', 'cosmos' only supported.",
        description: 'Support for other chains coming up!',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      break;
    }
  }

  function onModalHide(type = '') {
    hideModal();
    setTimeout(() => {
      navigation.goBack();
    }, MODAL_HIDE_TIMEOUT);
  }

  const showCbError = () => {
    showModal('state', {
      type: 'error',
      title: t('COINBASE_LINK_ERROR'),
      description: t('CONTACT_CYPHERD_SUPPORT'),
      onSuccess: onModalHide,
      onFailure: hideModal,
    });
  };

  const getCbCreds = async () => {
    try {
      const resp = await postWithAuth(
        '/v1/authentication/creds/cb/session-token',
        {
          address: addr,
          blockchains: blockchain,
          // assets: ['ETH', 'USDC'], // optional — omit to allow all assets for the network
        },
      );
      if (!resp.error && resp.data?.token) {
        const rampURL = generateOnRampURL({
          host: resp.data.host, // falls back to default inside generateOnRampURL if undefined
          sessionToken: resp.data.token,
        });
        setOnRampURL(rampURL);
      } else {
        showCbError();
      }
    } catch (e) {
      showCbError();
      Sentry.captureException('coinbase_pay_generate_url_error');
    }
  };

  useEffect(() => {
    // Only mint a token once we have a resolved address + supported chain.
    // addr is stable for a given screen open; keep deps minimal so we don't
    // re-mint a single-use token. The screen remounts on re-navigation.
    if (addr && Array.isArray(blockchain)) {
      void getCbCreds();
    }
  }, [addr]);

  return (
    <CyDView className={'h-full w-full'}>
      {onRampURL === '' && <Loading />}
      {onRampURL !== '' && (
        <WebView
          webviewDebuggingEnabled={__DEV__}
          startInLoadingState={true}
          renderLoading={() => {
            return <Loading />;
          }}
          source={{ uri: onRampURL }}
          style={{ marginTop: 0 }}
          allowsBackForwardNavigationGestures
        />
      )}
    </CyDView>
  );
}
