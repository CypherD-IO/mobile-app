import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BackHandler, Dimensions, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImageBackground,
} from '../../styles/tailwindComponents';
import { QRScannerScreens } from '../../constants/server';
import { QRCodeReadEvent } from '../../types/QRScanner';
import AppImages from '../../../assets/images/appImages';
import * as C from '../../constants/index';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useRoute,
  useNavigation,
} from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Route parameters for the QRScanner screen.
 * @property fromPage - Identifier for the screen that initiated the scanner
 * @property onSuccess - Callback function invoked when a QR code is successfully scanned
 */
interface RouteParams {
  fromPage: string | (() => string);
  onSuccess: (e: QRCodeReadEvent) => void;
}

/**
 * QRScanner Component
 *
 * A full-screen QR code scanner using react-native-vision-camera.
 * Displays a camera view with a custom overlay and handles QR code detection.
 * When a QR code is scanned, it navigates back and invokes the onSuccess callback.
 */
export default function QRScanner(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { t } = useTranslation();
  const [fromPage] = useState<string>(route.params.fromPage as string);

  // Reference to track if we've already processed a scan (prevents duplicate scans)
  const hasScannedRef = useRef<boolean>(false);

  // Get the back camera device for QR scanning
  const device = useCameraDevice('back');

  /**
   * Returns the appropriate instructional text based on the source screen.
   * @returns Translated text string for the scanner overlay
   */
  const renderText = useCallback((): string => {
    switch (fromPage) {
      case QRScannerScreens.SEND:
        return t('QRSCAN_SEND');
      case QRScannerScreens.IMPORT:
        return t('QRSCAN_IMPORT');
      case QRScannerScreens.WALLET_CONNECT:
        return t('QRSCAN_WALLET_CONNECT');
      case QRScannerScreens.TRACK_WALLET:
        return t('QR_TRACK_WALLET');
      default:
        return t('QRSCAN_TEXT');
    }
  }, [fromPage, t]);

  /**
   * Handles the hardware back button press on Android.
   * Navigates back to the previous screen.
   * @returns true to indicate the event was handled
   */
  const handleBackButton = useCallback((): boolean => {
    navigation?.goBack();
    return true;
  }, [navigation]);

  // Configure the code scanner with QR code support
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      // Prevent duplicate scans - only process the first successful scan
      if (hasScannedRef.current) {
        return;
      }

      // Process the first detected QR code
      if (codes.length > 0) {
        const code = codes[0];
        const scannedValue = code.value;

        // Validate that we have actual data
        if (scannedValue != null && scannedValue !== '') {
          hasScannedRef.current = true;

          // Navigate back and invoke the success callback
          navigation?.goBack();
          route?.params?.onSuccess({ data: scannedValue });
        }
      }
    },
  });

  // Set up hardware back button handler for Android
  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton]);

  // Handle case where no camera device is available
  if (device == null) {
    return (
      <CyDView className="flex-1 bg-n20 justify-center items-center">
        <CyDText className="text-white text-[18px]">
          {t('CAMERA_NOT_AVAILABLE') || 'Camera not available'}
        </CyDText>
      </CyDView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      {/* Custom Overlay UI */}
      <View style={styles.overlay}>
        <CyDImageBackground
          source={AppImages.SCANNER_BG}
          resizeMode="cover"
          style={styles.overlayBackground}
          imageStyle={styles.overlayImage}>
          <CyDView
            className={
              'flex flex-column justify-end items-center h-screen w-screen'
            }>
            <CyDView
              className={
                'flex items-center justify-center h-1/2 w-10/12 pt-[10px]'
              }>
              <CyDText
                className={' text-center text-[20px] text-white mt-[24%]'}>
                {renderText()}
              </CyDText>
              {fromPage === QRScannerScreens.WALLET_CONNECT && (
                <CyDTouchView
                  className={
                    'flex items-center justify-center mt-[40px] h-[60px] w-2/3 border-[1px] border-n40 rounded-[12px]'
                  }
                  onPress={() =>
                    navigation.navigate(C.screenTitle.WALLET_CONNECT)
                  }>
                  <CyDText
                    className={
                      'text-base400 text-[15px] font-extrabold text-white'
                    }>
                    {t('Manage Connections')}
                  </CyDText>
                </CyDTouchView>
              )}
            </CyDView>
          </CyDView>
        </CyDImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    height: '100%',
    width: '100%',
    marginTop: '-30%',
  },
  overlayImage: {
    height: '100%',
    width: '100%',
  },
});
