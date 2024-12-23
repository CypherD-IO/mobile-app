import {
  Chain,
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
  CHAIN_AURORA,
  CHAIN_MOONBEAM,
  CHAIN_MOONRIVER,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_KUJIRA,
  CHAIN_SOLANA,
} from '../constants/server';
import axios from './Http';
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
  totalBalance: number;
  totalUnverifiedBalance: number;
  totalStakedBalance: number;
  totalUnbondingBalance: number;
  totalHoldings: Holding[];
  timestamp: string;
}

export interface WalletHoldings {
  totalBalance: number;
  totalUnverifiedBalance: number;
  totalStakedBalance: number;
  totalUnbondingBalance: number;
  eth: ChainHoldings;
  polygon: ChainHoldings;
  bsc: ChainHoldings;
  avalanche: ChainHoldings;
  arbitrum: ChainHoldings;
  optimism: ChainHoldings;
  cosmos: ChainHoldings;
  osmosis: ChainHoldings;
  juno: ChainHoldings;
  stargaze: ChainHoldings;
  noble: ChainHoldings;
  shardeum: ChainHoldings;
  shardeum_sphinx: ChainHoldings;
  zksync_era: ChainHoldings;
  base: ChainHoldings;
  polygon_zkevm: ChainHoldings;
  aurora: ChainHoldings;
  moonbeam: ChainHoldings;
  moonriver: ChainHoldings;
  coreum: ChainHoldings;
  injective: ChainHoldings;
  kujira: ChainHoldings;
  solana: ChainHoldings;
  totalHoldings: Holding[];
  timestamp: string;
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
): ChainHoldings {
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
      return portfolio;
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

export function sortDesc(a: Holding, b: Holding) {
  const first =
    parseFloat(String(get(a, 'totalValue', 0))) +
    parseFloat(String(get(a, 'actualStakedBalance', 0)));
  const second =
    parseFloat(String(get(b, 'totalValue', 0))) +
    parseFloat(String(get(b, 'actualStakedBalance', 0)));
  if (first < second) {
    return 1;
  } else if (first > second) {
    return -1;
  }
  return 0;
}

export function getPortfolioModel(portfolioFromAPI: any): WalletHoldings {
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
  let arbitrumHoldings;
  let optimismHoldings;
  let zksyncEraHoldings;
  let baseHoldings;
  let polygonZkevmHoldings;
  let auroraHoldings;
  let moonbeamHoldings;
  let moonriverHoldings;
  let solanaHoldings;

  const totalHoldings: Holding[] = [];
  const tokenHoldings = portfolioFromAPI.chainPortfolios;
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
        chainDetails: CHAIN_ETH,
        denom: '',
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
      totalUnverifiedBalance: chainUnVerifiedBalance,
      totalBalance: chainTotalBalance,
      totalStakedBalance: chainStakedBalance,
      totalUnbondingBalance: chainUnbondingBalance,
      totalHoldings: tokenHoldings,
      timestamp: new Date().toISOString(),
    };
    totalBalance += chainTotalBalance;
    totalUnverifiedBalance += chainUnVerifiedBalance;
    totalStakedBalance += chainStakedBalance;
    totalUnbondingBalance += chainUnbondingBalance;

    chainHoldings.totalHoldings.sort(sortDesc);

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

  totalHoldings.sort(sortDesc);

  const portfolio: WalletHoldings = {
    totalBalance,
    totalUnverifiedBalance,
    totalStakedBalance,
    totalUnbondingBalance,
    eth: ethHoldings as ChainHoldings,
    polygon: maticHoldings as ChainHoldings,
    bsc: bscHoldings as ChainHoldings,
    avalanche: avaxHoldings as ChainHoldings,
    cosmos: cosmosHoldings as ChainHoldings,
    osmosis: osmosisHoldings as ChainHoldings,
    juno: junoHoldings as ChainHoldings,
    stargaze: stargazeHoldings as ChainHoldings,
    noble: nobleHoldings as ChainHoldings,
    optimism: optimismHoldings as ChainHoldings,
    arbitrum: arbitrumHoldings as ChainHoldings,
    shardeum: shardeumHoldings as ChainHoldings,
    shardeum_sphinx: shardeumSphinxHoldings as ChainHoldings,
    zksync_era: zksyncEraHoldings as ChainHoldings,
    base: baseHoldings as ChainHoldings,
    polygon_zkevm: polygonZkevmHoldings as ChainHoldings,
    aurora: auroraHoldings as ChainHoldings,
    moonbeam: moonbeamHoldings as ChainHoldings,
    moonriver: moonriverHoldings as ChainHoldings,
    coreum: coreumHoldings as ChainHoldings,
    injective: injectiveHoldings as ChainHoldings,
    kujira: kujiraHoldings as ChainHoldings,
    solana: solanaHoldings as ChainHoldings,
    totalHoldings,
    timestamp: '',
  };
  return portfolio;
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
