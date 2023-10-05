import moment from "moment";
import { CardTransactionStatuses, CardTransactionTypes } from "../../../constants/enum";

export const CARD_TXN_FILTERS = ['Type', 'Date', 'Status'];
export const TYPES = [CardTransactionTypes.CREDIT, CardTransactionTypes.DEBIT, CardTransactionTypes.REFUND];
export const STATUSES = [CardTransactionStatuses.PENDING, CardTransactionStatuses.SETTLED];

export type CardSectionHeights = 270 | 320;
export interface DateRange {
    fromDate: Date
    toDate: Date
}
export const initialCardTxnDateRange = {
    fromDate: moment().subtract(60, 'days').toDate(), // inital from is 60 days ago.
    toDate: new Date()
};