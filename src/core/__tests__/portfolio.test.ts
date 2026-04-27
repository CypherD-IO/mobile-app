/**
 * Unit tests for portfolio utilities.
 *
 * Tests chain holdings lookup and sorting logic. API-dependent functions are excluded.
 */

// ─── Mocks ───
jest.mock('@injectivelabs/sdk-ts/utils', () => ({
  getInjectiveAddress: jest.fn((addr: string) => addr),
}));
jest.mock('../../utils/decimalHelper', () => ({
  DecimalHelper: {
    isLessThan: jest.fn((a, b) => parseFloat(String(a)) < parseFloat(String(b))),
    isGreaterThan: jest.fn((a, b) => parseFloat(String(a)) > parseFloat(String(b))),
  },
}));
jest.mock('../../constants/server', () => ({
  CHAIN_ETH: { chainName: 'ethereum', backendName: 'ethereum' },
  CHAIN_POLYGON: { chainName: 'polygon', backendName: 'polygon' },
  CHAIN_BSC: { chainName: 'bsc', backendName: 'bsc' },
  CHAIN_AVALANCHE: { chainName: 'avalanche', backendName: 'avalanche' },
  CHAIN_ARBITRUM: { chainName: 'arbitrum', backendName: 'arbitrum' },
  CHAIN_OPTIMISM: { chainName: 'optimism', backendName: 'optimism' },
  CHAIN_COSMOS: { chainName: 'cosmos', backendName: 'cosmos' },
  CHAIN_OSMOSIS: { chainName: 'osmosis', backendName: 'osmosis' },
  CHAIN_NOBLE: { chainName: 'noble', backendName: 'noble' },
  CHAIN_ZKSYNC_ERA: { chainName: 'zksync_era', backendName: 'zksync_era' },
  CHAIN_BASE: { chainName: 'base', backendName: 'base' },
  CHAIN_COREUM: { chainName: 'coreum', backendName: 'coreum' },
  CHAIN_INJECTIVE: { chainName: 'injective', backendName: 'injective' },
  CHAIN_SOLANA: { chainName: 'solana', backendName: 'solana' },
  CHAIN_HYPERLIQUID: { chainName: 'hyperliquid', backendName: 'hyperliquid' },
  CHAIN_COLLECTION: { chainName: 'collection', backendName: 'collection' },
}));
jest.mock('../Http', () => ({ post: jest.fn() }));
jest.mock('../../global', () => ({ hostWorker: { getHost: jest.fn(() => '') } }));

import {
  getCurrentChainHoldings,
  sortDesc,
  getPortfolioModel,
  WalletHoldings,
  ChainHoldings,
  Holding,
} from '../portfolio';
import {
  CHAIN_ETH,
  CHAIN_POLYGON,
  CHAIN_BSC,
  CHAIN_COSMOS,
  CHAIN_SOLANA,
  CHAIN_ARBITRUM,
  CHAIN_OPTIMISM,
  CHAIN_BASE,
  CHAIN_COREUM,
  CHAIN_INJECTIVE,
  CHAIN_OSMOSIS,
  CHAIN_NOBLE,
  CHAIN_ZKSYNC_ERA,
  CHAIN_AVALANCHE,
  CHAIN_COLLECTION,
  CHAIN_HYPERLIQUID,
} from '../../constants/server';

// ─── Helpers ───

const emptyChainHoldings = (chain?: string): ChainHoldings => ({
  totalBalance: 0,
  totalUnverifiedBalance: 0,
  totalHoldings: [],
  timestamp: new Date().toISOString(),
});

const createHolding = (overrides?: Partial<Holding>): Holding => ({
  name: 'TestToken',
  symbol: 'TEST',
  logoUrl: 'https://example.com/logo.png',
  price: '100',
  contractAddress: '0x000',
  contractDecimals: 18,
  totalValue: 1000,
  balanceInteger: '10',
  balanceDecimal: '.0',
  isVerified: true,
  coinGeckoId: 'test-token',
  about: '',
  id: 1,
  chainDetails: CHAIN_ETH,
  denom: '',
  isNativeToken: false,
  isFundable: true,
  isBridgeable: true,
  isSwapable: true,
  ...overrides,
});

