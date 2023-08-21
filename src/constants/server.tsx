import AppImages from '../../assets/images/appImages';
export interface Chain {
  chainName: string
  name: string
  symbol: string
  id: number
  logo_url: any
  backendName: ChainBackendNames | 'ALL' | string
  chain_id: string
  native_token_address: string
  secondaryAddress?: string
  chainIdNumber: number
  coinGeckoId?: string
  nativeTokenLogoUrl?: string
}

export enum ChainBackendNames {
  ETH = 'ETH',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  FANTOM = 'FANTOM',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BSC = 'BSC',
  EVMOS = 'EVMOS',
  COSMOS = 'COSMOS',
  OSMOSIS = 'OSMOSIS',
  JUNO = 'JUNO',
  STARGAZE = 'STARGAZE',
  NOBLE = 'NOBLE',
  SHARDEUM = 'SHARDEUM',
  SHARDEUM_SPHINX = 'SHARDEUM_SPHINX'
}

export enum CosmosStakingTokens {
  EVMOS = 'Evmos',
  COSMOS = 'ATOM',
  OSMOSIS = 'Osmosis',
  JUNO = 'Juno',
  STARGAZE = 'Stargaze',
  NOBLE = 'Noble'
}

export enum FundWalletAddressType {
  EVM = 'EVM',
  EVMOS = 'EVMOS',
  COSMOS = 'COSMOS',
  OSMOSIS = 'OSMOSIS',
  JUNO = 'JUNO',
  STARGAZE = 'STARGAZE',
  NOBLE = 'NOBLE',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  FANTOM = 'FANTOM',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BSC = 'BSC',
  SHARDEUM = 'SHARDEUM',
  SHARDEUM_SPHINX = 'SHARDEUM_SPHINX'
}

export const CHAIN_ETH: Chain = {
  chainName: 'ethereum',
  name: 'Ethereum',
  symbol: 'ETH',
  id: 0,
  logo_url: AppImages.ETHERUM,
  backendName: ChainBackendNames.ETH,
  chain_id: '0x1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png',
  chainIdNumber: 1
};

export const CHAIN_POLYGON: Chain = {
  chainName: 'ethereum',
  name: 'Polygon',
  symbol: 'MATIC',
  id: 1,
  logo_url: AppImages.POLYGON,
  backendName: ChainBackendNames.POLYGON,
  chain_id: '0x89',
  native_token_address: '0x0000000000000000000000000000000000001010',
  nativeTokenLogoUrl: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1624446912',
  chainIdNumber: 137
};

export const CHAIN_BSC: Chain = {
  chainName: 'ethereum',
  name: 'Binance Smart Chain',
  symbol: 'BNB',
  id: 2,
  logo_url: AppImages.BIANCE,
  backendName: ChainBackendNames.BSC,
  chain_id: '0x38',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://www.covalenthq.com/static/images/icons/display-icons/binance-coin-bnb-logo.png',
  chainIdNumber: 56
};

export const CHAIN_AVALANCHE: Chain = {
  chainName: 'ethereum',
  name: 'Avalanche',
  symbol: 'AVAX',
  id: 3,
  logo_url: AppImages.AVALANCHE,
  backendName: ChainBackendNames.AVALANCHE,
  chain_id: '0xa86a',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://www.covalenthq.com/static/images/icons/display-icons/avalanche-avax-logo.png',
  chainIdNumber: 43114
};

export const CHAIN_COLLECTION: Chain = {
  chainName: 'all',
  name: 'ALL CHAINS',
  symbol: 'ALL CHAINS',
  id: 4,
  logo_url: AppImages.ALL_CHAINS,
  backendName: 'ALL',
  chain_id: '',
  native_token_address: '',
  chainIdNumber: 0
};

export const CHAIN_FTM: Chain = {
  chainName: 'ethereum',
  name: 'Fantom',
  symbol: 'FTM',
  id: 5,
  logo_url: AppImages.FANTOM,
  backendName: ChainBackendNames.FANTOM,
  chain_id: '0xfa',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://www.covalenthq.com/static/images/icons/display-icons/fantom-ftm-logo.png',
  chainIdNumber: 250
};

