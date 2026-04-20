/**
 * Unit tests for DeFi utilities — sort functions, chain logo lookup, position details, and parseDefiData.
 */

// ─── Mocks ───
jest.mock('../../constants/server', () => ({
  ChainBackendNames: { ETH: 'ethereum', ARBITRUM: 'arbitrum', AVALANCHE: 'avalanche', BASE: 'base', BSC: 'bsc', COSMOS: 'cosmos', NOBLE: 'noble', COREUM: 'coreum', INJECTIVE: 'injective', OPTIMISM: 'optimism', OSMOSIS: 'osmosis', POLYGON: 'polygon', ZKSYNC_ERA: 'zksync_era', ALL: 'All' },
  CHAIN_ETH: { logo_url: 'eth_logo' },
  CHAIN_ARBITRUM: { logo_url: 'arb_logo' },
  CHAIN_AVALANCHE: { logo_url: 'avax_logo' },
  CHAIN_BASE: { logo_url: 'base_logo' },
  CHAIN_BSC: { logo_url: 'bsc_logo' },
  CHAIN_COSMOS: { logo_url: 'cosmos_logo' },
  CHAIN_NOBLE: { logo_url: 'noble_logo' },
  CHAIN_COREUM: { logo_url: 'coreum_logo' },
  CHAIN_INJECTIVE: { logo_url: 'inj_logo' },
  CHAIN_OPTIMISM: { logo_url: 'op_logo' },
  CHAIN_OSMOSIS: { logo_url: 'osmo_logo' },
  CHAIN_POLYGON: { logo_url: 'polygon_logo' },
  CHAIN_ZKSYNC_ERA: { logo_url: 'zksync_logo' },
}));
jest.mock('../../../assets/images/appImages', () => ({
  __esModule: true,
  default: {
    UNKNOWN_TXN_TOKEN: 'unknown_token',
    DEFI_LIQUIDITY: 'defi_liquidity',
    DEFI_STAKING: 'defi_staking',
    DEFI_YEILD: 'defi_yield',
    DEFI_FARMING: 'defi_farming',
    DEFI_LENDING: 'defi_lending',
    DEFI_DEPOSIT: 'defi_deposit',
    DEFI_LEVERAGED_FARMING: 'defi_leveraged_farming',
    DEFI_OTHERS: 'defi_others',
    DEFI_LOCKED: 'defi_locked',
    DEFI_REWARDS: 'defi_rewards',
    DEFI_VESTING: 'defi_vesting',
    DEFI_NFT_STAKING: 'defi_nft_staking',
    DEFI_AIRDROP: 'defi_airdrop',
  },
}));

import {
  getChainLogo,
  getPositionDetails,
  sortDefiProtocolDesc,
  sortDefiChainsDesc,
  sortDefiPositionDesc,
  sortDefiAllocation,
  sortProtocols,
  parseDefiData,
} from '../defi';

// ─── getChainLogo ───
describe('getChainLogo', () => {
  it('returns eth_logo for ETH', () => {
    expect(getChainLogo('ethereum' as any)).toBe('eth_logo');
  });

  it('returns arb_logo for ARBITRUM', () => {
    expect(getChainLogo('arbitrum' as any)).toBe('arb_logo');
  });

  it('returns polygon_logo for POLYGON', () => {
    expect(getChainLogo('polygon' as any)).toBe('polygon_logo');
  });

  it('returns unknown_token for unknown chain', () => {
    expect(getChainLogo('unknown_chain' as any)).toBe('unknown_token');
  });
});

// ─── getPositionDetails ───
describe('getPositionDetails', () => {
  // Note: DefiPositonTypes enum has a typo: LIQUIDITY = 'liqudity' (not 'liquidity')
  it('returns Liquidity Provision for LIQUIDITY', () => {
    const [logo, label] = getPositionDetails('liqudity' as any);
    expect(logo).toBe('defi_liquidity');
    expect(label).toBe('Liquidity Provision');
  });

  it('returns Staking for STAKING', () => {
    const [logo, label] = getPositionDetails('staking' as any);
    expect(logo).toBe('defi_staking');
    expect(label).toBe('Staking');
  });

  it('returns Lending for LENDING', () => {
    const [logo, label] = getPositionDetails('lending' as any);
    expect(logo).toBe('defi_lending');
    expect(label).toBe('Lending');
  });

  it('returns Rewards for REWARDS', () => {
    const [logo, label] = getPositionDetails('rewards' as any);
    expect(logo).toBe('defi_rewards');
    expect(label).toBe('Rewards');
  });

  it('returns Unknown for unrecognized type', () => {
    const [logo, label] = getPositionDetails('SomethingNew' as any);
    expect(logo).toBe('defi_airdrop');
    expect(label).toBe('Unknown');
  });
});

