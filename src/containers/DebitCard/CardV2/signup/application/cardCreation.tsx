import React, { useEffect, useState } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDSafeAreaView,
  CyDMaterialDesignIcons,
  CyDLottieView,
  CyDImage,
} from '../../../../../styles/tailwindComponents';
import { screenTitle } from '../../../../../constants';
import AppImages from '../../../../../../assets/images/appImages';
import { Share, StyleSheet, Platform } from 'react-native';
import Button from '../../../../../components/v2/button';
import { ButtonType } from '../../../../../constants/enum';
import WebView from 'react-native-webview';

const SPLINE_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script type="module" src="https://unpkg.com/@splinetool/viewer@0.9.506/build/spline-viewer.js"></script>
    <style>
      body { margin: 0; background: black; display: flex; justify-content: center; align-items: center; height: 100vh; }
      spline-viewer { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <spline-viewer url="https://prod.spline.design/AIAexIIoEQLgOX9e/scene.splinecode"></spline-viewer>
  </body>
</html>
`;

const CardCreation = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSplineLoaded, setIsSplineLoaded] = useState(false);

  useEffect(() => {
    // Show loading state for 5 seconds or until Spline loads, whichever is longer
    const timer = setTimeout(() => {
      if (isSplineLoaded) {
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isSplineLoaded]);

  const handleShare = () => {
    Share.share({
      message: 'Check out my new Cypher Card!',
    }).catch(error => {
      console.error('Error sharing:', error);
    });
  };

  const handleStartUsing = () => {
    navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
  };

  const handleSplineLoad = () => {
    setIsSplineLoaded(true);
    // Only hide loading if 5 seconds have passed
    setTimeout(() => {
      setIsLoading(false);
    }, 0);
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-black'>
      {/* Back button */}
      <CyDView className='px-4 py-2'>
        <CyDTouchView
          onPress={() => navigation.goBack()}
          className='w-[32px] h-[32px] bg-n40 rounded-full flex items-center justify-center'>
          <CyDMaterialDesignIcons
            name='arrow-left'
            size={20}
            className='text-base400'
          />
        </CyDTouchView>
      </CyDView>

      {/* Main content */}
      <CyDView className='flex-1 justify-between'>
        {/* Spline animation container */}
        <CyDView className='flex-1'>
          {/* Show card image while Spline loads */}
          {!isSplineLoaded && (
            <CyDView className='absolute z-10 w-full h-full items-center justify-center'>
              <CyDImage
                source={AppImages.CYPHER_VIRTUAL_CARD}
                className='w-[90%] aspect-[380/239] rounded-[12px]'
                resizeMode='contain'
              />
            </CyDView>
          )}
          <WebView
            source={{ html: SPLINE_HTML }}
            style={styles.webview}
            scrollEnabled={false}
            bounces={false}
            onLoad={handleSplineLoad}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
          />
        </CyDView>

        {/* Status section */}
        <CyDView className='items-center mb-8'>
          {isLoading ? (
            <>
              <CyDLottieView
                source={AppImages.LOADER_TRANSPARENT}
                autoPlay
                loop
                style={styles.loader}
              />
              <CyDText className='text-white text-lg mt-2'>
                Creating card
              </CyDText>
            </>
          ) : (
            <>
              <CyDView className='flex-row items-center mb-4'>
                <CyDView className='w-6 h-6 bg-green-500 rounded-full items-center justify-center mr-2'>
                  <CyDMaterialDesignIcons
                    name='check'
                    size={16}
                    className='text-white'
                  />
                </CyDView>
                <CyDText className='text-white text-lg'>Card Created</CyDText>
              </CyDView>

              {/* Buttons */}
              <CyDView className='w-full px-4'>
                <CyDTouchView
                  onPress={handleShare}
                  className='bg-n40 rounded-lg py-3 mb-4 flex-row justify-center items-center'>
                  <CyDMaterialDesignIcons
                    name='share'
                    size={20}
                    className='text-white mr-2'
                  />
                  <CyDText className='text-white text-base'>Share</CyDText>
                </CyDTouchView>

                <Button
                  title='Start Using'
                  onPress={handleStartUsing}
                  type={ButtonType.PRIMARY}
                  style='h-[48px]'
                />
              </CyDView>
            </>
          )}
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: 'black',
  },
  loader: {
    width: 40,
    height: 40,
  },
});

export default CardCreation;
