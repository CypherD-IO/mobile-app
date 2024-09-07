import {
  CardApplicationStatus,
  CardProviders,
  CardStatus,
  CypherPlanId,
} from '../constants/enum';

export interface CardProfile {
  primaryEthAddress: string;
  fcmToken?: string;
  phone: string;
  email: string;
  apto?: {
    cardHolderId: string;
    status: CardStatus;
  };
  provider?: CardProviders;
  bc?: {
    personId?: string;
    applicationStatus: CardApplicationStatus;
    cards?: [
      {
        last4: string;
        type: string;
        cardId: string;
        status: CardStatus;
      },
    ];
  };
  isAutoloadConfigured: boolean;
  pc?: {
    personId?: string;
    applicationStatus: CardApplicationStatus;
    phoneVerified: boolean;
    emailVerified: boolean;
    cards?: [
      {
        last4: string;
        type: string;
        cardId: string;
        status: CardStatus;
      },
    ];
    isPhysicalCardEligible: boolean;
    physicalCardUpgradationFee: number | string;
    isRcUpgradable?: boolean;
  };
  rc?: {
    personId?: string;
    applicationStatus: CardApplicationStatus;
    phoneVerified: boolean;
    emailVerified: boolean;
    cards?: [
      {
        last4: string;
        type: string;
        cardId: string;
        status: CardStatus;
      },
    ];
    isPhysicalCardEligible: boolean;
    physicalCardUpgradationFee: number | string;
    isRcUpgradable?: boolean;
  };
  solid?: {
    applicationStatus: CardApplicationStatus;
    cardStatus?: CardStatus;
    personId: string;
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
  };
  telegramId: string | null;
}
