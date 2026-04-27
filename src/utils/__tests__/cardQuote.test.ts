/**
 * Unit tests for card quote utilities.
 *
 * Tests gas fee calculation, token parsing, and quote amount extraction.
 */

// ─── Mocks ───
jest.mock('../../core/util', () => ({
  limitDecimalPlaces: jest.fn((value: string, decimals: number) => {
    // Simple mock that just returns the input for testing
    return value;
  }),
}));

import {
  getCardQuoteActualTokensRequired,
  getCardQuoteEvmGasFeeInCrypto,
} from '../cardQuote';
import { CardQuoteResponse } from '../../models/card.model';

// ─── Helpers ───
const mockQuoteBase = (): CardQuoteResponse => ({
  tokensRequired: '100',
} as CardQuoteResponse);

const mockEvmTransaction = (gasLimit: string, gasPrice: string) => ({
  gasLimit,
  gasPrice,
});

const mockEvmTransactionAlt = (gas: string, maxFeePerGas: string) => ({
  gas,
  maxFeePerGas,
});

// ─── getCardQuoteActualTokensRequired ───
describe('getCardQuoteActualTokensRequired', () => {
  it('returns formatted fromAmount from evmSwap', () => {
    const quote: CardQuoteResponse = {
      ...mockQuoteBase(),
      evmSwap: {
        fromAmount: '1000000000000000000', // 1 token with 18 decimals
      },
    } as any;
    const result = getCardQuoteActualTokensRequired(quote, 18);
    expect(result).toBe('1');
  });

  it('returns formatted amountIn from cosmosSwap when evmSwap is absent', () => {
    const quote: CardQuoteResponse = {
      ...mockQuoteBase(),
      cosmosSwap: {
        amountIn: '5000000', // 5 ATOM with 6 decimals
      },
    } as any;
    const result = getCardQuoteActualTokensRequired(quote, 6);
    expect(result).toBe('5');
  });

  it('falls back to tokensRequired when no swaps present', () => {
    const quote = mockQuoteBase();
    const result = getCardQuoteActualTokensRequired(quote, 18);
    // tokensRequired is '100', with 18 decimals, formatted will be '100'
    expect(result).toBe('100');
  });

  it('handles very large amounts', () => {
    const quote: CardQuoteResponse = {
      tokensRequired: '1000',
      evmSwap: {
        fromAmount: '999999999999999999999999999', // 999999999999999999.999999999 with 18 decimals
      },
    } as any;
    const result = getCardQuoteActualTokensRequired(quote, 18);
    // Large BigInt division: 999999999999999999999999999 / 10^18 = 999999999.999999999999999999
    expect(result).toBe('999999999.999999999999999999');
  });

  it('handles zero amount from evmSwap', () => {
    const quote: CardQuoteResponse = {
      tokensRequired: '100',
      evmSwap: {
        fromAmount: '0',
      },
    } as any;
    const result = getCardQuoteActualTokensRequired(quote, 18);
    expect(result).toBe('0');
  });

  it('handles different decimal places', () => {
    const quote: CardQuoteResponse = {
      tokensRequired: '100',
      evmSwap: {
        fromAmount: '5000000', // 5 USDC with 6 decimals
      },
    } as any;
    const result = getCardQuoteActualTokensRequired(quote, 6);
    expect(result).toBe('5');
  });

  it('prioritizes evmSwap.fromAmount over cosmosSwap.amountIn', () => {
    const quote: CardQuoteResponse = {
      tokensRequired: '999',
      evmSwap: {
        fromAmount: '2000000000000000000', // 2 tokens
      },
      cosmosSwap: {
        amountIn: '1000000', // 1 token
      },
    } as any;
    const result = getCardQuoteActualTokensRequired(quote, 18);
    expect(result).toBe('2');
  });
});

// ─── getCardQuoteEvmGasFeeInCrypto ───
describe('getCardQuoteEvmGasFeeInCrypto', () => {
  it('calculates gas fee from gasLimit and gasPrice', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: mockEvmTransaction('21000', '20000000000'), // 0.42 ETH
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    // 21000 * 20000000000 = 420000000000000 wei = 0.00042 ETH
    expect(result).toBe('0.00042');
  });

  it('uses gas field when gasLimit is absent', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: mockEvmTransactionAlt('50000', '30000000000'),
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    // 50000 * 30000000000 = 1500000000000000 wei
    expect(result).toBe('0.0015');
  });

  it('uses maxFeePerGas when gasPrice is absent', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: {
          gasLimit: '100000',
          maxFeePerGas: '40000000000',
        },
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    // 100000 * 40000000000 = 4000000000000000 wei = 0.004 ETH
    expect(result).toBe('0.004');
  });

  it('falls back to transaction field when transactionRequest is absent', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transaction: mockEvmTransaction('21000', '25000000000'),
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    expect(result).toBe('0.000525');
  });

  it('returns undefined when nativeTokenDecimals is not a number', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: mockEvmTransaction('21000', '20000000000'),
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, undefined);
    expect(result).toBeUndefined();
  });

  it('returns undefined when nativeTokenDecimals is not an integer', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: mockEvmTransaction('21000', '20000000000'),
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18.5);
    expect(result).toBeUndefined();
  });

  it('returns undefined when nativeTokenDecimals is zero or negative', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: mockEvmTransaction('21000', '20000000000'),
      },
    } as any;
    expect(getCardQuoteEvmGasFeeInCrypto(quote, 0)).toBeUndefined();
    expect(getCardQuoteEvmGasFeeInCrypto(quote, -1)).toBeUndefined();
  });

  it('returns undefined when no transaction present', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {},
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    expect(result).toBeUndefined();
  });

  it('returns undefined when evmSwap is absent', () => {
    const quote: CardQuoteResponse = {} as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    expect(result).toBeUndefined();
  });

  it('returns undefined when gasLimit and gas are both absent', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: {
          gasPrice: '20000000000',
          maxFeePerGas: '30000000000',
        },
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    expect(result).toBeUndefined();
  });

  it('returns undefined when gasPrice and maxFeePerGas are both absent', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: {
          gasLimit: '21000',
        },
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 18);
    expect(result).toBeUndefined();
  });

  it('handles high-precision gas calculations with 6 decimal token', () => {
    const quote: CardQuoteResponse = {
      evmSwap: {
        transactionRequest: mockEvmTransaction('100000', '50000000000'),
      },
    } as any;
    const result = getCardQuoteEvmGasFeeInCrypto(quote, 6);
    // 100000 * 50000000000 = 5000000000000000 (5e15)
    // With 6 decimals: 5000000000000000 / 1000000 = 5000000000
    expect(result).toBe('5000000000');
  });
});
