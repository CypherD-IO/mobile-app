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

interface BlindPayIdCaptureModalProps {
  visible: boolean;
  docTypeName: string;
  side: 'front' | 'back';
  onContinue: (file: CapturedFile) => void;
  onClose: () => void;
}

type CaptureState = 'options' | 'capture' | 'preview';

// ── Tips bottom sheet ────────────────────────────────────────────
const TIPS_TEXT = `1. Avoid backlighting from windows or bright light sources when taking your ID photo.

2. If the image appears blurry, gradually move your ID closer to the camera until it comes into focus.

3. Ensure that the entire ID is visible within the frame.

4. Make sure the ID fits neatly within the four corners of the photo.`;

// ── Main modal ───────────────────────────────────────────────────
export default function BlindPayIdCaptureModal({
  visible,
  docTypeName,
  side,
  onContinue,
  onClose,
}: BlindPayIdCaptureModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [state, setState] = useState<CaptureState>('options');
  const [capturedFile, setCapturedFile] = useState<CapturedFile | null>(null);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (visible) {
      setState('capture');
      setCapturedFile(null);
      setShowTips(false);
      // Auto-request camera permission when opening
      if (!hasPermission) void requestPermission();
    }
  }, [visible]);

  const sideLabel =
    side === 'front'
      ? String(t('BLINDPAY_FRONT_SIDE', 'Front Side'))
      : String(t('BLINDPAY_BACK_SIDE', 'Back Side'));

  const headerTitle =
    side === 'front'
      ? `Front of your ${docTypeName}`
      : `Back of your ${docTypeName}`;

  const pickFile = useCallback(async () => {
    const file = await pickBlindPaySingleFile();
    if (!file) return; // User cancelled — no toast needed
    setCapturedFile(file);
    setState('preview');
  }, []);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePhoto({});
      setCapturedFile({
        uri: `file://${photo.path}`,
        name: `id_${side}_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      setState('preview');
    } catch {
      showToast(
        t('BLINDPAY_CAPTURE_FAILED', 'Failed to capture photo.'),
        'error',
      );
    }
  }, [side]);

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

  const openCamera = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        showToast(
          t(
            'BLINDPAY_CAMERA_DENIED',
            'Camera permission is required. Please enable it in Settings.',
          ),
          'error',
        );
        void Linking.openSettings();
        return;
      }
    }
    setState('capture');
  }, [hasPermission, requestPermission]);

  // ── OPTIONS (Screen 34 — light theme) ──────────────────────────
  if (state === 'options') {
    return (
      <Modal
        visible={visible}
        animationType='slide'
        presentationStyle='fullScreen'
        onRequestClose={handleClose}>
        <StatusBar barStyle='dark-content' />
        <CyDView
          className='flex-1 bg-n0'
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {/* Header */}
          <CyDView className='flex-row items-center px-[16px] h-[64px]'>
            <CyDTouchView onPress={handleClose} hitSlop={12}>
              <CyDIcons
                name='arrow-left'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>

          {/* Content */}
          <CyDView className='flex-1 px-[16px]'>
            <CyDText className='text-[32px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
              {docTypeName}
            </CyDText>
            <CyDText className='text-[14px] font-medium text-n200 leading-[1.45] tracking-[-0.6px] mt-[8px]'>
              {String(
                t(
                  'BLINDPAY_CAPTURE_SUBTITLE',
                  `Take a clear photo of the ${side} side of your ${docTypeName.toLowerCase()}`,
                ),
              )}
            </CyDText>

            {/* Card */}
            <CyDView className='mt-[24px] rounded-[16px] overflow-hidden'>
              <CyDView className='bg-n10 items-center py-[32px] gap-[8px]'>
                <CyDView className='w-[56px] h-[56px] bg-[#FBC02D] rounded-[14px] items-center justify-center'>
                  <CyDMaterialDesignIcons
                    name='card-account-details-outline'
                    size={28}
                    className='text-white'
                  />
                </CyDView>
                <CyDText className='text-[16px] font-semibold text-n200 tracking-[-0.8px]'>
                  {sideLabel}
                </CyDText>
              </CyDView>
              <CyDView className='bg-[#FFE082] px-[16px] py-[12px] flex-row items-center gap-[6px]'>
                <CyDMaterialDesignIcons
                  name='information-outline'
                  size={18}
                  className='text-n200'
                />
                <CyDText className='text-[13px] font-medium text-n200 tracking-[-0.4px] flex-1'>
                  {String(
                    t(
                      'BLINDPAY_CAPTURE_HINT',
                      `Capture or upload a photo of your ${docTypeName.toLowerCase()}`,
                    ),
                  )}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          {/* Buttons */}
          <CyDView className='px-[16px] gap-[12px] pb-[16px]'>
            <CyDTouchView
              onPress={() => {
                void pickFile();
              }}
              className='h-[58px] rounded-full border border-n30 bg-n0 items-center justify-center'>
              <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
                {String(t('BLINDPAY_UPLOAD_PHOTO', 'Upload a photo'))}
              </CyDText>
            </CyDTouchView>
            <CyDTouchView
              onPress={() => {
                void openCamera();
              }}
              className='h-[58px] rounded-full bg-[#FBC02D] items-center justify-center'>
              <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
                {String(t('BLINDPAY_OPEN_CAMERA', 'Open Camera'))}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </Modal>
    );
  }

  // ── CAPTURE (Screen 36 — dark theme with live camera) ──────────
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
          <CyDView className='flex-row items-center justify-between px-[16px] h-[64px]'>
            <CyDTouchView onPress={handleClose} hitSlop={12}>
              <CyDIcons name='arrow-left' size={24} className='text-white' />
            </CyDTouchView>
            <CyDText className='text-[16px] font-semibold text-white tracking-[-0.4px]'>
              {headerTitle}
            </CyDText>
            <CyDTouchView onPress={() => setShowTips(true)} hitSlop={12}>
              <CyDMaterialDesignIcons name='help-circle-outline' size={22} className='text-white' />
            </CyDTouchView>
          </CyDView>

          {/* Instruction */}
          <CyDView className='mx-[16px] mt-[24px] bg-[#1E1E1E] rounded-[8px] px-[16px] py-[16px]'>
            <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px] text-center'>
              {String(
                t(
                  'BLINDPAY_CAPTURE_INSTRUCTION',
                  `Please take a clear photo of the ${side} of your ID card, ensuring that the text is readable and well-lit.`,
                ),
              )}
            </CyDText>
          </CyDView>

          {/* Camera view */}
          <CyDView className='flex-1 items-center justify-center px-[16px]'>
            <CyDView className='w-full h-[246px] rounded-[16px] overflow-hidden'>
              {device ? (
                <Camera
                  ref={cameraRef}
                  style={{ width: '100%', height: '100%' }}
                  device={device}
                  isActive={state === 'capture' && visible}
                  photo
                />
              ) : (
                <CyDView className='w-full h-full bg-[#1E1E1E] items-center justify-center'>
                  <CyDText className='text-[14px] text-[#999]'>
                    {String(
                      t(
                        'BLINDPAY_NO_CAMERA',
                        'Camera not available',
                      ),
                    )}
                  </CyDText>
                </CyDView>
              )}
              {/* Corner overlay markers */}
              <CyDView className='absolute inset-0'>
                <CyDView className='absolute top-[8px] left-[8px] w-[32px] h-[32px] border-t-2 border-l-2 border-white rounded-tl-[8px]' />
                <CyDView className='absolute top-[8px] right-[8px] w-[32px] h-[32px] border-t-2 border-r-2 border-white rounded-tr-[8px]' />
                <CyDView className='absolute bottom-[8px] left-[8px] w-[32px] h-[32px] border-b-2 border-l-2 border-white rounded-bl-[8px]' />
                <CyDView className='absolute bottom-[8px] right-[8px] w-[32px] h-[32px] border-b-2 border-r-2 border-white rounded-br-[8px]' />
              </CyDView>
            </CyDView>
            <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px] text-center mt-[16px]'>
              {String(
                t(
                  'BLINDPAY_PLACE_ID',
                  `Just place the ${side} of your ID into this frame.`,
                ),
              )}
            </CyDText>
          </CyDView>

          {/* Bottom buttons */}
          <CyDView className='px-[16px] gap-[10px] pb-[16px]'>
            <CyDTouchView
              onPress={() => { void pickFile(); }}
              className='h-[52px] rounded-full border border-[#444] items-center justify-center'>
              <CyDText className='text-[16px] font-semibold text-white tracking-[-0.16px]'>
                Upload a photo
              </CyDText>
            </CyDTouchView>
            <CyDTouchView
              onPress={() => { void takePhoto(); }}
              className='h-[52px] rounded-full bg-[#F7C645] items-center justify-center'>
              <CyDText className='text-[16px] font-semibold text-black tracking-[-0.16px]'>
                Snap a photo
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {/* Tips overlay */}
        {showTips ? (
          <Modal visible transparent animationType='slide' onRequestClose={() => setShowTips(false)}>
            <CyDView className='flex-1 justify-end bg-black/60'>
              <CyDTouchView className='flex-1' onPress={() => setShowTips(false)} />
              <CyDView>
                <CyDView className='bg-n20 rounded-t-[24px] px-[16px]'
                  style={{ paddingBottom: Math.max(16, insets.bottom) }}>
                  <CyDView className='items-center pt-[12px] pb-[16px]'>
                    <CyDView className='w-[32px] h-[4px] bg-n50 rounded-[5px]' />
                  </CyDView>
                  <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[12px]'>
                    Tips on capturing
                  </CyDText>
                  <CyDText className='text-[14px] font-medium text-n200 leading-[1.5] tracking-[-0.4px] mb-[20px]'>
                    {TIPS_TEXT}
                  </CyDText>
                  <CyDTouchView
                    onPress={() => setShowTips(false)}
                    className='h-[48px] rounded-full bg-[#F7C645] items-center justify-center'>
                    <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>Got it</CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>
          </Modal>
        ) : null}
      </Modal>
    );
  }

  // ── PREVIEW (Screen 37 — dark theme) ───────────────────────────
  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
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
            {headerTitle}
          </CyDText>
        </CyDView>

        {/* Instruction */}
        <CyDView className='mx-[16px] mt-[24px] bg-[#1E1E1E] rounded-[8px] px-[16px] py-[16px]'>
          <CyDText className='text-[14px] font-medium text-[#999] leading-[1.45] tracking-[-0.6px] text-center'>
            {String(
              t(
                'BLINDPAY_PREVIEW_INSTRUCTION',
                'Make sure lighting is good and any lettering is clear before continuing with the application',
              ),
            )}
          </CyDText>
        </CyDView>

        {/* File preview */}
        <CyDView className='flex-1 items-center justify-center px-[16px]'>
          {capturedFile ? (
            capturedFile.type === 'application/pdf' ||
            capturedFile.name.toLowerCase().endsWith('.pdf') ? (
              <CyDView className='w-full h-[246px] rounded-[16px] bg-[#1E1E1E] items-center justify-center gap-[12px]'>
                <CyDMaterialDesignIcons
                  name='file-pdf-box'
                  size={64}
                  className='text-[#E57373]'
                />
                <CyDText
                  className='text-[14px] font-medium text-white tracking-[-0.6px] px-[24px] text-center'
                  numberOfLines={2}>
                  {capturedFile.name}
                </CyDText>
              </CyDView>
            ) : (
              <CyDView className='w-full h-[246px] rounded-[16px] overflow-hidden'>
                <CyDImage
                  source={{ uri: capturedFile.uri }}
                  className='w-full h-full'
                  resizeMode='cover'
                />
              </CyDView>
            )
          ) : null}
        </CyDView>

        {/* Buttons */}
        <CyDView className='px-[16px] gap-[16px] pb-[16px]'>
          <CyDTouchView
            onPress={handleRetake}
            className='h-[58px] rounded-full border border-n30 bg-n0 items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
              {String(t('BLINDPAY_RETAKE', 'Retake photo'))}
            </CyDText>
          </CyDTouchView>
          <CyDTouchView
            onPress={handleContinue}
            className='h-[58px] rounded-full bg-[#FFDE59] items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              {String(t('CONTINUE', 'Continue'))}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </Modal>
  );
}
