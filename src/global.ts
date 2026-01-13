import { getArchHost, setArchHost } from './core/asyncStorage';

// Production ARCH_HOST URL - used to determine if we are running in production environment
// This is used for additional security verification in critical flows like card loading
export const PRODUCTION_ARCH_HOST = 'https://arch.cypherhq.io';

// Simple test detection - use dev URL if in development mode
const getDefaultArchHost = () => {
  if (__DEV__) {
    console.log(
      '🧪 Development mode detected - using ARCH_HOST: https://arch-dev.cypherd.io for testing',
    );
    return 'https://arch-dev.cypherd.io';
  } else {
    console.log(
      '🚀 Production build - using ARCH_HOST: https://arch.cypherhq.io',
    );
    return 'https://arch.cypherhq.io';
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
