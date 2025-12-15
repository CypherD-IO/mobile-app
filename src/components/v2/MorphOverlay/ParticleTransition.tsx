import React, { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { CyDView } from '../../../styles/tailwindComponents';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  withSequence,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Single purple color for the particle overlay - matches the FAB button
const PARTICLE_COLOR = '#8B5CF6';

interface ParticleProps {
  index: number;
  startX: number;
  startY: number;
  isAnimating: boolean;
  /**
   * Precomputed random values for consistent animation behavior.
   * These are memoized to ensure particles return to their exact origin.
   */
  randomValues: {
    xOffset: number;
    yOffset: number;
    rotation: number;
    delayForward: number;
    delayReverse: number;
  };
}

const Particle: React.FC<ParticleProps> = ({
  index,
  startX,
  startY,
  isAnimating,
  randomValues,
}) => {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const borderRadius = useSharedValue(100); // Start as circle (high border radius)

  // Calculate final position in a grid pattern
  const cols = 6;
  const rows = 9;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const finalX = (SCREEN_WIDTH / cols) * col;
  const finalY = (SCREEN_HEIGHT / rows) * row;

  // Use precomputed random values for consistent behavior
  const { xOffset, yOffset, rotation, delayForward, delayReverse } =
    randomValues;

  useEffect(() => {
    if (isAnimating) {
      // Reduced delay for snappier "button exploding" effect - syncs with button dissolve
      const delay = delayForward * 80; // Max 80ms delay (was 150ms)
      const duration = 380 + delayForward * 150; // Faster overall (was 450 + 200)

      // Opacity: fade in very quickly to simulate particles bursting from button
      opacity.value = withDelay(
        delay,
        withTiming(1, { duration: 100, easing: Easing.out(Easing.ease) }),
      );

      // Scale: burst out quickly then settle - like sparks from the button
      scale.value = withDelay(
        delay,
        withSequence(
          // Burst out immediately
          withTiming(0.6, { duration: 60, easing: Easing.out(Easing.back(2)) }),
          // Grow as it moves
          withTiming(1.15, {
            duration: duration * 0.7,
            easing: Easing.out(Easing.cubic),
          }),
          // Settle with bounce
          withSpring(1, { damping: 12, stiffness: 120 }),
        ),
      );

      // BorderRadius: morph from circle to rectangle
      borderRadius.value = withDelay(
        delay,
        withSequence(
          // Stay circular during burst
          withTiming(100, { duration: duration * 0.4 }),
          // Transform to rectangle
          withTiming(0, {
            duration: duration * 0.6,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      );

      // Rotation: faster initial spin then settle
      rotate.value = withDelay(
        delay,
        withSequence(
          // Fast spin during burst
          withTiming(rotation * 0.7, {
            duration: duration * 0.5,
            easing: Easing.out(Easing.cubic),
          }),
          // Slow down and straighten
          withTiming(0, {
            duration: duration * 0.5,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
      );

      // X movement: explosive burst then float to position
      translateX.value = withDelay(
        delay,
        withSequence(
          // Burst outward from button center
          withTiming(startX + xOffset * 1.2, {
            duration: duration * 0.35,
            easing: Easing.out(Easing.back(1.5)),
          }),
          // Float to final grid position
          withTiming(finalX, {
            duration: duration * 0.65,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          }),
        ),
      );

      // Y movement: explosive burst then float to position
      translateY.value = withDelay(
        delay,
        withSequence(
          // Burst outward from button center
          withTiming(startY + yOffset * 1.2, {
            duration: duration * 0.35,
            easing: Easing.out(Easing.back(1.5)),
          }),
          // Float to final grid position
          withTiming(finalY, {
            duration: duration * 0.65,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          }),
        ),
      );
    } else {
      // Reverse animation - particles converge back to form the button
      const reverseDuration = 380; // Slightly faster for snappy reform
      const reverseDelay = delayReverse * 60; // Staggered convergence

      // Opacity: maintain visibility until near the end
      opacity.value = withDelay(
        reverseDelay + reverseDuration * 0.6,
        withTiming(0, { duration: reverseDuration * 0.4 }),
      );

      // Scale: shrink as particles converge - creates implosion effect
      scale.value = withDelay(
        reverseDelay,
        withSequence(
          withTiming(0.9, { duration: reverseDuration * 0.2 }),
          withTiming(0.3, {
            duration: reverseDuration * 0.5,
            easing: Easing.in(Easing.cubic),
          }),
          // Final collapse
          withTiming(0, {
            duration: reverseDuration * 0.3,
            easing: Easing.in(Easing.back(2)),
          }),
        ),
      );

      // BorderRadius: rectangle back to circle for the implosion
      borderRadius.value = withDelay(
        reverseDelay,
        withTiming(100, {
          duration: reverseDuration * 0.7,
          easing: Easing.inOut(Easing.ease),
        }),
      );

      // Rotation: reverse spin as particles spiral inward
      rotate.value = withDelay(
        reverseDelay,
        withSequence(
          withTiming(-rotation * 0.4, {
            duration: reverseDuration * 0.5,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(0, {
            duration: reverseDuration * 0.5,
            easing: Easing.in(Easing.cubic),
          }),
        ),
      );

      // X movement: spiral back to button origin
      translateX.value = withDelay(
        reverseDelay,
        withSequence(
          // Spiral through intermediate point
          withTiming(startX + xOffset * 0.5, {
            duration: reverseDuration * 0.4,
            easing: Easing.bezier(0.4, 0.0, 0.6, 1.0),
          }),
          // Accelerate into button center
          withTiming(startX, {
            duration: reverseDuration * 0.6,
            easing: Easing.in(Easing.back(1.2)),
          }),
        ),
      );

      // Y movement: spiral back to button origin
      translateY.value = withDelay(
        reverseDelay,
        withSequence(
          // Spiral through intermediate point
          withTiming(startY + yOffset * 0.5, {
            duration: reverseDuration * 0.4,
            easing: Easing.bezier(0.4, 0.0, 0.6, 1.0),
          }),
          // Accelerate into button center
          withTiming(startY, {
            duration: reverseDuration * 0.6,
            easing: Easing.in(Easing.back(1.2)),
          }),
        ),
      );
    }
  }, [isAnimating]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    width: SCREEN_WIDTH / cols,
    height: SCREEN_HEIGHT / rows,
    backgroundColor: PARTICLE_COLOR,
    opacity: opacity.value * 0.2,
    borderRadius: borderRadius.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={animatedStyle} />;
};

interface ParticleTransitionProps {
  isVisible: boolean;
  fabPosition: { x: number; y: number };
}

/**
 * ParticleTransition - Creates the magical particle effect that connects
 * the floating button to the full-screen overlay.
 *
 * Features:
 * - Particles burst from the button position when opening
 * - Particles spiral back to the button position when closing
 * - Multi-colored particles for a magical gradient effect
 * - Precomputed random values ensure consistent forward/reverse animations
 */
export const ParticleTransition: React.FC<ParticleTransitionProps> = ({
  isVisible,
  fabPosition,
}) => {
  const particleCount = 54; // 6 cols x 9 rows

  /**
   * Precompute random values for each particle so that:
   * 1. Forward and reverse animations are perfectly mirrored
   * 2. Values are stable across re-renders
   * 3. Each particle has unique but deterministic behavior
   */
  const particleRandomValues = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => ({
      // Random offsets for curved paths (reduced for tighter burst)
      xOffset: (Math.random() - 0.5) * 120,
      yOffset: (Math.random() - 0.5) * 120,
      // Random rotation for spinning effect
      rotation: (Math.random() - 0.5) * 480,
      // Staggered delays for wave effect (0-1 normalized)
      delayForward: Math.random(),
      delayReverse: Math.random(),
    }));
  }, [particleCount]);

  return (
    <CyDView className='absolute inset-0 pointer-events-none z-40'>
      {Array.from({ length: particleCount }).map((_, index) => (
        <Particle
          key={index}
          index={index}
          startX={fabPosition.x}
          startY={fabPosition.y}
          isAnimating={isVisible}
          randomValues={particleRandomValues[index]}
        />
      ))}
    </CyDView>
  );
};
