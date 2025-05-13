import React from 'react';
import { CyDView, CyDText } from '../../styles/tailwindComponents';
import Button from './button';
import { t } from 'i18next';

interface CardApplicationFooterProps {
  currentStep: number;
  totalSteps: number;
  currentSectionProgress: number; // 0-100 percentage
  buttonConfig: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
}

const CardApplicationFooter: React.FC<CardApplicationFooterProps> = ({
  currentStep,
  totalSteps,
  currentSectionProgress,
  buttonConfig,
}) => {
  return (
    <CyDView className='pb-[24px] bg-n0'>
      {/* Progress Indicator */}
      <CyDView className='flex-row items-center gap-[5px] mb-6'>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <CyDView
            key={index}
            className='flex-1 h-[6px] relative bg-n30 overflow-hidden'>
            {/* Progress Fill */}
            <CyDView
              className='absolute top-0 left-0 h-full bg-base400'
              style={{
                width: `${
                  index + 1 < currentStep
                    ? '100'
                    : index + 1 === currentStep
                      ? currentSectionProgress
                      : '0'
                }%`,
              }}
            />
          </CyDView>
        ))}
      </CyDView>

      {/* Footer Content */}
      <CyDView className='flex-row justify-between items-center px-4'>
        <CyDText className='text-n400 text-[14px]'>
          {`${currentStep} of ${totalSteps}`}
        </CyDText>
        <Button
          title={t(buttonConfig.title)}
          onPress={buttonConfig.onPress}
          disabled={buttonConfig.disabled}
          loading={buttonConfig.loading}
          paddingY={12}
          style='w-[106px] rounded-full'
        />
      </CyDView>
    </CyDView>
  );
};

export default CardApplicationFooter;
