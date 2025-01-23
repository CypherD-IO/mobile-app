/**
 * @format
 * @flow
 */
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { INJECTED_WEB3_CDN } from '../constants/data';
import { Web3Origin } from '../constants/enum';
import { CommunicationEvents } from '../constants/web3';
import useWeb3 from '../hooks/useWeb3';
import { WebsiteInfo } from '../types/Browser';
import Loading from './v2/loading';

interface WebScreenProps {
  websiteInfo: WebsiteInfo;
  origin: Web3Origin;
  url: string;
}

const webviewStyles = { marginTop: 0 };

export default function WebScreen({
  websiteInfo,
  origin,
  url,
}: WebScreenProps) {
  const [injectedCode, setInjectedCode] = useState('');
  const [handleWeb3, handleWeb3Cosmos] = useWeb3(origin);
  const webviewRef = useRef<any>(null);

  async function onWebviewMessage(event: WebViewMessageEvent) {
    const jsonObj = JSON.parse(event.nativeEvent.data);
    const { type } = jsonObj;

    if (type === CommunicationEvents.WEB3) {
      const { payload } = jsonObj;
      const response = await handleWeb3(jsonObj.payload, websiteInfo);
      webviewRef.current.postMessage(
        JSON.stringify({
          id: payload.id,
          type: CommunicationEvents.WEB3,
          ...response,
        }),
      );
    } else if (type === CommunicationEvents.WEB3COSMOS) {
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

  useEffect(() => {
    void axios.get(INJECTED_WEB3_CDN).then(r => setInjectedCode(r.data));
  }, []);

  return (
    <WebView
      injectedJavaScriptBeforeContentLoaded={injectedCode}
      ref={webviewRef}
      source={{ uri: url }}
      style={webviewStyles}
      onMessage={onWebviewMessage}
      renderLoading={() => {
        return <Loading />;
      }}
    />
  );
}
