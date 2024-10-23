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
  zkSync,
  base,
  polygonZkEvm,
  aurora,
  moonbeam,
  moonriver,
} from 'viem/chains';
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
  zkSync,
  base,
  polygonZkEvm,
  aurora,
  moonbeam,
  moonriver,
] as const;

const projectId = String(Config.WALLET_CONNECT_PROJECTID);

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId: String(Config.WALLET_CONNECT_PROJECTID),
  metadata: {
    name: 'Cypher Wallet',
    description: 'Cypher Wallet',
    url: 'https://cypherwallet.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
    redirect: {
      native: 'cypherwallet://',
      universal: 'YOUR_APP_UNIVERSAL_LINK.com',
    },
  },
});

export const WagmiConfigBuilder: React.FC = ({ children }) => {
  createAppKit({
    projectId,
    wagmiConfig,
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
