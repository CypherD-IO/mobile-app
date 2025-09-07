import React from 'react';
import { CyDSafeAreaView, CyDView } from '../../styles/tailwindComponents';
import WebView from 'react-native-webview';
import { BackHandler } from 'react-native';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import PageHeader from '../../components/PageHeader';
import { t } from 'i18next';

const uri = 'https://cypherhq.io/legal?redirect=true';

export default function LegalScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  React.useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);
  return (
    <CyDSafeAreaView className='bg-n0 flex-1' edges={['top']}>
      <PageHeader title={t('TERMS_AND_CONDITIONS')} navigation={navigation} />
      <CyDView className='flex-1 bg-n20'>
        <CyDView className={'h-full w-full bg-n20'}>
          <WebView source={{ uri }} backgroundColor={'transparent'} />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
