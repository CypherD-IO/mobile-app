/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable react-native/no-inline-styles */
/**
 * @format
 * @flow
 */
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Web3Origin } from '../../constants/enum';
import { CommunicationEvents } from '../../constants/web3';
import useWeb3 from '../../hooks/useWeb3';
import { WebsiteInfo } from '../../types/Browser';
const { SafeAreaView, DynamicView } = require('../../styles');

interface TransactionDetailProps {
  route: any;
  navigation: any;
}

const websiteInfo: WebsiteInfo = {
  title: '',
  host: '',
  origin: '',
  url: '',
};

export default function TransDetail({
  route,
  navigation,
}: TransactionDetailProps) {
  const { url } = route.params;
  const webviewRef = useRef<any>(null);

  const [injectedCode, setInjectedCode] = useState('');
  const [handleWeb3, handleWeb3Cosmos] = useWeb3(Web3Origin.BROWSER);
  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  async function onWebviewMessage(event: WebViewMessageEvent) {
    const jsonObj = JSON.parse(event.nativeEvent.data);
    const { type } = jsonObj;

    switch (type) {
      case CommunicationEvents.WEB3: {
        const { payload } = jsonObj;
        console.log('handleweb3 called in onWebviewmessage communication web3');

        const response = await handleWeb3(jsonObj.payload, websiteInfo);
        webviewRef.current.postMessage(
          JSON.stringify({
            id: payload.id,
            type: CommunicationEvents.WEB3,
            ...response,
          }),
        );
        break;
      }
      case CommunicationEvents.WEB3COSMOS: {
        const { id, method } = jsonObj;
        const response = await handleWeb3Cosmos(jsonObj, websiteInfo);
        webviewRef.current.postMessage(
          JSON.stringify({
            id,
            type: CommunicationEvents.WEB3COSMOS,
            method,
            result: response,
          }),
        );
      }
    }
  }

  useEffect(() => {
    const web3cdn = 'https://public.cypherd.io/js/injected.web3.js';
    void axios.get(web3cdn).then(r => setInjectedCode(r.data));
  }, []);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  return (
    <SafeAreaView dynamic>
      <DynamicView dynamic dynamicHeight height={100} fD={'row'} mH={15}>
        <WebView
          injectedJavaScriptBeforeContentLoaded={injectedCode}
          ref={webviewRef}
          source={{ uri: url }}
          style={{ marginTop: 0 }}
          onMessage={onWebviewMessage}
        />
      </DynamicView>
    </SafeAreaView>
  );
}
