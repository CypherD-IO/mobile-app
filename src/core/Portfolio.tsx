/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import {
  Chain,
  ChainBackendNames,
  CHAIN_AVALANCHE,
  CHAIN_BSC,
  CHAIN_COLLECTION,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_EVMOS,
  CHAIN_FTM,
  CHAIN_OSMOSIS,
  CHAIN_POLYGON,
  CHAIN_JUNO,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_STARGAZE,
  CHAIN_NOBLE,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  PORTFOLIO_CHAINS_BACKEND_NAMES,
} from '../constants/server';
import {
  PORTFOLIO_EMPTY,
  PORTFOLIO_ERROR,
  PORTFOLIO_NOT_EMPTY,
} from '../reducers/portfolio_reducer';
import Toast from 'react-native-toast-message';
import { getPortfolioData, storePortfolioData } from './asyncStorage';
import axios from '../core/Http';
import * as Sentry from '@sentry/react-native';
import qs from 'qs';
import { hostWorker } from '../global';
import { get, has } from 'lodash';

export interface Holding {
  name: string;
  displayName?: string; // used in card
  symbol: string;
  logoUrl: string;
  price: string;
  contractAddress: string;
  balance: string;
  contractDecimals: number;
  totalValue: number;
  actualBalance: number;
  isVerified: boolean;
  coinGeckoId: string;
  about: string;
  id: number;
  chainDetails?: Chain;
  denom?: string;
  stakedBalance?: string;
  actualStakedBalance: number;
  stakedBalanceTotalValue?: number;
  price24h?: number;
  unbondingBalanceTotalValue?: number;
  actualUnbondingBalance?: number;
  isMainnet?: boolean;
  isBridgeable: boolean;
  isSwapable: boolean;
  isStakeable?: boolean;
}

export interface ChainHoldings {
  chainTotalBalance: number;
  chainUnVerifiedBalance: number;
  chainStakedBalance: number;
  chainUnbondingBalance: number;
  holdings: Holding[];
  timestamp: string;
}

export interface WalletHoldings {
  totalBalance: number;
  totalUnverifiedBalance: number;
  totalStakedBalance: number;
  totalUnbondingBalance: number;
  eth: ChainHoldings | undefined;
  polygon: ChainHoldings | undefined;
  bsc: ChainHoldings | undefined;
  avalanche: ChainHoldings | undefined;
  fantom: ChainHoldings | undefined;
  arbitrum: ChainHoldings | undefined;
  optimism: ChainHoldings | undefined;
  evmos: ChainHoldings | undefined;
  cosmos: ChainHoldings | undefined;
  osmosis: ChainHoldings | undefined;
  juno: ChainHoldings | undefined;
  stargaze: ChainHoldings | undefined;
  noble: ChainHoldings | undefined;
  shardeum: ChainHoldings | undefined;
  shardeum_sphinx: ChainHoldings | undefined;
  totalHoldings: Holding[];
}

export interface NftHolding {
  symbol: string;
  address: string;
  id: number;
  image: string;
  tokenId: number;
}

export interface ChainNftHoldings {
  count: number;
  description: string;
  id: number;
  name: string;
  collections: NftHolding[];
  timestamp: string;
}

export interface NftHoldings {
  ETH: ChainNftHoldings[] | undefined;
  MATIC: ChainNftHoldings[] | undefined;
  BNB: ChainNftHoldings[] | undefined;
  AVAX: ChainNftHoldings[] | undefined;
  FTM: ChainNftHoldings[] | undefined;
  ARBITRUM: ChainNftHoldings[] | undefined;
  EVMOS: ChainNftHoldings[] | undefined;
  OPTIMISM: ChainNftHoldings[] | undefined;
  COSMOS: ChainNftHoldings[] | undefined;
  OSMO: ChainNftHoldings[] | undefined;
  JUNO: ChainNftHoldings[] | undefined;
  STARS: ChainNftHoldings[] | undefined;
  NOBLE: ChainNftHoldings[] | undefined;
  SHM: ChainNftHoldings[] | undefined;
  'ALL CHAINS': ChainNftHoldings[];
}

