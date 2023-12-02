import { CardTransactionTypes } from '../constants/enum';
import { ChainBackendNames } from '../constants/server';

export interface Card {
  bin: string;
  cardId: string;
  last4: string;
  network: string;
  status: string;
  type: string;
}

export interface ICardSubObjectMerchant {
  merchantName: string;
  merchantCity: string;
  merchantState: string;
  merchantCountry: string;
  postalCode: string;
  merchantCategory: string;
  merchantCategoryCode: string;
  merchantId: string;
}

export interface ICardSubObject {
  wallet: string;
  authMethod: string;
  localTransactionAmount: string;
  localTransactionCurrency: string;
  currencyConversionRate?: string;
  merchant: ICardSubObjectMerchant;
}

export interface ITokenData {
  id: string;
  chain: ChainBackendNames;
  coinId: string;
  hash: string;
  symbol: string;
  tokenNos: string;
  tokenAddress: string;
}

export interface ICardTransaction {
  id: string;
  type: CardTransactionTypes;
  category?: string;
  iconUrl?: string;
  title: string;
  amount: number;
  date: Date;
  createdAt: number;
  fId?: string;
  metadata?: ICardSubObject;
  tokenData?: ITokenData;
  closingBalance?: number;
  fxCurrencyName?: string;
  fxCurrencyNumber?: number;
  fxCurrencySymbol?: string;
  fxCurrencyValue?: number;
  fxConversionPrice?: number;
  cardId?: string;
  last4?: string;
  userId?: string;
  label?: string;
  isSettled?: boolean;
}

export interface CardQuoteResponse {
  status: string;
  tokenRequired: number;
  tokenFunded: number;
  cardFeeUsd: number;
  estimatedGasFee: number;
  expiry: number;
  targetWallet: string;
  usdValue: number;
  userStats: {
    lifetimeAmountUsd: number;
    lifetimeCount: number;
    lifetimeFeeUsd: number;
  };
  toFundCardId: string;
  quoteUUID: string;
  estimatedTime: number;
}

export interface PayTokenModalParams {
  gasFeeDollar: string;
  gasFeeETH: string;
  networkName: string;
  networkCurrency: string;
  totalDollar: string;
  appImage: number;
  tokenImage: string;
  finalGasPrice: string;
  gasLimit: number;
  gasPrice: {
    chainId: string;
    gasPrice: number;
    tokenPrice: number;
    cached: boolean;
  };
  tokenSymbol: string;
  tokenAmount: string;
  tokenValueDollar: string;
  totalValueTransfer: number;
  totalValueDollar: string;
  hasSufficientBalanceAndGasFee: boolean;
  tokenQuoteExpiry: number;
  cardNumber: string;
}

export const GAS_BUFFER_FACTOR_FOR_LOAD_MAX = 1.2;
