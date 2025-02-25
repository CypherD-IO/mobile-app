/* eslint-disable react-native/no-inline-styles */
import { HdWalletContext } from '../../core/util';
import React, { useContext, useEffect, useState } from 'react';
import WebView from 'react-native-webview';
import { ChainBackendNames } from '../../constants/server';
import * as Sentry from '@sentry/react-native';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import analytics from '@react-native-firebase/analytics';
import useAxios from '../../core/HttpRequest';
import { t } from 'i18next';

import Loading from '../../components/v2/loading';
import { CyDView } from '../../styles/tailwindComponents';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';

export type SupportedBlockchains =
  | 'avalanche-c-chain'
  | 'cosmos'
  | 'ethereum'
  | 'polygon';

export interface DestinationWallet {
  /* Destination address where the purchased assets will be sent. */
  address: string;
  /** List of networks enabled for the associated address. All assets available per network are displayed to the user. */
  blockchains?: string[];
  /** List of assets enabled for the associated address. They are appended to the available list of assets. */
  assets?: string[];
  /** Restrict the networks available for the associated assets. */
  supportedNetworks?: string[];
}

export interface OnRampAppParams {
  /** The destination wallets supported by your application (BTC, ETH, etc). */
  destinationWallets: DestinationWallet[];
  /** The preset input amount as a crypto value. i.e. 0.1 ETH. This will be the initial default for all cryptocurrencies. */
  presetCryptoAmount?: number;
  /**
   * The preset input amount as a fiat value. i.e. 15 USD.
   * This will be the initial default for all cryptocurrencies. Ignored if presetCryptoAmount is also set.
   * Also note this only works for a subset of fiat currencies: USD, CAD, GBP, EUR
   * */
  presetFiatAmount?: number;
  /** The default network that should be selected when multiple networks are present. */
  defaultNetwork?: string;
}

export type GenerateOnRampURLOptions = {
  appId: string;
  host?: string;
} & OnRampAppParams;

export const generateOnRampURL = ({
  host = 'https://pay.coinbase.com',
  destinationWallets,
  ...otherParams
}: GenerateOnRampURLOptions): string => {
  const url = new URL(host);
  url.pathname = '/buy/select-asset';

  url.searchParams.append(
    'destinationWallets',
    JSON.stringify(destinationWallets),
  );

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
  const { getWithAuth } = useAxios();

  useEffect(() => {
    void analytics().logEvent('inside_coinbase_pay');
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

  const getCbCreds = async () => {
    try {
      const resp = await getWithAuth('/v1/authentication/creds/cb');
      if (!resp.error) {
        const { data } = resp;
        const rampURL = generateOnRampURL({
          host: data.host,
          appId: data.appId,
          destinationWallets: [
            {
              address: addr,
              blockchains: blockchain,
            },
          ],
        });
        setOnRampURL(rampURL);
      }
    } catch (e) {
      showModal('state', {
        type: 'error',
        title: t('COINBASE_LINK_ERROR'),
        description: t('CONTACT_CYPHERD_SUPPORT'),
        onSuccess: onModalHide,
        onFailure: hideModal,
      });
      Sentry.captureException('coinbase_pay_generate_url_error');
    }
  };

  void getCbCreds();

  return (
    <CyDView className={'h-full w-full'}>
      {onRampURL === '' && <Loading />}
      {onRampURL !== '' && (
        <WebView
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
