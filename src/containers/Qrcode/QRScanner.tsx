import React, { useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDScrollView,
  CyDImageBackground,
} from '../../styles/tailwindComponents';
import { QRScannerScreens } from '../../constants/server';
import AppImages from '../../../assets/images/appImages';
import * as C from '../../constants/index';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import type { QRScanEvent } from '../../types/qr';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface RouteParams {
  fromPage: string | (() => string);
  onSuccess: (e: QRScanEvent) => void;
}

export default function QRScanner() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { t } = useTranslation();
  const [fromPage] = useState<string>(route.params.fromPage);
  const didScanRef = useRef<boolean>(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: Array<{ value?: string | null }>) => {
      if (didScanRef.current) return;
      const value = codes?.[0]?.value ?? '';
      if (!value) return;

      didScanRef.current = true;
      navigation?.goBack();
      route?.params?.onSuccess({ data: value });
    },
  });

  const renderText = () => {
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

  const handleBackButton = () => {
    navigation?.goBack();
    return true;
  };

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const cameraContent = useMemo(() => {
    // We intentionally keep this UI minimal. The app already has `react-native-permissions`
    // managing camera permission for other flows; VisionCamera still needs explicit runtime
    // permission before rendering the Camera view.
    if (!hasPermission) {
      return (
        <CyDView className='flex flex-col items-center justify-center h-screen w-screen bg-n20 px-[24px]'>
          <CyDText className='text-center text-[16px] text-white font-semibold'>
            {t('CAMERA_PERMISSION_REQUIRED', 'Camera permission is required')}
          </CyDText>
          <CyDTouchView
            className='mt-[16px] px-[16px] py-[12px] rounded-[12px] border-[1px] border-n40'
            onPress={() => {
              void requestPermission();
            }}>
            <CyDText className='text-white font-extrabold text-[15px]'>
              {t('GRANT_PERMISSION', 'Grant Permission')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      );
    }

    if (!device) {
      return (
        <CyDView className='flex flex-col items-center justify-center h-screen w-screen bg-n20 px-[24px]'>
          <CyDText className='text-center text-[16px] text-white font-semibold'>
            {t('CAMERA_UNAVAILABLE', 'Camera is unavailable')}
          </CyDText>
        </CyDView>
      );
    }

    return (
      <CyDView className='h-screen w-screen bg-black'>
        <Camera
          style={{ height: SCREEN_HEIGHT, width: '100%' }}
          device={device}
          isActive
          codeScanner={codeScanner}
        />
        <CyDImageBackground
          source={AppImages.SCANNER_BG}
          resizeMode='cover'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
          }}
          imageStyle={{ height: '100%', width: '100%' }}>
          <CyDView className='flex flex-column justify-end items-center h-screen w-screen'>
            <CyDView className='flex items-center justify-center h-1/2 w-10/12 pt-[10px]'>
              <CyDText className={' text-center text-[20px] text-white mt-[24%]'}>
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
      </CyDView>
    );
  }, [
    codeScanner,
    device,
    fromPage,
    hasPermission,
    navigation,
    renderText,
    requestPermission,
    t,
  ]);

  return (
    <CyDScrollView className='bg-n20'>{cameraContent}</CyDScrollView>
  );
}
