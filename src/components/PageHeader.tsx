import React from 'react';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindComponents';
import { t } from 'i18next';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

export default function PageHeader({
  title,
  navigation,
  onPress,
  titleClassName,
}: {
  title: string;
  navigation: NavigationProp<ParamListBase>;
  onPress?: () => void;
  titleClassName?: string;
}) {
  return (
    <CyDTouchView
      className='flex flex-row items-center py-[16px] px-[16px] bg-n0'
      onPress={() => {
        if (onPress) {
          onPress();
        } else {
          navigation.goBack();
        }
      }}>
      <CyDView className='pr-[16px]'>
        <CyDMaterialDesignIcons
          name='arrow-left'
          size={24}
          className='text-base400'
        />
      </CyDView>
      <CyDText
        className={
          titleClassName ??
          'text-[18px] font-medium tracking-[-0.8px] text-base400'
        }>
        {t(title)}
      </CyDText>
    </CyDTouchView>
  );
}
