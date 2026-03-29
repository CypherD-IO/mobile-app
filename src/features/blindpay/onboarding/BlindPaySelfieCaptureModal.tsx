import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, StatusBar } from 'react-native';
import { t } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { pickBlindPaySingleFile } from './pickBlindPayFile';
import { showToast } from '../../../containers/utilities/toastUtility';

export interface CapturedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface BlindPaySelfieCaptureModalProps {
  visible: boolean;
  onContinue: (file: CapturedFile) => void;
  onClose: () => void;
}

type CaptureState = 'capture' | 'preview';

export default function BlindPaySelfieCaptureModal({
  visible,
  onContinue,
  onClose,
}: BlindPaySelfieCaptureModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [state, setState] = useState<CaptureState>('capture');
  const [capturedFile, setCapturedFile] = useState<CapturedFile | null>(null);
  const [permissionReady, setPermissionReady] = useState(hasPermission);

  useEffect(() => {
    if (visible) {
      setState('capture');
      setCapturedFile(null);
      if (!hasPermission) {
        void requestPermission().then(granted => {
          setPermissionReady(granted);
          if (!granted) {
            showToast(
              t(
                'BLINDPAY_CAMERA_DENIED',
                'Camera permission is required. Please enable it in Settings.',
              ),
              'error',
            );
            void Linking.openSettings();
          }
        });
      } else {
        setPermissionReady(true);
      }
    }
  }, [visible, hasPermission, requestPermission]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({});
      setCapturedFile({
        uri: `file://${photo.path}`,
        name: `selfie_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      setState('preview');
    } catch {
      showToast(
        t('BLINDPAY_CAPTURE_FAILED', 'Failed to capture photo.'),
        'error',
      );
    }
  }, []);

  const pickFile = useCallback(async () => {
    const file = await pickBlindPaySingleFile();
    if (!file) return;
    setCapturedFile(file);
    setState('preview');
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedFile(null);
    setState('capture');
  }, []);

  const handleContinue = useCallback(() => {
    if (capturedFile) {
      onContinue(capturedFile);
    }
  }, [capturedFile, onContinue]);

  const handleClose = useCallback(() => {
    setCapturedFile(null);
    setState('capture');
    onClose();
  }, [onClose]);

  const title = String(t('BLINDPAY_SELFIE_CAPTURE_TITLE', 'Selfie verification'));

  // ── CAPTURE ────────────────────────────────────────────────────
  if (state === 'capture') {
    return (
      <Modal
        visible={visible}
        animationType='slide'
        presentationStyle='fullScreen'
        onRequestClose={handleClose}>
        <StatusBar barStyle='light-content' />
        <CyDView
          className='flex-1 bg-black'
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {/* Header */}
          <CyDView className='flex-row items-center px-[16px] h-[64px] gap-[12px]'>
            <CyDTouchView onPress={handleClose} hitSlop={12}>
              <CyDIcons name='arrow-left' size={24} className='text-white' />
            </CyDTouchView>
            <CyDText className='text-[20px] font-normal text-white tracking-[-1px] leading-[1.4] flex-1'>
              {title}
            </CyDText>
          </CyDView>

          {/* Instruction */}
          <CyDView className='mx-[16px] mt-[24px] bg-[#1E1E1E] rounded-[8px] px-[16px] py-[16px]'>
            <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px] text-center'>
              {String(
                t(
                  'BLINDPAY_SELFIE_INSTRUCTION',
                  'Ensure your entire face is clearly visible in the frame, well-lit, and set against a simple background.',
                ),
              )}
            </CyDText>
          </CyDView>

          {/* Oval camera frame */}
          <CyDView className='flex-1 items-center justify-center'>
            <CyDView className='w-[246px] h-[322px] rounded-[176px] overflow-hidden border border-dashed border-[#D8D8D8]'>
              {device && permissionReady ? (
                <Camera
                  ref={cameraRef}
                  style={{ width: '100%', height: '100%' }}
                  device={device}
                  isActive={state === 'capture' && visible}
                  photo
                />
              ) : (
                <CyDView className='w-full h-full items-center justify-center'>
                  <CyDMaterialDesignIcons
                    name='account-outline'
                    size={80}
                    className='text-[#555]'
                  />
                </CyDView>
              )}
            </CyDView>
          </CyDView>

          {/* Bottom */}
          <CyDView className='px-[16px] gap-[16px] pb-[16px]'>
            <CyDTouchView
              onPress={() => {
                void pickFile();
              }}
              className='flex-row items-center justify-center gap-[6px]'>
              <CyDMaterialDesignIcons
                name='upload'
                size={20}
                className='text-white'
              />
              <CyDText className='text-[14px] font-medium text-white tracking-[-0.6px]'>
                {String(t('BLINDPAY_UPLOAD_INSTEAD', 'Upload a photo instead'))}
              </CyDText>
            </CyDTouchView>
            <CyDTouchView
              onPress={() => {
                void takePhoto();
              }}
              className='h-[58px] rounded-full border border-n30 bg-white items-center justify-center'>
              <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
                {String(t('BLINDPAY_SNAP', 'Snap a photo'))}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </Modal>
    );
  }

  // ── PREVIEW ────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType='fade'
      presentationStyle='fullScreen'
      onRequestClose={handleClose}>
      <StatusBar barStyle='light-content' />
      <CyDView
        className='flex-1 bg-black'
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {/* Header */}
        <CyDView className='flex-row items-center px-[16px] h-[64px] gap-[12px]'>
          <CyDTouchView
            onPress={() => {
              setState('capture');
            }}
            hitSlop={12}>
            <CyDIcons name='arrow-left' size={24} className='text-white' />
          </CyDTouchView>
          <CyDText className='text-[20px] font-normal text-white tracking-[-1px] leading-[1.4] flex-1'>
            {title}
          </CyDText>
        </CyDView>

        {/* Instruction */}
        <CyDView className='mx-[16px] mt-[24px] bg-[#1E1E1E] rounded-[8px] px-[16px] py-[16px]'>
          <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px] text-center'>
            {String(
              t(
                'BLINDPAY_SELFIE_INSTRUCTION',
                'Ensure your entire face is clearly visible in the frame, well-lit, and set against a simple background.',
              ),
            )}
          </CyDText>
        </CyDView>

        {/* Oval preview */}
        <CyDView className='flex-1 items-center justify-center'>
          {capturedFile ? (
            <CyDView className='w-[246px] h-[322px] rounded-[176px] overflow-hidden'>
              <CyDImage
                source={{ uri: capturedFile.uri }}
                className='w-full h-full'
                resizeMode='cover'
              />
            </CyDView>
          ) : null}
        </CyDView>

        {/* Buttons */}
        <CyDView className='px-[16px] gap-[16px] pb-[16px]'>
          <CyDTouchView
            onPress={handleRetake}
            className='h-[58px] rounded-full border border-n30 bg-white items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
              {String(t('BLINDPAY_RETAKE', 'Retake photo'))}
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            onPress={handleContinue}
            className='h-[58px] rounded-full bg-[#FFDE59] items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
              {String(t('CONTINUE', 'Continue'))}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </Modal>
  );
}
