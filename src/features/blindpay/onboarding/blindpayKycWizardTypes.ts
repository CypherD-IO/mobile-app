export interface BlindPayKycStepReadyPayload {
  canNext: boolean;
  onNext: () => void;
  nextLoading?: boolean;
  nextLabel?: string;
  /** Override the step title from the step meta */
  titleOverride?: string;
  /** Override the step subtitle */
  subtitleOverride?: string;
}

export interface BlindPayKycStepProps {
  advance: () => void;
  onReady: (payload: BlindPayKycStepReadyPayload) => void;
}
