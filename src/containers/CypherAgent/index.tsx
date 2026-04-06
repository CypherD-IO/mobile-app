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

const styles = StyleSheet.create({
  webview: { backgroundColor: '#0D0D0D' },
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

  console.log('[CypherAgent] WebView URL:', agentUrl);

  return (
    <CyDSafeAreaView className='flex-1 bg-[#0D0D0D]' edges={['top']}>
      <StatusBar barStyle='light-content' />
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <CyDView className='flex-1 bg-[#0D0D0D]' style={styles.webviewContainer}>
          {isLoading && !error && <AgentLoadingSparkle />}
          {error && <AgentErrorState onRetry={retryLoad} />}
          <WebView
            ref={webviewRef}
            source={{ uri: agentUrl }}
            injectedJavaScriptBeforeContentLoaded={injectedCode}
            onLoadStart={({ nativeEvent }) => {
              console.log('[CypherAgent] onLoadStart:', nativeEvent.url);
              setIsLoading(true);
              setError(null);
            }}
            onLoadEnd={({ nativeEvent }) => {
              console.log('[CypherAgent] onLoadEnd:', nativeEvent.url);
              setIsLoading(false);
            }}
            onLoad={({ nativeEvent }) => {
              console.log(
                '[CypherAgent] onLoad - page rendered:',
                nativeEvent.url,
                'title:',
                nativeEvent.title,
              );
            }}
            onError={syntheticEvent => {
              const { code, description, url } = syntheticEvent.nativeEvent;
              console.log(
                '[CypherAgent] onError:',
                code,
                description,
                url,
              );
              setError(description || 'Failed to load');
              setIsLoading(false);
            }}
            onHttpError={syntheticEvent => {
              console.log(
                '[CypherAgent] onHttpError:',
                syntheticEvent.nativeEvent.statusCode,
                syntheticEvent.nativeEvent.url,
              );
              Sentry.captureException(syntheticEvent);
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
