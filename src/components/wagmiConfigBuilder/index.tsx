import '@walletconnect/react-native-compat';
import React, { Component, ErrorInfo } from 'react';
import Loading from '../../components/v2/loading';
import { WalletConnectListener } from '../walletConnectListener';
import { WagmiProvider } from 'wagmi';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createAppKit,
  defaultWagmiConfig,
} from '@reown/appkit-wagmi-react-native';
import { Config } from 'react-native-config';

const queryClient = new QueryClient();

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

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Loading />;
    }

    return this.props.children;
  }
}

// export const wagmiConfig = createConfig({
//   chains,
//   connectors: [injected(), walletConnect({ projectId }), metaMask(), safe()],
//   transports: {
//     [mainnet.id]: http(),
//     [polygon.id]: http(),
//     [optimism.id]: http(),
//     [arbitrum.id]: http(),
//     [avalanche.id]: http(),
//     [bsc.id]: http('https://bsc.rpc.blxrbdn.com	'),
//     [zkSync.id]: http(),
//     [base.id]: http(),
//     [polygonZkEvm.id]: http(),
//     [aurora.id]: http(),
//     [moonbeam.id]: http(),
//     [moonriver.id]: http(),
//   },
// });

console.log('Creating AppKit with projectId:', projectId);
console.log('Using wagmiConfig:', wagmiConfig);

createAppKit({
  projectId: String(Config.WALLET_CONNECT_PROJECTID),
  wagmiConfig,
});

console.log('wagmiConfig:', wagmiConfig);

export const WagmiConfigBuilder = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return wagmiConfig ? (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletConnectListener>
          <ErrorBoundary>{children}</ErrorBoundary>
        </WalletConnectListener>
      </QueryClientProvider>
    </WagmiProvider>
  ) : (
    <Loading />
  );
};
