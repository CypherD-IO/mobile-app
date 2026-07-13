/**
 * Unit tests for the Claim Incentives (bribes) pure helpers.
 */
import {
  BribeClaimStatus,
  ClaimBribesResult,
  ICandidateBribe,
  IMergedBribe,
} from '../../../models/bribesClaim.interface';
import {
  buildClaimParamsList,
  buildMerchantRows,
  formatBribeAmount,
  shortenAddress,
  summarizeClaimResults,
} from '../claimBribes.helpers';

const TOKEN_A = '0x1234567890abcdef1234567890abcdef12345678';
const TOKEN_B = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const CANDIDATE = `0x${'11'.repeat(32)}`;

describe('shortenAddress', () => {
  it('shortens a 0x address', () => {
    expect(shortenAddress(TOKEN_A)).toBe('0x1234…5678');
  });
  it('leaves short strings alone', () => {
    expect(shortenAddress('0x12')).toBe('0x12');
  });
});

describe('formatBribeAmount', () => {
  it('formats raw 18-decimal amounts', () => {
    expect(formatBribeAmount('1000000000000000000')).toBe('1');
    expect(formatBribeAmount('2500000000000000000')).toBe('2.5');
  });
  it('handles zero / empty', () => {
    expect(formatBribeAmount('0')).toBe('0');
  });
});

describe('buildMerchantRows', () => {
  const candidateBribes: ICandidateBribe[] = [
    {
      candidateId: CANDIDATE,
      merchantName: 'Acme',
      logoUrl: 'https://logo/acme.png',
      veNFTBribes: [
        {
          veNFTId: '1',
          bribes: [
            {
              tokenAddress: TOKEN_A,
              tokenSymbol: 'USDC',
              decimals: 18,
              amount: '1000000000000000000',
              amountFormatted: '1',
              valueUSD: '1.00',
              claimStatus: { isClaimed: false },
            },
            {
              tokenAddress: TOKEN_B,
              tokenSymbol: 'CYPR',
              decimals: 18,
              amount: '500000000000000000',
              amountFormatted: '0.5',
              claimStatus: { isClaimed: false },
            },
            {
              // Backend already includes the symbol — must NOT be doubled.
              tokenAddress: TOKEN_B,
              tokenSymbol: 'WETH',
              decimals: 18,
              amount: '50000000000000000',
              amountFormatted: '0.05 WETH',
              claimStatus: { isClaimed: false },
            },
            {
              tokenAddress: TOKEN_A,
              tokenSymbol: 'CLAIMED',
              decimals: 18,
              amount: '1',
              amountFormatted: '0',
              claimStatus: { isClaimed: true },
            },
          ],
        },
      ],
    },
    {
      candidateId: `0x${'22'.repeat(32)}`,
      merchantName: 'NothingLeft',
      veNFTBribes: [
        {
          veNFTId: '2',
          bribes: [
            {
              tokenAddress: TOKEN_A,
              tokenSymbol: 'USDC',
              decimals: 18,
              amount: '1',
              amountFormatted: '0',
              claimStatus: { isClaimed: true },
            },
          ],
        },
      ],
    },
  ];

  it('builds per-merchant rows (symbol/amount/USD), skipping claimed bribes and empty merchants', () => {
    const rows = buildMerchantRows(candidateBribes);
    expect(rows).toHaveLength(1);
    expect(rows[0].merchantName).toBe('Acme');
    expect(rows[0].logoUrl).toBe('https://logo/acme.png');
    expect(rows[0].tokens).toEqual([
      // number-only amountFormatted → symbol appended
      expect.objectContaining({
        symbol: 'USDC',
        amountFormatted: '1 USDC',
        valueUSD: '1.00',
      }),
      expect.objectContaining({ symbol: 'CYPR', amountFormatted: '0.5 CYPR' }),
      // already includes the symbol → left as-is (not "0.05 WETH WETH")
      expect.objectContaining({ symbol: 'WETH', amountFormatted: '0.05 WETH' }),
    ]);
  });

  it('returns [] for undefined input', () => {
    expect(buildMerchantRows(undefined)).toEqual([]);
  });
});

describe('buildClaimParamsList', () => {
  const mergedBribes: IMergedBribe[] = [
    {
      veNFTId: '7',
      bribeTokens: [TOKEN_A],
      candidates: [CANDIDATE],
      candidateNames: ['Acme'],
      totalBribeAmounts: ['1000000000000000000'],
      epochRange: { from: 100, until: 200 },
      claimStatus: BribeClaimStatus.PENDING,
    },
    {
      veNFTId: '8',
      bribeTokens: [TOKEN_B],
      candidates: [CANDIDATE],
      candidateNames: ['Done'],
      totalBribeAmounts: ['1'],
      epochRange: { from: 100, until: 200 },
      claimStatus: BribeClaimStatus.CLAIMED,
    },
  ];

  it('maps pending merged bribes to claim params (tokenId parsed), skipping claimed', () => {
    const params = buildClaimParamsList(mergedBribes);
    expect(params).toEqual([
      {
        tokenId: 7,
        bribeTokens: [TOKEN_A],
        candidates: [CANDIDATE],
        fromTimestamp: 100,
        untilTimestamp: 200,
      },
    ]);
  });

  it('returns [] for undefined input', () => {
    expect(buildClaimParamsList(undefined)).toEqual([]);
  });
});

describe('summarizeClaimResults', () => {
  it('counts successes vs total', () => {
    const results: ClaimBribesResult[] = [
      { isError: false, hash: '0x1' },
      { isError: true, error: 'boom' },
      { isError: false, hash: '0x2' },
    ];
    expect(summarizeClaimResults(results)).toEqual({ claimed: 2, total: 3 });
  });
});
