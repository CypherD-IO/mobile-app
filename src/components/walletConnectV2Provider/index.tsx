import WalletConnect from '@walletconnect/client';
import React, { createContext, useContext, useEffect } from 'react';
import { PortfolioContext } from '../../core/util';
import { web3WalletPair } from '../../core/walletConnectV2Utils';
import useInitialIntentURL from '../../hooks/useInitialIntentURL';
import useWalletConnectEventsManager from '../../hooks/useWalletConnectV2EventsManager';
import useWalletConnectV2Initialization from '../../hooks/useWalletConnectV2Initialization';
import { WalletConnectActions } from '../../reducers/wallet_connect_reducer';

const walletConnectInitialValue = {
  initialized: false
};

export const WalletConnectContext = createContext(walletConnectInitialValue);

export const WalletConnectV2Provider: React.FC<any> = ({ children }) => {
  // Step 1 - Initialize wallets and wallet connect client
  const initialized = useWalletConnectV2Initialization();
  const portfolioState = useContext<any>(PortfolioContext);
  const { walletConnectDispatch } = useContext<any>(WalletConnectContext);

  // Step 2 - Once initialized, set up wallet connect event manager
  useWalletConnectEventsManager(initialized);

  const { url: initialUrl } = useInitialIntentURL();

  const initiateWalletConnection = async () => {
    if (initialUrl) {
      let uri = '';
      if (initialUrl?.url) {
        uri = initialUrl?.url?.replace('cypherwallet://', '');
      } else if (initialUrl?.includes('cypherwallet://')) {
        uri = initialUrl?.replace('cypherwallet://', '');
      }
      console.log(uri);
      if (uri?.startsWith('wc') && (uri.includes('bridge') || uri.includes('relay-protocol'))) {
        if (uri.includes('relay-protocol')) {
          await web3WalletPair({ uri });
        } else if (uri.includes('bridge')) {
          const connector = new WalletConnect({ uri });
          portfolioState.dispatchPortfolio({ value: { walletConnectURI: uri } });
          walletConnectDispatch({ type: WalletConnectActions.ADD_CONNECTOR, value: connector });
        }
      }
    }
  };

  useEffect(() => {
    if (initialized) {
      void initiateWalletConnection();
    }
  }, [initialUrl, initialized]);

  return (
    <WalletConnectContext.Provider value={{ initialized }}>
        {children}
    </WalletConnectContext.Provider>
  );
};
