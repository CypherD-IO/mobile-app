import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { WalletConnectListener } from '../walletConnectListener';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  avalanche,
  bsc,
  base,
  polygonZkEvm,
  aurora,
  moonbeam,
  moonriver,
} from '@wagmi/core/chains';
import {
  AppKit,
  createAppKit,
  defaultWagmiConfig,
} from '@reown/appkit-wagmi-react-native';
import { Config } from 'react-native-config';
import Loading from '../v2/loading';
import {
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
  HdWalletContext,
} from '../../core/util';
import { getConnectionType } from '../../core/asyncStorage';
import { ConnectionTypes } from '../../constants/enum';

// Create a context for wagmiConfig
export const WagmiConfigContext = createContext<any>(null);

export const WagmiConfigBuilder: React.FC = ({ children }) => {
  const [wagmiConfig, setWagmiConfig] = useState<any>();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { ethereum } = hdWalletContext.state.wallet;
  const chains = [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    avalanche,
    bsc,
    base,
    polygonZkEvm,
    aurora,
    moonbeam,
    moonriver,
  ] as const;

  const projectId = String(Config.WALLET_CONNECT_PROJECTID);

  const metadata = {
    name: 'Cypher Wallet',
    description: 'Cypher Wallet',
    url: 'https://cypherhq.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
    redirect: {
      native: 'cypherwallet://',
      universal: 'https://app.cypherhq.io',
    },
  };

  useEffect(() => {
    void buildWagmiConfig();
  }, [ethereum.address]);

  const buildWagmiConfig = async () => {
    const connectionType = await getConnectionType();
    if (!wagmiConfig) {
      const tempWagmiConfig = defaultWagmiConfig({
        chains,
        projectId,
        enableWalletConnect: connectionType !== ConnectionTypes.SEED_PHRASE, // this should be set as false for wallet connect (mobile app to dapp connection, in that case the connection type will be SEED PHRASE)
        metadata,
      });

      createAppKit({
        projectId,
        wagmiConfig: tempWagmiConfig,
        defaultChain: mainnet, // Optional
        enableAnalytics: true, // Optional - defaults to your Cloud configuration
      });
      setWagmiConfig(tempWagmiConfig);
    }
  };

  const queryClient = new QueryClient();
  return (
    <WagmiConfigContext.Provider value={wagmiConfig}>
      {wagmiConfig ? (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <WalletConnectListener>{children}</WalletConnectListener>
          </QueryClientProvider>
        </WagmiProvider>
      ) : (
        <Loading />
      )}
    </WagmiConfigContext.Provider>
  );
};
