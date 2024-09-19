import {
  Chain,
  ChainBackendNames,
  CHAIN_AVALANCHE,
  CHAIN_BSC,
  CHAIN_COLLECTION,
  CHAIN_COSMOS,
  CHAIN_ETH,
  CHAIN_OSMOSIS,
  CHAIN_POLYGON,
  CHAIN_JUNO,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_STARGAZE,
  CHAIN_NOBLE,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_POLYGON_ZKEVM,
  PORTFOLIO_CHAINS_BACKEND_NAMES,
  CHAIN_AURORA,
  CHAIN_MOONBEAM,
  CHAIN_MOONRIVER,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_KUJIRA,
  CHAIN_SOLANA,
} from '../constants/server';
import {
  PORTFOLIO_EMPTY,
  PORTFOLIO_ERROR,
  PORTFOLIO_NOT_EMPTY,
} from '../reducers/portfolio_reducer';
import Toast from 'react-native-toast-message';
import { getPortfolioData, storePortfolioData } from './asyncStorage';
import axios from './Http';
import * as Sentry from '@sentry/react-native';
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
  chainDetails: Chain;
  denom: string;
  stakedBalance?: string;
  actualStakedBalance: number;
  stakedBalanceTotalValue?: number;
  price24h?: number | string;
  unbondingBalanceTotalValue?: number;
  actualUnbondingBalance?: number;
  isMainnet?: boolean;
  isNativeToken: boolean;
  isFundable: boolean;
  isBridgeable: boolean;
  isSwapable: boolean;
  isStakeable?: boolean;
  isZeroFeeCardFunding?: boolean;
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
  arbitrum: ChainHoldings | undefined;
  optimism: ChainHoldings | undefined;
  cosmos: ChainHoldings | undefined;
  osmosis: ChainHoldings | undefined;
  juno: ChainHoldings | undefined;
  stargaze: ChainHoldings | undefined;
  noble: ChainHoldings | undefined;
  shardeum: ChainHoldings | undefined;
  shardeum_sphinx: ChainHoldings | undefined;
  zksync_era: ChainHoldings | undefined;
  base: ChainHoldings | undefined;
  polygon_zkevm: ChainHoldings | undefined;
  aurora: ChainHoldings | undefined;
  moonbeam: ChainHoldings | undefined;
  moonriver: ChainHoldings | undefined;
  coreum: ChainHoldings | undefined;
  injective: ChainHoldings | undefined;
  kujira: ChainHoldings | undefined;
  solana: ChainHoldings | undefined;
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
  ARBITRUM: ChainNftHoldings[] | undefined;
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
  chain: Chain,
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
    case CHAIN_ARBITRUM.backendName:
      return portfolio.arbitrum;
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
    case CHAIN_ZKSYNC_ERA.backendName:
      return portfolio.zksync_era;
    case CHAIN_BASE.backendName:
      return portfolio.base;
    case CHAIN_POLYGON_ZKEVM.backendName:
      return portfolio.polygon_zkevm;
    case CHAIN_AURORA.backendName:
      return portfolio.aurora;
    case CHAIN_MOONBEAM.backendName:
      return portfolio.moonbeam;
    case CHAIN_MOONRIVER.backendName:
      return portfolio.moonriver;
    case CHAIN_COREUM.backendName:
      return portfolio.coreum;
    case CHAIN_INJECTIVE.backendName:
      return portfolio.injective;
    case CHAIN_KUJIRA.backendName:
      return portfolio.kujira;
    case CHAIN_SOLANA.backendName:
      return portfolio.solana;
    default:
      return portfolio;
  }
}

