import { CardApplicationStatus, CardStatus } from '../constants/enum';

export interface CardProfile {
  primaryEthAddress: string;
  fcmToken?: string;
  phone?: string;
  email?: string;
  apto?: {
    cardHolderId: string;
    status: CardStatus;
  };
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
  pc?: {
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
    isPhysicalCardEligible: boolean;
    physicalCardUpgradationFee: number | string;
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
}
