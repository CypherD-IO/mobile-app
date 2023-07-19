import { useState, useCallback, useEffect, useContext } from 'react';
import { createWeb3Wallet } from '../../core/walletConnectV2Utils';
import useAxios from '../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';
import { GlobalContext } from '../../core/globalContext';

export default function useWalletConnectV2Initialization () {
  const globalContext = useContext<any>(GlobalContext);
  const [initialized, setInitialized] = useState(false);
  const { getWithAuth } = useAxios();
  // const prevRelayerURLValue = useRef<string>('')

  // const { relayerRegionURL } = useSnapshot(SettingsStore.state)

  const onInitialize = useCallback(async () => {
    try {
      const resp = await getWithAuth('/v1/authentication/creds/wc');
      if (!resp.isError) {
        const { data } = resp;
        const { projectId } = data;
        if (projectId && projectId !== '') {
          await createWeb3Wallet(projectId);
          setInitialized(true);
        }
      }
    } catch (err: unknown) {
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