// ─── sortDefiProtocolDesc ───
describe('sortDefiProtocolDesc', () => {
  it('returns 1 when a < b (sorts b first)', () => {
    const a = { total: { value: 100 } } as any;
    const b = { total: { value: 200 } } as any;
    expect(sortDefiProtocolDesc(a, b)).toBe(1);
  });

  it('returns -1 when a > b', () => {
    const a = { total: { value: 200 } } as any;
    const b = { total: { value: 100 } } as any;
    expect(sortDefiProtocolDesc(a, b)).toBe(-1);
  });

  it('returns 0 when equal', () => {
    const a = { total: { value: 100 } } as any;
    const b = { total: { value: 100 } } as any;
    expect(sortDefiProtocolDesc(a, b)).toBe(0);
  });
});

// ─── sortDefiChainsDesc ───
describe('sortDefiChainsDesc', () => {
  it('sorts chains by total.value descending', () => {
    const items = [
      { total: { value: 100 } },
      { total: { value: 300 } },
      { total: { value: 200 } },
    ] as any[];
    items.sort(sortDefiChainsDesc);
    expect(items[0].total.value).toBe(300);
    expect(items[2].total.value).toBe(100);
  });
});

// ─── sortDefiPositionDesc ───
describe('sortDefiPositionDesc', () => {
  it('sorts positions by total.value descending', () => {
    const items = [
      { total: { value: 50 } },
      { total: { value: 150 } },
    ] as any[];
    items.sort(sortDefiPositionDesc);
    expect(items[0].total.value).toBe(150);
  });
});

// ─── sortDefiAllocation ───
describe('sortDefiAllocation', () => {
  it('sorts by balance descending', () => {
    const items = [
      { balance: 100 },
      { balance: 300 },
      { balance: 200 },
    ] as any[];
    items.sort(sortDefiAllocation);
    expect(items[0].balance).toBe(300);
    expect(items[2].balance).toBe(100);
  });

  it('returns 0 for equal balances', () => {
    expect(sortDefiAllocation({ balance: 100 } as any, { balance: 100 } as any)).toBe(0);
  });
});

// ─── sortProtocols ───
describe('sortProtocols', () => {
  it('sorts alphabetically ascending by label', () => {
    const items = [
      { label: 'Charlie' },
      { label: 'Alice' },
      { label: 'Bob' },
    ] as any[];
    items.sort(sortProtocols);
    expect(items[0].label).toBe('Alice');
    expect(items[1].label).toBe('Bob');
    expect(items[2].label).toBe('Charlie');
  });

  it('is case-insensitive', () => {
    const a = { label: 'alpha' } as any;
    const b = { label: 'Beta' } as any;
    expect(sortProtocols(a, b)).toBe(-1);
  });

  it('returns 0 for same label', () => {
    const a = { label: 'Same' } as any;
    const b = { label: 'Same' } as any;
    expect(sortProtocols(a, b)).toBe(0);
  });
});

