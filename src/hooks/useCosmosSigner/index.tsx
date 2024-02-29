import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import { getSignerClient } from '../../core/Keychain';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { useContext } from 'react';
import { HdWalletContext } from '../../core/util';
import { ChainBackendNames } from '../../constants/server';
import { get } from 'lodash';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';

export default function useCosmosSigner() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalStateContext = useContext(GlobalContext) as GlobalContextDef;
  const getCosmosSignerClient = async (chainName: string) => {
    const wallets: Map<string, OfflineDirectSigner> =
      await getSignerClient(hdWalletContext);
    return wallets.get(cosmosConfig[chainName].prefix);
  };

  const getCosmosRpc = (chainBackendName: ChainBackendNames) => {
    return (
      get(globalStateContext.globalState.rpcEndpoints, chainBackendName)
        ?.primary ?? ''
    );
  };

  return { getCosmosSignerClient, getCosmosRpc };
}
