import React, { useState, PropsWithChildren } from 'react';
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
import { Config } from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse, safeJsonStringify } from '@walletconnect/safe-json';
import { createAppKit, AppKitProvider } from '@reown/appkit-react-native';
import { WagmiAdapter } from '@reown/appkit-wagmi-react-native';

// Storage implementation for AppKit
const appKitStorage = {
  getKeys: async () => {
    return (await AsyncStorage.getAllKeys()) as string[];
  },
  // eslint-disable-next-line @typescript-eslint/array-type
  getEntries: async <T = unknown,>(): Promise<[string, T][]> => {
    const keys = await AsyncStorage.getAllKeys();
    return await Promise.all(
      keys.map(async key => [
        key,
        safeJsonParse((await AsyncStorage.getItem(key)) ?? '') as T,
      ]),
    );
  },
  setItem: async <T = unknown,>(key: string, value: T) => {
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
const networks = [mainnet, polygon, optimism, arbitrum, avalanche, bsc, base];

// Use dedicated AppKit project ID for connecting to external wallets
// This is separate from WalletKit's project ID (which uses customStoragePrefix: 'walletkit')
const projectId = String(Config.MOBILE_APPKIT_PROJECTID);

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

// Create WagmiAdapter with its own project ID (separate from WalletKit)
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as any,
});

// Create AppKit instance
const appKit = createAppKit({
  projectId,
  metadata,
  networks,
  defaultNetwork: mainnet,
  adapters: [wagmiAdapter],
  storage: appKitStorage,
  enableAnalytics: true,
  features: {
    socials: false,
    showWallets: true,
    swaps: false,
    onramp: false,
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
    'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a',
  ],
});

// Export wagmi config getter for external use
export function getWagmiConfig() {
  return wagmiAdapter.wagmiConfig;
}

export const WagmiConfigBuilder: React.FC<PropsWithChildren> = ({
  children,
}) => {
  // Keep a single QueryClient instance for the lifetime of this component.
  const [queryClient] = useState<QueryClient>(() => new QueryClient());

  return (
    <AppKitProvider instance={appKit}>
      <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount={true}>
        <QueryClientProvider client={queryClient}>
          <WalletConnectListener>{children}</WalletConnectListener>
        </QueryClientProvider>
      </WagmiProvider>
    </AppKitProvider>
  );
};
