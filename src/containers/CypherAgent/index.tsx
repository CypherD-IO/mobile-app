import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Sentry from '@sentry/react-native';
import {
  CyDSafeAreaView,
  CyDView,
} from '../../styles/tailwindComponents';
import useCypherAgent from '../../hooks/useCypherAgent';
import AgentLoadingSparkle from './AgentLoadingSkeleton';
import AgentErrorState from './AgentErrorState';

const TAB_BAR_HEIGHT = Platform.OS === 'android' ? 65 : 50;

// NOTE: Cypher Agent screen is intentionally forced to a dark theme so the
// transition between the native shell and the dApp WebView feels seamless.
// Hex colors are pinned (not driven by theme variables) so the agent surface
// stays dark regardless of the user's app-wide theme preference.
const AGENT_DARK_BG = '#0D0D0D';

const styles = StyleSheet.create({
  webview: { backgroundColor: AGENT_DARK_BG },
  webviewContainer: { paddingBottom: TAB_BAR_HEIGHT },
});

export default function CypherAgentScreen() {
  const {
    agentUrl,
    webviewRef,
    isLoading,
    setIsLoading,
    error,
    setError,
    injectedCode,
    onWebviewMessage,
    retryLoad,
  } = useCypherAgent();

  return (
    <CyDSafeAreaView className='flex-1 bg-[#0D0D0D]' edges={['top']}>
      <StatusBar barStyle='light-content' />
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <CyDView
          className='flex-1 bg-[#0D0D0D]'
          style={styles.webviewContainer}>
          {isLoading && !error ? <AgentLoadingSparkle /> : null}
          {error ? <AgentErrorState onRetry={retryLoad} /> : null}
          <WebView
            ref={webviewRef}
            source={{ uri: agentUrl }}
            injectedJavaScriptBeforeContentLoaded={injectedCode}
            onLoadStart={() => {
              setIsLoading(true);
              setError(null);
            }}
            onLoadEnd={() => {
              setIsLoading(false);
            }}
            onError={syntheticEvent => {
              const { description } = syntheticEvent.nativeEvent;
              setError(description || 'Failed to load');
              setIsLoading(false);
            }}
            onHttpError={syntheticEvent => {
              const { statusCode, url } = syntheticEvent.nativeEvent;
              const httpError = new Error(
                `HTTP Error ${statusCode} ${url}`,
              );
              Sentry.captureException(httpError, {
                extra: {
                  statusCode,
                  url,
                  nativeEvent: syntheticEvent.nativeEvent,
                },
              });
            }}
            onMessage={onWebviewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={true}
            bounces={false}
            overScrollMode='never'
            scrollEnabled={true}
            allowsBackForwardNavigationGestures={false}
            mediaPlaybackRequiresUserAction={true}
            automaticallyAdjustContentInsets={true}
            startInLoadingState={false}
            style={styles.webview}
          />
        </CyDView>
      </KeyboardAvoidingView>
    </CyDSafeAreaView>
  );
}