export function getCurrentChainHoldings(
  portfolio: WalletHoldings,
  chain: Chain
) {
  if (!portfolio) {
    return undefined;
  }
  switch (chain.backendName) {
    case CHAIN_ETH.backendName:
      return portfolio.eth;
    case CHAIN_POLYGON.backendName:
      return portfolio.polygon;
    case CHAIN_BSC.backendName:
      return portfolio.bsc;
    case CHAIN_AVALANCHE.backendName:
      return portfolio.avalanche;
    case CHAIN_COLLECTION.backendName:
      return portfolio.totalHoldings;
    case CHAIN_FTM.backendName:
      return portfolio.fantom;
    case CHAIN_ARBITRUM.backendName:
      return portfolio.arbitrum;
    case CHAIN_EVMOS.backendName:
      return portfolio.evmos;
    case CHAIN_OPTIMISM.backendName:
      return portfolio.optimism;
    case CHAIN_COSMOS.backendName:
      return portfolio.cosmos;
    case CHAIN_OSMOSIS.backendName:
      return portfolio.osmosis;
    case CHAIN_JUNO.backendName:
      return portfolio.juno;
    case CHAIN_STARGAZE.backendName:
      return portfolio.stargaze;
    case CHAIN_NOBLE.backendName:
      return portfolio.noble;
    case CHAIN_SHARDEUM.backendName:
      return portfolio.shardeum;
    case CHAIN_SHARDEUM_SPHINX.backendName:
      return portfolio.shardeum_sphinx;
  }
}

export async function fetchNftDatav2(
  portfolioState: any,
  ethereum: any,
  stargaze: any
) {
  const allChainNftHoldings: NftHoldings = {
    ETH: [],
    MATIC: [],
    BNB: [],
    AVAX: [],
    FTM: [],
    ARBITRUM: [],
    OPTIMISM: [],
    EVMOS: [],
    COSMOS: [],
    OSMO: [],
    JUNO: [],
    STARS: [],
    NOBLE: [],
    SHM: [],
    'ALL CHAINS': [],
  };
  const cursor: string = '';
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const getNfturl = `${PORTFOLIO_HOST}/v1/userholdings/nfts`;
  const getNftStargazeURL = `${ARCH_HOST}/v1/portfolio/stargaze/nft`;
  const promiseArray: Array<Promise<any>> = [];
  for (const chains in ChainBackendNames) {
    // build promiseArray for all chains
    if (['COSMOS', 'OSMOSIS', 'JUNO', 'NOBLE'].includes(chains)) {
      continue;
    }
    let temp;
    if (chains !== ChainBackendNames.STARGAZE) {
      temp = axios.get(getNfturl, {
        params: {
          address: ethereum.address,
          chain: chains,
          cursor,
          is_cursor_pagination: true,
        },
      });
    } else {
      temp = axios.get(getNftStargazeURL, {
        params: {
          address: stargaze.address,
        },
      });
    }
    promiseArray.push(temp);
  }
  let allChainNftBackend;
  try {
    allChainNftBackend = await Promise.all(promiseArray);
  } catch (e) {
    // showModal('state', {type: 'error', title: 'Network Timeout Error', description: 'NFT portfolio has not loaded yet try refreshing in a while!', onSuccess: hideModal, onFailure: hideModal});
    Toast.show({
      type: 'error',
      text1: 'Network Timeout Error',
      text2: 'NFT portfolio has not loaded yet try refreshing in a while!',
      position: 'bottom',
    });
    Sentry.captureException('nft_portfolio_network_error');
    return null;
  }
  let index = 0;
  let collectionId = 0;
  for (const chains in ChainBackendNames) {
    if (['COSMOS', 'OSMOSIS', 'JUNO'].includes(chains)) {
      continue;
    }
    const chainData = allChainNftBackend
      ? allChainNftBackend[index++].data.holdings
      : '';
    const tempCollections: Map<string, any> = new Map();
    for (const holding of chainData) {
      if (tempCollections.has(holding.token_address)) {
        const data = tempCollections.get(holding.token_address);
        if (holding.image) {
          data.collections.push({
            image: holding.image,
            id: data.count,
            address: holding.token_address,
            tokenId: holding.token_id,
            symbol: data.collections[0].symbol,
          });
        }
        tempCollections.set(holding.token_address, {
          name: holding.name,
          id: data.id,
          count: Number(data.count) + 1,
          collections: data.collections,
          description: holding.description,
          timestamp: new Date().toISOString(),
        });
      } else {
        tempCollections.set(holding.token_address, {
          name: holding.name,
          id: collectionId,
          count: 1,
          collections: [
            {
              image: holding.image,
              id: 0,
              address: holding.token_address,
              tokenId: holding.token_id,
              symbol: chains,
            },
          ],
          description: holding.description,
          timestamp: new Date().toISOString(),
        });
        collectionId++;
      }
    }

    const chainNftData: ChainNftHoldings[] = [];
    tempCollections.forEach((value) => {
      chainNftData.push(value);
    });
    if (allChainNftHoldings['ALL CHAINS'] && chainNftData) {
      allChainNftHoldings['ALL CHAINS'] =
        allChainNftHoldings['ALL CHAINS'].concat(chainNftData);
    } else
      allChainNftHoldings['ALL CHAINS'] =
        allChainNftHoldings['ALL CHAINS'] || chainNftData;

    switch (chains) {
      case CHAIN_ETH.backendName:
        allChainNftHoldings.ETH = chainNftData;
        break;
      case CHAIN_POLYGON.backendName:
        allChainNftHoldings.MATIC = chainNftData;
        break;
      case CHAIN_BSC.backendName:
        allChainNftHoldings.BNB = chainNftData;
        break;
      case CHAIN_AVALANCHE.backendName:
        allChainNftHoldings.AVAX = chainNftData;
        break;
      case CHAIN_FTM.backendName:
        allChainNftHoldings.FTM = chainNftData;
        break;
      case CHAIN_ARBITRUM.backendName:
        allChainNftHoldings.ARBITRUM = chainNftData;
        break;
      case CHAIN_OPTIMISM.backendName:
        allChainNftHoldings.OPTIMISM = chainNftData;
        break;
      case CHAIN_EVMOS.backendName:
        allChainNftHoldings.EVMOS = chainNftData;
        break;
      case CHAIN_STARGAZE.backendName:
        allChainNftHoldings.STARS = chainNftData;
        break;
      case CHAIN_NOBLE.backendName:
        allChainNftHoldings.NOBLE = chainNftData;
        break;
      case CHAIN_SHARDEUM.backendName:
        allChainNftHoldings.SHM = chainNftData;
        break;
    }
  }
  await storePortfolioData(
    allChainNftHoldings,
    ethereum,
    portfolioState,
    'ALL_NFT'
  );
  return allChainNftHoldings;
}

