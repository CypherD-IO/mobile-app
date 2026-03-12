import { formatUnits } from 'viem';
import { limitDecimalPlaces } from '../core/util';
import { CardQuoteResponse } from '../models/card.model';

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
): string | undefined => {
  const gasCosts = quote.evmSwap?.providerData?.estimate?.gasCosts;
  if (!gasCosts?.length) {
    return undefined;
  }

  const firstGasCost = gasCosts[0];
  if (typeof firstGasCost?.token?.decimals !== 'number') {
    return undefined;
  }

  const totalGasAmount = gasCosts.reduce((total, gasCost) => {
    if (!gasCost?.amount) {
      return total;
    }

    return total + BigInt(gasCost.amount);
  }, 0n);

  return formatUnits(totalGasAmount, firstGasCost.token.decimals);
};
