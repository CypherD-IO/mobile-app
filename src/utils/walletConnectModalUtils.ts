import { Platform } from 'react-native';
import type { AxiosError } from 'axios';

/**
 * iOS WalletConnect Modal Render Guard
 *
 * On iOS, the Reown AppKit SDK deep-links to the wallet app almost immediately
 * when sendTransactionAsync() fires. If react-native-modal is still mid-animation
 * when the app goes to background, the native-driver animation Promise stalls and
 * the modal may appear invisible on resume.
 *
 * Android does not need this because WalletConnect doesn't force an immediate
 * foreground app switch there.
 */
const IOS_MODAL_RENDER_DELAY_MS = 350;

export async function waitForWalletConnectModalRender(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  await new Promise<void>(resolve =>
    setTimeout(resolve, IOS_MODAL_RENDER_DELAY_MS),
  );
}

/**
 * Retry a network request on transient "Network Error" failures.
 *
 * On iOS, when the app returns from background (e.g. after the user signs in
 * an external wallet), the first HTTP request can fail with a transport-level
 * "Network Error" (no HTTP response at all) because the OS suspended the TCP
 * socket pool while the app was backgrounded.
 *
 * The global axiosRetry config does NOT cover this case — it only retries on
 * HTTP status codes (403, 5xx), not on connection-level failures.
 *
 * This helper retries with exponential back-off, only for errors that have
 * no `response` (i.e., the request never reached the server).
 */
export async function retryOnNetworkError<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number },
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 600 } = options ?? {};

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const axiosErr = err as AxiosError | undefined;
      // Only retry on transport-level failures (no HTTP response at all).
      // If the server responded with an error status, don't retry.
      const isTransportError =
        axiosErr && typeof axiosErr === 'object' && !axiosErr.response;

      if (isTransportError && attempt < maxRetries) {
        // Exponential back-off: 600ms → 1200ms → 2400ms
        await new Promise<void>(resolve =>
          setTimeout(resolve, baseDelayMs * attempt),
        );
        continue;
      }
      throw err;
    }
  }

  // TypeScript: this line is unreachable but satisfies the return type
  throw new Error('retryOnNetworkError: exhausted retries');
}