export const CHAIN_EVMOS: Chain = {
  chainName: 'evmos',
  name: 'Evmos',
  symbol: 'EVMOS',
  id: 6,
  logo_url: AppImages.EVMOS_LOGO,
  backendName: ChainBackendNames.EVMOS,
  chain_id: '0x2329',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  secondaryAddress: '0x93581991f68dbae1ea105233b67f7fa0d6bdee7b',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/evmos/info/logo.png',
  chainIdNumber: 9001
};

export const CHAIN_ARBITRUM: Chain = {
  chainName: 'ethereum',
  name: 'Arbitrum One',
  symbol: 'ETH',
  id: 10,
  logo_url: AppImages.ARBITRUM,
  backendName: ChainBackendNames.ARBITRUM,
  chain_id: '0xa4b1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/arbitrum/info/logo.png',
  chainIdNumber: 42161
};

export const CHAIN_SHARDEUM: Chain = {
  chainName: 'ethereum',
  name: 'Shardeum Sphinx DApp 1.X',
  symbol: 'SHM',
  id: 15,
  logo_url: AppImages.SHARDEUM,
  backendName: ChainBackendNames.SHARDEUM,
  chain_id: '0x1f91',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://img.api.cryptorank.io/coins/shardeum1665056595732.png', // TODO : Add shardeum resources.
  chainIdNumber: 8081
};

export const CHAIN_SHARDEUM_SPHINX: Chain = {
  chainName: 'ethereum',
  name: 'Shardeum Sphinx',
  symbol: 'SHM',
  id: 14,
  logo_url: AppImages.SHARDEUM,
  backendName: ChainBackendNames.SHARDEUM_SPHINX,
  chain_id: '0x1f92',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://img.api.cryptorank.io/coins/shardeum1665056595732.png', // TODO: Add shardeum resources.
  chainIdNumber: 8082
};

export const OwlracleChainCodes = {
  Ethereum: 'eth',
  Polygon: 'poly',
  'Binance Smart Chain': 'bsc',
  Avalanche: 'avax',
  Fantom: 'ftm',
  Arbitrum: 'arb',
  Optimism: 'opt'
};

export const CHAIN_COSMOS: Chain = {
  chainName: 'cosmos',
  name: 'Cosmos',
  symbol: 'COSMOS',
  id: 7,
  logo_url: AppImages.COSMOS,
  backendName: ChainBackendNames.COSMOS,
  chain_id: '0x0',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/cosmos/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: 'cosmos'
};

export const CHAIN_OSMOSIS: Chain = {
  chainName: 'osmosis',
  name: 'Osmosis',
  symbol: 'OSMO',
  id: 8,
  logo_url: AppImages.OSMOSIS_LOGO,
  backendName: ChainBackendNames.OSMOSIS,
  chain_id: '0x1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/osmosis/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: 'osmosis'
};

export const CHAIN_JUNO: Chain = {
  chainName: 'juno',
  name: 'Juno',
  symbol: 'JUNO',
  id: 9,
  logo_url: AppImages.JUNO_PNG,
  backendName: ChainBackendNames.JUNO,
  chain_id: 'juno-1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/juno/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: 'juno-network'
};

export const CHAIN_OPTIMISM: Chain = {
  chainName: 'ethereum',
  name: 'Optimism',
  symbol: 'ETH',
  id: 11,
  logo_url: AppImages.OPTIMISM,
  backendName: ChainBackendNames.OPTIMISM,
  chain_id: '0xa',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/optimism/info/logo.png',
  chainIdNumber: 10
};

export const CHAIN_STARGAZE: Chain = {
  chainName: 'stargaze',
  name: 'Stargaze',
  symbol: 'STARS',
  id: 12,
  logo_url: AppImages.STARGAZE_LOGO,
  backendName: ChainBackendNames.STARGAZE,
  chain_id: 'stargaze-1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/stargaze/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: 'stargaze'
};

