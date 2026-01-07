/**
 * Intercom shim used to fully disable Intercom at runtime.
 *
 * Why:
 * - RN 0.83 + New Architecture is stricter when parsing native module methods.
 * - If Intercom is incompatible/misconfigured, any import of `@intercom/intercom-react-native`
 *   can crash the app very early (before UI renders).
 *
 * How:
 * - Metro can be configured to alias `@intercom/intercom-react-native` to this file.
 * - This prevents any code (including 3rd-party deps) from loading the real native module.
 *
 * Important:
 * - This is intentionally minimal and safe. All methods are no-ops.
 * - When you want Intercom back, remove the Metro alias and rely on the real SDK + patches.
 */

export enum Visibility {
  GONE = 'GONE',
  VISIBLE = 'VISIBLE',
}

export enum LogLevel {
  VERBOSE = 'VERBOSE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

// Keep a compatible surface for event emitter usage.
export const IntercomEventEmitter = {
  addListener: () => ({ remove: () => undefined }),
  removeAllListeners: () => undefined,
};

const Intercom = {
  initialize: async (): Promise<boolean> => false,
  loginUnidentifiedUser: async (): Promise<boolean> => false,
  loginUserWithUserAttributes: async (): Promise<boolean> => false,
  logout: async (): Promise<boolean> => true,
  updateUser: async (): Promise<boolean> => false,
  isUserLoggedIn: async (): Promise<boolean> => false,
  fetchLoggedInUserAttributes: async (): Promise<Record<string, unknown>> => ({}),
  logEvent: async (): Promise<boolean> => true,
  present: async (): Promise<boolean> => false,
};

export default Intercom;


