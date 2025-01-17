import React from 'react';
import {
  CyDImageBackground,
  CyDSafeAreaView,
  CyDView,
} from '../../styles/tailwindStyles';
import { Colors } from '../../constants/theme';
import { ImageSourcePropType } from 'react-native';

export default function CyDContainer({
  children,
  backgroundImage,
  accentColor,
}: {
  children: JSX.Element[];
  backgroundImage?: ImageSourcePropType;
  accentColor?: string;
}) {
  if (backgroundImage) {
    return (
      <CyDImageBackground
        source={backgroundImage}
        className='flex-1 bg-n20'
        style={{ backgroundColor: accentColor ?? Colors.white }}>
        <CyDSafeAreaView>{children}</CyDSafeAreaView>
      </CyDImageBackground>
    );
  }
  return (
    <CyDView className='flex-1 bg-n20'>
      <CyDSafeAreaView>{children}</CyDSafeAreaView>
    </CyDView>
  );
}
