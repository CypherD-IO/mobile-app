import { CyDView, CyDText } from '../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import React from 'react';
import AppImages from '../../../assets/images/appImages';
import clsx from 'clsx';
import { StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';

export default function Loading({
  isTransparent = false,
  blurBg = false,
}: {
  isTransparent?: boolean;
  blurBg?: boolean;
}) {
  return (
    <CyDView
      className={clsx(
        'flex justify-center bg-white items-center h-full w-full z-10',
        {
          'absolute bg-transparent': isTransparent || blurBg,
        },
      )}>
      {blurBg && (
        <BlurView
          style={styles.absolute}
          blurType='dark'
          blurAmount={4}
          reducedTransparencyFallbackColor='white'
        />
      )}
      <LottieView
        source={AppImages.LOADING_IMAGE}
        autoPlay
        loop
        style={styles.loader}
      />
      <CyDText
        className={clsx('text-[16px] font-semibold z-50', {
          'text-white': blurBg,
        })}>
        {'Loading . . .'}
      </CyDText>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: { height: 150, width: 150, zIndex: 20 },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
  },
});
