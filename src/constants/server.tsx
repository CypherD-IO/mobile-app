import AppImages from '../../assets/images/appImages';
import { DefiPositonTypes } from '../models/defi.interface';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  avalanche,
  bsc,
  zkSync,
  base,
} from 'wagmi/chains';
import { AllChainsEnum } from './enum';
export interface Chain {
  chainName: string;
  name: string;
  symbol: string;
  id: number;
  logo_url: any;
  backendName: ChainBackendNames;
  chain_id: string;
  native_token_address: string;
  secondaryAddress?: string;
  chainIdNumber: number;
  coinGeckoId?: string;
  nativeTokenLogoUrl?: string;
}

export enum ChainBackendNames {
  ALL = 'ALL',
  ETH = 'ETH',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BSC = 'BSC',
  COSMOS = 'COSMOS',
  OSMOSIS = 'OSMOSIS',
  NOBLE = 'NOBLE',
  COREUM = 'COREUM',
  INJECTIVE = 'INJECTIVE',
  ZKSYNC_ERA = 'ZKSYNC_ERA',
  BASE = 'BASE',
  SOLANA = 'SOLANA',
}

export enum FundWalletAddressType {
  EVM = 'EVM',
  COSMOS = 'COSMOS',
  OSMOSIS = 'OSMOSIS',
  NOBLE = 'NOBLE',
  COREUM = 'COREUM',
  INJECTIVE = 'INJECTIVE',
  POLYGON = 'POLYGON',
  AVALANCHE = 'AVALANCHE',
  ARBITRUM = 'ARBITRUM',
  OPTIMISM = 'OPTIMISM',
  BSC = 'BSC',
  ZKSYNC_ERA = 'ZKSYNC_ERA',
  BASE = 'BASE',
  SOLANA = 'SOLANA',
}

export const CHAIN_ETH: Chain = {
  chainName: 'ethereum',
  name: 'Ethereum',
  symbol: 'ETH',
  id: 0,
  logo_url: AppImages.ETHEREUM,
  backendName: ChainBackendNames.ETH,
  chain_id: '0x1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl:
    'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png',
  chainIdNumber: 1,
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
  nativeTokenLogoUrl:
    'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png?1624446912',
  chainIdNumber: 137,
};

export const CHAIN_BSC: Chain = {
  chainName: 'ethereum',
  name: 'Binance Smart Chain',
  symbol: 'BNB',
  id: 2,
  logo_url: AppImages.BINANCE,
  backendName: ChainBackendNames.BSC,
  chain_id: '0x38',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl:
    'https://www.covalenthq.com/static/images/icons/display-icons/binance-coin-bnb-logo.png',
  chainIdNumber: 56,
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
  nativeTokenLogoUrl:
    'https://www.covalenthq.com/static/images/icons/display-icons/avalanche-avax-logo.png',
  chainIdNumber: 43114,
};

export const CHAIN_COLLECTION: Chain = {
  chainName: 'all',
  name: 'ALL CHAINS',
  symbol: 'ALL CHAINS',
  id: 4,
  logo_url: AppImages.ALL_CHAINS,
  backendName: ChainBackendNames.ALL,
  chain_id: '',
  native_token_address: '',
  chainIdNumber: 0,
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
  nativeTokenLogoUrl:
    'https://public.cypherd.io/assets/blockchains/arbitrum/info/logo.png',
  chainIdNumber: 42161,
};

export const OwlracleChainCodes = {
  Ethereum: 'eth',
  Polygon: 'poly',
  'Binance Smart Chain': 'bsc',
  Avalanche: 'avax',
  Arbitrum: 'arb',
  Optimism: 'opt',
};

export const CHAIN_COSMOS: Chain = {
  chainName: 'cosmos',
  name: 'Cosmos',
  symbol: 'COSMOS',
  id: 7,
  logo_url: AppImages.COSMOS_LOGO,
  backendName: ChainBackendNames.COSMOS,
  chain_id: 'cosmoshub-4',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl:
    'https://public.cypherd.io/assets/blockchains/cosmos/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: 'cosmos',
};

