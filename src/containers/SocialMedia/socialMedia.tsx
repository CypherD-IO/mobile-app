import React, { useEffect, useLayoutEffect } from 'react';
import { BackHandler } from 'react-native';
import { CyDView } from '../../styles/tailwindStyles';
import WebView from 'react-native-webview';

export default function SocialMediaScreen(props: {
  route: {
    params: {
      uri: string;
      title: string;
    };
  };
  navigation: {
    goBack: () => void;
    setOptions: ({ title }: { title: string }) => void;
  };
}) {
  const { route, navigation } = props;
  const { uri, title } = route.params;

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
    });
  }, []);

  return (
    <CyDView className={'h-full w-full'}>
      <WebView source={{ uri }} />
    </CyDView>
  );
}
