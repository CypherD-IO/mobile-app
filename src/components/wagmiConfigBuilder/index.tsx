import React, { useContext, useEffect, useState } from 'react';
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
} from '@wagmi/core/chains';
import {
  createAppKit,
  defaultWagmiConfig,
} from '@reown/appkit-wagmi-react-native';
import { Config } from 'react-native-config';
import Loading from '../v2/loading';
import { HdWalletContext } from '../../core/util';
import { getConnectionType } from '../../core/asyncStorage';
import { ConnectionTypes } from '../../constants/enum';
import { get } from 'lodash';

export const WagmiConfigBuilder: React.FC = ({ children }) => {
  const [wagmiConfig, setWagmiConfig] = useState<any>();
  const hdWalletContext = useContext<any>(HdWalletContext);
  // Keep a single QueryClient instance for the lifetime of this component.
  // Re-creating it on every render can cause unnecessary remounts and subtle state issues.
  const [queryClient] = useState<QueryClient>(() => new QueryClient());
  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    undefined,
  );
  const chains = [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    avalanche,
    bsc,
    base,
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
  }, [ethereumAddress]);

  const buildWagmiConfig = async (): Promise<void> => {
    const connectionType = await getConnectionType();
    if (!wagmiConfig) {
      const tempWagmiConfig = defaultWagmiConfig({
        chains,
        projectId,
        enableWalletConnect:
          connectionType !== ConnectionTypes.SEED_PHRASE &&
          connectionType !== ConnectionTypes.PRIVATE_KEY, // this should be set as false for wallet connect (mobile app to dapp connection, in that case the connection type will be SEED PHRASE)
        metadata,
        /**
         * wagmi's <Hydrate /> calls `onMount()` synchronously during render when `ssr` is false:
         *   if (!config._internal.ssr) onMount()
         *
         * That triggers store updates while React is still rendering and React 19 warns:
         *   "Cannot update a component while rendering a different component (Hydrate)"
         *
         * Setting `ssr: true` moves hydration work into a mount effect (no render-time updates),
         * which is the correct behavior in React Native as well.
         */
        ssr: true,
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

  return (
    <>
      {wagmiConfig ? (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <WalletConnectListener>{children}</WalletConnectListener>
          </QueryClientProvider>
        </WagmiProvider>
      ) : (
        <Loading />
      )}
    </>
  );
};
