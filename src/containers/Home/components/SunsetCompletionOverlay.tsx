import React from 'react';
import { Modal } from 'react-native';
import {
  initialWindowMetrics,
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import AppImages from '../../../../assets/images/appImages';
import { buildCompletionChecklist } from './sunsetCompletion';
import { useWindDownDates } from '../hooks/useWindDownDates';

/**
 * Full-screen "You're all set" overlay (Figma 1-911), shown over the sunset Home
 * once every winddown step is complete. Closable; closing returns to the Home.
 */
export default function SunsetCompletionOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const checklist = buildCompletionChecklist(useWindDownDates().shutdown);

  return (
    <Modal visible={visible} animationType='slide' transparent={false}>
      {/* The safe-area provider doesn't cross the Modal portal, so re-establish
          it here (seeded with initial metrics to avoid a flash) — otherwise the
          content rides up under the notch. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <CyDSafeAreaView className='flex-1 bg-n20' edges={['top', 'bottom']}>
        <CyDView className='flex-row justify-end px-[16px] pt-[8px]'>
          <CyDTouchView
            onPress={onClose}
            accessibilityRole='button'
            className='w-[36px] h-[36px] rounded-full bg-n0 items-center justify-center'>
            <CyDMaterialDesignIcons
              name='close'
              size={22}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>

        <CyDScrollView
          className='flex-1 px-[20px]'
          showsVerticalScrollIndicator={false}>
          <CyDView className='items-center mt-[12px]'>
            <CyDFastImage
              source={AppImages.GREEN_CHECK_3D}
              className='w-[120px] h-[120px]'
              resizeMode='contain'
            />
            <CyDText className='text-[26px] font-bold text-base400 mt-[20px]'>
              {t('SUNSET_ALL_SET_TITLE', 'You’re all set')}
            </CyDText>
            <CyDText className='text-[14px] text-n200 text-center mt-[8px] leading-[20px] px-[10px]'>
              {t(
                'SUNSET_ALL_SET_SUBTITLE',
                'Your funds, rewards and wallet access are fully secured, as part of Cypher sunsetting.',
              )}
            </CyDText>
          </CyDView>

          <CyDView className='bg-n0 rounded-[16px] p-[16px] mt-[24px]'>
            <CyDText className='text-[12px] font-bold tracking-[1px] text-n200 mb-[12px]'>
              {t('SUNSET_WHATS_NEXT', 'WHAT HAPPENS NEXT')}
            </CyDText>
            {checklist.map(line => (
              <CyDView key={line} className='flex-row items-start mb-[12px]'>
                <CyDMaterialDesignIcons
                  name='check'
                  size={18}
                  className='text-[#2EBD64] mr-[10px] mt-[2px]'
                />
                <CyDText className='flex-1 text-[13px] text-n200 leading-[19px]'>
                  {line}
                </CyDText>
              </CyDView>
            ))}
          </CyDView>

          <CyDView className='bg-n0 rounded-[16px] p-[16px] mt-[14px] mb-[28px]'>
            <CyDText className='text-[12px] font-bold tracking-[1px] text-n200 mb-[10px]'>
              {t('SUNSET_ONE_LAST_THING', 'AND ONE LAST THING …')}
            </CyDText>
            <CyDView className='flex-row items-center'>
              <CyDFastImage
                source={AppImages.LOVE_CYPHER}
                className='w-[70px] h-[70px] mr-[12px]'
                resizeMode='contain'
              />
              <CyDText className='flex-1 text-[13px] text-n200 leading-[19px]'>
                {t(
                  'SUNSET_THANK_YOU',
                  'Thank you for believing in Cypher. We’ll always be grateful to have been part of your spending journey.',
                )}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDScrollView>
        </CyDSafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
