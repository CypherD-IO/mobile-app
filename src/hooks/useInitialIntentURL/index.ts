import React, { useState, useEffect, useContext } from 'react';
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

    const handleOpenURL = (url: string) => {
      setUrl(url);
    };

    Linking.addEventListener('url', handleOpenURL);

    void getUrlAsync();

    return () => {
      Linking.removeEventListener('url');
    };
  }, []);

  return { url, processing };
}
