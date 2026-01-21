import React, { useMemo, useRef, useState } from 'react';
import { BackHandler, Dimensions, Linking, Platform } from 'react-native';
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
  const didRequestPermissionRef = useRef<boolean>(false);
  const [isRequestingPermission, setIsRequestingPermission] =
    useState<boolean>(false);
  const [didDenyPermission, setDidDenyPermission] = useState<boolean>(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: Array<{ value?: string | null }>) => {
      if (didScanRef.current) return;
      const value = codes?.[0]?.value ?? '';
      if (!value) return;

      didScanRef.current = true;
      try {
        route?.params?.onSuccess({ data: value });
      } catch (e) {
        console.error('[QRScanner] onSuccess callback failed', e);
      } finally {
        navigation?.goBack();
      }
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

  React.useEffect(() => {
    const requestOnMount = async (): Promise<void> => {
      if (hasPermission) return;
      if (didRequestPermissionRef.current) return;
      didRequestPermissionRef.current = true;

      setIsRequestingPermission(true);
      try {
        const granted = await requestPermission();
        if (!granted) setDidDenyPermission(true);
      } finally {
        setIsRequestingPermission(false);
      }
    };

    void requestOnMount();
  }, [hasPermission, requestPermission]);

  const cameraContent = useMemo(() => {
    // We intentionally keep this UI minimal. The app already has `react-native-permissions`
    // managing camera permission for other flows; VisionCamera still needs explicit runtime
    // permission before rendering the Camera view.
    if (!hasPermission) {
      const showTryAgain = !(Platform.OS === 'ios' && didDenyPermission);
      return (
        <CyDView className='flex flex-col items-center justify-center h-screen w-screen bg-n20 px-[28px]'>
          <CyDView className='w-full max-w-[360px] rounded-[18px] border-[1px] border-n40 bg-n0 px-[18px] py-[16px]'>
            <CyDText className='text-center text-[18px] text-base400 font-extrabold'>
              {t('CAMERA_PERMISSION_REQUIRED', 'Camera permission is required')}
            </CyDText>
            <CyDText className='text-center text-[13px] text-base200 mt-[10px]'>
              {t(
                'CAMERA_PERMISSION_REQUIRED_DESC',
                'We need camera access to scan QR codes. Please enable it in Settings -> Apps -> Cypher Wallet -> Camera',
              )}
            </CyDText>

            {isRequestingPermission ? (
              <CyDText className='text-center text-[13px] text-base150 mt-[16px]'>
                {t('REQUESTING_PERMISSION', 'Requesting permission...')}
              </CyDText>
            ) : (
              <CyDView className='mt-[16px] flex flex-row justify-center gap-x-[12px]'>
                {showTryAgain ? (
                  <CyDTouchView
                    className='px-[14px] py-[12px] rounded-[12px] border-[1px] border-n40'
                    onPress={() => {
                      setIsRequestingPermission(true);
                      void requestPermission()
                        .then(granted => {
                          if (!granted) setDidDenyPermission(true);
                        })
                        .finally(() => {
                          setIsRequestingPermission(false);
                        });
                    }}>
                    <CyDText className='text-base400 font-extrabold text-[14px]'>
                      {t('TRY_AGAIN', 'Try again')}
                    </CyDText>
                  </CyDTouchView>
                ) : null}

                <CyDTouchView
                  className='px-[14px] py-[12px] rounded-[12px] bg-[#E5E7EB] border-[1px] border-n40'
                  onPress={() => {
                    void Linking.openSettings();
                  }}>
                  <CyDText className='text-black font-extrabold text-[14px]'>
                    {t('OPEN_SETTINGS', 'Open Settings')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      );
    }

    if (!device) {
      return (
        <CyDView className='flex flex-col items-center justify-center h-screen w-screen bg-n20 px-[24px]'>
          <CyDText className='text-center text-[16px] font-semibold'>
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
    isRequestingPermission,
    didDenyPermission,
  ]);

  return <CyDScrollView className='bg-n20'>{cameraContent}</CyDScrollView>;
}
