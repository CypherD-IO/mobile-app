import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { CyDView } from '../../styles/tailwindComponents';
import WebView from 'react-native-webview';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Loading from '../../components/v2/loading';

interface RouteParams {
  uri: string;
  title: string;
}
export default function SocialMediaScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { uri } = route.params;
  const [isLoading, setIsLoading] = useState(true);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  return (
    <CyDView className={'h-full w-full bg-n20'}>
      {isLoading && <Loading />}
      <WebView
        source={{ uri }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => {
          return <Loading />;
        }}
      />
    </CyDView>
  );
}
