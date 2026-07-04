import { useCallback, useContext, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
import * as Sentry from '@sentry/react-native';
import { screenTitle } from '../../../constants';
import {
  formatWindDownDate,
  resolveWindDownDates,
  WindDownDates,
  WinddownStepId,
} from '../../../constants/winddown';
import { useSunset } from '../../../store/sunsetStore';
import useAxios from '../../../core/HttpRequest';
import { fetchWinddownStepAmounts, StepAmounts } from './winddownStepAmounts';
import { HdWalletContext } from '../../../core/util';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import { GlobalContext } from '../../../core/globalContext';
import {
  getWinddownStepsCompleted,
  setWinddownStepCompleted,
} from '../../../core/asyncStorage';
import { ConnectionTypes } from '../../../constants/enum';
import { CardProfile } from '../../../models/cardProfile.model';
import { SECURE_WALLET_SUPPORTED_TYPES } from '../secureWallet/getSecureWalletVariant';
import { getEffectiveConnectionType } from '../secureWallet/effectiveConnectionType';
import { WinddownStepStatus, WinddownStepViewModel } from '../types';

/** Inputs that decide which steps apply to the current wallet. */
export interface WinddownStepContext {
  isReadOnlyWallet: boolean;
  hasCard: boolean;
  connectionType: ConnectionTypes | null;
  /** Card profile, used to pass card + provider into the withdraw flow. */
  cardProfile: CardProfile | null;
  /** Effective wind-down dates, interpolated into step copy. */
  dates: WindDownDates;
  /** Live amounts from the step APIs; unset fields render no amount. */
  amounts: StepAmounts;
}

type Navigation = NavigationProp<ParamListBase>;

interface StepDefinition {
  id: WinddownStepId;
  icon: string;
  isApplicable: (ctx: WinddownStepContext) => boolean;
  /**
   * Frontend check for this step's status. Phase 1 returns placeholder
   * statuses; Phase 2 wires the real balance/claimable/backup sources.
   */
  resolveStatus: (ctx: WinddownStepContext) => Promise<WinddownStepStatus>;
  buildViewModel: (
    status: WinddownStepStatus,
    navigation: Navigation,
    ctx: WinddownStepContext,
  ) => Omit<WinddownStepViewModel, 'isPrimary'>;
}

const COMPLETED_BADGE = {
  label: t('WINDDOWN_COMPLETED', 'Completed'),
  tone: 'green' as const,
};

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: 'withdraw',
    icon: 'arrow-up-right',
    // Only for users who actually have a card balance to move. A null/absent
    // withdrawable amount (no balance / never had a card) hides the step so it
    // doesn't confuse those users with a withdraw/"completed" they never did.
    isApplicable: ctx => ctx.hasCard && ctx.amounts.cardBalanceNum != null,
    // Balance is $0 → nothing left to withdraw → the step is done (no button).
    resolveStatus: async ctx =>
      ctx.amounts.cardBalanceNum === 0
        ? WinddownStepStatus.COMPLETED
        : WinddownStepStatus.ACTIONABLE,
    buildViewModel: (status, navigation, ctx) => {
      const base = {
        id: 'withdraw' as const,
        icon: 'arrow-up-right',
        iconType: 'cyd' as const,
        title: t('WINDDOWN_WITHDRAW_TITLE', 'Withdraw card balance'),
      };
      if (status === WinddownStepStatus.IN_PROGRESS) {
        return {
          ...base,
          status,
          badge: {
            label: t('WINDDOWN_IN_PROGRESS', 'In progress'),
            tone: 'amber',
          },
          description: t(
            'WINDDOWN_WITHDRAW_IN_PROGRESS',
            'Your withdrawal is in progress. The money will be in your wallet soon.',
          ),
          detailLine:
            ctx.amounts.cardBalance != null
              ? `${t('WINDDOWN_WITHDRAWING_LEAD', 'Withdrawing $')}${
                  ctx.amounts.cardBalance
                }`
              : undefined,
        };
      }
      if (status === WinddownStepStatus.COMPLETED) {
        return {
          ...base,
          status,
          badge: COMPLETED_BADGE,
          description: t(
            'WINDDOWN_WITHDRAW_DONE',
            'Your card balance has been moved to your wallet.',
          ),
        };
      }
      return {
        ...base,
        status,
        description:
          t(
            'WINDDOWN_WITHDRAW_DESC_LEAD',
            'Move any remaining card balance to your wallet before ',
          ) +
          formatWindDownDate(ctx.dates.shutdown, 'short') +
          '.',
        detailLine:
          ctx.amounts.cardBalance != null
            ? `${t('WINDDOWN_WITHDRAW_BALANCE_LEAD', 'Balance $')}${
                ctx.amounts.cardBalance
              }`
            : undefined,
        primaryAction: {
          label: t('WINDDOWN_WITHDRAW_CTA', 'Withdraw'),
          variant: 'primary',
          // Pushed onto the Home stack (registered there too) so the flow stays
          // in the Home tab — back returns to Home, and the Options tab is never
          // left sitting on the withdraw screen.
          onPress: () =>
            navigation.navigate(screenTitle.CRYPTO_WITHDRAWAL, {
              currentCardProvider: ctx.cardProfile?.provider,
              card: ctx.cardProfile?.rc?.cards?.[0],
            }),
        },
      };
    },
  },
  {
    id: 'claimRewards',
    icon: 'circle-star',
    isApplicable: () => true,
    // Nothing left to claim (0 CYPR) → the step is done. Undefined = not yet
    // loaded, so stay actionable until the amount is known.
    resolveStatus: async ctx =>
      ctx.amounts.cyprRewardsNum === 0
        ? WinddownStepStatus.COMPLETED
        : WinddownStepStatus.ACTIONABLE,
    buildViewModel: (status, navigation, ctx) => {
      const base = {
        id: 'claimRewards' as const,
        icon: 'circle-star',
        iconType: 'cyd' as const,
        title: t('WINDDOWN_CLAIM_REWARDS_TITLE', 'Claim Rewards'),
      };
      if (status === WinddownStepStatus.COMPLETED) {
        return {
          ...base,
          status,
          badge: COMPLETED_BADGE,
          description: t(
            'WINDDOWN_CLAIM_REWARDS_DONE',
            "You've claimed all the rewards for your spending at Cypher!",
          ),
        };
      }
      return {
        ...base,
        status,
        description:
          t(
            'WINDDOWN_CLAIM_REWARDS_DESC_LEAD',
            'Claim all available CYPR rewards. The final reward epoch ends on ',
          ) +
          formatWindDownDate(ctx.dates.rewardEpochEnd, 'short') +
          t('WINDDOWN_CLAIM_REWARDS_DESC_TAIL', ' — no new rewards accrue.'),
        detailLine:
          (ctx.amounts.cyprRewards != null
            ? `${t('WINDDOWN_CLAIM_REWARDS_AVAILABLE', 'Available ')}${
                ctx.amounts.cyprRewards
              }${t('WINDDOWN_CYPR_CLAIM_BY', ' CYPR · Claim by ')}`
            : t('WINDDOWN_CLAIM_BY', 'Claim by ')) +
          formatWindDownDate(ctx.dates.shutdown, 'short'),
        primaryAction: {
          label: t('WINDDOWN_CLAIM_REWARDS_CTA', 'Claim Rewards'),
          variant: 'secondary',
          // Pushed onto the Home stack (registered there too) so back returns
          // to Home, not the Rewards tab's history.
          onPress: () => navigation.navigate(screenTitle.CLAIM_REWARD),
        },
      };
    },
  },
  {
    id: 'claimIncentives',
    icon: 'circle-dollor',
    isApplicable: () => true,
    // Nothing left to claim ($0 incentives) → the step is done (no button).
    // Undefined = not yet loaded, so stay actionable until the amount is known.
    resolveStatus: async ctx =>
      ctx.amounts.incentivesUsdNum === 0
        ? WinddownStepStatus.COMPLETED
        : WinddownStepStatus.ACTIONABLE,
    buildViewModel: (status, navigation, ctx) => {
      const base = {
        id: 'claimIncentives' as const,
        icon: 'circle-dollor',
        iconType: 'cyd' as const,
        title: t('WINDDOWN_CLAIM_INCENTIVES_TITLE', 'Claim Incentives'),
      };
      if (status === WinddownStepStatus.COMPLETED) {
        return {
          ...base,
          status,
          badge: COMPLETED_BADGE,
          description: t(
            'WINDDOWN_CLAIM_INCENTIVES_DONE',
            'You have claimed all available incentives from the Cypher protocol.',
          ),
        };
      }
      return {
        ...base,
        status,
        description:
          t(
            'WINDDOWN_CLAIM_INCENTIVES_DESC_LEAD',
            'Claim all available incentives from the cypher protocol. The final reward epoch ends on ',
          ) +
          formatWindDownDate(ctx.dates.rewardEpochEnd, 'short') +
          t('WINDDOWN_CLAIM_INCENTIVES_DESC_TAIL', ' — no new rewards accrue.'),
        detailLine:
          (ctx.amounts.incentivesUsd != null
            ? `${t('WINDDOWN_CLAIM_INCENTIVES_AVAILABLE', 'Available $')}${
                ctx.amounts.incentivesUsd
              }${t('WINDDOWN_INCENTIVES_CLAIM_BY', ' · Claim by ')}`
            : t('WINDDOWN_CLAIM_BY', 'Claim by ')) +
          formatWindDownDate(ctx.dates.shutdown, 'short'),
        primaryAction: {
          label: t('WINDDOWN_CLAIM_INCENTIVES_CTA', 'Claim Incentives'),
          variant: 'secondary',
          onPress: () => navigation.navigate(screenTitle.CLAIM_INCENTIVES),
        },
      };
    },
  },
  {
    id: 'backup',
    icon: 'wallet-stacked',
    // Backable wallets only (seed / private-key / social); WalletConnect +
    // watch-only have no local secret to back up.
    isApplicable: ctx =>
      !ctx.isReadOnlyWallet &&
      ctx.connectionType != null &&
      SECURE_WALLET_SUPPORTED_TYPES.includes(ctx.connectionType),
    resolveStatus: async () => WinddownStepStatus.ACTIONABLE, // Phase 2: backup flag
    buildViewModel: (status, navigation) => {
      const base = {
        id: 'backup' as const,
        icon: 'wallet-stacked',
        iconType: 'cyd' as const,
        title: t('WINDDOWN_BACKUP_TITLE', 'Backup Wallet'),
      };
      if (status === WinddownStepStatus.COMPLETED) {
        return {
          ...base,
          status,
          badge: COMPLETED_BADGE,
          description: t(
            'WINDDOWN_BACKUP_DONE',
            "You have backed up your wallet's seed phrase and stored it securely.",
          ),
          primaryAction: {
            label: t('WINDDOWN_BACKUP_AGAIN_CTA', 'Backup Again'),
            variant: 'secondary',
            onPress: () => navigation.navigate(screenTitle.SECURE_WALLET),
          },
        };
      }
      return {
        ...base,
        status,
        badge: {
          label: t('WINDDOWN_NOT_BACKED_UP', 'Not backed up'),
          tone: 'red',
        },
        description: t(
          'WINDDOWN_BACKUP_DESC',
          "Make sure to back up your wallet's seed phrase and keep it somewhere safe.",
        ),
        primaryAction: {
          label: t('WINDDOWN_BACKUP_CTA', 'Secure wallet'),
          variant: 'secondary',
          onPress: () => navigation.navigate(screenTitle.SECURE_WALLET),
        },
      };
    },
  },
];

