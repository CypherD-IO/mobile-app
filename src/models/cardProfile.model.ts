import { CardApplicationStatus, CardProviders } from '../constants/enum';
import { Card } from './card.model';
import { PlanInfo } from './planInfo.interface';

export interface CardProfile {
  primaryAddress: string;
  fcmToken?: string;
  phone: string;
  email: string;
  provider?: CardProviders;
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
    preferredName?: string;
    isRainDeclined?: boolean;
  };
  lifetimeAmountUsd: number;
  physicalCardEligibilityLimit: number;
  children?: Array<{ address: string; label: string }>;
  child?: string;
  planInfo?: PlanInfo;
  telegramId: string | null;
  evmAddress?: string;
}
