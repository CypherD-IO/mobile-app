import { useContext } from 'react';
import { HdWalletContext } from '../../core/util';
import { GlobalContext } from '../../core/globalContext';
import { getSolanaWallet } from '../../core/Keychain';
import { ChainBackendNames } from '../../constants/server';
import { get } from 'lodash';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

export default function useSolanaSigner() {
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const globalStateContext = useContext(GlobalContext);

  const getSolanWallet = async () => {
    const wallet = await getSolanaWallet(hdWalletContext);
    return wallet;
  };

  const getSolanaRpc = (getSecondary = false) => {
    if (globalStateContext)
      return (
        get(
          globalStateContext.globalState.rpcEndpoints,
          ChainBackendNames.SOLANA,
        )?.primary ?? ''
      );
    else return '';
  };

  return { getSolanWallet, getSolanaRpc };
}
