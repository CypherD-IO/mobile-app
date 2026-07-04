import { formatAmount } from '../../../core/util';
import { DecimalHelper } from '../../../utils/decimalHelper';

/** Live amounts shown on the winddown step cards, fetched from their APIs. */
export interface StepAmounts {
  /** Withdrawable card balance, formatted (e.g. "642.18"). */
  cardBalance?: string;
  /** Withdrawable card balance as a number, for the "done when 0" step check. */
  cardBalanceNum?: number;
  /** Claimable CYPR rewards, formatted (e.g. "1,240"). */
  cyprRewards?: string;
  /** Claimable CYPR as a number, for the "done when 0" step check. */
  cyprRewardsNum?: number;
  /** Claimable incentives total in USD, formatted (e.g. "0.24"). */
  incentivesUsd?: string;
  /** Claimable incentives (USD) as a number, for the "done when 0" step check. */
  incentivesUsdNum?: number;
}

type AuthedGet = (
  url: string,
) => Promise<{ isError: boolean; data?: any } | null>;

/**
 * Fetches the live amounts for the winddown step cards from their endpoints:
 *  - card balance    → GET /v1/cards/crypto-withdrawal/eligibility
 *  - CYPR rewards    → GET /v1/cypher-protocol/user/claim-reward
 *  - incentives (USD)→ GET /v1/cypher-protocol/bribes/claim
 *
 * Each source is independent — a failure just leaves that amount unset (the step
 * shows no amount) rather than failing the others.
 */
export const fetchWinddownStepAmounts = async (
  getWithAuth: AuthedGet,
  hasCard: boolean,
): Promise<StepAmounts> => {
  const [balanceRes, rewardsRes, bribesRes] = await Promise.all([
    hasCard
      ? getWithAuth('/v1/cards/crypto-withdrawal/eligibility')
      : Promise.resolve(null),
    getWithAuth('/v1/cypher-protocol/user/claim-reward'),
    getWithAuth('/v1/cypher-protocol/bribes/claim'),
  ]);

  const amounts: StepAmounts = {};

  // Only set the balance when the API actually returns a `withdrawableAmount`.
  // A null/absent value means the user has no card balance (or never had a
  // card) — the withdraw step is hidden entirely in that case (see
  // useWinddownSteps `isApplicable`), so we deliberately leave it unset rather
  // than coercing to 0 (which would wrongly show the step as "completed").
  const withdrawable = balanceRes?.isError
    ? undefined
    : balanceRes?.data?.withdrawableAmount;
  if (withdrawable != null) {
    const num = Number(withdrawable) || 0;
    amounts.cardBalanceNum = num;
    amounts.cardBalance = formatAmount(String(num), 2);
  }

  const rewardWei = rewardsRes?.isError
    ? null
    : rewardsRes?.data?.rewardInfo?.totalRewardsInToken;
  if (rewardWei != null) {
    const cyprDecimal = DecimalHelper.toDecimal(String(rewardWei), 18);
    amounts.cyprRewards = formatAmount(cyprDecimal, 2);
    amounts.cyprRewardsNum = cyprDecimal.toNumber();
  }

  const bribesUsd = bribesRes?.isError
    ? null
    : bribesRes?.data?.summary?.totalClaimableBribes;
  if (bribesUsd != null) {
    amounts.incentivesUsdNum = Number(bribesUsd) || 0;
    amounts.incentivesUsd = amounts.incentivesUsdNum.toFixed(2);
  }

  return amounts;
};
