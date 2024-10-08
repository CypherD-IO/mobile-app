import {
  getArchHost,
  getPortfolioHost,
  getOwlracleHost,
  setArchHost,
  setPortfolioHost,
  setOwlracleHost,
} from './core/asyncStorage';

// let ARCH_HOST = 'https://arch.cypherd.io';
let ARCH_HOST = 'http://localhost:9090';
let PORTFOLIO_HOST = 'https://api.cypherd.io';
let OWLRACLE_HOST = 'https://api.owlracle.info';

export async function initializeHostsFromAsync() {
  const archFromAsync = await getArchHost();
  if (archFromAsync && archFromAsync !== '') {
    ARCH_HOST = archFromAsync;
  } else {
    void setArchHost(ARCH_HOST);
  }

  const portfolioFromAsync = await getPortfolioHost();
  if (portfolioFromAsync && portfolioFromAsync !== '') {
    PORTFOLIO_HOST = portfolioFromAsync;
  } else {
    void setPortfolioHost(PORTFOLIO_HOST);
  }

  const owlracleFromAsync = await getOwlracleHost();
  if (owlracleFromAsync && owlracleFromAsync !== '') {
    OWLRACLE_HOST = owlracleFromAsync;
  } else {
    void setOwlracleHost(OWLRACLE_HOST);
  }
  return { ARCH_HOST, PORTFOLIO_HOST, OWLRACLE_HOST };
}

const setHost = (host: string, value: string) => {
  if (host === 'ARCH_HOST') {
    ARCH_HOST = value;
    void setArchHost(value);
  } else if (host === 'PORTFOLIO_HOST') {
    PORTFOLIO_HOST = value;
    void setPortfolioHost(value);
  } else if (host === 'OWLRACLE_HOST') {
    OWLRACLE_HOST = value;
    void setOwlracleHost(value);
  }
};

const getHost = (host: string) => {
  if (host === 'ARCH_HOST') {
    return ARCH_HOST;
  } else if (host === 'PORTFOLIO_HOST') {
    return PORTFOLIO_HOST;
  } else if (host === 'OWLRACLE_HOST') {
    return OWLRACLE_HOST;
  } else {
    return '';
  }
};

export const hostWorker = {
  setHost,
  getHost,
};
