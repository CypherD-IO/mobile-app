/**
 * Unit tests for WalletConnect modal and network utilities.
 *
 * Tests platform-specific delays and exponential backoff retry logic.
 */

import { Platform } from 'react-native';
import {
  waitForWalletConnectModalRender,
  retryOnNetworkError,
} from '../walletConnectModalUtils';
import { AxiosError } from 'axios';

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

// ─── waitForWalletConnectModalRender ───
describe('waitForWalletConnectModalRender', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns immediately on non-iOS platforms', async () => {
    (Platform.OS as any) = 'android';
    const promise = waitForWalletConnectModalRender();
    // Should resolve instantly without waiting for timer
    jest.runAllTimers();
    await promise;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('delays 350ms on iOS', async () => {
    (Platform.OS as any) = 'ios';
    const promise = waitForWalletConnectModalRender();

    // Should have set a timer
    expect(jest.getTimerCount()).toBe(1);

    // Advance timers
    jest.advanceTimersByTime(350);
    await promise;

    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not delay on other platforms', async () => {
    (Platform.OS as any) = 'web';
    const promise = waitForWalletConnectModalRender();
    jest.runAllTimers();
    await promise;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('resolves with void on iOS after delay', async () => {
    (Platform.OS as any) = 'ios';
    const promise = waitForWalletConnectModalRender();
    jest.advanceTimersByTime(350);
    const result = await promise;
    expect(result).toBeUndefined();
  });
});

// ─── retryOnNetworkError ───
describe('retryOnNetworkError', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retryOnNetworkError(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transport-level errors (no response)', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const result = await retryOnNetworkError(fn, { maxRetries: 3, baseDelayMs: 1 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on HTTP errors (has response)', async () => {
    const error = new Error('Bad request') as any;
    error.response = { status: 400, statusText: 'Bad Request' };

    const fn = jest.fn().mockRejectedValueOnce(error);

    try {
      await retryOnNetworkError(fn);
      fail('should have thrown');
    } catch (err) {
      expect(err).toBe(error);
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('respects maxRetries option', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    const fn = jest.fn().mockRejectedValue(error);

    try {
      await retryOnNetworkError(fn, { maxRetries: 2, baseDelayMs: 1 });
      fail('should have thrown');
    } catch (err) {
      expect(err).toBe(error);
      expect(fn).toHaveBeenCalledTimes(2);
    }
  });

  it('uses exponential backoff: baseDelay * attempt', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    let callCount = 0;
    const fn = jest.fn(async () => {
      callCount++;
      if (callCount < 3) {
        throw error;
      }
      return 'success';
    });

    const result = await retryOnNetworkError(fn, { baseDelayMs: 5, maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting maxRetries', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    const fn = jest.fn().mockRejectedValue(error);

    try {
      await retryOnNetworkError(fn, { maxRetries: 2, baseDelayMs: 1 });
      fail('should have thrown');
    } catch (err) {
      expect(err).toBe(error);
      expect(fn).toHaveBeenCalledTimes(2);
    }
  });

  it('defaults to 3 maxRetries', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    const fn = jest.fn().mockRejectedValue(error);

    try {
      await retryOnNetworkError(fn, { baseDelayMs: 1 });
      fail('should have thrown');
    } catch (err) {
      expect(fn).toHaveBeenCalledTimes(3);
    }
  });

  it('defaults to 600ms baseDelayMs', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const result = await retryOnNetworkError(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on error with no error.response property', async () => {
    jest.useRealTimers(); // Use real timers for this test since it's simple
    const error = { message: 'Network failure' } as any;
    // Explicitly set response to undefined
    error.response = undefined;

    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const result = await retryOnNetworkError(fn, { maxRetries: 2, baseDelayMs: 1 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    jest.useFakeTimers();
  });

  it('non-AxiosError objects without response trigger retries', async () => {
    jest.useRealTimers(); // Use real timers for this test
    const error = new Error('Some error') as any;
    // Not an AxiosError, no response property

    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const result = await retryOnNetworkError(fn, { maxRetries: 2, baseDelayMs: 1 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    jest.useFakeTimers();
  });

  it('stops retrying once maxRetries is reached', async () => {
    const error = new Error('Network error') as any;
    error.response = undefined;

    const fn = jest.fn().mockRejectedValue(error);
    const promise = retryOnNetworkError(fn, { maxRetries: 1, baseDelayMs: 100 });

    // First attempt
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait for delay and second attempt
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // No additional call yet (timer not fired)

    jest.runAllTimers();
    expect(fn).toHaveBeenCalledTimes(1); // Still 1, maxRetries was 1 so only 1 attempt

    try {
      await promise;
      fail('should have thrown');
    } catch (err) {
      expect(err).toBe(error);
    }
  });

  it('handles mixed error types across retries', async () => {
    const transportError = new Error('Network') as any;
    transportError.response = undefined;

    const httpError = new Error('Bad request') as any;
    httpError.response = { status: 400 };

    const fn = jest
      .fn()
      .mockRejectedValueOnce(transportError)
      .mockRejectedValueOnce(httpError); // Should not retry this one

    jest.useRealTimers();
    const promise = retryOnNetworkError(fn, { maxRetries: 3, baseDelayMs: 1 });

    try {
      await promise;
      fail('should have thrown');
    } catch (err) {
      expect(err).toBe(httpError);
      expect(fn).toHaveBeenCalledTimes(2);
    }
    jest.useFakeTimers();
  });
});
