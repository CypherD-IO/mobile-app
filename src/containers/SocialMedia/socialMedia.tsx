import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { CyDView } from '../../styles/tailwindStyles';
import WebView from 'react-native-webview';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';

interface RouteParams {
  uri: string;
  title: string;
}
export default function SocialMediaScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { uri } = route.params;

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

  return (
    <CyDView className={'h-full w-full bg-n20'}>
      <WebView source={{ uri }} />
    </CyDView>
  );
}
