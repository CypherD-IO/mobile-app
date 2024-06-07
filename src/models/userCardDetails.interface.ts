import { Card } from './card.model';

export interface UserCardDetails {
  cards: Card[];
  personId: string;
  currentCardRevealedDetails: {
    cardNumber: string;
    type: string;
    cvv: string;
    expiryMonth: string;
    expiryYear: string;
    cardId: string;
  };
  hideCardDetails: boolean;
  showCVVAndExpiry: boolean;
  isFetchingCardDetails: boolean;
}
