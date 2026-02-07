import { useState, useCallback, useEffect, useContext } from 'react';
import { createWeb3Wallet } from '../../core/walletConnectV2Utils';
import useAxios from '../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import { GlobalContext } from '../../core/globalContext';
import { wcDebug, wcError } from '../../core/walletConnectDebug';

export default function useWalletConnectV2Initialization () {
  const globalContext = useContext<any>(GlobalContext);
  const [initialized, setInitialized] = useState(false);
  const { getWithAuth } = useAxios();
  // const prevRelayerURLValue = useRef<string>('')

  // const { relayerRegionURL } = useSnapshot(SettingsStore.state)

  const onInitialize = useCallback(async () => {
    try {
      wcDebug('WalletKit', 'Fetching WalletConnect creds from backend');
      const resp = await getWithAuth('/v1/authentication/creds/wc');
      if (!resp.isError) {
        const { data } = resp;
        const { projectId } = data;
        if (projectId && projectId !== '') {
          wcDebug('WalletKit', 'Initializing WalletKit from backend projectId', {
            projectIdSuffix: String(projectId).slice(-6),
          });
          await createWeb3Wallet(projectId);
          setInitialized(true);
        } else {
          wcError('WalletKit', 'Backend returned empty WalletConnect projectId');
        }
      } else {
        wcError('WalletKit', 'Failed to fetch WalletConnect creds', resp as any);
      }
    } catch (err: unknown) {
      wcError('WalletKit', 'Exception during WalletConnect init', err as any);
      Sentry.captureException(err);
    }
  }, []);

  useEffect(() => {
    if (!initialized && globalContext.globalState.token) {
      void onInitialize();
    }
    // if (prevRelayerURLValue.current !== relayerRegionURL) {
    //   setInitialized(false);
    //   onInitialize();
    // }
  }, [initialized, onInitialize, globalContext.globalState.token]);

  return initialized;
}
