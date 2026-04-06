import { useContext, useEffect, useRef, useState } from 'react';
import { WebViewMessageEvent } from 'react-native-webview';
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { get } from 'lodash';
import { INJECTED_WEB3_CDN } from '../constants/data';
import { Web3Origin } from '../constants/enum';
import { CommunicationEvents, Web3Method, WALLET_PERMISSIONS } from '../constants/web3';
import { CHAIN_ETH } from '../constants/server';
import { GlobalContext } from '../core/globalContext';
import { HdWalletContext } from '../core/util';
import useAxios from '../core/HttpRequest';
import useWeb3 from './useWeb3';
import { getInjectedJavascript } from '../containers/Browser/injectedJs';
import { AnalyticEvent, logAnalyticsToFirebase } from '../core/analytics';

// const AGENT_BASE_URL = 'https://app.cypherhq.io/#/agent';
   const AGENT_BASE_URL = 'http://localhost:3000/#/agent';

export default function useCypherAgent() {
  const hdWalletContext = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const { getWithAuth } = useAxios();

  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cdnInjectedCode, setCdnInjectedCode] = useState('');

  const ethereumAddress = get(
    hdWalletContext,
    'state.wallet.ethereum.address',
    '',
  );
  const selectedChain =
    hdWalletContext?.state?.selectedChain ?? CHAIN_ETH;
  const chainIdNumber = selectedChain.chainIdNumber ?? '0x1';

  const [handleWeb3, handleWeb3Cosmos] = useWeb3(Web3Origin.BROWSER);

  const sessionToken = globalContext?.globalState?.token ?? '';

  const agentUrl = sessionToken
    ? `${AGENT_BASE_URL}?sessionToken=${encodeURIComponent(sessionToken)}`
    : AGENT_BASE_URL;

  const injectWeb3FromCDN = async () => {
    try {
      const response = await axios.get(INJECTED_WEB3_CDN);
      const hash = CryptoJS.SHA256(response.data);
      const hashForInjectedWeb3 = hash.toString(CryptoJS.enc.Hex);
      const resp = await getWithAuth(
        '/v1/configuration/checksum/injectedWeb3',
      );
      if (!resp.isError) {
        const { data } = resp;
        const { hash: hashFromServerForInjectedWeb3 } = data;
        if (hashForInjectedWeb3 === hashFromServerForInjectedWeb3) {
          setCdnInjectedCode(response.data);
        }
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  useEffect(() => {
    void injectWeb3FromCDN();
  }, []);

  const combinedInjectedCode = cdnInjectedCode
    ? `${getInjectedJavascript(ethereumAddress, chainIdNumber)}\n${cdnInjectedCode}`
    : getInjectedJavascript(ethereumAddress, chainIdNumber);

  const onWebviewMessage = async (event: WebViewMessageEvent) => {
    try {
      const jsonObj = JSON.parse(event.nativeEvent.data);
      const { type } = jsonObj;

      console.log(
        '[CypherAgent] onMessage:',
        JSON.stringify({
          type,
          method: jsonObj.method,
          payloadMethod: jsonObj.payload?.method,
          id: jsonObj.id ?? jsonObj.payload?.id,
        }),
      );

      switch (type) {
        case CommunicationEvents.WEBINFO: {
          break;
        }
        case CommunicationEvents.ANALYTICS: {
          const { chain, payload } = jsonObj;
          logAnalyticsToFirebase(
            AnalyticEvent.WEB3_INSTANCE_UNDEFINED_PROPS,
            {
              ...payload,
              chain,
            },
          );
          break;
        }
        case CommunicationEvents.WEB3: {
          const { payload } = jsonObj;

          // Auto-approve for our own agent — no permission popup
          if (
            payload.method === Web3Method.REQUEST_ACCOUNTS ||
            payload.method === Web3Method.ACCOUNTS
          ) {
            webviewRef.current?.postMessage(
              JSON.stringify({
                id: payload.id,
                type: CommunicationEvents.WEB3,
                result: [ethereumAddress],
              }),
            );
            break;
          }
          if (payload.method === Web3Method.WALLET_PUSH_PERRMISSION) {
            webviewRef.current?.postMessage(
              JSON.stringify({
                id: payload.id,
                type: CommunicationEvents.WEB3,
                result: WALLET_PERMISSIONS.ALLOW,
              }),
            );
            break;
          }

          const websiteInfo = {
            host: 'app.cypherhq.io',
            title: 'Cypher Agent',
            origin: 'https://app.cypherhq.io',
            url: agentUrl,
          };
          const response = await handleWeb3(payload, websiteInfo);
          webviewRef.current?.postMessage(
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
          const websiteInfo = {
            host: 'app.cypherhq.io',
            title: 'Cypher Agent',
            origin: 'https://app.cypherhq.io',
            url: agentUrl,
          };
          const response = await handleWeb3Cosmos(jsonObj, websiteInfo);
          webviewRef.current?.postMessage(
            JSON.stringify({
              id,
              type: CommunicationEvents.WEB3COSMOS,
              method,
              result: response,
            }),
          );
          break;
        }
        default: {
          // Handle non-typed messages (direct Web3 RPC calls from injected provider)
          if (jsonObj.method) {
            // Auto-approve account and permission requests for our own agent
            if (
              jsonObj.method === Web3Method.REQUEST_ACCOUNTS ||
              jsonObj.method === Web3Method.ACCOUNTS
            ) {
              webviewRef.current?.postMessage(
                JSON.stringify({
                  id: jsonObj.id,
                  type: CommunicationEvents.WEB3,
                  result: [ethereumAddress],
                }),
              );
              break;
            }
            if (jsonObj.method === Web3Method.WALLET_PUSH_PERRMISSION) {
              webviewRef.current?.postMessage(
                JSON.stringify({
                  id: jsonObj.id,
                  type: CommunicationEvents.WEB3,
                  result: WALLET_PERMISSIONS.ALLOW,
                }),
              );
              break;
            }

            const websiteInfo = {
              host: 'app.cypherhq.io',
              title: 'Cypher Agent',
              origin: 'https://app.cypherhq.io',
              url: agentUrl,
            };
            const response = await handleWeb3(jsonObj, websiteInfo);
            webviewRef.current?.postMessage(
              JSON.stringify({
                id: jsonObj.id,
                type: CommunicationEvents.WEB3,
                ...response,
              }),
            );
          }
          break;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  };

  const retryLoad = () => {
    setError(null);
    setIsLoading(true);
    webviewRef.current?.reload();
  };

  return {
    agentUrl,
    webviewRef,
    isLoading,
    setIsLoading,
    error,
    setError,
    injectedCode: combinedInjectedCode,
    onWebviewMessage,
    retryLoad,
  };
}