export async function fetchNftDatav2(
  portfolioState: any,
  ethereum: any,
  stargaze: any,
) {
  const allChainNftHoldings: NftHoldings = {
    ETH: [],
    MATIC: [],
    BNB: [],
    AVAX: [],
    ARBITRUM: [],
    OPTIMISM: [],
    COSMOS: [],
    OSMO: [],
    JUNO: [],
    STARS: [],
    NOBLE: [],
    SHM: [],
    'ALL CHAINS': [],
  };
  const cursor = '';
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
    tempCollections.forEach(value => {
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
      case CHAIN_ARBITRUM.backendName:
        allChainNftHoldings.ARBITRUM = chainNftData;
        break;
      case CHAIN_OPTIMISM.backendName:
        allChainNftHoldings.OPTIMISM = chainNftData;
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
    'ALL_NFT',
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
  archCall: any,
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
  let cosmosHoldings;
  let osmosisHoldings;
  let junoHoldings;
  let stargazeHoldings;
  let nobleHoldings;
  let coreumHoldings;
  let injectiveHoldings;
  let kujiraHoldings;
  let shardeumHoldings;
  let shardeumSphinxHoldings;
  let totalHoldings: Holding[] = [];
  let arbitrumHoldings;
  let optimismHoldings;
  let zksyncEraHoldings;
  let baseHoldings;
  let polygonZkevmHoldings;
  let auroraHoldings;
  let moonbeamHoldings;
  let moonriverHoldings;
  let solanaHoldings;
  const allChains = new Set([
    CHAIN_AVALANCHE.backendName,
    CHAIN_BSC.backendName,
    CHAIN_COSMOS.backendName,
    CHAIN_ETH.backendName,
    CHAIN_ARBITRUM.backendName,
    CHAIN_OSMOSIS.backendName,
    CHAIN_JUNO.backendName,
    CHAIN_POLYGON.backendName,
    CHAIN_OPTIMISM.backendName,
    CHAIN_NOBLE.backendName,
    CHAIN_SHARDEUM.backendName,
    CHAIN_SHARDEUM_SPHINX.backendName,
    CHAIN_ZKSYNC_ERA.backendName,
    CHAIN_BASE.backendName,
    CHAIN_POLYGON_ZKEVM.backendName,
    CHAIN_AURORA.backendName,
    CHAIN_MOONBEAM.backendName,
    CHAIN_MOONRIVER.backendName,
    CHAIN_COREUM.backendName,
    CHAIN_INJECTIVE.backendName,
    CHAIN_KUJIRA.backendName,
    CHAIN_SOLANA.backendName,
  ]);

  const fetchedChains = new Set<ChainBackendNames | 'ALL'>();

  const tokenHoldings = archCall.data.chainPortfolios;
  let allholdings;
  if (tokenHoldings) {
    allholdings = tokenHoldings;
  } else allholdings = [];

  for (let i = 0; i < allholdings.length; i++) {
    let chainStakedBalance = 0;
    let chainUnbondingBalance = 0;
    const tokenHoldings: Holding[] = [];
    const currentHoldings = allholdings[i]?.tokens || [];

    for (const holding of currentHoldings) {
      const { flags } = holding;
      const tokenHolding: Holding = {
        name: holding.name,
        symbol: holding.symbol,
        logoUrl: holding.logoUrl,
        price: holding.price,
        contractAddress: holding.contractAddress,
        balance: holding.balanceInInteger,
        contractDecimals: holding.decimals,
        totalValue: holding.totalValue,
        actualBalance: holding.actualBalance,
        isVerified: flags.verified,
        coinGeckoId: holding.coingeckoId,
        about: '',
        id: id++,
        price24h: holding.coingeckoId ?? 'NA',
        stakedBalance: holding.stakedBalance ?? undefined,
        actualStakedBalance: holding.actualStakedBalance ?? 0,
        stakedBalanceTotalValue: holding.stakedBalanceTotalValue ?? 0,
        actualUnbondingBalance: holding.actualUnbondingBalance ?? 0,
        unbondingBalanceTotalValue: holding.unbondingBalanceTotalValue ?? 0,
        isNativeToken: flags.nativeToken,
        isFundable: flags.fundable,
        isBridgeable: flags.bridgeable,
        isSwapable: flags.swapable,
        isStakeable: flags.stakeable ?? false,
        isZeroFeeCardFunding: flags.zeroFeeToken ?? false,
      };
      if (has(holding, 'isMainnet')) {
        tokenHolding.isMainnet = holding.isMainnet;
      } else {
        tokenHolding.isMainnet = true;
      }
      if (holding?.denom) tokenHolding.denom = holding.denom;
      switch (allholdings[i]?.chain) {
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
        case CHAIN_ARBITRUM.backendName:
          tokenHolding.chainDetails = CHAIN_ARBITRUM;
          break;
        case CHAIN_OPTIMISM.backendName:
          tokenHolding.chainDetails = CHAIN_OPTIMISM;
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
        case CHAIN_POLYGON_ZKEVM.backendName:
          tokenHolding.chainDetails = CHAIN_POLYGON_ZKEVM;
          break;
        case CHAIN_ZKSYNC_ERA.backendName:
          tokenHolding.chainDetails = CHAIN_ZKSYNC_ERA;
          break;
        case CHAIN_BASE.backendName:
          tokenHolding.chainDetails = CHAIN_BASE;
          break;
        case CHAIN_AURORA.backendName:
          tokenHolding.chainDetails = CHAIN_AURORA;
          break;
        case CHAIN_MOONBEAM.backendName:
          tokenHolding.chainDetails = CHAIN_MOONBEAM;
          break;
        case CHAIN_MOONRIVER.backendName:
          tokenHolding.chainDetails = CHAIN_MOONRIVER;
          break;
        case CHAIN_COREUM.backendName:
          tokenHolding.chainDetails = CHAIN_COREUM;
          break;
        case CHAIN_KUJIRA.backendName:
          tokenHolding.chainDetails = CHAIN_KUJIRA;
          break;
        case CHAIN_INJECTIVE.backendName:
          tokenHolding.chainDetails = CHAIN_INJECTIVE;
          break;
        case CHAIN_SOLANA.backendName:
          tokenHolding.chainDetails = CHAIN_SOLANA;
          break;
      }
      if (has(tokenHolding, 'chainDetails')) {
        tokenHoldings.push(tokenHolding);
        totalHoldings.push(tokenHolding);
      }
      chainStakedBalance += tokenHolding.actualStakedBalance;
      chainUnbondingBalance += Number(tokenHolding.actualUnbondingBalance);
    }

    const chainTotalBalance = allholdings[i]?.totalValue
      ? parseFloat(allholdings[i]?.totalValue)
      : 0;
    const chainUnVerifiedBalance = allholdings[i]?.unverifiedTotalValue
      ? parseFloat(allholdings[i]?.unverifiedTotalValue)
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

    fetchedChains.add(allholdings[i]?.chain);
    await storePortfolioData(
      chainHoldings,
      ethereum,
      portfolioState,
      allholdings[i]?.chain,
    );

    chainHoldings.holdings.sort(sortDesc);

    switch (allholdings[i]?.chain) {
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
      case CHAIN_ARBITRUM.backendName:
        arbitrumHoldings = chainHoldings;
        break;
      case CHAIN_OPTIMISM.backendName:
        optimismHoldings = chainHoldings;
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
      case CHAIN_POLYGON_ZKEVM.backendName:
        polygonZkevmHoldings = chainHoldings;
        break;
      case CHAIN_ZKSYNC_ERA.backendName:
        zksyncEraHoldings = chainHoldings;
        break;
      case CHAIN_BASE.backendName:
        baseHoldings = chainHoldings;
        break;
      case CHAIN_AURORA.backendName:
        auroraHoldings = chainHoldings;
        break;
      case CHAIN_MOONBEAM.backendName:
        moonbeamHoldings = chainHoldings;
        break;
      case CHAIN_MOONRIVER.backendName:
        moonriverHoldings = chainHoldings;
        break;
      case CHAIN_COREUM.backendName:
        coreumHoldings = chainHoldings;
        break;
      case CHAIN_KUJIRA.backendName:
        kujiraHoldings = chainHoldings;
        break;
      case CHAIN_INJECTIVE.backendName:
        injectiveHoldings = chainHoldings;
        break;
      case CHAIN_SOLANA.backendName:
        solanaHoldings = chainHoldings;
        break;
    }
  }
  const remainingChains = new Set(
    [...allChains].filter(x => !fetchedChains.has(x)),
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
        chainHoldings.chainUnVerifiedBalance,
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
        case CHAIN_ARBITRUM.backendName:
          arbitrumHoldings = chainHoldings;
          break;
        case CHAIN_OPTIMISM.backendName:
          optimismHoldings = chainHoldings;
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
        case CHAIN_POLYGON_ZKEVM.backendName:
          polygonZkevmHoldings = chainHoldings;
          break;
        case CHAIN_ZKSYNC_ERA.backendName:
          zksyncEraHoldings = chainHoldings;
          break;
        case CHAIN_BASE.backendName:
          baseHoldings = chainHoldings;
          break;
        case CHAIN_AURORA.backendName:
          auroraHoldings = chainHoldings;
          break;
        case CHAIN_MOONBEAM.backendName:
          moonbeamHoldings = chainHoldings;
          break;
        case CHAIN_MOONRIVER.backendName:
          moonriverHoldings = chainHoldings;
          break;
        case CHAIN_COREUM.backendName:
          coreumHoldings = chainHoldings;
          break;
        case CHAIN_KUJIRA.backendName:
          kujiraHoldings = chainHoldings;
          break;
        case CHAIN_INJECTIVE.backendName:
          injectiveHoldings = chainHoldings;
          break;
        case CHAIN_SOLANA.backendName:
          solanaHoldings = chainHoldings;
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
    cosmos: cosmosHoldings,
    osmosis: osmosisHoldings,
    juno: junoHoldings,
    stargaze: stargazeHoldings,
    noble: nobleHoldings,
    optimism: optimismHoldings,
    arbitrum: arbitrumHoldings,
    shardeum: shardeumHoldings,
    shardeum_sphinx: shardeumSphinxHoldings,
    zksync_era: zksyncEraHoldings,
    base: baseHoldings,
    polygon_zkevm: polygonZkevmHoldings,
    aurora: auroraHoldings,
    moonbeam: moonbeamHoldings,
    moonriver: moonriverHoldings,
    coreum: coreumHoldings,
    injective: injectiveHoldings,
    kujira: kujiraHoldings,
    solana: solanaHoldings,
    totalHoldings,
  };
  await storePortfolioData(portfolio, ethereum, portfolioState);
  return portfolio;
}

export async function fetchTokenData(
  hdWalletState: { state: { wallet: any; isReadOnlyWallet: boolean } },
  portfolioState: any,
  isVerifyCoinChecked = true,
) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const portfolioUrl = `${ARCH_HOST}/v1/portfolio/balances`;
  const {
    cosmos,
    osmosis,
    juno,
    stargaze,
    noble,
    ethereum,
    coreum,
    injective,
    kujira,
    solana,
  } = hdWalletState.state.wallet;
  if (ethereum.address !== 'null') {
    const localPortfolio = await getPortfolioData(ethereum, portfolioState);
    console.log(localPortfolio);
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
    const addresses = [
      cosmos?.wallets[cosmos?.currentIndex]?.address,
      osmosis?.wallets[osmosis?.currentIndex]?.address,
      juno?.wallets[juno?.currentIndex]?.address,
      stargaze?.address,
      noble?.address,
      coreum?.address,
      injective?.address,
      kujira?.address,
      ethereum.address,
      solana.address,
    ].filter(address => address !== undefined);
    const payload = {
      chains: PORTFOLIO_CHAINS_BACKEND_NAMES,
      addresses,
      allowTestNets: false,
      isVerified: isVerifyCoinChecked,
    };
    const archBackend = await axios.post(portfolioUrl, payload);
    if (archBackend && archBackend?.status === 201) {
      let newPortfolio = portfolio;
      if (archBackend.data.chainPortfolios.length > 0) {
        newPortfolio = await getPortfolioModel(
          ethereum,
          portfolioState,
          archBackend,
        );
      }

      if (
        newPortfolio &&
        newPortfolio?.totalUnverifiedBalance +
          newPortfolio?.totalBalance +
          newPortfolio?.totalStakedBalance >
          0
      ) {
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
  symbol?: string,
) {
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const portfolioUrl = `${ARCH_HOST}/v1/portfolio/balances`;
  const payload = {
    chains: [chain],
    addresses: [address],
  };
  const response = await axios.post(
    portfolioUrl,
    {
      ...payload,
    },
    { timeout: 25000 },
  );
  if (response.data) {
    if (symbol) {
      const tokenHoldings = response.data.chainPortfolios[0].tokens;
      const tokenData = tokenHoldings?.find(
        (token: { symbol: string }) => token.symbol === symbol,
      );
      return tokenData;
    } else {
      return response.data;
    }
  } else {
    return false;
  }
}
