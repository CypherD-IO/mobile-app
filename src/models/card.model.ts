import {
  CardProviders,
  PhysicalCardType,
  ReapTxnStatus,
} from '../constants/enum';
import { ChainBackendNames } from '../constants/server';
import { Holding, IHyperLiquidHolding } from '../core/portfolio';

export interface Card {
  bin: string;
  cardId: string;
  last4: string;
  network: string;
  status: string;
  type: string;
  cardProvider: CardProviders;
  physicalCardType?: PhysicalCardType;
  designId?: string;
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
  type: string;
  createdAt: number;
  channel?: string;
  date: string;
  category?: string;
  iconUrl?: string;
  title: string;
  amount: number;
  prAmount?: number;
  fId?: string;
  metadata?: ICardSubObject;
  tokenData?: ITokenData;
  closingBalance?: number;
  fxCurrencyName?: string;
  fxCurrencyNumber?: number;
  fxCurrencySymbol?: string;
  fxCurrencyValue?: number;
  fxConversionPrice?: number;
  planId?: string;
  dCode?: string; // decline code
  dReason?: string; // decline reason
  cDReason?: string;
  cDCode?: string;
  fxFee?: number;
  prFxFee?: number;
  atmFee?: number;
  cardId?: string;
  last4?: string;
  userId?: string;
  label?: string;
  isSettled?: boolean;
  isB2b?: boolean;
  biAccId?: string;
  biUserId?: string;
  authorizationNumber?: string;
  authMethod?: string;
  processCode?: string;
  acquirerCountryCode?: string;
  terminalId?: string;
  merchant?: string;
  isCorrection?: boolean;
  pcTxnId?: string;
  rpTxnId?: string;
  raTxnId?: string;
  tStatus?: ReapTxnStatus;
  wallet?: string;
  programId?: CardProviders;
  client?: string;
  isReported?: boolean;
  cypherRewards?: {
    epochNumber: number;
    calculatedAt: number;
    rewardsAllocation: {
      tierMultiplier: number;
      baseSpendRewards: string;
      planId: string;
      percentageOfUserRewards: number;
      boostedSpendRewards: string;
      amountSpent: number;
      totalRewards: string;
    };
  };
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
  programId: string;
  isInstSwapEnabled: boolean;
  fees: {
    fee: number;
    actualFee: number;
  };
  cosmosSwap?: {
    sourceAssetDenom: string;
    sourceAssetChainId: string;
    destAssetDenom: string;
    destAssetChainId: string;
    amountIn: string;
    amountOut: string;
    requiredAddresses: string[];
    operations: string[];
  };
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
    selectedToken: Holding | IHyperLiquidHolding;
    tokenQuote: CardQuoteResponse;
  };
}
