import React from 'react';
import { CyDView } from '../../styles/tailwindStyles';
import WebView from 'react-native-webview';
import { BackHandler } from 'react-native';

const uri = 'https://cypherwallet.io/legal/';

export default function LegalScreen ({ navigation }) {
  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);
  return (
      <CyDView className={'h-full w-full'}>
          <WebView
              source={{ uri }}
          />
      </CyDView>
  );
}
