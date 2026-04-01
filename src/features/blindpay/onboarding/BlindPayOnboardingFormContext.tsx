import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { CreateReceiverRequest } from '../types';
import { BlindpayReceiverType } from '../types';

type Draft = Partial<CreateReceiverRequest>;

interface BlindPayOnboardingFormContextValue {
  draft: Draft;
  setDraftField: <K extends keyof CreateReceiverRequest>(
    key: K,
    value: CreateReceiverRequest[K],
  ) => void;
  mergeDraft: (partial: Draft) => void;
  resetDraft: () => void;
}

const BlindPayOnboardingFormContext =
  createContext<BlindPayOnboardingFormContextValue | null>(null);

export function BlindPayOnboardingFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Draft>({
    type: BlindpayReceiverType.INDIVIDUAL,
  });

  const setDraftField = useCallback(
    <K extends keyof CreateReceiverRequest>(
      key: K,
      value: CreateReceiverRequest[K],
    ) => {
      setDraft(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const mergeDraft = useCallback((partial: Draft) => {
    setDraft(prev => ({ ...prev, ...partial }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft({ type: BlindpayReceiverType.INDIVIDUAL });
  }, []);

  const value = useMemo(
    () => ({
      draft,
      setDraftField,
      mergeDraft,
      resetDraft,
    }),
    [draft, mergeDraft, resetDraft, setDraftField],
  );

  return (
    <BlindPayOnboardingFormContext.Provider value={value}>
      {children}
    </BlindPayOnboardingFormContext.Provider>
  );
}

export function useBlindPayOnboardingForm() {
  const ctx = useContext(BlindPayOnboardingFormContext);
  if (!ctx) {
    throw new Error(
      'useBlindPayOnboardingForm must be used within BlindPayOnboardingFormProvider',
    );
  }
  return ctx;
}
