/**
 * Cross-platform typing shim for `showExitToast`.
 *
 * Runtime behavior:
 * - React Native bundler will prefer `exitToast.android.ts` on Android
 * - React Native bundler will prefer `exitToast.ios.ts` on iOS
 *
 * Why this file exists:
 * Some TypeScript tooling configurations do not resolve platform-specific extensions
 * (`.android.ts` / `.ios.ts`) during type-checking. This file provides a stable module
 * so `import { showExitToast } from '../misc/exitToast'` always type-checks.
 */
export const showExitToast = (): void => {
  // No-op fallback. Platform-specific implementations override this at runtime.
};

