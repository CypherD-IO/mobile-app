import '@walletconnect/react-native-compat';
import React from 'react';
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
  createAppKit,
  defaultWagmiConfig,
} from '@reown/appkit-wagmi-react-native';
import { Config } from 'react-native-config';
import Loading from '../v2/loading';

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
  url: 'https://cypherwallet.io',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
  redirect: {
    native: 'cypherwallet://',
    universal: 'https://app.cypherhq.io',
  },
};

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

export const WagmiConfigBuilder: React.FC = ({ children }) => {
  createAppKit({
    projectId,
    wagmiConfig,
    defaultChain: mainnet, // Optional
    enableAnalytics: true, // Optional - defaults to your Cloud configuration
  });

  const queryClient = new QueryClient();
  return wagmiConfig ? (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectListener>{children}</WalletConnectListener>
      </QueryClientProvider>
    </WagmiProvider>
  ) : (
    <Loading />
  );
};
