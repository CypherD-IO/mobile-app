import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { CyDSafeAreaView, CyDView } from '../../styles/tailwindComponents';
import WebView from 'react-native-webview';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Loading from '../../components/v2/loading';
import PageHeader from '../../components/PageHeader';

interface RouteParams {
  uri: string;
  title: string;
}

/**
 * SocialMediaScreen Component
 * Displays external web content in a webview with proper media playback controls
 */
export default function SocialMediaScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { uri } = route.params;
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Handles hardware back button press on Android
   * @returns {boolean} true to prevent default back behavior
   */
  const handleBackButton = (): boolean => {
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
    <CyDSafeAreaView className='bg-n0 flex-1' edges={['top']}>
      <PageHeader title={''} navigation={navigation} />
      <CyDView className='flex-1 bg-n20'>
        {isLoading && <Loading />}
        <WebView
          source={{ uri }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          renderLoading={() => {
            return <Loading />;
          }}
          // Media playback configuration
          allowsInlineMediaPlayback={true} // Prevents videos from auto-fullscreen on iOS
          mediaPlaybackRequiresUserAction={false} // Allows autoplay if needed
          javaScriptEnabled={true} // Required for video player controls
          domStorageEnabled={true} // Required for HTML5 video storage
          // Additional settings for better video experience
          allowsFullscreenVideo={false} // Disables fullscreen video button
          allowsProtectedMedia={true} // Allows DRM protected content if needed
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
