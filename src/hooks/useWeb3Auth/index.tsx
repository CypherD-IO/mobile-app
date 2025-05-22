import { useContext, useMemo } from 'react';
import Web3Auth, { WEB3AUTH_NETWORK } from '@web3auth/react-native-sdk';
import type { CustomChainConfig } from '@web3auth/base';
import * as WebBrowser from '@toruslabs/react-native-web-browser';
import EncryptedStorage from 'react-native-encrypted-storage';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { SolanaPrivateKeyProvider } from '@web3auth/solana-provider';
import { CHAIN_NAMESPACES } from '@web3auth/base';
import Config from 'react-native-config';
import { GlobalContext } from '../../core/globalContext';
import { ChainBackendNames } from '../../constants/server';
import { get } from 'lodash';

const scheme = 'app.cypherhq.web3auth';
const redirectUrl = `${scheme}://auth`;
const clientId = Config.WEB3_AUTH_CLIENT_ID;
if (!clientId) {
  throw new Error('WEB3_AUTH_CLIENT_ID env var is not defined');
}

type SupportedChains = Exclude<
  ChainBackendNames,
  | ChainBackendNames.ALL
  | ChainBackendNames.COSMOS
  | ChainBackendNames.OSMOSIS
  | ChainBackendNames.NOBLE
  | ChainBackendNames.COREUM
  | ChainBackendNames.INJECTIVE
>;

