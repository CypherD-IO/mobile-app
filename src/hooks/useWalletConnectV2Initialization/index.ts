import { useState, useCallback, useEffect } from 'react';
import { createWeb3Wallet } from '../../core/walletConnectV2Utils';
import useAxios from '../../core/HttpRequest';
import * as Sentry from '@sentry/react-native';

export default function useWalletConnectV2Initialization () {
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
    if (!initialized) {
      void onInitialize();
    }
    // if (prevRelayerURLValue.current !== relayerRegionURL) {
    //   setInitialized(false);
    //   onInitialize();
    // }
  }, [initialized, onInitialize]);

  return initialized;
}
