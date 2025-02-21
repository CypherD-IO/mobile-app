import { useContext } from 'react';
import { HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { hostWorker } from '../../global';
import {
  ChainBackendNames,
  ChainNameMapping,
  NativeTokenMapping,
  PORTFOLIO_CHAINS_BACKEND_NAMES,
} from '../../constants/server';
import axios from '../../core/Http';
import * as Sentry from '@sentry/react-native';
import {
  getPortfolioModel,
  Holding,
  WalletHoldings,
} from '../../core/portfolio';
import { getPortfolioData, storePortfolioData } from '../../core/asyncStorage';
import { find, get } from 'lodash';

export default function usePortfolio() {
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;

  async function fetchPortfolio(isVerifyCoinChecked = true) {
    const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
    const portfolioUrl = `${ARCH_HOST}/v1/portfolio/balances`;
    const {
      cosmos,
      osmosis,
      stargaze,
      noble,
      ethereum,
      coreum,
      injective,
      kujira,
      solana,
    } = hdWallet.state.wallet;
    if (ethereum.address && ethereum.address !== 'null') {
      const addresses = [
        ethereum.address,
        cosmos?.wallets[cosmos?.currentIndex]?.address,
        osmosis?.wallets[osmosis?.currentIndex]?.address,
        stargaze?.address,
        noble?.address,
        coreum?.address,
        injective?.address,
        kujira?.address,
        solana.address,
      ].filter(address => address !== undefined);

      const payload = {
        chains: PORTFOLIO_CHAINS_BACKEND_NAMES,
        addresses,
        allowTestNets: false,
        isVerified: isVerifyCoinChecked,
      };
      try {
        const response = await axios.post(portfolioUrl, payload);
        if (response && response?.status === 201) {
          if (response.data?.chainPortfolios?.length) {
            const portfolio = getPortfolioModel(response.data);
            void storePortfolioData(portfolio, ethereum);
            return { data: portfolio, isError: false, isPortfolioEmpty: false };
          }
          return { isError: false, isPortfolioEmpty: true };
        }
      } catch (e) {
        Sentry.captureException(e);
        return { isError: true, isPortfolioEmpty: false };
      }
    }
  }

  async function getNativeToken(
    chainName: ChainBackendNames,
  ): Promise<Holding> {
    const { ethereum } = hdWallet.state.wallet;
    const localPortfolio = await getPortfolioData(ethereum);
    const chainHoldings = get(
      localPortfolio.data,
      get(ChainNameMapping, chainName, ''),
    ).totalHoldings;
    const nativeTokenSymbol = get(NativeTokenMapping, chainName);

    const nativeToken = find(
      chainHoldings,
      holding =>
        holding.symbol.toLowerCase() ===
        (nativeTokenSymbol ?? '').toLowerCase(),
    );
    return nativeToken;
  }

  async function getLocalPortfolio(): Promise<WalletHoldings | null> {
    const { ethereum } = hdWallet.state.wallet;
    const localPortfolio = await getPortfolioData(ethereum);
    if (localPortfolio) return localPortfolio.data;
    return null;
  }

  return { fetchPortfolio, getNativeToken, getLocalPortfolio };
}