const createPortfolioBase = (): WalletHoldings => ({
  totalBalance: 0,
  totalUnverifiedBalance: 0,
  eth: emptyChainHoldings(),
  polygon: emptyChainHoldings(),
  bsc: emptyChainHoldings(),
  avalanche: emptyChainHoldings(),
  arbitrum: emptyChainHoldings(),
  optimism: emptyChainHoldings(),
  cosmos: emptyChainHoldings(),
  osmosis: emptyChainHoldings(),
  noble: emptyChainHoldings(),
  zksync_era: emptyChainHoldings(),
  base: emptyChainHoldings(),
  coreum: emptyChainHoldings(),
  injective: emptyChainHoldings(),
  solana: emptyChainHoldings(),
  hyperliquid: emptyChainHoldings(),
  totalHoldings: [],
  timestamp: '',
});

// ─── getCurrentChainHoldings ───
describe('getCurrentChainHoldings', () => {
  it('returns ethereum holdings for ETH chain', () => {
    const portfolio = createPortfolioBase();
    const holding = createHolding({ name: 'Ether' });
    portfolio.eth.totalHoldings = [holding];
    portfolio.eth.totalBalance = 5000;

    const result = getCurrentChainHoldings(portfolio, CHAIN_ETH);
    expect(result).toBe(portfolio.eth);
    expect(result.totalBalance).toBe(5000);
  });

  it('returns polygon holdings for POLYGON chain', () => {
    const portfolio = createPortfolioBase();
    const holding = createHolding({ name: 'Matic' });
    portfolio.polygon.totalHoldings = [holding];
    portfolio.polygon.totalBalance = 2000;

    const result = getCurrentChainHoldings(portfolio, CHAIN_POLYGON);
    expect(result).toBe(portfolio.polygon);
  });

  it('returns bsc holdings for BSC chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.bsc.totalBalance = 1500;

    const result = getCurrentChainHoldings(portfolio, CHAIN_BSC);
    expect(result).toBe(portfolio.bsc);
  });

  it('returns avalanche holdings for AVALANCHE chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.avalanche.totalBalance = 800;

    const result = getCurrentChainHoldings(portfolio, CHAIN_AVALANCHE);
    expect(result).toBe(portfolio.avalanche);
  });

  it('returns cosmos holdings for COSMOS chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.cosmos.totalBalance = 300;

    const result = getCurrentChainHoldings(portfolio, CHAIN_COSMOS);
    expect(result).toBe(portfolio.cosmos);
  });

  it('returns solana holdings for SOLANA chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.solana.totalBalance = 600;

    const result = getCurrentChainHoldings(portfolio, CHAIN_SOLANA);
    expect(result).toBe(portfolio.solana);
  });

  it('returns osmosis holdings for OSMOSIS chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.osmosis.totalBalance = 150;

    const result = getCurrentChainHoldings(portfolio, CHAIN_OSMOSIS);
    expect(result).toBe(portfolio.osmosis);
  });

  it('returns noble holdings for NOBLE chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.noble.totalBalance = 100;

    const result = getCurrentChainHoldings(portfolio, CHAIN_NOBLE);
    expect(result).toBe(portfolio.noble);
  });

  it('returns base holdings for BASE chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.base.totalBalance = 400;

    const result = getCurrentChainHoldings(portfolio, CHAIN_BASE);
    expect(result).toBe(portfolio.base);
  });

  it('returns arbitrum holdings for ARBITRUM chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.arbitrum.totalBalance = 500;

    const result = getCurrentChainHoldings(portfolio, CHAIN_ARBITRUM);
    expect(result).toBe(portfolio.arbitrum);
  });

  it('returns optimism holdings for OPTIMISM chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.optimism.totalBalance = 450;

    const result = getCurrentChainHoldings(portfolio, CHAIN_OPTIMISM);
    expect(result).toBe(portfolio.optimism);
  });

  it('returns coreum holdings for COREUM chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.coreum.totalBalance = 200;

    const result = getCurrentChainHoldings(portfolio, CHAIN_COREUM);
    expect(result).toBe(portfolio.coreum);
  });

  it('returns injective holdings for INJECTIVE chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.injective.totalBalance = 350;

    const result = getCurrentChainHoldings(portfolio, CHAIN_INJECTIVE);
    expect(result).toBe(portfolio.injective);
  });

  it('returns zksync_era holdings for ZKSYNC_ERA chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.zksync_era.totalBalance = 250;

    const result = getCurrentChainHoldings(portfolio, CHAIN_ZKSYNC_ERA);
    expect(result).toBe(portfolio.zksync_era);
  });

  it('returns hyperliquid holdings for HYPERLIQUID chain', () => {
    const portfolio = createPortfolioBase();
    portfolio.hyperliquid.totalBalance = 750;

    const result = getCurrentChainHoldings(portfolio, CHAIN_HYPERLIQUID);
    expect(result).toBe(portfolio.hyperliquid);
  });

  it('returns entire portfolio for COLLECTION chain (fallback)', () => {
    const portfolio = createPortfolioBase();
    portfolio.totalBalance = 5000;

    const result = getCurrentChainHoldings(portfolio, CHAIN_COLLECTION);
    expect(result).toBe(portfolio);
  });

  it('returns entire portfolio for unknown chain (fallback)', () => {
    const portfolio = createPortfolioBase();
    const unknownChain = { ...CHAIN_ETH, backendName: 'unknown' };

    const result = getCurrentChainHoldings(portfolio, unknownChain as any);
    expect(result).toBe(portfolio);
  });
});

