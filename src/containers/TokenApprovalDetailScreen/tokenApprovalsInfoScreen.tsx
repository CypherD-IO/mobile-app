/**
 * @format
 * @flow
 */
import React from 'react';
import { WebView } from 'react-native-webview';
const {
  SafeAreaView,
  DynamicView
} = require('../../styles');

interface TokenApprovalsInfoScreenProps {
  route: any
}

export default function TokenApprovalsInfoScreen ({ route }: TokenApprovalsInfoScreenProps) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { url } = route.params;

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <SafeAreaView dynamic>
      <DynamicView dynamic dynamicHeight height={100} fD={'row'} mH={15}>
        <WebView
          source={{ uri: url }}
          style={{ marginTop: 0 }}
        />
      </DynamicView>
    </SafeAreaView>
  );
}
