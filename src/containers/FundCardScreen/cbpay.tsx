import { HdWalletContext } from '../../core/util';
import React, { useContext, useEffect } from 'react';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import * as Sentry from '@sentry/react-native';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import useAxios from '../../core/HttpRequest';
import { t } from 'i18next';

import Loading from '../../components/v2/loading';
import { CyDView } from '../../styles/tailwindComponents';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

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

/** One destination wallet + the Coinbase network slugs it can receive on. */
interface CoinbaseAddress {
  address: string;
  blockchains: string[];
}

/**
 * EVM networks Coinbase Onramp supports that share the wallet's single
 * `ethereum` address. Coinbase requires one address per network, so each
 * slug appears exactly once across the addresses array.
 */
const EVM_ONRAMP_BLOCKCHAINS = [
  'ethereum',
  'polygon',
  'base',
  'arbitrum',
  'optimism',
  'avacchain', // Coinbase's slug for Avalanche C-Chain (NOT 'avalanche-c-chain')
];

export const generateOnRampURL = ({
  host = 'https://pay.coinbase.com',
  sessionToken,
  ...otherParams
}: GenerateOnRampURLOptions): string => {
  const url = new URL('/buy/select-asset', host);
  url.searchParams.append('sessionToken', sessionToken);

  Object.entries(otherParams).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  });
  return url.toString();
};

interface CoinbasePayProps {
  navigation: { goBack: () => void };
}

export default function CoinbasePay({ navigation }: CoinbasePayProps) {
  const hdWallet = useContext<any>(HdWalletContext);
  const { ethereum, cosmos, osmosis, solana } = hdWallet.state.wallet;
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();

  useEffect(() => {
    void logAnalyticsToFirebase(AnalyticEvent.INSIDE_COINBASE_PAY);
  }, []);

  /**
   * Build Coinbase's `addresses` array from whatever addresses this wallet
   * holds. EVM chains share `ethereum.address`; cosmos, osmosis and solana
   * each get their own entry. A solana-only account (email/social or solana private-key
   * import) naturally produces a single `solana` entry — so Coinbase's own
   * asset picker handles network selection and we no longer ask the user to
   * choose a chain up front.
   */
  const buildAddresses = (): CoinbaseAddress[] => {
    const addresses: CoinbaseAddress[] = [];
    if (ethereum?.address) {
      addresses.push({
        address: ethereum.address,
        blockchains: EVM_ONRAMP_BLOCKCHAINS,
      });
    }
    if (cosmos?.address) {
      addresses.push({ address: cosmos.address, blockchains: ['cosmos'] });
    }
    if (osmosis?.address) {
      addresses.push({ address: osmosis.address, blockchains: ['osmosis'] });
    }
    if (solana?.address) {
      addresses.push({ address: solana.address, blockchains: ['solana'] });
    }
    return addresses;
  };

  function onModalHide() {
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
      onFailure: onModalHide,
    });
  };

  /**
   * Mint a one-time session token for all the wallet's addresses, then open the
   * Onramp URL in the system browser. Coinbase mandates a popup / new tab —
   * Onramp URLs do not authenticate correctly inside an in-app WebView
   * (Passkey/U2F is unavailable), so we use SafariVC / Chrome Custom Tabs via
   * `@toruslabs/react-native-web-browser`. The screen is a thin launcher: once
   * the external browser closes we pop back.
   */
  const launchOnramp = async () => {
    const addresses = buildAddresses();
    if (!addresses.length) {
      showCbError();
      return;
    }
    try {
      const resp = await postWithAuth(
        '/v1/authentication/creds/cb/session-token',
        { addresses },
      );
      if (!resp.error && resp.data?.token) {
        const rampURL = generateOnRampURL({
          host: resp.data.host, // falls back to default inside generateOnRampURL if undefined
          sessionToken: resp.data.token,
        });
        await WebBrowser.openBrowserAsync(rampURL);
        navigation.goBack();
      } else {
        showCbError();
      }
    } catch (e) {
      showCbError();
      Sentry.captureException('coinbase_pay_generate_url_error');
    }
  };

  useEffect(() => {
    // Session tokens are single-use and expire in ~5 min; mint once per screen
    // open. The screen remounts on re-navigation, which re-runs this effect.
    void launchOnramp();
  }, []);

  return (
    <CyDView className={'h-full w-full'}>
      <Loading />
    </CyDView>
  );
}
