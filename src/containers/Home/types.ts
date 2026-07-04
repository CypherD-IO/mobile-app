import { WinddownStepId } from '../../constants/winddown';

/** Resolved status of a winddown step (NOT_APPLICABLE steps are filtered out). */
export enum WinddownStepStatus {
  ACTIONABLE = 'ACTIONABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type WinddownBadgeTone = 'red' | 'amber' | 'green' | 'gray';

export interface WinddownBadge {
  label: string;
  tone: WinddownBadgeTone;
}

export type WinddownActionVariant = 'primary' | 'secondary';

export interface WinddownStepAction {
  label: string;
  variant: WinddownActionVariant;
  onPress: () => void;
}

/** Which icon font a step's glyph comes from. */
export type WinddownIconType = 'cyd' | 'material';

/** View-model produced by useWinddownSteps and rendered by WinddownStepCard. */
export interface WinddownStepViewModel {
  id: WinddownStepId;
  icon: string; // glyph name in the font given by iconType
  iconType: WinddownIconType;
  title: string;
  status: WinddownStepStatus;
  badge?: WinddownBadge;
  description: string;
  detailLine?: string;
  primaryAction?: WinddownStepAction;
  /**
   * True for the first not-yet-completed step — it gets the focused/primary
   * treatment (yellow icon tile + yellow action button). Assigned by the hook.
   */
  isPrimary: boolean;
}
