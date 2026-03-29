import React from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';
import { t } from 'i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';

interface BlindPayKycChromeProps {
  stepIndex: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  nextLabel?: string;
}

export default function BlindPayKycChrome({
  stepIndex,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextDisabled = false,
  nextLoading = false,
  nextLabel,
}: BlindPayKycChromeProps) {
  const insets = useSafeAreaInsets();
  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row h-[64px] items-center px-[16px] py-[8px]'>
        <CyDTouchView onPress={onBack} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='flex-1'>
        <Animated.View
          key={stepIndex}
          entering={FadeIn.duration(200)}>
          {title ? (
            <CyDView className='px-[16px] pt-[4px] pb-[12px] gap-[6px]'>
              <CyDText className='text-[24px] font-semibold text-base400 tracking-[-1px] leading-[1.4]'>
                {title}
              </CyDText>
              {subtitle ? (
                <CyDText className='text-[14px] font-medium text-n200 leading-[1.45] tracking-[-0.6px]'>
                  {subtitle}
                </CyDText>
              ) : null}
            </CyDView>
          ) : null}
        </Animated.View>

        <CyDKeyboardAwareScrollView
          className='flex-1'
          enableOnAndroid
          enableAutomaticScroll
          keyboardShouldPersistTaps='handled'
          extraScrollHeight={32}
          extraHeight={88}
          viewIsInsideTabBar
          contentContainerClassName='pb-[24px]'
          onLayout={() => Keyboard.dismiss()}>
          <CyDView className='px-[16px] gap-[16px]'>{children}</CyDView>
        </CyDKeyboardAwareScrollView>
      </CyDView>

      <CyDView
        className='px-[16px] pt-[16px] gap-[24px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDView className='h-[6px] rounded-full bg-n40 overflow-hidden'>
          <CyDView
            className='h-full rounded-full bg-base400'
            style={{
              width: `${(((stepIndex + 1) / totalSteps) * 100).toFixed(1)}%`,
            }}
          />
        </CyDView>
        <CyDView className='flex-row items-center justify-end'>
          <CyDTouchView
            onPress={() => {
              onNext();
            }}
            disabled={nextDisabled || nextLoading}
            className='rounded-full min-h-[52px] min-w-[120px] bg-[#FBC02D] px-[32px] flex-row items-center justify-center'>
            <CyDView className='relative min-w-[72px] items-center justify-center py-[2px]'>
              <CyDText
                className={`text-[20px] font-semibold text-base400 tracking-[-1px] leading-[1.3] ${
                  nextLoading ? 'opacity-0' : ''
                }`}>
                {nextLabel ?? String(t('NEXT', 'Next'))}
              </CyDText>
              {nextLoading ? (
                <CyDView className='absolute inset-0 items-center justify-center'>
                  <ActivityIndicator color='#0D0D0D' />
                </CyDView>
              ) : null}
            </CyDView>
          </CyDTouchView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
