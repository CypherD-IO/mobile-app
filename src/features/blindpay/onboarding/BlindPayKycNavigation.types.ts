import type { ParamListBase } from '@react-navigation/native';

/**
 * Single-route KYC wizard (no stack slide between steps).
 */
export type BlindPayKycStackParamList = {
  BlindPayKycWizard: Record<string, never>;
} & ParamListBase;
