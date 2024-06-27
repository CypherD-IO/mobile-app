import React, { useContext, useEffect, useRef, useState } from 'react';
import { WalletConnectListener } from '../walletConnectListener';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  avalanche,
  fantom,
  bsc,
  evmos,
  zkSync,
  base,
  polygonZkEvm,
  aurora,
  moonbeam,
  moonriver,
} from 'viem/chains';
import {
  createWeb3Modal,
  defaultWagmiConfig,
} from '@web3modal/wagmi-react-native';
import { Config } from 'react-native-config';
import { getConnectionType } from '../../core/asyncStorage';
import { ConnectionTypes } from '../../constants/enum';
import Loading from '../v2/loading';
import {
  HdWalletContext,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';

export const WagmiConfigBuilder: React.FC = ({ children }) => {
  const [wagmiConfig, setWagmiConfig] = useState();
  const hdWalletContext = useContext<any>(HdWalletContext);
  const projectId = String(Config.WALLET_CONNECT_PROJECTID);
  const { ethereum } = hdWalletContext.state.wallet;
  const enableWalletConnectRef = useRef(true);
  const metadata = {
    name: 'Cypher Wallet',
    description: 'Cypher Wallet',
    url: 'https://cypherwallet.io',
    icons: ['https://avatars.githubusercontent.com/u/37784886'],
    redirect: {
      native: 'cypherwallet://',
      universal: 'YOUR_APP_UNIVERSAL_LINK.com',
    },
  };

  const chains = [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    avalanche,
    fantom,
    bsc,
    evmos,
    zkSync,
    base,
    polygonZkEvm,
    aurora,
    moonbeam,
    moonriver,
  ];

  useEffect(() => {
    void buildWagmiConfig();
  }, [ethereum.address]);

  const buildWagmiConfig = async () => {
    const connectionType = await getConnectionType();
    if (
      !wagmiConfig ||
      enableWalletConnectRef.current !==
        (ethereum.address === undefined ||
          ethereum.address === _NO_CYPHERD_CREDENTIAL_AVAILABLE_ ||
          connectionType === ConnectionTypes.WALLET_CONNECT)
    ) {
      if (wagmiConfig) {
        enableWalletConnectRef.current = !enableWalletConnectRef.current;
      }
      const tempWagmiConfig = defaultWagmiConfig({
        chains,
        projectId,
        enableWalletConnect: enableWalletConnectRef.current,
        metadata,
      });
      createWeb3Modal({
        projectId,
        chains,
        wagmiConfig: tempWagmiConfig,
      });
      setWagmiConfig(tempWagmiConfig);
    }
  };

  //   const walletConnectConnector = new WalletConnectConnector({
  //     chains,
  //     options: { projectId, showQrModal: false, metadata },
  //   });

  //   const { publicClient } = configureChains(chains, [
  //     walletConnectProvider({ projectId }),
  //     publicProvider(),
  //   ]);

  //   const wagmiConfig = createConfig({
  //     autoConnect: true,
  //     connectors: [walletConnectConnector],
  //     publicClient,
  //   });
  const queryClient = new QueryClient();
  // console.log('.... wagmiConfig : ', wagmiConfig);
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
