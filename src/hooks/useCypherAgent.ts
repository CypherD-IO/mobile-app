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

const AGENT_BASE_URL = 'https://app.cypherhq.io/#/agent';

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
      if (resp.isError) {
        Sentry.captureMessage(
          '[CypherAgent] Failed to fetch injectedWeb3 checksum from server',
          {
            level: 'error',
            extra: {
              cdnUrl: INJECTED_WEB3_CDN,
              hashForInjectedWeb3,
            },
          },
        );
        return;
      }
      const { hash: hashFromServerForInjectedWeb3 } = resp.data;
      if (hashForInjectedWeb3 !== hashFromServerForInjectedWeb3) {
        Sentry.captureMessage(
          '[CypherAgent] Injected Web3 checksum mismatch',
          {
            level: 'error',
            extra: {
              cdnUrl: INJECTED_WEB3_CDN,
              hashForInjectedWeb3,
              hashFromServerForInjectedWeb3,
            },
          },
        );
        return;
      }
      setCdnInjectedCode(response.data);
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

      const websiteInfo = {
        host: 'app.cypherhq.io',
        title: 'Cypher Agent',
        origin: 'https://app.cypherhq.io',
        url: agentUrl,
      };

      // Auto-approve account and permission requests for our own agent
      // (no permission popup). Returns true if a reply was posted so the
      // caller can short-circuit further handling.
      const handleAutoApprovalMethods = (
        method: string | undefined,
        id: string | number | undefined,
      ): boolean => {
        if (
          method === Web3Method.REQUEST_ACCOUNTS ||
          method === Web3Method.ACCOUNTS
        ) {
          webviewRef.current?.postMessage(
            JSON.stringify({
              id,
              type: CommunicationEvents.WEB3,
              result: [ethereumAddress],
            }),
          );
          return true;
        }
        if (method === Web3Method.WALLET_PUSH_PERRMISSION) {
          webviewRef.current?.postMessage(
            JSON.stringify({
              id,
              type: CommunicationEvents.WEB3,
              result: WALLET_PERMISSIONS.ALLOW,
            }),
          );
          return true;
        }
        return false;
      };

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

          if (handleAutoApprovalMethods(payload.method, payload.id)) {
            break;
          }

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
            if (handleAutoApprovalMethods(jsonObj.method, jsonObj.id)) {
              break;
            }

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
