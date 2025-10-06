import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import useAxios from '../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
/**
 * Detailed reward milestone structure returned by backend within
 * `statusWiseRewards`. Keys like "kycPending", "firstLoad" etc. map to
 * individual milestone objects.
 */
export interface RewardMilestone {
  amount: number;
  earned: boolean;
  /** ISO string deadline when the milestone must be completed (optional). */
  deadline?: string;
  /** Time remaining in **milliseconds** returned by backend (optional). */
  timeRemaining?: number;
}

export interface StatusWiseRewards {
  // backend returns a dynamic object keyed by milestone name
  [status: string]: RewardMilestone;
}

interface OnboardingRewardState {
  /** Earliest deadline (currently KYC window) in ISO format. */
  deadline: string | null;
  /** Milliseconds remaining until `deadline` with a 30-sec safety buffer. */
  remainingMs: number;

  /** Maximum amount the user can earn in this onboarding programme. */
  totalRewardsPossible: number;
  /** How much user has **already** earned across milestones. */
  totalRewardsEarned: number;

  /** Backend provided split of milestone-wise rewards. */
  statusWiseRewards: StatusWiseRewards;

  /** Current milestone user is on – e.g. `KYC_PENDING`, `FIRST_LOAD`… */
  currentStage: string | null;

  /** Whether a free reward slot is still available in current epoch. */
  isRewardSlotAvailable: boolean;
  /** Remaining slots returned by backend. */
  remainingSlots: number;
  /** True once backend confirms slot is secure. */
  hasSecuredSlot: boolean;

  /** Programme activation flag from backend. */
  isActive: boolean;

  /** Current epoch number (int) returned by backend. */
  currentEpoch: number;
}

interface OnboardingRewardContextProps extends OnboardingRewardState {
  refreshStatus: () => Promise<void>;
  createTracking: () => Promise<void>;
  /**
   * Cancels the internal one-second countdown interval so that downstream
   * consumers no longer receive super-frequent context updates. Typical use-
   * case is when the user has already initiated KYC and we no longer need to
   * display the deadline timer.
   */
  stopTimer: () => void;
}

const DEFAULT_STATE: OnboardingRewardState = {
  deadline: null,
  remainingMs: 0,
  totalRewardsPossible: 0,
  totalRewardsEarned: 0,
  statusWiseRewards: {},
  currentStage: null,
  isRewardSlotAvailable: false,
  remainingSlots: 0,
  hasSecuredSlot: false,
  isActive: false,
  currentEpoch: 0,
};

const OnboardingRewardContext =
  createContext<OnboardingRewardContextProps | null>(null);

export const OnboardingRewardProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { getWithAuth, postWithAuth } = useAxios();
  const [state, setState] = useState<OnboardingRewardState>(DEFAULT_STATE);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute milliseconds remaining from deadline ISO string (minus 30-sec buffer)
  const computeRemaining = useCallback((deadlineIso: string | null): number => {
    if (!deadlineIso) return 0;
    const deadlineMs = Date.parse(deadlineIso);
    // subtract 30 seconds for buffer
    const safeDeadline = deadlineMs - 30 * 1000;
    const now = Date.now();
    return Math.max(safeDeadline - now, 0);
  }, []);

  const applyResponse = useCallback(
    (data: any) => {
      if (!data) return;
      const kycDeadline = data?.statusWiseRewards?.kycPending?.deadline ?? null;
      const remainingMs = computeRemaining(kycDeadline);

      const remainingSlots =
        typeof data?.remainingSlots === 'number' ? data.remainingSlots : 0;
      const hasSlot = remainingSlots > 0;
      const backendSlot = Boolean(data?.hasSecuredSlot);

      // Extract milestone split safely; fallback to empty object to maintain
      // referential equality across renders when nothing is provided.
      const milestoneSplit: StatusWiseRewards =
        (data?.statusWiseRewards as StatusWiseRewards) ?? {};

      setState({
        deadline: kycDeadline,
        remainingMs,
        totalRewardsPossible: data?.totalRewardsPossible ?? 0,
        totalRewardsEarned: data?.totalRewardsEarned ?? 0,
        statusWiseRewards: milestoneSplit,
        currentStage: data?.currentStage ?? null,
        currentEpoch: data?.currentEpoch ?? 0,
        isRewardSlotAvailable: hasSlot,
        remainingSlots,
        hasSecuredSlot: backendSlot,
        isActive: Boolean(data?.isActive),
      });
    },
    [computeRemaining],
  );

  const refreshStatus = useCallback(async () => {
    console.log('refreshStatus ::::::::::::::::: ');
    try {
      const res = await getWithAuth('/v1/cards/onboarding-rewards');
      if (!res.isError) {
        console.log(
          'refreshStatus ::::::::::::::::: res.data',
          res.data.currentStage,
          res.data.statusWiseRewards,
        );
        applyResponse(res.data);
      } else {
        Sentry.captureException(
          new Error('Failed to fetch onboarding rewards status'),
          {
            extra: { error: res.error },
          },
        );
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  }, [getWithAuth, applyResponse]);

  const createTracking = useCallback(async () => {
    try {
      const { data, isError, error } = await postWithAuth(
        '/v1/cards/onboarding-rewards',
        {},
      );
      if (!isError) {
        applyResponse(data);
      } else {
        Sentry.captureException(
          new Error('Failed to create onboarding reward tracking'),
          {
            extra: { error },
          },
        );
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  }, [postWithAuth, applyResponse]);

  // Initial fetch on mount
  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update remainingMs every second (if deadline exists)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.remainingMs <= 0) return prev;
        return { ...prev, remainingMs: Math.max(prev.remainingMs - 1000, 0) };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  /**
   * Public helper to cancel the countdown interval. This is useful once the
   * user starts the KYC process and the deadline timer no longer needs to run.
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Refresh when app comes back to foreground
  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refreshStatus();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refreshStatus]);

  const value: OnboardingRewardContextProps = {
    ...state,
    refreshStatus,
    createTracking,
    stopTimer,
  };

  return (
    <OnboardingRewardContext.Provider value={value}>
      {children}
    </OnboardingRewardContext.Provider>
  );
};

export function useOnboardingReward() {
  const ctx = useContext(OnboardingRewardContext);
  if (!ctx) {
    throw new Error(
      'useOnboardingReward must be used within OnboardingRewardProvider',
    );
  }
  return ctx;
}