export const CHAIN_OSMOSIS: Chain = {
  chainName: 'osmosis',
  name: 'Osmosis',
  symbol: 'OSMO',
  id: 8,
  logo_url: AppImages.OSMOSIS_LOGO,
  backendName: ChainBackendNames.OSMOSIS,
  chain_id: 'osmosis-1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl:
    'https://public.cypherd.io/assets/blockchains/osmosis/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: 'osmosis',
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
  nativeTokenLogoUrl:
    'https://public.cypherd.io/assets/blockchains/optimism/info/logo.png',
  chainIdNumber: 10,
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
  nativeTokenLogoUrl:
    'https://public.cypherd.io/assets/blockchains/noble/info/logo.png',
  chainIdNumber: 0,
  coinGeckoId: '',
};

export const CHAIN_COREUM: Chain = {
  chainName: 'coreum',
  name: 'Coreum',
  symbol: 'COREUM',
  id: 22,
  logo_url: AppImages.COREUM_LOGO,
  backendName: ChainBackendNames.COREUM,
  chain_id: 'coreum-mainnet-1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  chainIdNumber: 0,
  coinGeckoId: 'coreum',
};

export const CHAIN_INJECTIVE: Chain = {
  chainName: 'injective',
  name: 'Injective',
  symbol: 'INJ',
  id: 23,
  logo_url: AppImages.INJECTIVE_LOGO,
  backendName: ChainBackendNames.INJECTIVE,
  chain_id: 'injective-1',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  chainIdNumber: 0,
  coinGeckoId: 'injective-protocol',
};

export const CHAIN_ZKSYNC_ERA: Chain = {
  chainName: 'ethereum',
  name: 'zkSync Era',
  symbol: 'ETH',
  id: 16,
  logo_url: AppImages.ZKSYNC_ERA_LOGO,
  backendName: ChainBackendNames.ZKSYNC_ERA,
  chain_id: '0x144',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl:
    'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png',
  chainIdNumber: 324,
};

export const CHAIN_BASE: Chain = {
  chainName: 'ethereum',
  name: 'Base',
  symbol: 'ETH',
  id: 17,
  logo_url: AppImages.BASE_LOGO,
  backendName: ChainBackendNames.BASE,
  chain_id: '0x2105',
  native_token_address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  nativeTokenLogoUrl:
    'https://www.covalenthq.com/static/images/icons/display-icons/ethereum-eth-logo.png',
  chainIdNumber: 8453,
};

export const CHAIN_SOLANA: Chain = {
  chainName: 'solana',
  name: 'Solana',
  symbol: 'SOL',
  id: 25,
  logo_url: AppImages.SOLANA_LOGO,
  backendName: ChainBackendNames.SOLANA,
  chain_id: 'solana',
  native_token_address: 'solana-native',
  chainIdNumber: 101,
  coinGeckoId: 'solana',
};

export const EnsCoinTypes: Record<string, string> = {
  [ChainBackendNames.ETH]: '60',
  [ChainBackendNames.AVALANCHE]: '2147526762',
  [ChainBackendNames.BSC]: '2147483704',
  [ChainBackendNames.POLYGON]: '2147483785',
};

export const SUPPORTED_EVM_CHAINS = [
  1, 137, 56, 43114, 250, 10, 42161, 9001, 324, 8453, 1101, 1313161554, 1284,
  1285,
];
export const CHAIN_NAMES = [
  'ethereum',
  'cosmos',
  'osmosis',
  'noble',
  'coreum',
  'injective',
  'solana',
];
export const COSMOS_CHAINS = [
  'cosmos',
  'osmosis',
  'noble',
  'coreum',
  'injective',
];
export const PURE_COSMOS_CHAINS = ['cosmos', 'osmosis', 'noble', 'coreum'];