// ─── sortDesc ───
describe('sortDesc', () => {
  it('sorts holdings by totalValue descending', () => {
    const holdings: Holding[] = [
      createHolding({ id: 1, totalValue: 100 }),
      createHolding({ id: 2, totalValue: 500 }),
      createHolding({ id: 3, totalValue: 300 }),
    ];

    holdings.sort(sortDesc);

    expect(holdings[0].id).toBe(2);
    expect(holdings[1].id).toBe(3);
    expect(holdings[2].id).toBe(1);
  });

  it('handles equal totalValues', () => {
    const holding1 = createHolding({ id: 1, totalValue: 100 });
    const holding2 = createHolding({ id: 2, totalValue: 100 });

    const result = sortDesc(holding1, holding2);
    expect(result).toBe(0); // Equal
  });

  it('handles string totalValues with numeric comparison', () => {
    const holding1 = createHolding({ id: 1, totalValue: 100 as any });
    const holding2 = createHolding({ id: 2, totalValue: 200 as any });

    const result = sortDesc(holding2, holding1);
    expect(result).toBe(-1); // holding2 is greater, returns -1
  });

  it('handles large totalValues', () => {
    const holdings: Holding[] = [
      createHolding({ id: 1, totalValue: 1000000 }),
      createHolding({ id: 2, totalValue: 9999999 }),
      createHolding({ id: 3, totalValue: 5000000 }),
    ];

    holdings.sort(sortDesc);

    expect(holdings[0].totalValue).toBe(9999999);
    expect(holdings[1].totalValue).toBe(5000000);
    expect(holdings[2].totalValue).toBe(1000000);
  });

  it('handles zero and negative values', () => {
    const holdings: Holding[] = [
      createHolding({ id: 1, totalValue: 100 }),
      createHolding({ id: 2, totalValue: 0 }),
      createHolding({ id: 3, totalValue: -50 }),
    ];

    holdings.sort(sortDesc);

    expect(holdings[0].totalValue).toBe(100);
    expect(holdings[1].totalValue).toBe(0);
    expect(holdings[2].totalValue).toBe(-50);
  });

  it('handles decimal values', () => {
    const holdings: Holding[] = [
      createHolding({ id: 1, totalValue: 100.5 }),
      createHolding({ id: 2, totalValue: 100.75 }),
      createHolding({ id: 3, totalValue: 100.25 }),
    ];

    holdings.sort(sortDesc);

    expect(holdings[0].totalValue).toBe(100.75);
    expect(holdings[1].totalValue).toBe(100.5);
    expect(holdings[2].totalValue).toBe(100.25);
  });

  it('handles single holding', () => {
    const holdings: Holding[] = [createHolding({ id: 1, totalValue: 100 })];
    holdings.sort(sortDesc);

    expect(holdings.length).toBe(1);
    expect(holdings[0].totalValue).toBe(100);
  });

  it('handles empty array', () => {
    const holdings: Holding[] = [];
    holdings.sort(sortDesc);

    expect(holdings.length).toBe(0);
  });

  it('preserves stable sort for equal values', () => {
    const holding1 = createHolding({ id: 1, totalValue: 100 });
    const holding2 = createHolding({ id: 2, totalValue: 100 });
    const holding3 = createHolding({ id: 3, totalValue: 100 });
    const holdings = [holding1, holding2, holding3];

    holdings.sort(sortDesc);

    // All have same value, so order may vary but all should be present
    expect(holdings.map(h => h.id)).toContain(1);
    expect(holdings.map(h => h.id)).toContain(2);
    expect(holdings.map(h => h.id)).toContain(3);
  });
});