// ─── parseDefiData ───
describe('parseDefiData', () => {
  const emptyFilters = {
    chain: 'All',
    positionTypes: [],
    protocols: [],
    activePositionsOnly: false,
  };

  it('returns empty structure for empty protocols array', () => {
    const result = parseDefiData([], emptyFilters as any);
    expect(result.defiData.total.value).toBe(0);
    expect(result.defiData.total.supply).toBe(0);
    expect(result.defiData.total.debt).toBe(0);
    expect(Object.keys(result.defiData.protocols)).toHaveLength(0);
    expect(result.chainAllocation).toHaveLength(0);
    expect(result.typeAllocation).toHaveLength(0);
  });

  it('parses a single protocol with one position', () => {
    const protocols = [{
      name: 'Aave',
      chain: 'ethereum',
      logo: 'https://aave.com/logo.png',
      url: 'https://aave.com',
      positions: [{
        type: 'lending',
        total: { supply: 1000, debt: 0, value: 1000, isActive: true },
        details: { rewards: null },
      }],
    }];

    const result = parseDefiData(protocols as any, emptyFilters as any);

    expect(result.defiData.total.value).toBe(1000);
    expect(result.defiData.total.supply).toBe(1000);
    expect(result.defiData.protocols['Aave']).toBeDefined();
    expect(result.defiData.protocols['Aave'].protocolName).toBe('Aave');
    expect(result.chainAllocation).toHaveLength(1);
    expect(result.chainAllocation[0].name).toBe('ethereum');
  });

  it('filters by chain', () => {
    const protocols = [{
      name: 'Aave',
      chain: 'ethereum',
      logo: 'https://aave.com/logo.png',
      url: 'https://aave.com',
      positions: [{
        type: 'lending',
        total: { supply: 1000, debt: 0, value: 1000, isActive: true },
        details: { rewards: null },
      }],
    }];

    const filters = { ...emptyFilters, chain: 'polygon' };
    const result = parseDefiData(protocols as any, filters as any);

    // Ethereum protocol should be excluded when filtering for polygon
    expect(Object.keys(result.defiData.protocols)).toHaveLength(0);
  });

  it('removes protocol with all-zero totals', () => {
    const protocols = [{
      name: 'EmptyProtocol',
      chain: 'ethereum',
      logo: 'https://empty.com/logo.png',
      url: 'https://empty.com',
      positions: [{
        type: 'staking',
        total: { supply: 0, debt: 0, value: 0, isActive: false },
        details: { rewards: null },
      }],
    }];

    // With activePositionsOnly=true, the position is filtered out,
    // leaving protocol with zero totals → gets deleted
    const filters = { ...emptyFilters, activePositionsOnly: true };
    const result = parseDefiData(protocols as any, filters as any);

    expect(result.defiData.protocols['EmptyProtocol']).toBeUndefined();
  });

  it('accumulates rewards into claimable total', () => {
    const protocols = [{
      name: 'RewardProtocol',
      chain: 'ethereum',
      logo: 'https://rewards.com/logo.png',
      url: 'https://rewards.com',
      positions: [{
        type: 'staking',
        total: { supply: 500, debt: 0, value: 500, isActive: true },
        details: {
          rewards: [
            { balanceUSD: 25 },
            { balanceUSD: 75 },
          ],
        },
      }],
    }];

    const result = parseDefiData(protocols as any, emptyFilters as any);

    expect(result.defiData.total.claimable).toBe(100);
    expect(result.defiData.protocols['RewardProtocol'].total.claimable).toBe(100);
  });

  it('sorts defiOptionsData alphabetically', () => {
    const protocols = [
      {
        name: 'Zapper',
        chain: 'ethereum',
        logo: 'https://zapper.com/logo.png',
        url: 'https://zapper.com',
        positions: [{
          type: 'staking',
          total: { supply: 100, debt: 0, value: 100, isActive: true },
          details: { rewards: null },
        }],
      },
      {
        name: 'Aave',
        chain: 'ethereum',
        logo: 'https://aave.com/logo.png',
        url: 'https://aave.com',
        positions: [{
          type: 'lending',
          total: { supply: 200, debt: 0, value: 200, isActive: true },
          details: { rewards: null },
        }],
      },
    ];

    const result = parseDefiData(protocols as any, emptyFilters as any);

    expect(result.defiOptionsData[0].label).toBe('Aave');
    expect(result.defiOptionsData[1].label).toBe('Zapper');
  });

  it('aggregates multiple chains into chainAllocation', () => {
    const protocols = [
      {
        name: 'Proto1',
        chain: 'ethereum',
        logo: 'logo1',
        url: 'url1',
        positions: [{
          type: 'staking',
          total: { supply: 500, debt: 0, value: 500, isActive: true },
          details: { rewards: null },
        }],
      },
      {
        name: 'Proto2',
        chain: 'polygon',
        logo: 'logo2',
        url: 'url2',
        positions: [{
          type: 'lending',
          total: { supply: 300, debt: 0, value: 300, isActive: true },
          details: { rewards: null },
        }],
      },
    ];

    const result = parseDefiData(protocols as any, emptyFilters as any);

    expect(result.chainAllocation).toHaveLength(2);
    const ethAlloc = result.chainAllocation.find(c => c.name === 'ethereum');
    const polyAlloc = result.chainAllocation.find(c => c.name === 'polygon');
    expect(ethAlloc?.balance).toBe(500);
    expect(polyAlloc?.balance).toBe(300);
  });
});
