export interface BlindPayKycStepReadyPayload {
  canNext: boolean;
  onNext: () => void;
  nextLoading?: boolean;
  nextLabel?: string;
}

export interface BlindPayKycStepProps {
  advance: () => void;
  onReady: (payload: BlindPayKycStepReadyPayload) => void;
}
