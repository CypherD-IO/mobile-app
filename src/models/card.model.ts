import { CardTransactionTypes } from "../constants/enum";

export interface Card {
  bin: string
  cardId: string
  last4: string
  network: string
  status: string
  type: string
}

export interface CardTransaction {
  id: string;
  type: CardTransactionTypes;
  title: string;
  date: Date;
  amount: number;
  iconUrl: string;
  isSettled: boolean;
  tokenData?: {
      id: number,
      chain: string,
      hash: string,
      symbol: string,
      coinId: string,
      tokenNos: number,
      tokenAddress: string
  }
}