import React, { useEffect, useState, PropsWithChildren } from 'react';
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
import { createAppKit, AppKitProvider } from '@reown/appkit-react-native';
import { WagmiAdapter } from '@reown/appkit-wagmi-react-native';
import { Config } from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse, safeJsonStringify } from '@walletconnect/safe-json';
import Loading from '../v2/loading';

// Storage implementation for AppKit
const appKitStorage = {
  getKeys: async () => {
    return (await AsyncStorage.getAllKeys()) as string[];
  },
  getEntries: async <T = any,>(): Promise<[string, T][]> => {
    const keys = await AsyncStorage.getAllKeys();
    return await Promise.all(
      keys.map(async key => [
        key,
        safeJsonParse((await AsyncStorage.getItem(key)) ?? '') as T,
      ]),
    );
  },
  setItem: async <T = any,>(key: string, value: T) => {
    await AsyncStorage.setItem(key, safeJsonStringify(value));
  },
  getItem: async <T = any,>(key: string): Promise<T | undefined> => {
    const item = await AsyncStorage.getItem(key);
    if (typeof item === 'undefined' || item === null) {
      return undefined;
    }
    return safeJsonParse(item) as T;
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

// Define supported networks
const networks = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  avalanche,
  bsc,
  base,
] as const;

// Project ID from environment config
const projectId = String(Config.WALLET_CONNECT_PROJECTID);

// App metadata for WalletConnect
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

// Initialize Wagmi adapter with the new pattern
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

// Create AppKit instance with the adapter
const appKit = createAppKit({
  projectId,
  metadata,
  networks,
  defaultNetwork: mainnet,
  adapters: [wagmiAdapter],
  storage: appKitStorage,
  enableAnalytics: true,
  features: {
    // Disable social logins (including email) - false disables all
    socials: false,
    // Show wallets on the connect screen
    showWallets: true,
    // Disable new features - keeping migration minimal
    swaps: false,
    onramp: false,
  },
  // Feature popular wallets at the top of the list
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
    '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget Wallet
    'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a', // Uniswap Wallet
  ],
});

// Export wagmi config for external use
export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const WagmiConfigBuilder: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [isReady, setIsReady] = useState(false);
  // Keep a single QueryClient instance for the lifetime of this component.
  // Re-creating it on every render can cause unnecessary remounts and subtle state issues.
  const [queryClient] = useState<QueryClient>(() => new QueryClient());

  useEffect(() => {
    // Small delay to ensure AppKit is fully initialized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <Loading />;
  }

  return (
    <AppKitProvider instance={appKit}>
      <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
        <QueryClientProvider client={queryClient}>
          <WalletConnectListener>{children}</WalletConnectListener>
        </QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  );
};
