import { useContext, useEffect, useMemo, useState } from 'react';
import { Chain, ALL_CHAINS } from '../../constants/server';
import { ConnectionTypes } from '../../constants/enum';
import * as Sentry from '@sentry/react-native';
import { HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { getConnectionType } from '../../core/asyncStorage';

export default function useSupportedChains() {
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { state: hdWalletState } = hdWalletContext;
  const { wallet } = hdWalletState;
  const [connectionType, setConnectionType] = useState<ConnectionTypes | null>(
    ConnectionTypes.SEED_PHRASE,
  );

  const setConnectionTypeValue = async () => {
    const _connectionType = await getConnectionType();
    setConnectionType(_connectionType as ConnectionTypes);
  };

  useEffect(() => {
    void setConnectionTypeValue();
  }, []);

  const supportedChains = useMemo(() => {
    try {
      // Filter chains based on available addresses in the wallet
      return ALL_CHAINS.filter(chain => {
        // Check if the chain has a corresponding address in the wallet
        const chainAddress = wallet[chain.chainName]?.address;
        return chainAddress !== undefined && chainAddress !== '';
      });
    } catch (error) {
      Sentry.captureException(error);
      return [];
    }
  }, [wallet]);

  const validateChainSupport = (chain: Chain) => {
    const isSupported = supportedChains.some(
      supportedChain => supportedChain.chain_id === chain.chain_id,
    );

    if (!isSupported) {
      let errorMessage = `${chain.name} is not available`;

      // Specific message based on connection type
      if (connectionType === ConnectionTypes.WALLET_CONNECT) {
        errorMessage += ' as you have connected using WalletConnect';
      } else if (connectionType === ConnectionTypes.PRIVATE_KEY) {
        errorMessage +=
          ' as you have imported the wallet using Ethereum private key';
      }

      errorMessage +=
        '. Please import your Seed-Phrase to access the funds in ' + chain.name;

      return { errorMessage, isSupported };
    }

    return { errorMessage: '', isSupported: true };
  };

  return {
    supportedChains,
    validateChainSupport,
    connectionType,
  };
}
