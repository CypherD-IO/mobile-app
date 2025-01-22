/**
 * @format
 * @flow
 */
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import WebView from 'react-native-webview';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDTouchView,
} from '../../styles/tailwindStyles';
const { DynamicImage } = require('../../styles');

interface RouteParams {
  url: string;
}
export default function OpenLegalScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎

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
  // set a cookie
  return (
    <CyDSafeAreaView className='bg-n20'>
      <WebView
        source={{
          uri: route.params.url,
          headers: {
            Cookie: 'native_card_token=asdf; native_card_id=dfasdfdas',
          },
        }}
        sharedCookiesEnabled={true}
      />
      <CyDTouchView
        sentry-label='legal-back'
        className='absolute top-[50px] left-[30px]'
        onPress={() => navigation.goBack()}>
        <CyDIcons name='arrow-left' size={24} className='text-base400' />
      </CyDTouchView>
    </CyDSafeAreaView>
  );
}
