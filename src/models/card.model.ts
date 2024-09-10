import {
  CardProviders,
  CardTransactionTypes,
  ReapTxnStatus,
} from '../constants/enum';
import { ChainBackendNames } from '../constants/server';
import { Holding } from '../core/Portfolio';

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
  cDReason?: string;
  tStatus?: ReapTxnStatus;
}

export interface CardQuoteResponse {
  quoteId: string;
  chain: string;
  tokensRequired: number;
  tokenAddress: string;
  tokenCoinId: string;
  tokensRequiredFiat: number;
  amount: number;
  fromAddress: string;
  targetAddress: string;
  masterAddress: string;
  cardProvider: string;
  tokenSymbol: string;
  expiry: number;
  estimatedTime: number;
  version: 2;
}

export interface PayTokenModalParams {
  isModalVisible: boolean;
  quoteExpiry: number;
  hasSufficientBalanceAndGasFee: boolean;
  cardProvider: CardProviders;
  cardId: string;
  planCost: number;
  tokenSendParams: {
    chain: ChainBackendNames;
    amountInCrypto: string;
    amountInFiat: string;
    symbol: string;
    toAddress: string;
    gasFeeInCrypto: string;
    gasFeeInFiat: string;
    nativeTokenSymbol: string;
    selectedToken: Holding;
    tokenQuote: CardQuoteResponse;
  };
}
