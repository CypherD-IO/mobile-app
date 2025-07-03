import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import useAxios from '../core/HttpRequest';

interface OnboardingRewardState {
  deadline: string | null; // ISO timestamp returned by backend
  remainingMs: number; // milliseconds remaining (after safety buffer)
  totalRewardsPossible: number; // e.g., 3000 represents $30.00 worth of CYPR
  isRewardSlotAvailable: boolean;
  remainingSlots: number;
  hasSecuredSlot: boolean; // raw backend flag
  isActive: boolean;
}

interface OnboardingRewardContextProps extends OnboardingRewardState {
  refreshStatus: () => Promise<void>;
  createTracking: () => Promise<void>;
}

const DEFAULT_STATE: OnboardingRewardState = {
  deadline: null,
  remainingMs: 0,
  totalRewardsPossible: 0,
  isRewardSlotAvailable: false,
  remainingSlots: 0,
  hasSecuredSlot: false,
  isActive: false,
};

const OnboardingRewardContext =
  createContext<OnboardingRewardContextProps | null>(null);

export const OnboardingRewardProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { getWithAuth, postWithAuth } = useAxios();
  const [state, setState] = useState<OnboardingRewardState>(DEFAULT_STATE);

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

      setState({
        deadline: kycDeadline,
        remainingMs,
        totalRewardsPossible: data?.totalRewardsPossible ?? 0,
        isRewardSlotAvailable: hasSlot,
        remainingSlots,
        hasSecuredSlot: backendSlot,
        isActive: Boolean(data?.isActive),
      });
    },
    [computeRemaining],
  );

  const refreshStatus = useCallback(async () => {
    const res = await getWithAuth('/v1/cards/onboarding-rewards');
    console.log('res in refreshStatus', res);
    console.log('data in refreshStatus', res.data);
    console.log('isError in refreshStatus', res.isError);
    if (!res.isError) {
      applyResponse(res.data);
    }
  }, [getWithAuth, applyResponse]);

  const createTracking = useCallback(async () => {
    const { data, isError } = await postWithAuth(
      '/v1/cards/onboarding-rewards',
      {},
    );
    console.log('data in createTracking', data);
    console.log('isError in createTracking', isError);
    if (!isError) {
      applyResponse(data);
    }
  }, [postWithAuth, applyResponse]);

  // Initial fetch on mount
  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update remainingMs every second (if deadline exists)
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.remainingMs <= 0) return prev;
        return { ...prev, remainingMs: Math.max(prev.remainingMs - 1000, 0) };
      });
    }, 1000);
    return () => clearInterval(interval);
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