export const ALL_CHAINS: Chain[] = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_NOBLE,
  CHAIN_AVALANCHE,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_BSC,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_SOLANA,
];

export const EVM_CHAINS: Chain[] = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BASE,
  CHAIN_BSC,
  CHAIN_ARBITRUM,
  CHAIN_OPTIMISM,
  CHAIN_AVALANCHE,
  CHAIN_ZKSYNC_ERA,
];

export const SOLANA_CHAINS: Chain[] = [CHAIN_SOLANA];

export const COSMOS_CHAINS_LIST: Chain[] = [
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_NOBLE,
  CHAIN_COREUM,
];

export const EVM_CHAINS_FOR_ADDRESS_DIR = [
  'ethereum',
  'polygon',
  'binance',
  'avalanche',
  'optimism',
  'arbitrum',
  'zksync_era',
  'base',
];

export const chainIdNumberMapping: Record<number, Chain> = {
  1: CHAIN_ETH,
  137: CHAIN_POLYGON,
  56: CHAIN_BSC,
  43114: CHAIN_AVALANCHE,
  10: CHAIN_OPTIMISM,
  42161: CHAIN_ARBITRUM,
  324: CHAIN_ZKSYNC_ERA,
  8453: CHAIN_BASE,
};

export const EVM_CHAINS_BACKEND_NAMES: ChainBackendNames[] = [
  ChainBackendNames.POLYGON,
  ChainBackendNames.BSC,
  ChainBackendNames.AVALANCHE,
  ChainBackendNames.OPTIMISM,
  ChainBackendNames.ARBITRUM,
  ChainBackendNames.ZKSYNC_ERA,
  ChainBackendNames.BASE,
];

export const COSMOS_CHAINS_BACKEND_NAMES: ChainBackendNames[] = [
  ChainBackendNames.COSMOS,
  ChainBackendNames.NOBLE,
  ChainBackendNames.COREUM,
  ChainBackendNames.INJECTIVE,
  ChainBackendNames.OSMOSIS,
];

export const PORTFOLIO_CHAINS_BACKEND_NAMES = [
  ChainBackendNames.ETH,
  ChainBackendNames.POLYGON,
  ChainBackendNames.BSC,
  ChainBackendNames.AVALANCHE,
  ChainBackendNames.OPTIMISM,
  ChainBackendNames.ARBITRUM,
  ChainBackendNames.COSMOS,
  ChainBackendNames.NOBLE,
  ChainBackendNames.COREUM,
  ChainBackendNames.INJECTIVE,
  ChainBackendNames.OSMOSIS,
  ChainBackendNames.ZKSYNC_ERA,
  ChainBackendNames.BASE,
  ChainBackendNames.SOLANA,
];

export const CARD_CHAINS: Chain[] = [
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_AVALANCHE,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_ZKSYNC_ERA,
  CHAIN_BASE,
  CHAIN_SOLANA,
];

export const IBC_CHAINS: Chain[] = [
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_NOBLE,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
];

export const ALL_CHAINS_WITH_COLLECTION = [CHAIN_COLLECTION, ...ALL_CHAINS];

export const ALL_FUNDABLE_CHAINS = [
  CHAIN_COLLECTION,
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_SOLANA,
  CHAIN_NOBLE,
  CHAIN_BASE,
  CHAIN_AVALANCHE,
  CHAIN_OPTIMISM,
  CHAIN_ARBITRUM,
  CHAIN_BSC,
  CHAIN_COSMOS,
  CHAIN_OSMOSIS,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_ZKSYNC_ERA,
];

export enum ChainNames {
  ETH = 'ethereum',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  NOBLE = 'noble',
  COREUM = 'coreum',
  INJECTIVE = 'injective',
  BSC = 'binance',
  POLYGON = 'polygon',
  AVALANCHE = 'avalanche',
  OPTIMISM = 'optimism',
  ARBITRUM = 'arbitrum',
  ZKSYNC_ERA = 'zksync_era',
  BASE = 'base',
  SOLANA = 'solana',
}

