/**
 * Unit tests for chain/explorer URL builders and chain predicates in util.tsx.
 */

// ─── Mocks (must come before imports) ───
jest.mock('../../constants/server', () => ({
  ChainBackendNames: { ETH: 'ethereum', COSMOS: 'cosmos', OSMOSIS: 'osmosis', NOBLE: 'noble', COREUM: 'coreum', INJECTIVE: 'injective', SOLANA: 'solana', BSC: 'bsc', POLYGON: 'polygon', AVALANCHE: 'avalanche', ARBITRUM: 'arbitrum', OPTIMISM: 'optimism', BASE: 'base', ZKSYNC_ERA: 'zksync_era', HYPERLIQUID: 'hyperliquid', ALL: 'All' },
  CHAIN_ETH: { chainName: 'ethereum', symbol: 'ETH', backendName: 'ethereum', chainIdNumber: 1, name: 'ethereum', chain_id: 'ethereum-1', native_token_address: '0x0000000000000000000000000000000000000000' },
  CHAIN_COSMOS: { chainName: 'cosmos', symbol: 'ATOM', backendName: 'cosmos', chain_id: 'cosmoshub-4' },
  CHAIN_OSMOSIS: { chainName: 'osmosis', symbol: 'OSMO', backendName: 'osmosis', chain_id: 'osmosis-1' },
  CHAIN_NOBLE: { chainName: 'noble', symbol: 'USDC', backendName: 'noble', chain_id: 'noble-1' },
  CHAIN_COREUM: { chainName: 'coreum', symbol: 'CORE', backendName: 'coreum', chain_id: 'coreum-mainnet-1' },
  CHAIN_INJECTIVE: { chainName: 'injective', symbol: 'INJ', backendName: 'injective', chain_id: 'injective-1' },
  CHAIN_SOLANA: { chainName: 'solana', symbol: 'SOL', backendName: 'solana', chain_id: 'mainnet-beta' },
  CHAIN_BSC: { chainName: 'bsc', symbol: 'BNB', backendName: 'bsc', chainIdNumber: 56 },
  CHAIN_POLYGON: { chainName: 'polygon', symbol: 'MATIC', backendName: 'polygon', chainIdNumber: 137 },
  CHAIN_AVALANCHE: { chainName: 'avalanche', symbol: 'AVAX', backendName: 'avalanche', chainIdNumber: 43114 },
  CHAIN_ARBITRUM: { chainName: 'arbitrum', name: 'arbitrum', symbol: 'ETH', backendName: 'arbitrum', chainIdNumber: 42161 },
  CHAIN_OPTIMISM: { chainName: 'optimism', name: 'optimism', symbol: 'ETH', backendName: 'optimism', chainIdNumber: 10 },
  CHAIN_BASE: { chainName: 'base', name: 'base', symbol: 'ETH', backendName: 'base', chainIdNumber: 8453 },
  CHAIN_BASE_SEPOLIA: { name: 'base_sepolia' },
  CHAIN_ZKSYNC_ERA: { chainName: 'zksync_era', name: 'zksync_era', symbol: 'ETH', backendName: 'zksync_era', chainIdNumber: 324 },
  CHAIN_COLLECTION: {},
  EVM_CHAINS: [],
  NativeTokenMapping: { COSMOS: 'ATOM' },
  EnsCoinTypes: { ethereum: 60 },
  NON_EIP1599_CHAINS: ['bsc', 'zksync_era'],
}));
jest.mock('../../constants/data', () => ({
  chainExplorerMapping: {
    ethereum: 'https://etherscan.io/tx/',
    polygon: 'https://polygonscan.com/tx/',
    cosmos: 'https://www.mintscan.io/cosmos/txs/',
  },
  ChainNameToChainMapping: {},
  ANALYTICS_ERROR_URL: '',
  ANALYTICS_SUCCESS_URL: '',
  MINIMUM_TRANSFER_AMOUNT_ETH: 50,
  MINIMUM_TRANSFER_AMOUNT_HL_SPOT: 15,
}));
jest.mock('../globalContext', () => ({ initialGlobalState: { rpcEndpoints: {} } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../../misc/checkers', () => ({ isIOS: jest.fn(() => false) }));
jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));
jest.mock('../../containers/utilities/cosmosSendUtility', () => ({ isCosmosAddress: jest.fn() }));
jest.mock('../../containers/utilities/osmosisSendUtility', () => ({ isOsmosisAddress: jest.fn() }));
jest.mock('../../containers/utilities/nobleSendUtility', () => ({ isNobleAddress: jest.fn() }));
jest.mock('../../containers/utilities/coreumUtilities', () => ({ isCoreumAddress: jest.fn() }));
jest.mock('../../containers/utilities/injectiveUtilities', () => ({ isInjectiveAddress: jest.fn() }));
jest.mock('../../containers/utilities/solanaUtilities', () => ({ isSolanaAddress: jest.fn() }));
jest.mock('../Http', () => ({ post: jest.fn() }));
jest.mock('react-native-device-info', () => ({ isEmulatorSync: jest.fn(() => true), getVersion: jest.fn(() => '1.0') }));
jest.mock('react-native-rsa-native', () => ({ RSA: { generateKeys: jest.fn() } }));
jest.mock('../../global', () => ({ hostWorker: { getHost: jest.fn(() => '') } }));
jest.mock('web3-validator', () => ({ isAddress: jest.fn(() => false) }));
jest.mock('viem/accounts', () => ({ privateKeyToAccount: jest.fn() }));
jest.mock('viem', () => ({ createPublicClient: jest.fn(), http: jest.fn() }));
jest.mock('@ethereumjs/common', () => ({ Common: jest.fn(), Hardfork: {} }));
jest.mock('@ethereumjs/tx', () => ({ TransactionFactory: {} }));
jest.mock('../../constants/cardColours', () => ({ getCardColorByHex: jest.fn() }));
jest.mock('../../../assets/images/appImages', () => ({ CYPHER_CARD_IMAGES: 'https://example.com/cards' }));
jest.mock('../../../assets/datasets/countryMaster', () => ([]));
jest.mock('../../../assets/datasets/currencySymbolMap', () => ({ currencySymbolMap: {} }));
jest.mock('react-native-svg', () => ({ SvgUri: 'SvgUri' }));
jest.mock('../../styles/tailwindComponents', () => ({ CyDImage: 'CyDImage' }));
jest.mock('../../reducers/activity_reducer', () => ({}));
jest.mock('../../reducers/hdwallet_reducer', () => ({}));

// ─── Imports ───
import {
  getExplorerUrlFromBackendNames,
  getExplorerUrlFromChainId,
  getExplorerUrl,
  getExplorerUrlFromChainName,
  getNftExplorerUrl,
  getChain,
  isBasicCosmosChain,
  isCosmosChain,
  isEIP1599Chain,
} from '../util';

// ─── getExplorerUrlFromBackendNames ───
describe('getExplorerUrlFromBackendNames', () => {
  const hash = '0xabc123';

  it('returns etherscan URL for ETH', () => {
    expect(getExplorerUrlFromBackendNames('ethereum', hash)).toBe(`https://etherscan.io/tx/${hash}`);
  });

  it('returns snowtrace URL for AVALANCHE', () => {
    expect(getExplorerUrlFromBackendNames('avalanche', hash)).toBe(`https://snowtrace.io/tx/${hash}`);
  });

  it('returns bscscan URL for BSC', () => {
    expect(getExplorerUrlFromBackendNames('bsc', hash)).toBe(`https://bscscan.com/tx/${hash}`);
  });

  it('returns polygonscan URL for POLYGON', () => {
    expect(getExplorerUrlFromBackendNames('polygon', hash)).toBe(`https://polygonscan.com/tx/${hash}`);
  });

  it('returns arbiscan URL for ARBITRUM', () => {
    expect(getExplorerUrlFromBackendNames('arbitrum', hash)).toBe(`https://arbiscan.io/tx/${hash}`);
  });

  it('returns optimistic etherscan URL for OPTIMISM', () => {
    expect(getExplorerUrlFromBackendNames('optimism', hash)).toBe(`https://optimistic.etherscan.io/tx/${hash}`);
  });

  it('returns basescan URL for BASE', () => {
    expect(getExplorerUrlFromBackendNames('base', hash)).toBe(`https://basescan.org/tx/${hash}`);
  });

  it('returns oklink URL for ZKSYNC_ERA', () => {
    expect(getExplorerUrlFromBackendNames('zksync_era', hash)).toBe(`https://www.oklink.com/zksync/tx/${hash}`);
  });

  it('returns mintscan URL for COSMOS', () => {
    expect(getExplorerUrlFromBackendNames('cosmos', hash)).toBe(`https://www.mintscan.io/cosmos/txs/${hash}`);
  });

  it('returns mintscan URL for OSMOSIS', () => {
    expect(getExplorerUrlFromBackendNames('osmosis', hash)).toBe(`https://www.mintscan.io/osmosis/txs/${hash}`);
  });

  it('returns mintscan URL for NOBLE', () => {
    expect(getExplorerUrlFromBackendNames('noble', hash)).toBe(`https://www.mintscan.io/noble/txs/${hash}`);
  });

  it('returns mintscan URL for COREUM', () => {
    expect(getExplorerUrlFromBackendNames('coreum', hash)).toBe(`https://www.mintscan.io/coreum/txs/${hash}`);
  });

  it('returns mintscan URL for INJECTIVE', () => {
    expect(getExplorerUrlFromBackendNames('injective', hash)).toBe(`https://www.mintscan.io/injective/txs/${hash}`);
  });

  it('returns undefined for unknown chain', () => {
    expect(getExplorerUrlFromBackendNames('unknown', hash)).toBeUndefined();
  });
});

// ─── getExplorerUrlFromChainId ───
describe('getExplorerUrlFromChainId', () => {
  const hash = '0xdef456';

  it('returns etherscan for chainId 1 (ETH)', () => {
    expect(getExplorerUrlFromChainId('1', hash)).toBe(`https://etherscan.io/tx/${hash}`);
  });

  it('returns snowtrace for chainId 43114 (AVAX)', () => {
    expect(getExplorerUrlFromChainId('43114', hash)).toBe(`https://snowtrace.io/tx/${hash}`);
  });

  it('returns bscscan for chainId 56 (BSC)', () => {
    expect(getExplorerUrlFromChainId('56', hash)).toBe(`https://bscscan.com/tx/${hash}`);
  });

  it('returns polygonscan for chainId 137 (POLYGON)', () => {
    expect(getExplorerUrlFromChainId('137', hash)).toBe(`https://polygonscan.com/tx/${hash}`);
  });

  it('returns arbiscan for chainId 42161 (ARBITRUM)', () => {
    expect(getExplorerUrlFromChainId('42161', hash)).toBe(`https://arbiscan.io/tx/${hash}`);
  });

  it('returns basescan for chainId 8453 (BASE)', () => {
    expect(getExplorerUrlFromChainId('8453', hash)).toBe(`https://basescan.org/tx/${hash}`);
  });

  it('returns oklink for chainId 324 (ZKSYNC)', () => {
    expect(getExplorerUrlFromChainId('324', hash)).toBe(`https://www.oklink.com/zksync/tx/${hash}`);
  });

  it('returns mintscan for cosmos chain_id', () => {
    expect(getExplorerUrlFromChainId('cosmoshub-4', hash)).toBe(`https://www.mintscan.io/cosmos/txs/${hash}`);
  });

  it('returns solscan for Solana chain_id', () => {
    expect(getExplorerUrlFromChainId('mainnet-beta', hash)).toBe(`https://solscan.io/tx/${hash}`);
  });

  it('returns empty string for unknown chainId', () => {
    expect(getExplorerUrlFromChainId('999999', hash)).toBe('');
  });
});

// ─── getExplorerUrl ───
describe('getExplorerUrl', () => {
  const hash = '0x789';

  it('returns etherscan for ETH symbol with no sub-chain', () => {
    expect(getExplorerUrl('ETH', 'ethereum', hash)).toBe(`https://etherscan.io/tx/${hash}`);
  });

  it('returns arbiscan for ETH symbol with arbitrum name', () => {
    expect(getExplorerUrl('ETH', 'arbitrum', hash)).toBe(`https://arbiscan.io/tx/${hash}`);
  });

  it('returns optimistic etherscan for ETH symbol with optimism name', () => {
    expect(getExplorerUrl('ETH', 'optimism', hash)).toBe(`https://optimistic.etherscan.io/tx/${hash}`);
  });

  it('returns zksync explorer for ETH symbol with zksync_era name', () => {
    expect(getExplorerUrl('ETH', 'zksync_era', hash)).toBe(`https://explorer.zksync.io/tx/${hash}`);
  });

  it('returns basescan for ETH symbol with base name', () => {
    expect(getExplorerUrl('ETH', 'base', hash)).toBe(`https://basescan.org/tx/${hash}`);
  });

  it('returns sepolia basescan for ETH symbol with base_sepolia name', () => {
    expect(getExplorerUrl('ETH', 'base_sepolia', hash)).toBe(`https://sepolia.basescan.org/tx/${hash}`);
  });

  it('returns avax explorer for AVAX symbol', () => {
    expect(getExplorerUrl('AVAX', 'avalanche', hash)).toBe(`https://explorer.avax.network/tx/${hash}`);
  });

  it('returns bscscan for BNB symbol', () => {
    expect(getExplorerUrl('BNB', 'bsc', hash)).toBe(`https://bscscan.com/tx/${hash}`);
  });

  it('returns polygonscan for MATIC symbol', () => {
    expect(getExplorerUrl('MATIC', 'polygon', hash)).toBe(`https://polygonscan.com/tx/${hash}`);
  });

  it('returns mintscan for ATOM symbol', () => {
    expect(getExplorerUrl('ATOM', 'cosmos', hash)).toBe(`https://www.mintscan.io/cosmos/txs/${hash}`);
  });

  it('returns solscan for SOL symbol', () => {
    expect(getExplorerUrl('SOL', 'solana', hash)).toBe(`https://solscan.io/tx/${hash}`);
  });

  it('returns undefined for unknown symbol', () => {
    expect(getExplorerUrl('UNKNOWN', 'unknown', hash)).toBeUndefined();
  });
});

// ─── getExplorerUrlFromChainName ───
describe('getExplorerUrlFromChainName', () => {
  it('constructs URL from chainExplorerMapping', () => {
    expect(getExplorerUrlFromChainName('ethereum', '0xabc')).toBe('https://etherscan.io/tx/0xabc');
  });

  it('sanitizes hash (removes non-alphanumeric characters)', () => {
    // The function strips non-alphanumeric chars from the hash
    expect(getExplorerUrlFromChainName('ethereum', '0x-abc!@#')).toBe('https://etherscan.io/tx/0xabc');
  });
});

// ─── getNftExplorerUrl ───
describe('getNftExplorerUrl', () => {
  const contractAddress = '0xcontract';
  const tokenId = '42';

  it('returns OpenSea URL for ETH NFT', () => {
    expect(getNftExplorerUrl('ethereum', contractAddress, tokenId)).toBe(
      `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`,
    );
  });

  it('returns OpenSea URL for POLYGON NFT', () => {
    expect(getNftExplorerUrl('polygon', contractAddress, tokenId)).toBe(
      `https://opensea.io/assets/matic/${contractAddress}/${tokenId}`,
    );
  });

  it('returns avax explorer for AVALANCHE NFT', () => {
    expect(getNftExplorerUrl('avalanche', contractAddress, tokenId)).toBe(
      `https://explorer.avax.network/address/${contractAddress}`,
    );
  });

  it('returns bscscan for BSC NFT', () => {
    expect(getNftExplorerUrl('bsc', contractAddress, tokenId)).toBe(
      `https://bscscan.com/address/${contractAddress}`,
    );
  });

  it('returns arbiscan for ARBITRUM NFT', () => {
    expect(getNftExplorerUrl('arbitrum', contractAddress, tokenId)).toBe(
      `https://arbitrum.nftscan.com/${contractAddress}`,
    );
  });

  it('returns optimistic etherscan for OPTIMISM NFT', () => {
    expect(getNftExplorerUrl('optimism', contractAddress, tokenId)).toBe(
      `https://optimistic.etherscan.io/address/${contractAddress}`,
    );
  });

  it('returns etherscan as default for unknown chain', () => {
    expect(getNftExplorerUrl('unknown', contractAddress, tokenId)).toBe(
      `https://etherscan.io/address/${contractAddress}`,
    );
  });
});

// ─── getChain ───
describe('getChain', () => {
  it('returns CHAIN_ETH for "eth"', () => {
    const chain = getChain('eth');
    expect(chain.backendName).toBe('ethereum');
  });

  it('returns CHAIN_POLYGON for "polygon"', () => {
    const chain = getChain('polygon');
    expect(chain.backendName).toBe('polygon');
  });

  it('returns CHAIN_BASE for "base"', () => {
    const chain = getChain('base');
    expect(chain.backendName).toBe('base');
  });

  it('returns CHAIN_COSMOS for "cosmos"', () => {
    const chain = getChain('cosmos');
    expect(chain.backendName).toBe('cosmos');
  });

  it('is case-insensitive', () => {
    const chain = getChain('ETH');
    expect(chain.backendName).toBe('ethereum');
  });

  it('returns empty chain for unknown input', () => {
    const chain = getChain('unknown');
    expect(chain.backendName).toBe('ALL');
    expect(chain.chainName).toBe('');
  });
});

// ─── isBasicCosmosChain ───
describe('isBasicCosmosChain', () => {
  it('returns true for cosmos', () => {
    expect(isBasicCosmosChain('cosmos')).toBe(true);
  });

  it('returns true for osmosis', () => {
    expect(isBasicCosmosChain('osmosis')).toBe(true);
  });

  it('returns true for noble', () => {
    expect(isBasicCosmosChain('noble')).toBe(true);
  });

  it('returns true for coreum', () => {
    expect(isBasicCosmosChain('coreum')).toBe(true);
  });

  it('returns true for injective', () => {
    expect(isBasicCosmosChain('injective')).toBe(true);
  });

  it('returns false for ethereum', () => {
    expect(isBasicCosmosChain('ethereum')).toBe(false);
  });

  it('returns false for solana', () => {
    expect(isBasicCosmosChain('solana')).toBe(false);
  });
});

// ─── isCosmosChain ───
describe('isCosmosChain', () => {
  it('delegates to isBasicCosmosChain (true case)', () => {
    expect(isCosmosChain('cosmos')).toBe(true);
  });

  it('delegates to isBasicCosmosChain (false case)', () => {
    expect(isCosmosChain('ethereum')).toBe(false);
  });
});

// ─── isEIP1599Chain ───
describe('isEIP1599Chain', () => {
  it('returns true for ethereum (not in NON_EIP1599_CHAINS)', () => {
    expect(isEIP1599Chain('ethereum' as any)).toBe(true);
  });

  it('returns false for bsc (in NON_EIP1599_CHAINS)', () => {
    expect(isEIP1599Chain('bsc' as any)).toBe(false);
  });

  it('returns false for zksync_era (in NON_EIP1599_CHAINS)', () => {
    expect(isEIP1599Chain('zksync_era' as any)).toBe(false);
  });

  it('returns true for polygon (not in NON_EIP1599_CHAINS)', () => {
    expect(isEIP1599Chain('polygon' as any)).toBe(true);
  });
});