// --- Pure helpers (unit-tested without React) ---------------------------------

/** Steps that apply to the given wallet context, in display order. */
export const getApplicableStepDefinitions = (
  ctx: WinddownStepContext,
): StepDefinition[] => STEP_DEFINITIONS.filter(def => def.isApplicable(ctx));

/** Completed numerator + applicable denominator from resolved statuses. */
export const summarizeSteps = (
  statuses: WinddownStepStatus[],
): { completedCount: number; totalCount: number } => ({
  completedCount: statuses.filter(s => s === WinddownStepStatus.COMPLETED)
    .length,
  totalCount: statuses.length,
});

export interface UseWinddownStepsResult {
  steps: WinddownStepViewModel[];
  completedCount: number;
  totalCount: number;
  /** Force a re-resolution of the steps (used by the dev test panel). */
  reload: () => void;
}

/**
 * Resolves the winddown step cards on every focus: applicable steps are
 * checked, already-completed steps are read from the AsyncStorage cache (and
 * never re-checked), and any step that newly reads COMPLETED is cached.
 */
export default function useWinddownSteps(): UseWinddownStepsResult {
  const navigation = useNavigation<Navigation>();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const globalContext = useContext(GlobalContext);

  const { config: windDownConfig } = useSunset();
  const { getWithAuth } = useAxios();
  const isReadOnlyWallet = Boolean(hdWalletContext?.state?.isReadOnlyWallet);
  const cardProfile = globalContext?.globalState?.cardProfile ?? null;
  const hasCard = Boolean(cardProfile);

  const [steps, setSteps] = useState<WinddownStepViewModel[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [stepAmounts, setStepAmounts] = useState<StepAmounts>({});

  // Fetch the live step amounts on focus; the step cards re-render with them
  // via the build effect below (stepAmounts is in its deps).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void fetchWinddownStepAmounts(getWithAuth, hasCard)
        .then(result => {
          if (active) setStepAmounts(result);
        })
        .catch(Sentry.captureException);
      return () => {
        active = false;
      };
    }, [hasCard, reloadKey]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async (): Promise<void> => {
        const connectionType = await getEffectiveConnectionType();
        const ctx: WinddownStepContext = {
          isReadOnlyWallet,
          hasCard,
          connectionType,
          cardProfile,
          dates: resolveWindDownDates(windDownConfig),
          amounts: stepAmounts,
        };
        const applicable = getApplicableStepDefinitions(ctx);
        const cache = await getWinddownStepsCompleted();

        const statuses = await Promise.all(
          applicable.map(async def => {
            if (cache[def.id]) return WinddownStepStatus.COMPLETED;
            try {
              const status = await def.resolveStatus(ctx);
              if (status === WinddownStepStatus.COMPLETED) {
                await setWinddownStepCompleted(def.id);
              }
              return status;
            } catch (error) {
              Sentry.captureException(error);
              // Never falsely mark a step complete on error.
              return WinddownStepStatus.ACTIONABLE;
            }
          }),
        );

        if (!active) return;

        const built = applicable.map((def, i) =>
          def.buildViewModel(statuses[i], navigation, ctx),
        );
        // The first not-yet-completed step is the focused/primary one: it gets
        // the yellow icon tile + yellow button; the rest are secondary. Focus
        // naturally advances as earlier steps complete.
        const firstUndoneIndex = built.findIndex(
          vm => vm.status !== WinddownStepStatus.COMPLETED,
        );
        setSteps(
          built.map((vm, i) => {
            const isPrimary = i === firstUndoneIndex;
            return {
              ...vm,
              isPrimary,
              primaryAction: vm.primaryAction
                ? {
                    ...vm.primaryAction,
                    variant: isPrimary ? 'primary' : 'secondary',
                  }
                : undefined,
            };
          }),
        );
        const { completedCount: done, totalCount: total } =
          summarizeSteps(statuses);
        setCompletedCount(done);
        setTotalCount(total);
      };

      void run();
      return () => {
        active = false;
      };
    }, [isReadOnlyWallet, hasCard, reloadKey, windDownConfig, stepAmounts]),
  );

  return {
    steps,
    completedCount,
    totalCount,
    reload: () => setReloadKey(k => k + 1),
  };
}