export enum ChainNameMapping {
  BSC = 'bsc',
  ETH = 'eth',
  POLYGON = 'polygon',
  AVALANCHE = 'avalanche',
  OPTIMISM = 'optimism',
  ARBITRUM = 'arbitrum',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  COREUM = 'coreum',
  INJECTIVE = 'injective',
  NOBLE = 'noble',
  ZKSYNC_ERA = 'zksync_era',
  BASE = 'base',
  SOLANA = 'solana',
  ALL = 'All',
}

export const ChainConfigMapping = {
  bsc: CHAIN_BSC,
  binance: CHAIN_BSC,
  eth: CHAIN_ETH,
  ethereum: CHAIN_ETH,
  polygon: CHAIN_POLYGON,
  avalanche: CHAIN_AVALANCHE,
  optimism: CHAIN_OPTIMISM,
  arbitrum: CHAIN_ARBITRUM,
  cosmos: CHAIN_COSMOS,
  osmosis: CHAIN_OSMOSIS,
  noble: CHAIN_NOBLE,
  coreum: CHAIN_COREUM,
  injective: CHAIN_INJECTIVE,
  zksync_era: CHAIN_ZKSYNC_ERA,
  base: CHAIN_BASE,
  solana: CHAIN_SOLANA,
};

export enum QRScannerScreens {
  SEND = 'SEND',
  WALLET_CONNECT = 'WALLET_CONNECT',
  IMPORT = 'IMPORT_WALLET',
  TRACK_WALLET = 'TRACK_WALLET',
}

export enum NotificationEvents {
  ACTIVITY_UPDATE = 'ACTIVITY_UPDATE',
  ORBITAL_APES = 'ORBITAL_APES',
  ADDRESS_ACTIVITY_WEBHOOK = 'ADDRESS_ACTIVITY_WEBHOOK',
  CARD_APPLICATION_UPDATE = 'CARD_APPLICATION_UPDATE',
  CARD_TXN_UPDATE = 'CARD_TXN_UPDATE',
  DAPP_BROWSER_OPEN = 'DAPP_BROWSER_OPEN',
  THREE_DS_APPROVE = 'THREE_DS_APPROVE',
}

export const ChainNameToContactsChainNameMapping = {
  Ethereum: 'ethereum',
  Polygon: 'polygon',
  'Binance Smart Chain': 'binance',
  Avalanche: 'avalanche',
  'Arbitrum One': 'arbitrum',
  Cosmos: 'cosmos',
  Osmosis: 'osmosis',
  Coreum: 'coreum',
  Injective: 'injective',
  Optimism: 'optimism',
  Noble: 'noble',
  'zkSync Era': 'zksync_era',
  Base: 'base',
  Solana: 'solana',
};

export const NativeTokenMapping: Record<AllChainsEnum, string> = {
  ETH: 'ETH',
  POLYGON: 'MATIC',
  AVALANCHE: 'AVAX',
  ARBITRUM: 'ETH',
  OPTIMISM: 'ETH',
  BSC: 'BNB',
  COSMOS: 'ATOM',
  OSMOSIS: 'OSMO',
  NOBLE: 'USDC',
  COREUM: 'COREUM',
  INJECTIVE: 'INJ',
  ZKSYNC_ERA: 'ETH',
  BASE: 'ETH',
  SOLANA: 'SOL',
  TRON: 'TRX',
};
export const GASLESS_CHAINS: ChainBackendNames[] = []; // Add any cosmos gasless chain backend names in this array

// DeFi Data
export const DEFI_URL = '/v1/portfolio/evm/defi';

