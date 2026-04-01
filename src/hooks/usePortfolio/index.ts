import { useContext } from 'react';
import { HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { hostWorker } from '../../global';
import {
  ChainBackendNames,
  ChainConfigMapping,
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
    const { cosmos, osmosis, noble, coreum, injective, ethereum, solana } =
      hdWallet.state.wallet;
    const ethereumAddress = ethereum?.address;
    const solanaAddress = solana?.address;
    const address = ethereumAddress ?? solanaAddress;

    if (address) {
      const addresses = [
        ethereumAddress,
        cosmos?.address,
        osmosis?.address,
        noble?.address,
        coreum?.address,
        injective?.address,
        solanaAddress,
      ].filter(address => address !== undefined);

      const chains = __DEV__
        ? [...PORTFOLIO_CHAINS_BACKEND_NAMES, ChainBackendNames.BASE_SEPOLIA]
        : PORTFOLIO_CHAINS_BACKEND_NAMES;
      const payload = {
        chains,
        addresses,
        allowTestNets: __DEV__,
        isVerified: isVerifyCoinChecked,
        inclHyperliquidBalances: true,
      };
      try {
        const response = await axios.post(portfolioUrl, payload);
        if (response && response?.status === 201) {
          if (response.data?.chainPortfolios?.length) {
            const portfolio = getPortfolioModel(response.data);
            void storePortfolioData(
              portfolio,
              ethereumAddress ?? solanaAddress ?? '',
            );
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
    const ethereumAddress = get(
      hdWallet,
      'state.wallet.ethereum.address',
      undefined,
    );
    const solanaAddress = get(
      hdWallet,
      'state.wallet.solana.address',
      undefined,
    );
    const localPortfolio = await getPortfolioData(
      ethereumAddress ?? solanaAddress ?? '',
    );
    const chainKey = String(get(ChainNameMapping, chainName, ''));
    const chainHoldings = get(
      localPortfolio,
      ['data', chainKey, 'totalHoldings'],
      [],
    ) as Holding[];
    const fallbackChainDetails = (get(ChainConfigMapping, chainKey) ??
      get(ChainConfigMapping, 'eth')) as Holding['chainDetails'];
    const nativeTokenSymbol = String(get(NativeTokenMapping, chainName, ''));
    const symbolsToMatch = [
      nativeTokenSymbol,
      String(get(fallbackChainDetails, 'symbol', '')),
    ]
      .filter(Boolean)
      .map(symbol => symbol.toLowerCase());

    const nativeToken =
      find(chainHoldings, holding => holding?.isNativeToken) ??
      find(
        chainHoldings,
        holding =>
          (holding?.isNativeToken === undefined ||
            holding?.isNativeToken === null) &&
          symbolsToMatch.includes(
            String(get(holding, 'symbol', '')).toLowerCase(),
          ),
      );

    if (nativeToken) return nativeToken;

    return {
      name:
        String(get(fallbackChainDetails, 'name', '')) ||
        nativeTokenSymbol ||
        '',
      symbol:
        String(get(fallbackChainDetails, 'symbol', '')) || nativeTokenSymbol,
      logoUrl: String(get(fallbackChainDetails, 'logo_url', '')),
      price: '0',
      contractAddress: String(
        get(fallbackChainDetails, 'native_token_address', ''),
      ),
      contractDecimals: 0,
      totalValue: 0,
      balanceInteger: '0',
      balanceDecimal: '0',
      isVerified: true,
      coinGeckoId: String(get(fallbackChainDetails, 'coinGeckoId', '')),
      about: '',
      id: -1,
      chainDetails: fallbackChainDetails,
      denom: '',
      price24h: 0,
      isNativeToken: true,
      isFundable: false,
      isBridgeable: false,
      isSwapable: false,
    };
  }

  async function getLocalPortfolio(): Promise<WalletHoldings | null> {
    const ethereumAddress = get(
      hdWallet,
      'state.wallet.ethereum.address',
      undefined,
    );
    const solanaAddress = get(
      hdWallet,
      'state.wallet.solana.address',
      undefined,
    );
    const localPortfolio = await getPortfolioData(
      ethereumAddress ?? solanaAddress ?? '',
    );
    if (localPortfolio) return localPortfolio.data;
    return null;
  }

  return { fetchPortfolio, getNativeToken, getLocalPortfolio };
}