export function sortDesc(a: any, b: any) {
  const first =
    parseFloat(get(a, 'totalValue', 0)) +
    parseFloat(get(a, 'actualStakedBalance', 0));
  const second =
    parseFloat(get(b, 'totalValue', 0)) +
    parseFloat(get(b, 'actualStakedBalance', 0));
  if (first < second) {
    return 1;
  } else if (first > second) {
    return -1;
  }
  return 0;
}

export async function getPortfolioModel(
  ethereum: any,
  portfolioState: any,
  archCall: any
): Promise<WalletHoldings> {
  let id = 1;
  let totalUnverifiedBalance = 0;
  let totalBalance = 0;
  let totalStakedBalance = 0;
  let totalUnbondingBalance = 0;
  let ethHoldings;
  let maticHoldings;
  let bscHoldings;
  let avaxHoldings;
  let evmosHoldings;
  let cosmosHoldings;
  let osmosisHoldings;
  let junoHoldings;
  let stargazeHoldings;
  let nobleHoldings;
  let shardeumHoldings;
  let shardeumSphinxHoldings;
  let totalHoldings: Holding[] = [];
  let ftmHoldings;
  let arbitrumHoldings;
  let optimismHoldings;
  const allChains = new Set([
    CHAIN_AVALANCHE.backendName,
    CHAIN_BSC.backendName,
    CHAIN_COSMOS.backendName,
    CHAIN_ETH.backendName,
    CHAIN_EVMOS.backendName,
    CHAIN_FTM.backendName,
    CHAIN_ARBITRUM.backendName,
    CHAIN_OSMOSIS.backendName,
    CHAIN_JUNO.backendName,
    CHAIN_POLYGON.backendName,
    CHAIN_OPTIMISM.backendName,
    CHAIN_NOBLE.backendName,
    CHAIN_SHARDEUM.backendName,
    CHAIN_SHARDEUM_SPHINX.backendName,
  ]);

  const fetchedChains = new Set<ChainBackendNames | 'ALL'>();

  const cosmoholdings = archCall.data.chain_portfolios;
  let allholdings;
  if (cosmoholdings) {
    allholdings = cosmoholdings;
  } else allholdings = [];

  for (let i = 0; i < allholdings.length; i++) {
    let chainStakedBalance = 0;
    let chainUnbondingBalance = 0;
    const tokenHoldings: Holding[] = [];
    const currentHoldings = allholdings[i]?.token_holdings || [];

    for (const holding of currentHoldings) {
      const tokenHolding: Holding = {
        name: holding.name,
        symbol: holding.symbol,
        logoUrl: holding.logo_url,
        price: holding.price,
        contractAddress: holding.contract_address,
        balance: holding.balance,
        contractDecimals: holding.contract_decimals,
        totalValue: holding.total_value,
        actualBalance: holding.actual_balance,
        isVerified: holding.is_verified,
        coinGeckoId: holding.coin_gecko_id,
        about: holding.about,
        id: id++,
        price24h: holding.price24h,
        stakedBalance: holding.stakedBalance
          ? holding.stakedBalance
          : undefined,
        actualStakedBalance: holding.actualStakedBalance
          ? holding.actualStakedBalance
          : 0,
        stakedBalanceTotalValue: holding.stakedBalanceTotalValue
          ? holding.stakedBalanceTotalValue
          : 0,
        actualUnbondingBalance: holding.actualUnbondingBalance
          ? holding.actualUnbondingBalance
          : 0,
        unbondingBalanceTotalValue: holding.unbondingBalanceTotalValue
          ? holding.unbondingBalanceTotalValue
          : 0,
        isBridgeable: holding.isBridgeable,
        isSwapable: holding.isSwapable,
        isStakeable: holding.isStakeable ?? false,
      };
      if (has(holding, 'isMainnet')) {
        tokenHolding.isMainnet = holding.isMainnet;
      } else {
        tokenHolding.isMainnet = true;
      }
      if (holding?.denom) tokenHolding.denom = holding.denom;
      switch (allholdings[i]?.chain_id) {
        case CHAIN_ETH.backendName:
          tokenHolding.chainDetails = CHAIN_ETH;
          break;
        case CHAIN_POLYGON.backendName:
          tokenHolding.chainDetails = CHAIN_POLYGON;
          break;
        case CHAIN_BSC.backendName:
          tokenHolding.chainDetails = CHAIN_BSC;
          break;
        case CHAIN_AVALANCHE.backendName:
          tokenHolding.chainDetails = CHAIN_AVALANCHE;
          break;
        case CHAIN_FTM.backendName:
          tokenHolding.chainDetails = CHAIN_FTM;
          break;
        case CHAIN_ARBITRUM.backendName:
          tokenHolding.chainDetails = CHAIN_ARBITRUM;
          break;
        case CHAIN_OPTIMISM.backendName:
          tokenHolding.chainDetails = CHAIN_OPTIMISM;
          break;
        case CHAIN_EVMOS.backendName:
          tokenHolding.chainDetails = CHAIN_EVMOS;
          break;
        case CHAIN_COSMOS.backendName:
          tokenHolding.chainDetails = CHAIN_COSMOS;
          break;
        case CHAIN_OSMOSIS.backendName:
          tokenHolding.chainDetails = CHAIN_OSMOSIS;
          break;
        case CHAIN_JUNO.backendName:
          tokenHolding.chainDetails = CHAIN_JUNO;
          break;
        case CHAIN_STARGAZE.backendName:
          tokenHolding.chainDetails = CHAIN_STARGAZE;
          break;
        case CHAIN_NOBLE.backendName:
          tokenHolding.chainDetails = CHAIN_NOBLE;
          break;
        case CHAIN_SHARDEUM.backendName:
          tokenHolding.chainDetails = CHAIN_SHARDEUM;
          break;
        case CHAIN_SHARDEUM_SPHINX.backendName:
          tokenHolding.chainDetails = CHAIN_SHARDEUM_SPHINX;
          break;
      }
      if (has(tokenHolding, 'chainDetails')) {
        tokenHoldings.push(tokenHolding);
        totalHoldings.push(tokenHolding);
      }
      chainStakedBalance += tokenHolding.actualStakedBalance;
      chainUnbondingBalance += Number(tokenHolding.actualUnbondingBalance);
    }

    const chainTotalBalance = allholdings[i]?.total_value
      ? parseFloat(allholdings[i]?.total_value)
      : 0;
    const chainUnVerifiedBalance = allholdings[i]?.unverfied_total_value
      ? parseFloat(allholdings[i]?.unverfied_total_value)
      : 0;
    const chainHoldings: ChainHoldings = {
      chainUnVerifiedBalance,
      chainTotalBalance,
      chainStakedBalance,
      chainUnbondingBalance,
      holdings: tokenHoldings,
      timestamp: new Date().toISOString(),
    };
    totalBalance += chainTotalBalance;
    totalUnverifiedBalance += chainUnVerifiedBalance;
    totalStakedBalance += chainStakedBalance;
    totalUnbondingBalance += chainUnbondingBalance;

    fetchedChains.add(allholdings[i]?.chain_id);
    await storePortfolioData(
      chainHoldings,
      ethereum,
      portfolioState,
      allholdings[i]?.chain_id
    );

    chainHoldings.holdings.sort(sortDesc);

    switch (allholdings[i]?.chain_id) {
      case CHAIN_ETH.backendName:
        ethHoldings = chainHoldings;
        break;
      case CHAIN_POLYGON.backendName:
        maticHoldings = chainHoldings;
        break;
      case CHAIN_BSC.backendName:
        bscHoldings = chainHoldings;
        break;
      case CHAIN_AVALANCHE.backendName:
        avaxHoldings = chainHoldings;
        break;
      case CHAIN_FTM.backendName:
        ftmHoldings = chainHoldings;
        break;
      case CHAIN_ARBITRUM.backendName:
        arbitrumHoldings = chainHoldings;
        break;
      case CHAIN_OPTIMISM.backendName:
        optimismHoldings = chainHoldings;
        break;
      case CHAIN_EVMOS.backendName:
        evmosHoldings = chainHoldings;
        break;
      case CHAIN_COSMOS.backendName:
        cosmosHoldings = chainHoldings;
        break;
      case CHAIN_OSMOSIS.backendName:
        osmosisHoldings = chainHoldings;
        break;
      case CHAIN_JUNO.backendName:
        junoHoldings = chainHoldings;
        break;
      case CHAIN_STARGAZE.backendName:
        stargazeHoldings = chainHoldings;
        break;
      case CHAIN_NOBLE.backendName:
        nobleHoldings = chainHoldings;
        break;
      case CHAIN_SHARDEUM.backendName:
        shardeumHoldings = chainHoldings;
        break;
      case CHAIN_SHARDEUM_SPHINX.backendName:
        shardeumSphinxHoldings = chainHoldings;
        break;
    }
  }
  const remainingChains = new Set(
    [...allChains].filter((x) => !fetchedChains.has(x))
  );

  if (remainingChains.size > 0 && portfolioState.statePortfolio.developerMode) {
    // showModal('state', {type: 'info', title: `Not refreshed : ${[...remainingChains].join(' ')}`, description: 'Try refreshing in a while!', onSuccess: hideModal, onFailure: hideModal});
    Toast.show({
      type: 'info',
      text1: `Not refreshed : ${[...remainingChains].join(' ')}`,
      text2: 'Try refreshing in a while!',
      position: 'bottom',
    });
  }

  for (const chain of remainingChains) {
    const chainData = await getPortfolioData(ethereum, portfolioState, chain);
    if (chainData?.data) {
      const chainHoldings = chainData.data || [];
      for (const cHoldings of chainHoldings.holdings) {
        cHoldings.id = id++; // Replacing id global id to avoid overlapping
      }
      if (totalHoldings && chainHoldings.holdings) {
        totalHoldings = totalHoldings.concat(chainHoldings.holdings);
      } else totalHoldings = totalHoldings || chainHoldings.holdings;

      totalBalance += parseFloat(chainHoldings.chainTotalBalance);
      totalUnverifiedBalance += parseFloat(
        chainHoldings.chainUnVerifiedBalance
      );

      chainHoldings.holdings.sort(sortDesc);
      switch (chain) {
        case CHAIN_ETH.backendName:
          ethHoldings = chainHoldings;
          break;
        case CHAIN_POLYGON.backendName:
          maticHoldings = chainHoldings;
          break;
        case CHAIN_BSC.backendName:
          bscHoldings = chainHoldings;
          break;
        case CHAIN_AVALANCHE.backendName:
          avaxHoldings = chainHoldings;
          break;
        case CHAIN_FTM.backendName:
          ftmHoldings = chainHoldings;
          break;
        case CHAIN_ARBITRUM.backendName:
          arbitrumHoldings = chainHoldings;
          break;
        case CHAIN_OPTIMISM.backendName:
          optimismHoldings = chainHoldings;
          break;
        case CHAIN_EVMOS.backendName:
          evmosHoldings = chainHoldings;
          break;
        case CHAIN_COSMOS.backendName:
          cosmosHoldings = chainHoldings;
          break;
        case CHAIN_OSMOSIS.backendName:
          osmosisHoldings = chainHoldings;
          break;
        case CHAIN_JUNO.backendName:
          junoHoldings = chainHoldings;
          break;
        case CHAIN_STARGAZE.backendName:
          stargazeHoldings = chainHoldings;
          break;
        case CHAIN_NOBLE.backendName:
          nobleHoldings = chainHoldings;
          break;
        case CHAIN_SHARDEUM.backendName:
          shardeumHoldings = chainHoldings;
          break;
        case CHAIN_SHARDEUM_SPHINX.backendName:
          shardeumSphinxHoldings = chainHoldings;
          break;
      }
    }
  }

  totalHoldings.sort(sortDesc);

  const portfolio: WalletHoldings = {
    totalBalance,
    totalUnverifiedBalance,
    totalStakedBalance,
    totalUnbondingBalance,
    eth: ethHoldings,
    polygon: maticHoldings,
    bsc: bscHoldings,
    avalanche: avaxHoldings,
    evmos: evmosHoldings,
    cosmos: cosmosHoldings,
    osmosis: osmosisHoldings,
    juno: junoHoldings,
    stargaze: stargazeHoldings,
    noble: nobleHoldings,
    optimism: optimismHoldings,
    fantom: ftmHoldings,
    arbitrum: arbitrumHoldings,
    shardeum: shardeumHoldings,
    shardeum_sphinx: shardeumSphinxHoldings,
    totalHoldings,
  };
  await storePortfolioData(portfolio, ethereum, portfolioState);
  return portfolio;
}

