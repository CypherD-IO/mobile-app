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
  /**
   * Backend override (arch): when true, this user may keep loading their card
   * even while the sunset is active — the load-disabled sheet and other sunset
   * load restrictions are bypassed for them.
   */
  loadingEnabled?: boolean;
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
    accountId?: string;
  };
  lifetimeAmountUsd: number;
  physicalCardEligibilityLimit: number;
  // eslint-disable-next-line @typescript-eslint/array-type
  children?: Array<{ address: string; label: string }>;
  child?: string;
  planInfo?: PlanInfo;
  telegramId: string | null;
  rcAccountId?: string;
  evmAddress?: string;
}
