import React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import ProgressBarButton from '../../../components/v2/ProgressBarButton';
import useBlindPaySheet from '../components/BlindPayDropdownSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
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
  /** Help text shown when Questions button is tapped */
  helpText?: string;
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
  helpText,
}: BlindPayKycChromeProps) {
  const insets = useSafeAreaInsets();
  const { openHelpSheet } = useBlindPaySheet();

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row h-[64px] items-center justify-between px-[16px] py-[8px]'>
        <CyDTouchView onPress={onBack} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        {helpText ? (
          <CyDTouchView
            onPress={() => openHelpSheet({ title: 'Help', text: helpText })}
            className='flex-row items-center gap-[6px] rounded-full bg-n20 px-[12px] py-[6px]'>
            <CyDMaterialDesignIcons name='help-circle-outline' size={18} className='text-base400' />
            <CyDText className='text-[14px] font-normal text-base400 tracking-[-0.6px]'>
              Questions
            </CyDText>
          </CyDTouchView>
        ) : null}
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
          contentContainerClassName='pb-[24px]'>
          <CyDView className='px-[16px] gap-[16px]'>{children}</CyDView>
        </CyDKeyboardAwareScrollView>
      </CyDView>

      <CyDView className='px-[16px] pt-[12px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <ProgressBarButton
          step={stepIndex}
          totalSteps={totalSteps}
          onPress={onNext}
          disabled={nextDisabled || nextLoading}
          loading={nextLoading}
          isLastStep={nextLabel != null}
          lastStepLabel={nextLabel}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
