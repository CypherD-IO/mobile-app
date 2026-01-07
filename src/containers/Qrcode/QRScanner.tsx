import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Dimensions, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
  CameraPermissionStatus,
} from 'react-native-vision-camera';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDImageBackground,
} from '../../styles/tailwindComponents';
import { QRScannerScreens } from '../../constants/server';
import { BarCodeReadEvent } from '../../types/barcode';
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

interface RouteParams {
  fromPage: string | (() => string);
  onSuccess: (e: BarCodeReadEvent) => void;
}

/**
 * QR Scanner component using react-native-vision-camera
 * Replaces the deprecated react-native-qrcode-scanner
 */
export default function QRScanner(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { t } = useTranslation();
  const [fromPage] = useState<string>(route.params.fromPage as string);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isScanned, setIsScanned] = useState<boolean>(false);

  // Get the back camera device
  const device = useCameraDevice('back');

  // Request camera permission on mount
  useEffect(() => {
    const requestPermission = async (): Promise<void> => {
      const status: CameraPermissionStatus = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      
      if (status === 'denied') {
        Alert.alert(
          t('Camera Permission Required'),
          t('Please enable camera access in settings to scan QR codes.'),
          [
            { text: t('Cancel'), style: 'cancel', onPress: () => navigation.goBack() },
            { text: t('Open Settings'), onPress: () => Linking.openSettings() },
          ]
        );
      }
    };
    
    void requestPermission();
  }, [navigation, t]);

  // Code scanner configuration
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93'],
    onCodeScanned: useCallback((codes) => {
      // Prevent multiple scans
      if (isScanned || codes.length === 0) return;
      
      const firstCode = codes[0];
      if (firstCode.value) {
        setIsScanned(true);
        
        // Create event compatible with legacy API
        const event: BarCodeReadEvent = {
          data: firstCode.value,
          type: firstCode.type,
        };
        
        // Navigate back and call success callback
        navigation.goBack();
        route.params?.onSuccess(event);
      }
    }, [isScanned, navigation, route.params]),
  });

  // Handle hardware back button (Android)
  const handleBackButton = useCallback((): boolean => {
    navigation.goBack();
    return true;
  }, [navigation]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton]);

  // Render helper text based on scan context
  const renderText = (): string => {
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
  };

  // Show loading state while camera initializes
  if (!device || !hasPermission) {
    return (
      <CyDView className='flex-1 bg-black justify-center items-center'>
        <ActivityIndicator size='large' color='white' />
        <CyDText className='text-white mt-4'>
          {!hasPermission ? t('Requesting camera permission...') : t('Loading camera...')}
        </CyDText>
      </CyDView>
    );
  }

  return (
    <CyDView className='flex-1 bg-black'>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!isScanned}
        codeScanner={codeScanner}
      />
      
      {/* Custom overlay */}
      <CyDImageBackground
        source={AppImages.SCANNER_BG}
        resizeMode='cover'
        style={styles.overlay}
        imageStyle={styles.overlayImage}>
        <CyDView className='flex flex-column justify-end items-center h-screen w-screen'>
          <CyDView className='flex items-center justify-center h-1/2 w-10/12 pt-[10px]'>
            <CyDText className='text-center text-[20px] text-white mt-[24%]'>
              {renderText()}
            </CyDText>
            {fromPage === QRScannerScreens.WALLET_CONNECT && (
              <CyDTouchView
                className='flex items-center justify-center mt-[40px] h-[60px] w-2/3 border-[1px] border-n40 rounded-[12px]'
                onPress={() => navigation.navigate(C.screenTitle.WALLET_CONNECT)}>
                <CyDText className='text-base400 text-[15px] font-extrabold text-white'>
                  {t('Manage Connections')}
                </CyDText>
              </CyDTouchView>
            )}
          </CyDView>
        </CyDView>
      </CyDImageBackground>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
  },
  overlayImage: {
    height: '100%',
    width: '100%',
  },
});
