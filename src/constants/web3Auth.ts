import Web3Auth, {
  WEB3AUTH_NETWORK,
  ChainNamespace,
} from '@web3auth/react-native-sdk';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import EncryptedStorage from 'react-native-encrypted-storage';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { SolanaPrivateKeyProvider } from '@web3auth/solana-provider';
import { CHAIN_NAMESPACES, getEvmChainConfig } from '@web3auth/base';
import { Config } from 'react-native-config';

// This file is deprecated. Please use the useWeb3Auth hook from src/hooks/useWeb3Auth/index.tsx instead.
// The hook provides the same functionality but with proper RPC endpoint management from the global context.

const scheme = 'app.cypherhq.web3auth';

const redirectUrl = `${scheme}://auth`;

if (!Config.WEB3_AUTH_CLIENT_ID) {
  throw new Error('WEB3_AUTH_CLIENT_ID is not set');
}

const clientId = Config.WEB3_AUTH_CLIENT_ID;

export const chainConfigs = {
  eth: getEvmChainConfig(1, clientId),
  polygon: getEvmChainConfig(137, clientId),
  bnb: getEvmChainConfig(56, clientId),
  optimism: getEvmChainConfig(10, clientId),
  arbitrum: {
    chainNamespace: ChainNamespace.EIP155,
    chainId: '0xA4B1', // hex of 42161
    rpcTarget: 'https://arb1.arbitrum.io/rpc',
    // Avoid using public rpcTarget in production.
    // Use services like Infura
    displayName: 'Arbitrum Mainnet',
    blockExplorer: 'https://arbiscan.io',
    ticker: 'AETH',
    tickerName: 'AETH',
  },
  avax: {
    chainNamespace: ChainNamespace.EIP155,
    chainId: '0xA86A', // hex of 43114
    rpcTarget: 'https://api.avax.network/ext/bc/C/rpc',
    // Avoid using public rpcTarget in production.
    // Use services like Infura
    displayName: 'Avalanche C-Chain Mainnet',
    blockExplorer: 'https://subnets.avax.network/c-chain',
    ticker: 'AVAX',
    tickerName: 'AVAX',
  },
  base: {
    chainNamespace: ChainNamespace.EIP155,
    chainId: '0x2105',
    rpcTarget: 'https://base.llamarpc.com',
    // Avoid using public rpcTarget in production.
    // Use services like Infura
    displayName: 'Base',
    blockExplorer: 'https://basescan.org/',
    ticker: 'ETH',
    tickerName: 'ETH',
  },
  baseTestnet: {
    chainNamespace: ChainNamespace.EIP155,
    chainId: '0x14A34',
    rpcTarget: 'https://base-sepolia-rpc.publicnode.com',
    displayName: 'Base Sepolia',
    blockExplorer: 'https://sepolia-explorer.base.org/',
    ticker: 'ETH',
    tickerName: 'ETH',
  },
  solana: {
    chainNamespace: CHAIN_NAMESPACES.SOLANA,
    chainId: '0x1',
    rpcTarget: 'https://api.mainnet-beta.solana.com',
    displayName: 'Solana Mainnet',
    blockExplorerUrl: 'https://explorer.solana.com',
    ticker: 'SOL',
    tickerName: 'Solana',
    logo: 'https://images.toruswallet.io/solana.svg',
  },
};

export const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
  config: {
    chainConfig: chainConfigs.base,
  },
});

export const solanaPrivateKeyProvider = new SolanaPrivateKeyProvider({
  config: {
    chainConfig: chainConfigs.solana,
  },
});

export const web3AuthEvm = new Web3Auth(WebBrowser, EncryptedStorage, {
  clientId: Config.WEB3_AUTH_CLIENT_ID ?? '',
  redirectUrl,
  network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  privateKeyProvider: ethereumPrivateKeyProvider,
  // accountAbstractionProvider,
  sessionTime: 30 * 24 * 60 * 60, // 30 days in seconds
  mfaSettings: {
    socialBackupFactor: {
      enable: true,
      priority: 1,
      mandatory: true, // at least two factors are mandatory
    },
    backUpShareFactor: {
      enable: true,
      priority: 2,
      mandatory: false, // at least two factors are mandatory
    },
    authenticatorFactor: {
      enable: true,
      priority: 3,
      mandatory: false, // at least two factors are mandatory
    },
    deviceShareFactor: {
      enable: true,
      priority: 4,
      mandatory: false,
    },
    passkeysFactor: {
      enable: true,
      priority: 5,
      mandatory: false, // at least two factors are mandatory
    },
    passwordFactor: {
      enable: false,
      priority: 6,
      mandatory: false,
    },
  },
});

export const web3AuthSolana = new Web3Auth(WebBrowser, EncryptedStorage, {
  clientId: Config.WEB3_AUTH_CLIENT_ID ?? '',
  redirectUrl,
  network: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  privateKeyProvider: solanaPrivateKeyProvider,
  sessionTime: 30 * 24 * 60 * 60, // 30 days in seconds
  mfaSettings: {
    socialBackupFactor: {
      enable: true,
      priority: 1,
      mandatory: true, // at least two factors are mandatory
    },
    backUpShareFactor: {
      enable: true,
      priority: 2,
      mandatory: false, // at least two factors are mandatory
    },
    authenticatorFactor: {
      enable: true,
      priority: 3,
      mandatory: false, // at least two factors are mandatory
    },
    deviceShareFactor: {
      enable: true,
      priority: 4,
      mandatory: false,
    },
    passkeysFactor: {
      enable: true,
      priority: 5,
      mandatory: false, // at least two factors are mandatory
    },
    passwordFactor: {
      enable: false,
      priority: 6,
      mandatory: false,
    },
  },
});
