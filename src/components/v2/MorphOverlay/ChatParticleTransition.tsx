import React, { useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { CyDView } from '../../../styles/tailwindComponents';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Number of particles for the disintegration effect
const PARTICLE_COUNT = 60;

// Particle configuration
interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  delay: number;
  color: string;
}

interface ChatParticleTransitionProps {
  isTransitioning: boolean; // true = chat to widget, false = widget to chat
  direction: 'toWidget' | 'toChat' | 'none';
  chatAreaTop: number; // Top position of chat area
  chatAreaHeight: number; // Height of chat area
  widgetAreaTop: number; // Top position where widget will appear
  widgetAreaHeight: number; // Height of widget area
  onTransitionComplete?: () => void;
}

// Individual particle component with its own animation
const ParticleItem: React.FC<{
  particle: Particle;
  progress: Animated.SharedValue<number>;
  direction: 'toWidget' | 'toChat' | 'none';
}> = ({ particle, progress, direction }) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Calculate intermediate random positions for organic movement
    const midX =
      (particle.startX + particle.endX) / 2 +
      (Math.random() - 0.5) * 100 * (particle.id % 3 === 0 ? 1 : -1);
    const midY = (particle.startY + particle.endY) / 2;

    // Determine actual start and end based on direction
    const actualStartX =
      direction === 'toWidget' ? particle.startX : particle.endX;
    const actualStartY =
      direction === 'toWidget' ? particle.startY : particle.endY;
    const actualEndX =
      direction === 'toWidget' ? particle.endX : particle.startX;
    const actualEndY =
      direction === 'toWidget' ? particle.endY : particle.startY;

    // Interpolate position with bezier-like curve through midpoint
    const x = interpolate(
      progress.value,
      [0, 0.5, 1],
      [actualStartX, midX, actualEndX],
    );

    const y = interpolate(
      progress.value,
      [0, 0.5, 1],
      [actualStartY, midY, actualEndY],
    );

    // Scale animation - particles shrink/grow during transition
    const scale = interpolate(
      progress.value,
      [0, 0.3, 0.7, 1],
      direction === 'toWidget' ? [1, 1.3, 0.8, 0.6] : [0.6, 0.8, 1.3, 1],
    );

    // Opacity animation
    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.9, 1],
      [1, 1, 1, 0.8],
    );

    return {
      position: 'absolute',
      left: x,
      top: y,
      width: particle.size,
      height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      opacity,
      transform: [{ scale }],
    };
  });

  return <Animated.View style={animatedStyle} />;
};

export const ChatParticleTransition: React.FC<ChatParticleTransitionProps> = ({
  isTransitioning,
  direction,
  chatAreaTop,
  chatAreaHeight,
  widgetAreaTop,
  widgetAreaHeight,
  onTransitionComplete,
}) => {
  const progress = useSharedValue(0);

  // Generate particles distributed across chat area that will move to widget area
  const particles = useMemo<Particle[]>(() => {
    const result: Particle[] = [];
    const chatCenterX = SCREEN_WIDTH / 2;
    const chatCenterY = chatAreaTop + chatAreaHeight / 2;
    const widgetCenterX = SCREEN_WIDTH / 2;
    const widgetCenterY = widgetAreaTop + widgetAreaHeight / 2;

    // Color palette matching the UI
    const colors = [
      '#8B5CF6', // Purple (primary)
      '#A78BFA', // Light purple
      '#C4B5FD', // Lighter purple
      '#7C3AED', // Darker purple
      '#6D28D9', // Deep purple
      '#DDD6FE', // Very light purple
      '#FFFFFF', // White
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute particles in chat area (clustered around center with spread)
      const chatSpreadX = (Math.random() - 0.5) * (SCREEN_WIDTH - 80);
      const chatSpreadY = (Math.random() - 0.5) * Math.min(chatAreaHeight, 200);

      // Target positions in widget area (clustered formation)
      const widgetSpreadX = (Math.random() - 0.5) * (SCREEN_WIDTH - 100);
      const widgetSpreadY =
        (Math.random() - 0.5) * Math.min(widgetAreaHeight, 300);

      result.push({
        id: i,
        startX: chatCenterX + chatSpreadX,
        startY: chatCenterY + chatSpreadY,
        endX: widgetCenterX + widgetSpreadX,
        endY: widgetCenterY + widgetSpreadY,
        size: 4 + Math.random() * 8, // Random size between 4-12
        delay: Math.random() * 150, // Staggered delay
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    return result;
  }, [chatAreaTop, chatAreaHeight, widgetAreaTop, widgetAreaHeight]);

  // Handle transition animation
  useEffect(() => {
    if (isTransitioning && direction !== 'none') {
      // Reset and animate
      progress.value = 0;
      progress.value = withDelay(
        50,
        withTiming(
          1,
          {
            duration: 600,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          },
          finished => {
            if (finished && onTransitionComplete) {
              runOnJS(onTransitionComplete)();
            }
          },
        ),
      );
    }
  }, [isTransitioning, direction]);

  // Don't render if not transitioning
  if (!isTransitioning || direction === 'none') {
    return null;
  }

  return (
    <CyDView
      className='absolute inset-0 z-[58]'
      pointerEvents='none'
      style={{ overflow: 'hidden' }}>
      {particles.map(particle => (
        <ParticleItem
          key={particle.id}
          particle={particle}
          progress={progress}
          direction={direction}
        />
      ))}
    </CyDView>
  );
};