export const CHAIN_NOBLE: Chain = {
  chainName: 'noble',
  name: 'Noble',
  symbol: 'NOBLE',
  id: 13,
  logo_url: AppImages.NOBLE_LOGO,
  backendName: ChainBackendNames.NOBLE,
  chain_id: 'noble-1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl: 'https://public.cypherd.io/assets/blockchains/noble/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: ''
};

export const EnsCoinTypes: Record<string, string> = {
  [ChainBackendNames.ETH]: '60',
  [ChainBackendNames.AVALANCHE]: '2147526762',
  [ChainBackendNames.FANTOM]: '2147483898',
  [ChainBackendNames.BSC]: '2147483704',
  [ChainBackendNames.POLYGON]: '2147483785',
  [ChainBackendNames.SHARDEUM]: 'dummy',
  [ChainBackendNames.SHARDEUM_SPHINX]: 'dummy'

};

export const SUPPORTED_EVM_CHAINS = [1, 137, 56, 43114, 250, 10, 42161, 9001];
export const CHAIN_NAMES = ['ethereum', 'evmos', 'cosmos', 'osmosis', 'juno', 'stargaze', 'noble'];
export const COSMOS_CHAINS = ['cosmos', 'evmos', 'osmosis', 'juno', 'stargaze', 'noble'];
export const PURE_COSMOS_CHAINS = ['cosmos', 'osmosis', 'juno', 'stargaze', 'noble'];
export const ALL_CHAINS: Chain[] = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_STARGAZE,
  CHAIN_NOBLE,
  CHAIN_AVALANCHE,
  CHAIN_FTM,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_EVMOS,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_JUNO,
  CHAIN_BSC,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX
];

export const EVM_CHAINS: Chain[] = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_AVALANCHE,
  CHAIN_FTM,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX
];

export const EVM_CHAINS_FOR_ADDRESS_DIR = [
  'ethereum',
  'polygon',
  'binance',
  'avalanche',
  'fantom',
  'optimism',
  'arbitrum',
  'shardeum',
  'shardeum_sphinx'
];

export const chainIdNumberMapping: Record<number, Chain> = {
  1: CHAIN_ETH,
  137: CHAIN_POLYGON,
  56: CHAIN_BSC,
  43114: CHAIN_AVALANCHE,
  250: CHAIN_FTM,
  10: CHAIN_OPTIMISM,
  42161: CHAIN_ARBITRUM,
  9001: CHAIN_EVMOS
};

export const EVM_CHAINS_BACKEND_NAMES: ChainBackendNames[] = [
  ChainBackendNames.POLYGON,
  ChainBackendNames.BSC,
  ChainBackendNames.AVALANCHE,
  ChainBackendNames.FANTOM,
  ChainBackendNames.OPTIMISM,
  ChainBackendNames.ARBITRUM,
  ChainBackendNames.EVMOS,
  ChainBackendNames.SHARDEUM,
  ChainBackendNames.SHARDEUM_SPHINX
];

export const PORTFOLIO_CHAINS_BACKEND_NAMES = [
  ChainBackendNames.ETH,
  ChainBackendNames.POLYGON,
  ChainBackendNames.BSC,
  ChainBackendNames.AVALANCHE,
  ChainBackendNames.FANTOM,
  ChainBackendNames.OPTIMISM,
  ChainBackendNames.ARBITRUM,
  ChainBackendNames.EVMOS,
  ChainBackendNames.SHARDEUM,
  ChainBackendNames.SHARDEUM_SPHINX,
  ChainBackendNames.EVMOS,
  ChainBackendNames.COSMOS,
  ChainBackendNames.JUNO,
  ChainBackendNames.NOBLE,
  ChainBackendNames.OSMOSIS,
  ChainBackendNames.STARGAZE
];

export const CARD_CHAINS: Chain[] = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_AVALANCHE,
  CHAIN_FTM,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_EVMOS,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_JUNO,
  CHAIN_SHARDEUM,
  CHAIN_SHARDEUM_SPHINX
];

export const IBC_CHAINS: Chain[] = [
  CHAIN_EVMOS,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_JUNO,
  CHAIN_STARGAZE,
  CHAIN_NOBLE
];

