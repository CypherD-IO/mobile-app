import { CyDView, CyDText } from '../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import React from 'react';
import AppImages from '../../../assets/images/appImages';

export default function Loading () {
  return (
    <CyDView
      className={'flex justify-center items-center bg-white h-full w-full'}
    >
      <LottieView
        source={AppImages.LOADING_IMAGE}
        autoPlay
        loop
        style={{ height: 150, width: 150 }}
      />
      <CyDText className={'text-[16px] font-semibold'}>{'Loading . . .'}</CyDText>
    </CyDView>
  );
}
