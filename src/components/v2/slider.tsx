import React, { useEffect, useState } from 'react';
import Slider from '@react-native-community/slider';
import { styled } from 'nativewind';
import { CyDView } from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import { round } from 'lodash';

const StyledSlider = styled(Slider);

const StepMarker = () => (
  <CyDView className='w-[4px] h-[4px] top-[8px] rounded-full bg-n0 relative' />
);

interface CustomSliderProps {
  maxValue: number;
  stopCount: number;
  onValueChange?: (value: number) => void;
  initialValue?: number;
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  maxValue,
  stopCount,
  onValueChange,
  initialValue = 0,
  minValue = 0,
}: {
  stopCount: number;
  onValueChange?: (value: number) => void;
  initialValue?: number;
  maxValue: number;
  minValue?: number;
}) => {
  const [value, setValue] = useState(initialValue);
  const stepSize = round(maxValue / stopCount);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <CyDView className='w-full'>
      <StyledSlider
        className='max-h-[12px] h-[12px] bg-p50 rounded-full'
        minimumValue={minValue}
        maximumValue={maxValue}
        value={value}
        step={stepSize}
        minimumTrackTintColor='#F7C645'
        maximumTrackTintColor='#F7C645'
        // TODO: Add thumb image
        // thumbImage={{
        //   uri: 'https://public.cypherd.io/icons/sliderKnob.png',
        //   width: 24,
        //   height: 24,
        // }}
        tapToSeek={true}
        onSlidingComplete={finalValue => {
          // Round to nearest step value if needed
          const roundedValue = round(finalValue / stepSize) * stepSize;
          setValue(roundedValue);
          onValueChange?.(roundedValue);
        }}
        StepMarker={StepMarker}
      />
    </CyDView>
  );
};

export default CustomSlider;
