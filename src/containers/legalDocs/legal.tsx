import React from 'react';
import { CyDView } from '../../styles/tailwindStyles';
import WebView from 'react-native-webview';

const uri = 'https://cypherwallet.io/legal/';

export default function LegalScreen () {
  return (
      <CyDView className={'h-full w-full'}>
          <WebView
              source={{ uri }}
          />
      </CyDView>
  );
}