export const ALL_CHAINS_WITH_COLLECTION = [
  CHAIN_COLLECTION,
  ...ALL_CHAINS
];

export enum ChainNames {
  ETH = 'ethereum',
  EVMOS = 'evmos',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  JUNO = 'juno',
  STARGAZE = 'stargaze',
  NOBLE = 'noble',
  BSC = 'binance',
  POLYGON = 'polygon',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom',
  OPTIMISM = 'optimism',
  ARBITRUM = 'arbitrum',
  SHARDEUM = 'shardeum',
  SHARDEUM_SPHINX = 'shardeum_sphinx'
};

export enum QRScannerScreens {
  SEND = 'SEND',
  WALLET_CONNECT = 'WALLET_CONNECT',
  IMPORT = 'IMPORT_WALLET',
  TRACK_WALLET = 'TRACK_WALLET'
}

export enum NotificationEvents {
  BEEFY_FINANCE = 'BEEFY_FINANCE',
  EVMOS_STAKING = 'EVMOS_STAKING',
  COSMOS_STAKING = 'COSMOS_STAKING',
  OSMOSIS_STAKING = 'OSMOSIS_STAKING',
  JUNO_STAKING = 'JUNO_STAKING',
  STARGAZE_STAKING = 'STARGAZE_STAKING',
  NOBLE_STAKING = 'NOBLE_STAKING',
  ACTIVITY_UPDATE = 'ACTIVITY_UPDATE',
  ORBITAL_APES = 'ORBITAL_APES',
  ADDRESS_ACTIVITY_WEBHOOK = 'ADDRESS_ACTIVITY_WEBHOOK',
  CARD_APPLICATION_UPDATE = 'CARD_APPLICATION_UPDATE',
  CARD_TXN_UPDATE = 'CARD_TXN_UPDATE',
  DAPP_BROWSER_OPEN = 'DAPP_BROWSER_OPEN'
}

export enum ChainNameMapping {
  BSC = 'bsc',
  ETH = 'eth',
  POLYGON = 'polygon',
  AVALANCHE = 'avalanche',
  EVMOS = 'evmos',
  FANTOM = 'fantom',
  OPTIMISM = 'optimism',
  ARBITRUM = 'arbitrum',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  JUNO = 'juno',
  STARGAZE = 'stargaze',
  NOBLE = 'noble',
  SHARDEUM = 'shardeum',
  SHARDEUM_SPHINX = 'shardeum_sphinx'
};

export const ChainNameToContactsChainNameMapping = {
  Ethereum: 'ethereum',
  Polygon: 'polygon',
  'Binance Smart Chain': 'binance',
  Avalanche: 'avalanche',
  Fantom: 'fantom',
  Evmos: 'evmos',
  'Arbitrum One': 'arbitrum',
  'Shardeum Liberty 2.0': 'shardeum',
  'Shardeum Sphinx': 'shardeum_sphinx',
  Cosmos: 'cosmos',
  Osmosis: 'osmosis',
  Juno: 'juno',
  Optimism: 'optimism',
  Stargaze: 'stargaze',
  Noble: 'noble'
};

export const ChainConfigMapping = {
  binance: CHAIN_BSC,
  eth: CHAIN_ETH,
  ethereum: CHAIN_ETH,
  polygon: CHAIN_POLYGON,
  avalanche: CHAIN_AVALANCHE,
  evmos: CHAIN_EVMOS,
  fantom: CHAIN_FTM,
  optimism: CHAIN_OPTIMISM,
  arbitrum: CHAIN_ARBITRUM,
  cosmos: CHAIN_COSMOS,
  osmosis: CHAIN_OSMOSIS,
  juno: CHAIN_JUNO,
  stargaze: CHAIN_STARGAZE,
  noble: CHAIN_NOBLE,
  shardeum: CHAIN_SHARDEUM,
  shardeum_sphinx: CHAIN_SHARDEUM_SPHINX
};

export enum NativeTokenMapping {
  COSMOS = 'ATOM',
};