export const deFiPositionTypes = [
  {
    logo: AppImages.DEFI_LIQUIDITY,
    value: DefiPositonTypes.LIQUIDITY,
    label: 'Liquidity',
  },
  {
    logo: AppImages.DEFI_STAKING,
    value: DefiPositonTypes.STAKING,
    label: 'Staking',
  },
  {
    logo: AppImages.DEFI_LENDING,
    value: DefiPositonTypes.LENDING,
    label: 'Lending',
  },
  {
    logo: AppImages.DEFI_FARMING,
    value: DefiPositonTypes.FARMING,
    label: 'Farming',
  },
  {
    logo: AppImages.DEFI_LEVERAGED_FARMING,
    value: DefiPositonTypes.LEVRAGED_FARMING,
    label: 'Leveraged farming',
  },
  { logo: AppImages.DEFI_YEILD, value: DefiPositonTypes.YEILD, label: 'Yield' },
  {
    logo: AppImages.DEFI_REWARDS,
    value: DefiPositonTypes.REWARDS,
    label: 'Rewards',
  },
  {
    logo: AppImages.DEFI_DEPOSIT,
    value: DefiPositonTypes.DEPOSIT,
    label: 'Deposit',
  },
  {
    logo: AppImages.DEFI_VESTING,
    value: DefiPositonTypes.VESTING,
    label: 'Vesting',
  },
  {
    logo: AppImages.DEFI_LOCKED,
    value: DefiPositonTypes.LOCKED,
    label: 'Locked',
  },
  {
    logo: AppImages.DEFI_OTHERS,
    value: DefiPositonTypes.OTHERS,
    label: 'Others',
  },
  {
    logo: AppImages.DEFI_NFT_STAKING,
    value: DefiPositonTypes.NFT_STAKING,
    label: 'NFT staking',
  },
  {
    logo: AppImages.DEFI_AIRDROP,
    value: DefiPositonTypes.AIRDROP,
    label: 'Airdrop',
  },
];

export const OP_ETH_ADDRESS = '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000';

export const BASE_GAS_LIMIT = 21000;
export const OPTIMISM_GAS_MULTIPLIER = 1.3;
export const CONTRACT_GAS_MULTIPLIER = 1.5;
export const GAS_MULTIPLIER_NATIVE_TOKENS = 1.2;

export interface NetworkInterface {
  [key: string]: any;
}

export const walletConnectChainData: Record<string, NetworkInterface> = {
  ETH: {
    chainId: `0x${Number(1).toString(16)}`,
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      'https://rpc.ankr.com/eth',
      'https://eth-rpc.gateway.pokt.network',
    ],
    blockExplorerUrls: ['https://etherscan.io'],
    chainConfig: mainnet,
  },
  POLYGON: {
    chainId: `0x${Number(137).toString(16)}`,
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com/'],
    chainConfig: polygon,
  },
  BSC: {
    chainId: `0x${Number(56).toString(16)}`,
    chainName: 'Binance Smart Chain Mainnet',
    nativeCurrency: {
      name: 'Binance Chain Native Token',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: [
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
      'https://bsc-dataseed4.binance.org',
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed2.defibit.io',
      'https://bsc-dataseed3.defibit.io',
      'https://bsc-dataseed4.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
      'https://bsc-dataseed2.ninicoin.io',
      'https://bsc-dataseed3.ninicoin.io',
      'https://bsc-dataseed4.ninicoin.io',
      'wss://bsc-ws-node.nariox.org',
    ],
    blockExplorerUrls: ['https://bscscan.com'],
    chainConfig: bsc,
  },
  AVALANCHE: {
    chainId: `0x${Number(43114).toString(16)}`,
    chainName: 'Avalanche Mainnet',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
    chainConfig: avalanche,
  },
  ARBITRUM: {
    chainId: `0x${Number(42161).toString(16)}`,
    chainName: 'Arbitrum One',
    nativeCurrency: {
      name: 'Arbitrum One Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.ankr.com/arbitrum'],
    blockExplorerUrls: ['https://arbiscan.io/'],
    chainConfig: arbitrum,
  },
  OPTIMISM: {
    chainId: `0x${Number(10).toString(16)}`,
    chainName: 'Optimism',
    nativeCurrency: {
      name: 'Optimism Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io/'],
    chainConfig: optimism,
  },
  ZKSYNC_ERA: {
    chainId: '0x144',
    chainName: 'ZkSync Era',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.era.zksync.io'],
    blockExplorerUrls: ['https://explorer.zksync.io'],
    chainConfig: zkSync,
  },
  BASE: {
    chainId: '0x2105',
    chainName: 'base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://developer-access-mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    chainConfig: base,
  },
};

