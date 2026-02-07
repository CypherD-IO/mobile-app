import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { wcDebug } from '../../core/walletConnectDebug';

export default function useInitialIntentURL() {
  const [url, setUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(true);

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      setUrl(initialUrl);
      setProcessing(false);
      wcDebug('DeepLink', 'Initial URL resolved', { initialUrl });
    };

    const handleOpenURL = ({ url }: { url: string }) => {
      setUrl(url);
      wcDebug('DeepLink', 'Received URL event', { url });
    };

    const subscription = Linking.addListener('url', handleOpenURL);

    void getUrlAsync();

    return () => {
      subscription.remove();
    };
  }, []);

  const updateUrl = (newUrl: string) => {
    setUrl(newUrl);
  };

  return { url, processing, updateUrl };
}
