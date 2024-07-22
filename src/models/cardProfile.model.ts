import {
  CardApplicationStatus,
  CardProviders,
  CardStatus,
} from '../constants/enum';

export interface CardProfile {
  primaryEthAddress: string;
  fcmToken?: string;
  phone: string;
  email: string;
  apto?: {
    cardHolderId: string;
    status: PCCardStatus | RC_CARD_STATUS;
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
        status: PCCardStatus | RC_CARD_STATUS;
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
        status: PCCardStatus | RC_CARD_STATUS;
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
        status: PCCardStatus | RC_CARD_STATUS;
      },
    ];
    isPhysicalCardEligible: boolean;
    physicalCardUpgradationFee: number | string;
  };
  solid?: {
    applicationStatus: CardApplicationStatus;
    cardStatus?: PCCardStatus | RC_CARD_STATUS;
    personId: string;
  };
  lifetimeAmountUsd: number;
  physicalCardEligibilityLimit: number;
  children?: Array<{ address: string; label: string }>;
  child?: string;
}
