import React, { useEffect, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { CyDTouchView, CyDView } from '../../../styles/tailwindComponents';
import { CyDMaterialDesignIcons } from '../../../styles/tailwindComponents';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Purple color constant - matches the particle overlay
const PURPLE_COLOR = '#8B5CF6';

interface FloatingMorphButtonProps {
  onPress: () => void;
  /**
   * When true, the button animates in as if particles are reforming into it.
   * This should be set to true when the overlay has just closed.
   */
  isReforming?: boolean;
}

const AnimatedTouchView = Animated.createAnimatedComponent(CyDTouchView);
const AnimatedCyDView = Animated.createAnimatedComponent(CyDView);

/**
 * Mini sparkle particle component that orbits around the button
 * Creates the "magic dust" effect on the FAB
 */
interface SparkleParticleProps {
  index: number;
  totalCount: number;
  buttonRadius: number;
}

const SparkleParticle: React.FC<SparkleParticleProps> = ({
  index,
  totalCount,
  buttonRadius,
}) => {
  const progress = useSharedValue(0);
  const twinkle = useSharedValue(1);

  // Calculate initial angle based on index for even distribution
  const baseAngle = (index / totalCount) * Math.PI * 2;
  // Vary the orbit radius slightly for depth (adjusted for smaller button)
  const orbitRadius = buttonRadius + 6 + (index % 3) * 4;

  useEffect(() => {
    // Continuous orbital motion with varying speeds
    const duration = 3000 + (index % 3) * 1000;
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false,
    );

    // Twinkling effect
    twinkle.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 + Math.random() * 300 }),
        withTiming(1, { duration: 400 + Math.random() * 300 }),
      ),
      -1,
      true,
    );
  }, [progress, twinkle, index]);

  const sparkleStyle = useAnimatedStyle(() => {
    const angle = baseAngle + progress.value * Math.PI * 2;
    const x = Math.cos(angle) * orbitRadius;
    const y = Math.sin(angle) * orbitRadius;

    return {
      position: 'absolute',
      width: 3 + (index % 2) * 2,
      height: 3 + (index % 2) * 2,
      borderRadius: 3,
      backgroundColor: PURPLE_COLOR,
      opacity: twinkle.value * 0.7,
      transform: [
        { translateX: x + buttonRadius - 2 },
        { translateY: y + buttonRadius - 2 },
        { scale: twinkle.value },
      ],
      shadowColor: PURPLE_COLOR,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 3,
    };
  });

  return <AnimatedCyDView style={sparkleStyle} />;
};

/**
 * FloatingMorphButton - A magical floating action button that triggers the MorphOverlay.
 *
 * Features:
 * - Dissolve animation when pressed (button appears to transform into particles)
 * - Reform animation when overlay closes (particles converge back into button)
 * - Orbiting sparkle particles for magical effect
 * - Breathing glow animation
 * - Solid purple styling matching the overlay particles
 */
export const FloatingMorphButton: React.FC<FloatingMorphButtonProps> = ({
  onPress,
  isReforming = false,
}) => {
  // Core animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glowPulse = useSharedValue(0.9);

  useEffect(() => {
    /**
     * Subtle "breathing" glow to sell the magic vibe without being distracting.
     * Runs indefinitely while the FAB is mounted.
     */
    glowPulse.value = withRepeat(withTiming(0.5, { duration: 1400 }), -1, true);
  }, [glowPulse]);

  /**
   * Handle the reform animation when overlay closes.
   * This creates the effect of particles converging back into the button.
   */
  useEffect(() => {
    if (isReforming) {
      // Reset values first
      scale.value = 0.3;
      opacity.value = 0;

      // Delay slightly to allow particles to start converging
      scale.value = withDelay(
        200,
        withSpring(1, { damping: 12, stiffness: 100 }),
      );
      opacity.value = withDelay(
        200,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      // Normal state
      scale.value = withSpring(1, { damping: 10 });
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isReforming, scale, opacity]);

  /**
   * Handle button press with dissolve animation.
   * The button shrinks and fades as if it's transforming into particles.
   */
  const handlePress = useCallback((): void => {
    // Dissolve animation - button appears to explode into particles
    scale.value = withSequence(
      // Quick press feedback
      withSpring(0.92, { damping: 15 }),
      // Rapid shrink as "particles" emanate
      withTiming(0.1, { duration: 250, easing: Easing.in(Easing.cubic) }),
    );

    // Fade out as it dissolves
    opacity.value = withSequence(
      withTiming(0.8, { duration: 50 }),
      withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }),
    );

    // Trigger the overlay after a tiny delay to sync with animation start
    setTimeout(() => {
      onPress();
    }, 100);
  }, [onPress, scale, opacity]);

  // Main button animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Outer glow animated style
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value * opacity.value,
    transform: [{ scale: 1 + (1 - glowPulse.value) * 0.25 }],
  }));

  return (
    <CyDView
      className='absolute bottom-[80px] right-[20px] z-50'
      style={{ width: 52, height: 52 }}
      pointerEvents='box-none'>
      {/* Sparkle particles orbiting the button */}
      {[0, 1, 2, 3, 4, 5].map(index => (
        <SparkleParticle
          key={`sparkle-${index}`}
          index={index}
          totalCount={6}
          buttonRadius={22}
        />
      ))}

      {/* Outer glow (purple - behind the button) */}
      <AnimatedCyDView
        className='absolute'
        style={[styles.glow, glowStyle]}
        pointerEvents='none'
      />

      {/* Button core - solid purple */}
      <AnimatedTouchView
        onPress={handlePress}
        style={[styles.button, animatedStyle]}
        activeOpacity={0.92}
        accessibilityRole='button'
        accessibilityLabel='Open Morph Overlay'>
        {/* Inner highlight ring for depth */}
        <CyDView style={styles.innerRing} />

        {/* Icon */}
        <CyDMaterialDesignIcons
          name='auto-fix'
          size={24}
          className='text-white'
          style={styles.icon}
        />
      </AnimatedTouchView>
    </CyDView>
  );
};

const styles = StyleSheet.create({
  glow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    left: -4,
    top: -4,
    backgroundColor: 'rgba(139, 92, 246, 0.35)', // purple glow
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: PURPLE_COLOR,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
        }
      : {
          elevation: 10,
        }),
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        }
      : {
          elevation: 12,
        }),
  },
  innerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  icon: {
    // Slight text shadow for depth
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
