import { CardReferralStatus } from '../constants/enum';

export interface IReferredUser {
  address: string;
  inviteCode: string;
  email: string;
  name?: string;
  applicationStatus: CardReferralStatus;
}
