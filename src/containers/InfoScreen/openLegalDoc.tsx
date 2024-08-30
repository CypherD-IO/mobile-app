/**
 * @format
 * @flow
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import WebView from 'react-native-webview';
import AppImages from '../../../assets/images/appImages';
const {
  SafeAreaView,
  DynamicView,
  DynamicImage,
  CText,
  DynamicTouchView,
} = require('../../styles');

export default function OpenLegalScreen(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const { route } = props;
  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎

  const handleBackButton = () => {
    props.navigation.goBack();
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
    <SafeAreaView dynamic>
      <WebView
        source={{
          uri: route.params.url,
          headers: {
            Cookie: 'native_card_token=asdf; native_card_id=dfasdfdas',
          },
        }}
        sharedCookiesEnabled={true}
      />
      <DynamicTouchView
        sentry-label='legal-back'
        dynamic
        style={{ position: 'absolute', top: 50, left: 30 }}
        onPress={() => props.navigation.goBack()}>
        <DynamicImage
          dynamic
          dynamicWidthFix
          mT={5}
          height={20}
          width={20}
          resizemode='contain'
          source={AppImages.BACK_ARROW_CIRCLE}
          style={{ tintColor: 'black' }}
        />
      </DynamicTouchView>
    </SafeAreaView>
  );
}
