import React from 'react';
import AppImages from '../../assets/images/appImages';

import {
  CyDFastImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { ImageSourcePropType, Keyboard } from 'react-native';

export default function CustomHeader({
  navigation,
  title = '',
  backArrow = AppImages.BACK_ARROW_GRAY,
  keyboardHeight,
}: {
  navigation: NavigationProp<ParamListBase>;
  title?: string;
  backArrow?: ImageSourcePropType;
  keyboardHeight?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <CyDView
      className='flex flex-row items-center justify-between py-[16px] px-[16px] bg-n0 '
      style={{ paddingTop: insets.top }}>
      <CyDTouchView
        className=''
        onPress={() => {
          if (keyboardHeight) {
            Keyboard.dismiss();
            setTimeout(() => {
              navigation.goBack();
            }, 100);
          } else {
            navigation.goBack();
          }
        }}>
        <CyDFastImage
          className={'w-[32px] h-[32px]'}
          resizeMode='cover'
          source={
            backArrow ? AppImages.BACK_ARROW_GRAY : AppImages.BACK_ARROW_GRAY
          }
        />
      </CyDTouchView>
      {title && (
        <CyDText className='text-[20px] font-extrabold text-base400 mr-[20px]'>
          {title}
        </CyDText>
      )}
      <CyDView />
    </CyDView>
  );
}
