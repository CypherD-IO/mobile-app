/**
 * Winddown ("sunset") constants and static content.
 *
 * Milestone dates come exclusively from the wind-down API (GET /v1/wind-down) at
 * runtime via `resolveWindDownDates()` — nothing is hardcoded; an absent config
 * yields empty strings. All date-bearing copy is built with those effective
 * dates through the `build*` helpers, so it never drifts.
 */

export type WinddownStepId =
  | 'withdraw'
  | 'claimRewards'
  | 'claimIncentives'
  | 'backup';

/** The milestone dates the sunset UI needs (ISO yyyy-mm-dd, UTC). */
export interface WindDownDates {
  /** Wind-down begins; rewards paused; card loading + new applications disabled. */
  windDownStart: string;
  /** Final reward-epoch end / rewards-distribution date (protocol wind-down). */
  rewardEpochEnd: string;
  /** Card spending cut-off shown on the Home banner. */
  cardSpendTill: string;
  /** Card spending ends / all cards cancelled. */
  cardSpendEnd: string;
  /** Platform shutdown; withdrawal + rewards-claim deadline. */
  shutdown: string;
}

/**
 * Milestone dates, sourced entirely from the wind-down API config
 * (GET /v1/wind-down). No dates are hardcoded: a missing config or field yields
 * an empty string, so date UI only renders once the backend has answered (which
 * it always has by the time the sunset flag is on, since both come together).
 */
export const resolveWindDownDates = (
  config?: {
    windDownStartDate?: string;
    finalRewardsDistributionDate?: string;
    cardSpendTillDate?: string;
    cardSpendEndDate?: string;
    shutdownDate?: string;
  } | null,
): WindDownDates => ({
  windDownStart: config?.windDownStartDate ?? '',
  rewardEpochEnd: config?.finalRewardsDistributionDate ?? '',
  cardSpendTill: config?.cardSpendTillDate ?? '',
  cardSpendEnd: config?.cardSpendEndDate ?? '',
  shutdown: config?.shutdownDate ?? '',
});

const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats an ISO yyyy-mm-dd date as "July 8, 2026" (long) or "Oct 6, 2026"
 * (short). UTC-based so the calendar day never shifts by timezone.
 */
export const formatWindDownDate = (
  iso: string,
  style: 'long' | 'short' = 'long',
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = (style === 'short' ? SHORT_MONTHS : LONG_MONTHS)[
    date.getUTCMonth()
  ];
  return `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Whole days remaining until `target`, never negative.
 * @param target ISO date string (empty/invalid → 0)
 * @param from   reference date (defaults to now) — injectable for testing
 */
export const getDaysRemaining = (
  target: string,
  from: Date = new Date(),
): number => {
  const targetMs = new Date(target).getTime();
  if (Number.isNaN(targetMs)) return 0;
  const diffDays = Math.ceil((targetMs - from.getTime()) / MS_PER_DAY);
  return Math.max(0, diffDays);
};

// ---------------------------------------------------------------------------
// Learn More — timeline + detail content, built with the effective dates
// ---------------------------------------------------------------------------

export interface WinddownTimelineMilestone {
  date: string; // ISO; rendered via the app's date formatter
  icon: string; // CyDIcons glyph shown while the milestone is still upcoming
  items: string[];
}

export const buildWinddownTimeline = (
  dates: WindDownDates,
): WinddownTimelineMilestone[] => [
  {
    date: dates.windDownStart,
    icon: 'information',
    items: [
      'Cypher starts winding down',
      'Card loading disabled',
      'New applications disabled',
    ],
  },
  {
    date: dates.cardSpendEnd,
    icon: 'card',
    items: ['Card spending ends', 'All cards cancelled'],
  },
  {
    date: dates.shutdown,
    icon: 'sunset',
    items: ['Platform shutdown', 'Withdrawal deadline', 'Rewards claim deadline'],
  },
];

export interface WinddownDetail {
  key: string;
  title: string;
  /**
   * Milestone date for the badge, derived at render: past/today → "Ended",
   * else "Ends in N days". No badge when unset.
   */
  endsOn?: string;
  points: string[];
}

export const buildWinddownDetails = (
  dates: WindDownDates,
): WinddownDetail[] => {
  const start = formatWindDownDate(dates.windDownStart);
  const spendEnd = formatWindDownDate(dates.cardSpendEnd);
  const shutdown = formatWindDownDate(dates.shutdown);
  const rewardEpoch = formatWindDownDate(dates.rewardEpochEnd);
  return [
    {
      key: 'cardBalance',
      title: 'Card Balance',
      endsOn: dates.shutdown,
      points: [
        `Withdraw any remaining card balance before ${shutdown}.`,
        'The withdrawal is processed as USDC on Base and may take a few hours during the wind-down period.',
      ],
    },
    {
      key: 'cardSpending',
      title: 'Card Spending',
      endsOn: dates.cardSpendEnd,
      points: [
        `Existing cards can continue to be used until ${spendEnd}.`,
        `All cards are cancelled after ${spendEnd}.`,
      ],
    },
    {
      key: 'cardLoading',
      title: 'Card Loading',
      endsOn: dates.windDownStart,
      points: [
        `Card loading is disabled on ${start}.`,
        'No additional funds can be added to cards during the wind-down period.',
      ],
    },
    {
      key: 'rewards',
      title: 'Rewards',
      endsOn: dates.rewardEpochEnd,
      points: [
        `The final reward epoch ends on ${rewardEpoch}.`,
        `No new rewards accrue after ${rewardEpoch}.`,
        `Existing rewards can be claimed until ${shutdown}.`,
      ],
    },
    {
      key: 'unlockedCypr',
      title: 'Unlocked CYPR',
      endsOn: dates.shutdown,
      points: [
        'Any unlocked CYPR remains claimable during the wind-down period.',
        `Unlocked CYPR must be claimed before ${shutdown}.`,
      ],
    },
    {
      key: 'protocol',
      title: 'Protocol',
      endsOn: dates.rewardEpochEnd,
      points: [
        `The rewards and governance protocol is sunset on ${rewardEpoch}.`,
        'Protocol participation is no longer available.',
        'Relevant balances and claim information remain visible during the wind-down period.',
      ],
    },
    {
      key: 'walletSecurity',
      title: 'Wallet Security',
      points: [
        'Back up your wallet seed phrase and recovery details.',
        'Verify that you can access your wallet.',
        'After shutdown, access to your assets depends entirely on your self-custody wallet.',
      ],
    },
    {
      key: 'transactionHistory',
      title: 'Transaction History',
      endsOn: dates.shutdown,
      points: [
        `Transaction history can be downloaded until ${shutdown}.`,
        'A full list of transaction records is shared once everything is wrapped up.',
      ],
    },
    {
      key: 'finalShutdown',
      title: 'Final Shutdown',
      endsOn: dates.shutdown,
      points: [
        `Cypher services permanently shut down on ${shutdown}.`,
        'Withdrawals, reward claims, and transaction-history exports are no longer available after this date.',
      ],
    },
  ];
};
