import { formatUnits } from 'viem';
import { limitDecimalPlaces } from '../core/util';
import { CardQuoteResponse } from '../models/card.model';

const parseGasValue = (value?: string): bigint | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
};

const getQuotedEvmGasFromTransaction = (
  quote: CardQuoteResponse,
  nativeTokenDecimals?: number,
): string | undefined => {
  if (
    typeof nativeTokenDecimals !== 'number' ||
    !Number.isInteger(nativeTokenDecimals) ||
    nativeTokenDecimals <= 0
  ) {
    return undefined;
  }

  const transaction = quote.evmSwap?.transactionRequest ?? quote.evmSwap?.transaction;
  if (!transaction) {
    return undefined;
  }

  const gasLimit = parseGasValue(transaction.gasLimit ?? transaction.gas);
  const gasPrice = parseGasValue(
    transaction.maxFeePerGas ?? transaction.gasPrice,
  );

  if (gasLimit == null || gasPrice == null) {
    return undefined;
  }

  return formatUnits(gasLimit * gasPrice, nativeTokenDecimals);
};

export const getCardQuoteActualTokensRequired = (
  quote: CardQuoteResponse,
  contractDecimals: number,
): string => {
  if (quote.evmSwap?.fromAmount) {
    return formatUnits(BigInt(quote.evmSwap.fromAmount), contractDecimals);
  }

  if (quote.cosmosSwap?.amountIn) {
    return formatUnits(BigInt(quote.cosmosSwap.amountIn), contractDecimals);
  }

  return limitDecimalPlaces(quote.tokensRequired, contractDecimals);
};

export const getCardQuoteEvmGasFeeInCrypto = (
  quote: CardQuoteResponse,
  nativeTokenDecimals?: number,
): string | undefined => {
  return getQuotedEvmGasFromTransaction(quote, nativeTokenDecimals);
};
