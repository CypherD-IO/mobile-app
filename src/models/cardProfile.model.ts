import {
  CardApplicationStatus,
  CardProviders,
  CardStatus,
  CypherPlanId,
} from '../constants/enum';
import { Card } from './card.model';

export interface CardProfile {
  primaryEthAddress: string;
  fcmToken?: string;
  phone: string;
  email: string;
  apto?: {
    cardHolderId: string;
    status: CardStatus;
    cards?: Card[];
  };
  provider?: CardProviders;
  [CardProviders.BRIDGE_CARD]?: {
    personId?: string;
    applicationStatus: CardApplicationStatus;
    cards?: Card[];
  };
  isAutoloadConfigured: boolean;
  [CardProviders.PAYCADDY]?: {
    personId?: string;
    applicationStatus: CardApplicationStatus;
    phoneVerified: boolean;
    emailVerified: boolean;
    cards?: Card[];
    isPhysicalCardEligible: boolean;
    physicalCardUpgradationFee: number | string;
    isRcUpgradable?: boolean;
  };
  [CardProviders.REAP_CARD]?: {
    personId?: string;
    applicationStatus: CardApplicationStatus;
    phoneVerified: boolean;
    emailVerified: boolean;
    cards?: Card[];
    isPhysicalCardEligible: boolean;
    physicalCardUpgradationFee: number | string;
    isRcUpgradable?: boolean;
  };
  [CardProviders.SOLID]?: {
    applicationStatus: CardApplicationStatus;
    cardStatus?: CardStatus;
    personId: string;
    cards?: Card[];
  };
  lifetimeAmountUsd: number;
  physicalCardEligibilityLimit: number;
  children?: Array<{ address: string; label: string }>;
  child?: string;
  planInfo: {
    planId: CypherPlanId;
    optedPlanId: CypherPlanId;
    updatedOn: number;
    expiresOn: number;
    metalCardEligible: boolean;
  };
  telegramId: string | null;
}
