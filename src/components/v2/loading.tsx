import React from 'react';
import { CyDView, CyDLottieView } from '../../styles/tailwindComponents';
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
        'flex justify-center bg-n20 items-center h-full w-full z-10',
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
      <CyDLottieView
        source={AppImages.LOADING_SPINNER}
        autoPlay
        loop
        style={styles.loader}
      />
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: { height: 30, width: 30, zIndex: 20 },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 1,
  },
});
