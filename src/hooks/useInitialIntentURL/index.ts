import React, { useState, useEffect } from 'react';
import { Linking } from 'react-native';

export default function useInitialIntentURL() {
  const [url, setUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(true);

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      setUrl(initialUrl);
      setProcessing(false);
    };

    const handleOpenURL = ({ url }: { url: string }) => {
      setUrl(url);
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
