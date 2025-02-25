import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CyDAnimatedView, CyDView } from '../../styles/tailwindComponents';
import { Theme, useTheme } from '../../reducers/themeReducer';

interface SkeletonLoaderProps {
  height: number | string;
  width: number | string;
  rounded?: number;
  style?: ViewStyle;
  value: any;
  children?: React.ReactNode;
  className?: string;
}

const CyDSkeleton: React.FC<SkeletonLoaderProps> = ({
  height,
  width,
  rounded = 4,
  style,
  value,
  children,
  className,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  if (value) {
    return <CyDView className={className}>{children}</CyDView>;
  }

  return (
    <CyDView
      style={[{ height, width, borderRadius: rounded }, style]}
      className={`bg-n40 overflow-hidden ${className}`}>
      <CyDView style={StyleSheet.absoluteFillObject}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <LinearGradient
            colors={['#E0E0E0', '#F5F5F5', '#E0E0E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className='w-full h-full'
          />
        </Animated.View>
      </CyDView>
    </CyDView>
  );
};

export default CyDSkeleton;