export async function fetchTokenData(
  hdWalletState: { state: { wallet: any } },
  portfolioState: any
) {
  console.log('fetchTokenData');
  console.log(portfolioState.statePortfolio);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const fromAnkr: boolean = portfolioState.statePortfolio.developerMode;
  const cosmosPortfolioUrl = `${ARCH_HOST}/v1/portfolio/balances?ankr=${
    fromAnkr as unknown as string
  }`;
  const { isReadOnlyWallet } = hdWalletState.state;
  const { cosmos, osmosis, juno, stargaze, noble, ethereum } =
    hdWalletState.state.wallet;
  if (ethereum.address !== 'null') {
    const localPortfolio = await getPortfolioData(ethereum, portfolioState);
    const portfolio: WalletHoldings | null = localPortfolio
      ? (localPortfolio.data as unknown as WalletHoldings)
      : null;

    const updatedTime =
      localPortfolio !== null
        ? localPortfolio.timestamp
        : new Date().toISOString();

    if (
      portfolio &&
      portfolioState.statePortfolio.tokenPortfolio === undefined
    ) {
      if (
        portfolio?.totalUnverifiedBalance +
          portfolio?.totalBalance +
          portfolio?.totalStakedBalance >
        0
      ) {
        console.log('not empty dispatch');
        portfolioState.dispatchPortfolio({
          value: {
            tokenPortfolio: portfolio,
            portfolioState: PORTFOLIO_NOT_EMPTY,
            rtimestamp: updatedTime,
          },
        });
      } else {
        portfolioState.dispatchPortfolio({
          value: {
            tokenPortfolio: portfolio,
            portfolioState: PORTFOLIO_EMPTY,
            rtimestamp: updatedTime,
          },
        });
      }
    }
    let params = {
      'chains[]': PORTFOLIO_CHAINS_BACKEND_NAMES,
      allowTestnet: true,
      'address[]': [
        cosmos?.wallets[cosmos?.currentIndex]?.address,
        osmosis?.wallets[osmosis?.currentIndex]?.address,
        juno?.wallets[juno?.currentIndex]?.address,
        stargaze?.address,
        noble?.address,
        ethereum.address,
      ],
    };
    if (isReadOnlyWallet) {
      params = {
        allowTestnet: true,
        'chains[]': PORTFOLIO_CHAINS_BACKEND_NAMES,
        'address[]': [ethereum.address],
      };
    }
    const archCall = axios.get(cosmosPortfolioUrl, {
      params,
      timeout: 25000,
      paramsSerializer: function (params) {
        return qs.stringify(params, { arrayFormat: 'repeat' });
      },
    });

    const promiseArray: Array<Promise<any>> = [archCall];
    let result, archBackend;
    try {
      result = await Promise.all(promiseArray);
      archBackend = result[0];
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Network Timeout Error',
        text2: 'Try refreshing in a while!',
        position: 'bottom',
      });
    }

    if (archBackend && archBackend?.status === 200) {
      let newPortfolio = portfolio;
      if (archBackend.data.chain_portfolios.length > 0) {
        newPortfolio = await getPortfolioModel(
          ethereum,
          portfolioState,
          archBackend
        );
      }

      if (
        newPortfolio &&
        newPortfolio?.totalUnverifiedBalance +
          newPortfolio?.totalBalance +
          newPortfolio?.totalStakedBalance >
          0
      ) {
        console.log('newPortfolio dispatch');
        portfolioState.dispatchPortfolio({
          value: {
            tokenPortfolio: newPortfolio,
            portfolioState: PORTFOLIO_NOT_EMPTY,
            rtimestamp: new Date().toISOString(),
          },
        });
      } else {
        portfolioState.dispatchPortfolio({
          value: {
            tokenPortfolio: newPortfolio,
            portfolioState: PORTFOLIO_EMPTY,
            rtimestamp: new Date().toISOString(),
          },
        });
        // portfolioState.dispatchPortfolio({ value: { portfolioState: PORTFOLIO_EMPTY } });
      }
    } else if (portfolio) {
      // showModal('state', {: 'error', title: 'Network Timeout Error', description: 'Try refreshing in a while!', onSuccess: hideModal, onFailure: hideModal});
      Toast.show({
        type: 'error',
        text1: 'Network Timeout Error',
        text2: 'Try refreshing in a while!',
        position: 'bottom',
      });
    } else {
      portfolioState.dispatchPortfolio({
        value: { portfolioState: PORTFOLIO_ERROR },
      });
      // showModal('state', {type: 'error', title: 'Portfolio not loaded', description: 'Try restarting the app! Check network status', onSuccess: hideModal, onFailure: hideModal});
      Toast.show({
        type: 'error',
        text1: 'Portfolio not loaded',
        text2: 'Try restarting the app! Check network status.',
        position: 'bottom',
      });
      Sentry.captureException('portfolio_not_load_edgecase');
    }
  }
}

export async function fetchRequiredTokenData(
  chain: string,
  address: string,
  symbol?: string
) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const portfolioUrl = `${ARCH_HOST}/v1/portfolio/balances?`;
  const params = {
    'chains[]': [chain],
    'address[]': [address],
  };
  const response = await axios.get(portfolioUrl, {
    params,
    timeout: 25000,
    paramsSerializer: function (params) {
      return qs.stringify(params, { arrayFormat: 'repeat' });
    },
  });
  if (response.data) {
    if (symbol) {
      const tokenHoldings = response.data.chain_portfolios[0].token_holdings;
      const tokenData = tokenHoldings?.find((token) => token.symbol === symbol);
      return tokenData;
    } else {
      return response.data;
    }
  } else {
    return false;
  }
}
