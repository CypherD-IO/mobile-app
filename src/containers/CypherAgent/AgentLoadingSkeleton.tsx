import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CyDView } from '../../styles/tailwindComponents';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const SPARKLE_PATH =
  'M12 2C12 2 13.5 8.5 15.5 10.5C17.5 12.5 22 12 22 12C22 12 17.5 13.5 15.5 15.5C13.5 17.5 12 22 12 22C12 22 10.5 17.5 8.5 15.5C6.5 13.5 2 12 2 12C2 12 6.5 10.5 8.5 8.5C10.5 6.5 12 2 12 2Z';

// Cypher Agent screen forces a dark theme so the native loading state matches
// the dApp's own sparkle animation. The background (#0D0D0D) and the gold
// sparkle (#FFC72F, equivalent to dark-theme `--color-p100`) are pinned on
// purpose so this surface stays dark regardless of the user's theme choice.
const SPARKLE_COLOR = '#FFC72F';

export default function AgentLoadingSparkle() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.7, {
          duration: 750,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <CyDView className='absolute top-0 left-0 right-0 bottom-0 bg-[#0D0D0D] z-10 items-center justify-center pb-[54px]'>
      <AnimatedSvg
        width={32}
        height={32}
        viewBox='0 0 24 24'
        style={animatedStyle}>
        <Path d={SPARKLE_PATH} fill={SPARKLE_COLOR} />
      </AnimatedSvg>
    </CyDView>
  );
}
