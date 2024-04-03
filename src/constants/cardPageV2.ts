import { CardTransactionStatuses, CardTransactionTypes } from './enum';

export const CARD_TXN_FILTERS = ['Type', 'Date', 'Status'];
export const TYPES = [
  CardTransactionTypes.CREDIT,
  CardTransactionTypes.DEBIT,
  CardTransactionTypes.REFUND,
  CardTransactionTypes.WITHDRAWAL,
];
export const STATUSES = [
  CardTransactionStatuses.PENDING,
  CardTransactionStatuses.SETTLED,
];

export type CardSectionHeights = 270 | 420;
export interface DateRange {
  fromDate: Date;
  toDate: Date;
}
export const initialCardTxnDateRange = {
  fromDate: new Date(2023, 5, 1), // inital date in June 1st, 2023 when the card was launched
  toDate: new Date(),
};

export const PRESET_OFFSET_DAYS = [7, 30, 60];