export default function useWeb3Auth() {
  const globalContext = useContext(GlobalContext);

  if (!globalContext) {
    throw new Error('useWeb3Auth must be used within a GlobalContextProvider');
  }

  const getChainConfig = (
    chainName: ChainBackendNames,
  ): CustomChainConfig | null => {
    // Return null for excluded chains
    if (
      chainName === ChainBackendNames.ALL ||
      chainName === ChainBackendNames.COSMOS ||
      chainName === ChainBackendNames.OSMOSIS ||
      chainName === ChainBackendNames.NOBLE ||
      chainName === ChainBackendNames.COREUM ||
      chainName === ChainBackendNames.INJECTIVE
    ) {
      return null;
    }

    const rpcEndpoint = get(
      globalContext.globalState.rpcEndpoints,
      chainName,
    )?.primary;
    if (!rpcEndpoint) return null;

    switch (chainName) {
      case ChainBackendNames.ETH:
      case ChainBackendNames.POLYGON:
      case ChainBackendNames.BSC:
      case ChainBackendNames.OPTIMISM:
      case ChainBackendNames.ARBITRUM:
      case ChainBackendNames.AVALANCHE:
      case ChainBackendNames.BASE:
      case ChainBackendNames.ZKSYNC_ERA:
        return {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: getChainIdHex(chainName),
          rpcTarget: rpcEndpoint,
          displayName: getDisplayName(chainName),
          blockExplorerUrl: getBlockExplorer(chainName),
          ticker: getTicker(chainName),
          tickerName: getTickerName(chainName),
        };
      case ChainBackendNames.SOLANA:
        return {
          chainNamespace: CHAIN_NAMESPACES.SOLANA,
          chainId: '0x1',
          rpcTarget: rpcEndpoint,
          displayName: 'Solana Mainnet',
          blockExplorerUrl: 'https://explorer.solana.com',
          ticker: 'SOL',
          tickerName: 'Solana',
          logo: 'https://images.toruswallet.io/solana.svg',
        };
      default:
        return null;
    }
  };

  const getChainIdHex = (chainName: ChainBackendNames): string => {
    const chainIds: Record<
      Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>,
      string
    > = {
      [ChainBackendNames.ETH]: '0x1',
      [ChainBackendNames.POLYGON]: '0x89',
      [ChainBackendNames.BSC]: '0x38',
      [ChainBackendNames.OPTIMISM]: '0xA',
      [ChainBackendNames.ARBITRUM]: '0xA4B1',
      [ChainBackendNames.AVALANCHE]: '0xA86A',
      [ChainBackendNames.BASE]: '0x2105',
      [ChainBackendNames.SOLANA]: '0x1',
      [ChainBackendNames.ZKSYNC_ERA]: '0x144',
    };
    return (
      chainIds[
        chainName as Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>
      ] || '0x1'
    );
  };

  const getDisplayName = (chainName: ChainBackendNames): string => {
    const displayNames: Record<
      Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>,
      string
    > = {
      [ChainBackendNames.ETH]: 'Ethereum Mainnet',
      [ChainBackendNames.POLYGON]: 'Polygon Mainnet',
      [ChainBackendNames.BSC]: 'BNB Smart Chain',
      [ChainBackendNames.OPTIMISM]: 'Optimism Mainnet',
      [ChainBackendNames.ARBITRUM]: 'Arbitrum Mainnet',
      [ChainBackendNames.AVALANCHE]: 'Avalanche C-Chain Mainnet',
      [ChainBackendNames.BASE]: 'Base',
      [ChainBackendNames.SOLANA]: 'Solana',
      [ChainBackendNames.ZKSYNC_ERA]: 'zkSync Era',
    };
    return (
      displayNames[
        chainName as Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>
      ] || chainName
    );
  };

  const getBlockExplorer = (chainName: ChainBackendNames): string => {
    const explorers: Record<
      Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>,
      string
    > = {
      [ChainBackendNames.ETH]: 'https://etherscan.io',
      [ChainBackendNames.POLYGON]: 'https://polygonscan.com',
      [ChainBackendNames.BSC]: 'https://bscscan.com',
      [ChainBackendNames.OPTIMISM]: 'https://optimistic.etherscan.io',
      [ChainBackendNames.ARBITRUM]: 'https://arbiscan.io',
      [ChainBackendNames.AVALANCHE]: 'https://subnets.avax.network/c-chain',
      [ChainBackendNames.BASE]: 'https://basescan.org',
      [ChainBackendNames.SOLANA]: 'https://explorer.solana.com',
      [ChainBackendNames.ZKSYNC_ERA]: 'https://explorer.zksync.io',
    };
    return (
      explorers[
        chainName as Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>
      ] || ''
    );
  };

  const getTicker = (chainName: ChainBackendNames): string => {
    const tickers: Record<
      Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>,
      string
    > = {
      [ChainBackendNames.ETH]: 'ETH',
      [ChainBackendNames.POLYGON]: 'MATIC',
      [ChainBackendNames.BSC]: 'BNB',
      [ChainBackendNames.OPTIMISM]: 'ETH',
      [ChainBackendNames.ARBITRUM]: 'AETH',
      [ChainBackendNames.AVALANCHE]: 'AVAX',
      [ChainBackendNames.BASE]: 'ETH',
      [ChainBackendNames.SOLANA]: 'SOL',
      [ChainBackendNames.ZKSYNC_ERA]: 'ETH',
    };
    return (
      tickers[
        chainName as Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>
      ] || 'ETH'
    );
  };

  const getTickerName = (chainName: ChainBackendNames): string => {
    const tickerNames: Record<
      Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>,
      string
    > = {
      [ChainBackendNames.ETH]: 'ETH',
      [ChainBackendNames.POLYGON]: 'MATIC',
      [ChainBackendNames.BSC]: 'BNB',
      [ChainBackendNames.OPTIMISM]: 'ETH',
      [ChainBackendNames.ARBITRUM]: 'AETH',
      [ChainBackendNames.AVALANCHE]: 'AVAX',
      [ChainBackendNames.BASE]: 'ETH',
      [ChainBackendNames.SOLANA]: 'SOL',
      [ChainBackendNames.ZKSYNC_ERA]: 'ETH',
    };
    return (
      tickerNames[
        chainName as Exclude<SupportedChains, ChainBackendNames.HYPERLIQUID>
      ] || 'ETH'
    );
  };

  const baseChainConfig = getChainConfig(ChainBackendNames.BASE);
  const solanaChainConfig = getChainConfig(ChainBackendNames.SOLANA);

  if (!baseChainConfig || !solanaChainConfig) {
    throw new Error('Failed to initialize chain configurations');
  }

  const mfaSettings = {
    socialBackupFactor: {
      enable: true,
      priority: 1,
      mandatory: true,
    },

    passkeysFactor: {
      enable: true,
      priority: 2,
      mandatory: false,
    },

    deviceShareFactor: {
      enable: true,
      priority: 3,
      mandatory: false,
    },
    authenticatorFactor: {
      enable: true,
      priority: 4,
      mandatory: false,
    },
    backUpShareFactor: {
      enable: true,
      priority: 5,
      mandatory: false,
    },
    passwordFactor: {
      enable: false,
      priority: 6,
      mandatory: false,
    },
  };
  const { web3AuthEvm, web3AuthSolana } = useMemo(() => {
    const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
      config: { chainConfig: baseChainConfig },
    });
    const solanaPrivateKeyProvider = new SolanaPrivateKeyProvider({
      config: { chainConfig: solanaChainConfig },
    });

    return {
      web3AuthEvm: new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        redirectUrl,
        network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
        privateKeyProvider: ethereumPrivateKeyProvider,
        sessionTime: 30 * 24 * 60 * 60,
        mfaSettings,
      }),
      web3AuthSolana: new Web3Auth(WebBrowser, EncryptedStorage, {
        clientId,
        redirectUrl,
        network: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
        privateKeyProvider: solanaPrivateKeyProvider,
        sessionTime: 30 * 24 * 60 * 60,
        mfaSettings,
      }),
    };
  }, [baseChainConfig, solanaChainConfig, clientId, redirectUrl]);

  return {
    web3AuthEvm,
    web3AuthSolana,
  };
}
