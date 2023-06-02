import { CardApplicationStatus, CardStatus } from '../constants/enum';

export interface CardProfile {
  primaryEthAddress: string
  fcmToken?: string
  phone?: string
  email?: string
  apto?: {
    cardHolderId: string
    status: CardStatus
  }
  solid?: {
    applicationStatus: CardApplicationStatus
    cardStatus?: CardStatus
    personId: string
  }
}
