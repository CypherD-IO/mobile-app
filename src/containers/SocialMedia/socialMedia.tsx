import React, { useEffect, useLayoutEffect } from 'react';
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
