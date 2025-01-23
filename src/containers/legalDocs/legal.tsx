import React from 'react';
import { CyDView } from '../../styles/tailwindStyles';
import WebView from 'react-native-webview';
import { BackHandler } from 'react-native';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';

const uri = 'https://cypherhq.io/legal?redirect=true';

export default function LegalScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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
    <CyDView className={'h-full w-full bg-n20'}>
      <WebView source={{ uri }} backgroundColor={'transparent'} />
    </CyDView>
  );
}
