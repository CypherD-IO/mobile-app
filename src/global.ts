import { getArchHost, setArchHost } from './core/asyncStorage';

let ARCH_HOST = 'https://arch.cypherhq.io';

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
