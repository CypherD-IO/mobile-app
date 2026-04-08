import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { t } from 'i18next';
import BlindPayKycChrome from './BlindPayKycChrome';
import type { BlindPayKycStackParamList } from './BlindPayKycNavigation.types';
import { getBlindPayKycStepChrome } from './blindpayKycWizardStepMeta';
import type { BlindPayKycStepReadyPayload } from './blindpayKycWizardTypes';
import { isHighRiskCountry } from './blindpayCountryRisk';
import { useBlindPayOnboardingForm } from './BlindPayOnboardingFormContext';
import { BlindPayKycAddressStep } from './screens/BlindPayKycAddressScreen';
import { BlindPayKycBasicDetailsStep } from './screens/BlindPayKycBasicDetailsScreen';
import { BlindPayKycDocTypeStep } from './screens/BlindPayKycDocTypeScreen';
import { BlindPayKycDocVerificationStep } from './screens/BlindPayKycDocVerificationScreen';
import { BlindPayKycIdDocsStep } from './screens/BlindPayKycIdDocsScreen';
import { BlindPayKycProofOfAddressStep } from './screens/BlindPayKycProofOfAddressScreen';
import { BlindPayKycPurposeOfTxStep } from './screens/BlindPayKycPurposeOfTxScreen';
import { BlindPayKycReviewStep } from './screens/BlindPayKycReviewScreen';
import { BlindPayKycSelfieIntroStep } from './screens/BlindPayKycSelfieIntroScreen';
import { BlindPayKycSelfieStep } from './screens/BlindPayKycSelfieScreen';
import { BlindPayKycSourceOfFundsStep } from './screens/BlindPayKycSourceOfFundsScreen';
import { BlindPayKycTaxStep } from './screens/BlindPayKycTaxScreen';

const IDLE_HANDLERS: BlindPayKycStepReadyPayload = {
  canNext: false,
  onNext: () => undefined,
};

type StepComponent = React.ComponentType<{
  advance: () => void;
  onReady: (payload: BlindPayKycStepReadyPayload) => void;
}>;

const BASE_STEPS: StepComponent[] = [
  BlindPayKycBasicDetailsStep, // 0
  BlindPayKycTaxStep, // 1
  BlindPayKycAddressStep, // 2
  BlindPayKycDocVerificationStep, // 3
  BlindPayKycDocTypeStep, // 4
  BlindPayKycIdDocsStep, // 5
  BlindPayKycProofOfAddressStep, // 6
  BlindPayKycSelfieIntroStep, // 7
  BlindPayKycSelfieStep, // 8
];

const HIGH_RISK_STEPS: StepComponent[] = [
  BlindPayKycSourceOfFundsStep,
  BlindPayKycPurposeOfTxStep,
];

export default function BlindPayKycWizardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BlindPayKycStackParamList>>();
  const { draft } = useBlindPayOnboardingForm();
  const [step, setStep] = useState(0);
  const [handlers, setHandlers] = useState<BlindPayKycStepReadyPayload>(
    IDLE_HANDLERS,
  );

  const highRisk = isHighRiskCountry(draft.country ?? '');

  const steps = useMemo<StepComponent[]>(
    () =>
      highRisk
        ? [...BASE_STEPS, ...HIGH_RISK_STEPS, BlindPayKycReviewStep]
        : [...BASE_STEPS, BlindPayKycReviewStep],
    [highRisk],
  );

  // Clamp step index when steps array length changes (e.g. country changes high-risk status)
  useEffect(() => {
    setStep(prev => Math.max(0, Math.min(prev, steps.length - 1)));
  }, [steps.length]);

  const advance = useCallback(() => {
    setHandlers(IDLE_HANDLERS);
    setStep(s => Math.min(s + 1, steps.length - 1));
  }, [steps.length]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setHandlers(IDLE_HANDLERS);
      setStep(s => s - 1);
    } else {
      navigation.goBack();
    }
  }, [navigation, step]);

  const StepComponent = steps[step];
  const chrome = getBlindPayKycStepChrome(step, steps.length);

  return (
    <BlindPayKycChrome
      stepIndex={step}
      totalSteps={steps.length}
      title={handlers.titleOverride ?? chrome.title}
      subtitle={handlers.subtitleOverride ?? chrome.subtitle}
      helpText={chrome.helpText}
      onBack={goBack}
      onNext={() => {
        handlers.onNext();
      }}
      nextDisabled={!handlers.canNext}
      nextLoading={handlers.nextLoading}
      nextLabel={handlers.nextLabel}>
      <StepComponent advance={advance} onReady={setHandlers} />
    </BlindPayKycChrome>
  );
}