export const AUTO_LOAD_SUPPORTED_CHAINS = [
  CHAIN_ETH.backendName,
  CHAIN_BASE.backendName,
  CHAIN_ARBITRUM.backendName,
  CHAIN_POLYGON.backendName,
  CHAIN_OPTIMISM.backendName,
  CHAIN_BSC.backendName,
  CHAIN_OSMOSIS.backendName,
  CHAIN_NOBLE.backendName,
];

export const STABLE_TOKEN_CHAIN_MAP = new Map([
  [
    'POLYGON',
    [
      {
        contractAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
      {
        contractAddress: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ], // [usdc, usdt, dai]
  [
    'AVALANCHE',
    [
      {
        contractAddress: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
        decimal: 6,
        symbol: 'USDC.e',
        name: 'Bridged USD Coin (Avalanche)',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
      {
        contractAddress: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ], // [usdc, usdc.e, usdt, dai]
  [
    'ETH',
    [
      {
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
      {
        contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ], // [usdc, usdt, dai]
  [
    'BSC',
    [
      {
        contractAddress: '0x55d398326f99059ff775485246999027b3197955',
        decimal: 18,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
      {
        contractAddress: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ], // [usdc, usdt, dai]
  [
    'ARBITRUM',
    [
      {
        contractAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
        decimal: 6,
        symbol: 'USDC.e',
        name: 'Bridged USD Coin (Arbitrum)',
        coingeckoId: 'usd-coin-ethereum-bridged',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
      {
        contractAddress: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ], // [usdc, usdc.e, usdt, dai]
  [
    'OPTIMISM',
    [
      {
        contractAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
      {
        contractAddress: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ], // [usdc, usdt, dai]
  [
    'ZKSYNC_ERA',
    [
      {
        contractAddress: '0x3355df6d4c9c3035724fd0e3914de96a5a83aaf4',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0x493257fd37edb34451f62edf8d2a0c418852ba4c',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
    ],
  ],
  [
    'BASE',
    [
      {
        contractAddress: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      },
      {
        contractAddress: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
        decimal: 18,
        symbol: 'DAI',
        name: 'Dai',
        coingeckoId: 'dai',
        logo: 'https://assets.coingecko.com/coins/images/9956/large/Badge_Dai.png?1687143508',
      },
    ],
  ],
  [
    'TRON',
    [
      {
        contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        decimal: 6,
        symbol: 'USDT',
        name: 'Tether',
        coingeckoId: 'tether',
        logo: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
      },
    ],
  ],
  [
    'SOLANA',
    [
      {
        contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimal: 6,
        symbol: 'USDC',
        name: 'USD Coin',
        coingeckoId: 'usd-coin',
        logo: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      },
    ],
  ],
]);

export const NON_EIP1599_CHAINS: ChainBackendNames[] = [
  ChainBackendNames.BSC,
  ChainBackendNames.ZKSYNC_ERA,
];

export const OP_STACK_ENUMS = [
  ChainBackendNames.OPTIMISM,
  ChainBackendNames.BASE,
];

export const CAN_ESTIMATE_L1_FEE_CHAINS = [
  ChainBackendNames.OPTIMISM,
  ChainBackendNames.BASE,
  ChainBackendNames.ARBITRUM,
];
