import { Config } from 'react-native-config';

/**
 * WalletConnect/AppKit debug logger.
 *
 * Enable via:
 * - __DEV__ (default)
 * - ENV: WALLETCONNECT_DEBUG=true (or WC_DEBUG=true)
 *
 * IMPORTANT:
 * - Do NOT log secrets (seed/private keys, full signatures).
 * - When logging URIs, always use `redactWcUri`.
 */
const isWalletConnectDebugEnabled =
  __DEV__ ||
  String(Config.WALLETCONNECT_DEBUG) === 'true' ||
  String(Config.WC_DEBUG) === 'true';

type LogData = Record<string, unknown> | unknown[] | string | number | boolean;

export function redactWcUri(uri: string): string {
  if (!uri) {
    return '';
  }
  const trimmed = uri.trim();
  // Typical WC URI is quite long and contains sensitive routing info.
  // Keep just the prefix and a short suffix.
  if (trimmed.length <= 40) {
    return trimmed;
  }
  return `${trimmed.slice(0, 16)}…${trimmed.slice(-12)}`;
}

function safeLog(prefix: string, message: string, data?: LogData) {
  if (!isWalletConnectDebugEnabled) {
    return;
  }
  try {
    // eslint-disable-next-line no-console
    data === undefined
      ? console.log(prefix, message)
      : console.log(prefix, message, data);
  } catch {
    // Never let logging crash app code.
  }
}

export function wcDebug(scope: string, message: string, data?: LogData) {
  safeLog(`[WC][${scope}]`, message, data);
}

export function wcWarn(scope: string, message: string, data?: LogData) {
  safeLog(`[WC][${scope}][warn]`, message, data);
}

export function wcError(scope: string, message: string, data?: LogData) {
  safeLog(`[WC][${scope}][error]`, message, data);
}

export function isWcDebugEnabled(): boolean {
  return isWalletConnectDebugEnabled;
}

