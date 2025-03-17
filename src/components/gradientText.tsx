import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { CyDText, CyDView } from '../styles/tailwindComponents';

export default function GradientText({
  textElement,
  gradientColors,
  locations,
  useAngle = false,
  angle,
  angleCenter,
}: {
  textElement: React.ReactElement<typeof CyDText>;
  gradientColors: string[];
  locations?: number[];
  useAngle?: boolean;
  angle?: number;
  angleCenter?: { x: number; y: number };
}) {
  return (
    <MaskedView maskElement={textElement}>
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={locations}
        useAngle={useAngle}
        angleCenter={angleCenter}
        angle={angle}>
        <CyDView className='opacity-0'>{textElement}</CyDView>
      </LinearGradient>
    </MaskedView>
  );
}
