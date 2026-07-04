import { DecimalHelper } from '../../utils/decimalHelper';
import {
  BribeClaimStatus,
  ClaimBribesParams,
  ClaimBribesResult,
  ICandidateBribe,
  IMergedBribe,
} from '../../models/bribesClaim.interface';

// Bribe token amounts come back raw; the data has no per-token decimals, so we
// format at the protocol default (18).
const TOKEN_DECIMALS = 18;

export interface MerchantBribeTokenAmount {
  symbol: string;
  amountFormatted: string;
  valueUSD?: string;
  logo?: string;
}

export interface MerchantBribeRow {
  candidateId: string;
  merchantName: string;
  logoUrl?: string;
  tokens: MerchantBribeTokenAmount[];
}

/** "0x1234…abcd" for a token address with no symbol in the data. */
export const shortenAddress = (address: string): string =>
  address && address.length > 10
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

/** Raw on-chain amount → human readable (18 decimals, ≤4 fraction digits). */
export const formatBribeAmount = (raw: string): string => {
  const decimal = DecimalHelper.toDecimal(raw ?? '0', TOKEN_DECIMALS).toString();
  return parseFloat(decimal).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
};

/**
 * Per-merchant display rows: one row per merchant with its unclaimed token
 * bribes (symbol + formatted amount + USD value + logo). Merchants with nothing
 * left to claim are dropped so the list never renders empty cards.
 */
export const buildMerchantRows = (
  candidateBribes?: ICandidateBribe[],
): MerchantBribeRow[] => {
  if (!candidateBribes) return [];
  return candidateBribes
    .map(c => ({
      candidateId: c.candidateId,
      merchantName: c.merchantName,
      logoUrl: c.logoUrl,
      tokens: (c.veNFTBribes ?? [])
        .flatMap(group => group.bribes ?? [])
        .filter(bribe => !bribe.claimStatus?.isClaimed)
        .map(bribe => {
          const symbol =
            bribe.tokenSymbol || shortenAddress(bribe.tokenAddress);
          const raw =
            bribe.amountFormatted || formatBribeAmount(bribe.amount ?? '0');
          // The backend's `amountFormatted` usually already includes the symbol
          // (e.g. "0.05 USDC"); only append it when missing so it isn't doubled
          // ("USDC USDC").
          return {
            symbol,
            amountFormatted:
              symbol && !raw.includes(symbol) ? `${raw} ${symbol}` : raw,
            valueUSD: bribe.valueUSD,
            logo: bribe.logo,
          };
        }),
    }))
    .filter(row => row.tokens.length > 0);
};

/**
 * One claim-params entry per veNFT (mergedBribes), skipping claimed. The caller
 * adds onStatusUpdate. tokenId is parsed from the veNFT id string.
 */
export type ClaimParam = Omit<ClaimBribesParams, 'onStatusUpdate'>;

export const buildClaimParamsList = (
  mergedBribes?: IMergedBribe[],
): ClaimParam[] => {
  if (!mergedBribes) return [];
  return mergedBribes
    .filter(m => m.claimStatus !== BribeClaimStatus.CLAIMED)
    .map(m => ({
      tokenId: parseInt(m.veNFTId, 10),
      bribeTokens: m.bribeTokens,
      candidates: m.candidates,
      fromTimestamp: m.epochRange.from,
      untilTimestamp: m.epochRange.until,
    }));
};

/** Partial-success counts from a batch of claim results. */
export const summarizeClaimResults = (
  results: ClaimBribesResult[],
): { claimed: number; total: number } => ({
  claimed: results.filter(r => !r.isError).length,
  total: results.length,
});
