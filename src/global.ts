import { getArchHost, setArchHost } from './core/asyncStorage';

// Production ARCH_HOST URL - used to determine if we are running in production environment
// This is used for additional security verification in critical flows like card loading
export const PRODUCTION_ARCH_HOST = 'https://arch.cypherhq.io';

// Explicit allow-list of non-prod hosts. isNonProdEnv() fails closed: only exact
// matches in this set count as non-prod, so empty/corrupted ARCH_HOST values are
// treated as production (safer default for security-gated flows).
export const TEST_ARCH_HOST = 'https://arch-dev.cypherd.io';
export const STAGING_ARCH_HOST = 'https://arch-staging.cypherd.io';
export const NON_PROD_HOSTS: ReadonlySet<string> = new Set([
  TEST_ARCH_HOST,
  STAGING_ARCH_HOST,
]);

// Simple test detection - use dev URL if in development mode
const getDefaultArchHost = () => {
  if (__DEV__) {
    console.log(
      '🧪 Development mode detected - using ARCH_HOST: https://arch-dev.cypherd.io for testing',
    );
    return TEST_ARCH_HOST;
  } else {
    console.log(
      '🚀 Production build - using ARCH_HOST: https://arch.cypherhq.io',
    );
    return PRODUCTION_ARCH_HOST;
  }
};

let ARCH_HOST = getDefaultArchHost();

export async function initializeHostsFromAsync() {
  const archFromAsync = await getArchHost();
  if (archFromAsync && archFromAsync !== '') {
    ARCH_HOST = archFromAsync;
  } else {
    void setArchHost(ARCH_HOST);
  }
  return { ARCH_HOST };
}

const setHost = (host: string, value: string) => {
  if (host === 'ARCH_HOST') {
    ARCH_HOST = value;
    void setArchHost(value);
  }
};

const getHost = (host: string) => {
  if (host === 'ARCH_HOST') {
    return ARCH_HOST;
  } else {
    return '';
  }
};

export const hostWorker = {
  setHost,
  getHost,
};

/**
 * Returns true when NOT running against production backend.
 * Covers both __DEV__ (local) and TestFlight/beta builds that use dev API.
 * Use this instead of __DEV__ to gate testnet features.
 */
export function isNonProdEnv(): boolean {
  if (!ARCH_HOST) return false;
  return NON_PROD_HOSTS.has(ARCH_HOST);
}
