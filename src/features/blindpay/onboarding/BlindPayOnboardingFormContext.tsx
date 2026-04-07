import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { CreateReceiverRequest } from '../types';
import { BlindpayReceiverType } from '../types';
import useAxios from '../../../core/HttpRequest';
import { CardProviders } from '../../../constants/enum';

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
  const { getWithAuth } = useAxios();
  const [draft, setDraft] = useState<Draft>({
    type: BlindpayReceiverType.INDIVIDUAL,
  });

  // Pre-fill from card user-data on mount (best effort — silent if unavailable)
  useEffect(() => {
    void (async () => {
      try {
        const res = await getWithAuth(`/v1/cards/${CardProviders.REAP_CARD}/user-data`);
        if (res.isError || !res.data) return;
        const u = res.data;

        // Only include fields that have a non-empty value from the API
        const updates: Draft = {};
        if (u.firstName) updates.firstName = u.firstName;
        if (u.lastName) updates.lastName = u.lastName;
        if (u.line1) updates.addressLine1 = u.line1;
        if (u.line2) updates.addressLine2 = u.line2;
        if (u.city) updates.city = u.city;
        // state from user-data is full name (e.g. "California"), but BlindPay expects 2-letter codes
        if (u.country) updates.country = u.country;
        // phone: only prefill if it matches BlindPay's E.164 format (+ followed by 7-15 digits)
        if (typeof u.phone === 'string' && /^\+\d{7,15}$/.test(u.phone.trim())) {
          updates.phoneNumber = u.phone.trim();
        }
        // dateOfBirth: only prefill if it matches BlindPay's YYYY-MM-DD format and is a valid date
        if (typeof u.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.dateOfBirth.trim())) {
          const dob = u.dateOfBirth.trim();
          const parsed = new Date(`${dob}T12:00:00`);
          if (!isNaN(parsed.getTime())) {
            updates.dateOfBirth = dob;
          }
        }

        if (Object.keys(updates).length === 0) return;

        // Don't overwrite anything the user already typed
        setDraft(prev => {
          const merged: Draft = { ...prev };
          for (const [k, v] of Object.entries(updates)) {
            if (merged[k as keyof Draft] == null) {
              (merged as any)[k] = v;
            }
          }
          return merged;
        });
      } catch {
        // silent — pre-fill is non-critical
      }
    })();
  }, []);

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
