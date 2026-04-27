import React, { useCallback, useEffect, useRef } from 'react';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { t } from 'i18next';
import WebView from 'react-native-webview';
import { CyDSafeAreaView, CyDView } from '../../styles/tailwindComponents';
import PageHeader from '../../components/PageHeader';
import Loading from '../../components/v2/loading';
import useBlindPayApi from './api';
import { extractTermsIdFromUrl } from './tosUrl';
import { replaceWithBlindPayKycStack } from './navigateToBlindPayKyc';
import { showToast } from '../../containers/utilities/toastUtility';

/**
 * After accept, BlindPay must redirect the WebView to your `redirect_url` with `tos_id` (15 chars)
 * in the query string. If you never see that navigation, the backend likely did not pass
 * `redirect_url` into BlindPay’s TOS initiate call (only opening app.blindpay.com/… is not enough).
 */

export interface BlindPayTosWebViewParams {
  url: string;
  idempotencyKey?: string;
}

export default function BlindPayTosWebViewScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, BlindPayTosWebViewParams>, string>>();
  const { url } = route.params ?? { url: '' };
  const { completeTerms } = useBlindPayApi();
  const completingRef = useRef(false);
  const completeTermsRef = useRef(completeTerms);
  completeTermsRef.current = completeTerms;

  const finalizeTerms = useCallback(
    async (termsId: string) => {
      if (completingRef.current) {
        return;
      }
      completingRef.current = true;
      const result = await completeTermsRef.current(termsId);
      if (result.isError) {
        completingRef.current = false;
        showToast(
          typeof result.errorMessage === 'string'
            ? result.errorMessage
            : t('UNEXPECTED_ERROR', 'Something went wrong'),
          'error',
        );
        return;
      }
      showToast(
        t(
          'BLINDPAY_TOS_COMPLETE',
          'Terms accepted. Continue with verification.',
        ),
      );
      queueMicrotask(() => {
        replaceWithBlindPayKycStack(navigation);
      });
    },
    [navigation],
  );

  const tryCompleteFromUrl = useCallback(
    (currentUrl: string) => {
      const termsId = extractTermsIdFromUrl(currentUrl);
      if (termsId) {
        finalizeTerms(termsId).catch(() => undefined);
      }
    },
    [finalizeTerms],
  );

  // If url is missing, surface an error and navigate back instead of leaving a blank screen
  useEffect(() => {
    if (!url) {
      showToast(
        String(t('BLINDPAY_TOS_URL_MISSING', 'Terms URL is unavailable. Please try again.')),
        'error',
      );
      navigation.goBack();
    }
  }, [url, navigation]);

  if (!url) {
    return null;
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <PageHeader title='TERMS_AND_CONDITIONS' navigation={navigation} />
      <CyDView className='flex-1 bg-n20'>
        <WebView
          source={{ uri: url }}
          renderLoading={() => <Loading />}
          startInLoadingState
          onNavigationStateChange={nav => tryCompleteFromUrl(nav.url)}
          onShouldStartLoadWithRequest={request => {
            tryCompleteFromUrl(request.url);
            return true;
          }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
