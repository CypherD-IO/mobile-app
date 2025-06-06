import { getArchHost, setArchHost } from './core/asyncStorage';

// Simple test detection - use dev URL if in development mode
// This is the simplest and most reliable approach
const getDefaultArchHost = () => {
  if (__DEV__) {
    console.log(
      '🧪 Development mode detected - using dev ARCH_HOST for testing',
    );
    return 'https://arch-dev.cypherd.io';
  } else {
    console.log('🚀 Production build - using production ARCH_HOST');
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