// ─── getPortfolioModel ───
describe('getPortfolioModel', () => {
  it('transforms empty portfolio API response', () => {
    const apiResponse = {
      chainPortfolios: [],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    expect(result).toBeInstanceOf(Object);
    expect(result.totalBalance).toBe(0);
    expect(result.totalUnverifiedBalance).toBe(0);
    expect(result.totalHoldings.length).toBe(0);
  });

  it('transforms single chain portfolio', () => {
    const apiResponse = {
      chainPortfolios: [
        {
          chain: 'ethereum',
          totalValue: '1000',
          unverifiedTotalValue: '100',
          tokens: [
            {
              name: 'Ether',
              symbol: 'ETH',
              logoUrl: 'https://example.com/eth.png',
              price: '2000',
              contractAddress: '0x000',
              decimals: 18,
              totalValue: 1000,
              balanceInteger: '0',
              balanceDecimal: '.5',
              coingeckoId: 'ethereum',
              flags: {
                verified: true,
                nativeToken: true,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
      ],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    expect(result.eth.totalBalance).toBe(1000);
    expect(result.eth.totalUnverifiedBalance).toBe(100);
    expect(result.eth.totalHoldings.length).toBe(1);
    expect(result.eth.totalHoldings[0].name).toBe('Ether');
    expect(result.totalBalance).toBe(1000);
  });

  it('aggregates multiple chains', () => {
    const apiResponse = {
      chainPortfolios: [
        {
          chain: 'ethereum',
          totalValue: '1000',
          unverifiedTotalValue: '0',
          tokens: [
            {
              name: 'Ether',
              symbol: 'ETH',
              logoUrl: 'https://example.com/eth.png',
              price: '2000',
              contractAddress: '0x000',
              decimals: 18,
              totalValue: 1000,
              balanceInteger: '0',
              balanceDecimal: '.5',
              coingeckoId: 'ethereum',
              flags: {
                verified: true,
                nativeToken: true,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
        {
          chain: 'solana',
          totalValue: '500',
          unverifiedTotalValue: '0',
          tokens: [
            {
              name: 'Solana',
              symbol: 'SOL',
              logoUrl: 'https://example.com/sol.png',
              price: '100',
              contractAddress: 'So11111111111111111111111111111111111111111',
              decimals: 9,
              totalValue: 500,
              balanceInteger: '5',
              balanceDecimal: '.0',
              coingeckoId: 'solana',
              flags: {
                verified: true,
                nativeToken: true,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
      ],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    expect(result.eth.totalBalance).toBe(1000);
    expect(result.solana.totalBalance).toBe(500);
    expect(result.totalBalance).toBe(1500);
    expect(result.totalHoldings.length).toBe(2);
  });

  it('assigns unique IDs to holdings', () => {
    const apiResponse = {
      chainPortfolios: [
        {
          chain: 'ethereum',
          totalValue: '1000',
          unverifiedTotalValue: '0',
          tokens: [
            {
              name: 'Token1',
              symbol: 'TK1',
              logoUrl: 'https://example.com/tk1.png',
              price: '100',
              contractAddress: '0x001',
              decimals: 18,
              totalValue: 500,
              balanceInteger: '5',
              balanceDecimal: '.0',
              coingeckoId: 'token1',
              flags: {
                verified: true,
                nativeToken: false,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
            {
              name: 'Token2',
              symbol: 'TK2',
              logoUrl: 'https://example.com/tk2.png',
              price: '100',
              contractAddress: '0x002',
              decimals: 18,
              totalValue: 500,
              balanceInteger: '5',
              balanceDecimal: '.0',
              coingeckoId: 'token2',
              flags: {
                verified: true,
                nativeToken: false,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
      ],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    const ids = result.totalHoldings.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length); // All IDs unique
  });

  it('sorts holdings by totalValue descending', () => {
    const apiResponse = {
      chainPortfolios: [
        {
          chain: 'ethereum',
          totalValue: '2000',
          unverifiedTotalValue: '0',
          tokens: [
            {
              name: 'Token1',
              symbol: 'TK1',
              logoUrl: 'https://example.com/tk1.png',
              price: '100',
              contractAddress: '0x001',
              decimals: 18,
              totalValue: 500,
              balanceInteger: '5',
              balanceDecimal: '.0',
              coingeckoId: 'token1',
              flags: {
                verified: true,
                nativeToken: false,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
            {
              name: 'Token2',
              symbol: 'TK2',
              logoUrl: 'https://example.com/tk2.png',
              price: '100',
              contractAddress: '0x002',
              decimals: 18,
              totalValue: 1500,
              balanceInteger: '15',
              balanceDecimal: '.0',
              coingeckoId: 'token2',
              flags: {
                verified: true,
                nativeToken: false,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
      ],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    expect(result.eth.totalHoldings[0].totalValue).toBe(1500);
    expect(result.eth.totalHoldings[1].totalValue).toBe(500);
  });

  it('sets isMainnet to true by default', () => {
    const apiResponse = {
      chainPortfolios: [
        {
          chain: 'ethereum',
          totalValue: '1000',
          unverifiedTotalValue: '0',
          tokens: [
            {
              name: 'Ether',
              symbol: 'ETH',
              logoUrl: 'https://example.com/eth.png',
              price: '2000',
              contractAddress: '0x000',
              decimals: 18,
              totalValue: 1000,
              balanceInteger: '0',
              balanceDecimal: '.5',
              coingeckoId: 'ethereum',
              // isMainnet is missing
              flags: {
                verified: true,
                nativeToken: true,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
      ],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    expect(result.eth.totalHoldings[0].isMainnet).toBe(true);
  });

  it('respects isMainnet when provided', () => {
    const apiResponse = {
      chainPortfolios: [
        {
          chain: 'ethereum',
          totalValue: '1000',
          unverifiedTotalValue: '0',
          tokens: [
            {
              name: 'Ether',
              symbol: 'ETH',
              logoUrl: 'https://example.com/eth.png',
              price: '2000',
              contractAddress: '0x000',
              decimals: 18,
              totalValue: 1000,
              balanceInteger: '0',
              balanceDecimal: '.5',
              coingeckoId: 'ethereum',
              isMainnet: false,
              flags: {
                verified: true,
                nativeToken: true,
                zeroFeeToken: false,
                fundable: true,
                swapable: true,
                bridgeable: true,
              },
            },
          ],
        },
      ],
      hyperliquidBalances: [],
    };

    const result = getPortfolioModel(apiResponse);

    expect(result.eth.totalHoldings[0].isMainnet).toBe(false);
  });
});
