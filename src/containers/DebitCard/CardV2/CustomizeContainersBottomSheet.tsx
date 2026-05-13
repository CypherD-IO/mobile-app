import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { setCardContainerOrder } from '../../../core/asyncStorage';

const ITEM_HEIGHT = 53;

const LIFT_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
  mass: 0.6,
};

export interface CardContainer {
  id: string;
  label: string;
}

export const DEFAULT_CARD_CONTAINERS: CardContainer[] = [
  { id: 'spend_analytics', label: 'Spend analytics' },
  { id: 'recent_transactions', label: 'Recent Transactions' },
  { id: 'spend_reward', label: 'Spend Reward' },
];

interface DraggableContainerRowProps {
  container: CardContainer;
  index: number;
  totalItems: number;
  isActive: boolean;
  isDragging: boolean;
  onReorder: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function DraggableContainerRow({
  container,
  index,
  totalItems,
  isActive,
  isDragging,
  onReorder,
  onDragStart,
  onDragEnd,
}: DraggableContainerRowProps): React.ReactElement {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rowOpacity = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.06, LIFT_SPRING);
      lift.value = withSpring(1, LIFT_SPRING);
      rowOpacity.value = withSpring(1, LIFT_SPRING);
    } else if (isDragging) {
      scale.value = withSpring(1, LIFT_SPRING);
      lift.value = withSpring(0, LIFT_SPRING);
      rowOpacity.value = withSpring(0.4, LIFT_SPRING);
    } else {
      scale.value = withSpring(1, LIFT_SPRING);
      lift.value = withSpring(0, LIFT_SPRING);
      rowOpacity.value = withSpring(1, LIFT_SPRING);
    }
  }, [isActive, isDragging, scale, lift, rowOpacity]);

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      onDragStart();
    })
    .onUpdate(e => {
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      const movedPositions = Math.round(translateY.value / ITEM_HEIGHT);
      const newIndex = Math.max(
        0,
        Math.min(totalItems - 1, index + movedPositions),
      );

      translateY.value = 0;
      onDragEnd();

      if (newIndex !== index) {
        onReorder(index, newIndex);
      }
    })
    .onFinalize(() => {
      translateY.value = 0;
      onDragEnd();
    });

  const animatedStyle = useAnimatedStyle(() => {
    const isLifted = lift.value > 0.5;

    if (Platform.OS === 'android') {
      return {
        transform: [
          { translateY: translateY.value },
          { scale: scale.value },
        ],
        opacity: rowOpacity.value,
        zIndex: isLifted ? 999 : 0,
      };
    }

    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: rowOpacity.value,
      shadowColor: '#000',
      shadowOpacity: lift.value * 0.18,
      shadowRadius: lift.value * 10,
      shadowOffset: { width: 0, height: lift.value * 6 },
      zIndex: isLifted ? 999 : 0,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <CyDView className='flex-row items-center px-[16px] py-[16px] bg-n0'>
        <GestureDetector gesture={gesture}>
          <Animated.View hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
            <CyDMaterialDesignIcons
              name='menu'
              size={20}
              className='text-n100 mr-[12px]'
            />
          </Animated.View>
        </GestureDetector>
        <CyDText className='font-manrope text-[14px] font-medium text-base400 leading-[145%] tracking-[-0.6px]'>
          {container.label}
        </CyDText>
      </CyDView>
      <CyDView className='h-[1px] bg-n30 mx-[16px]' />
    </Animated.View>
  );
}

interface CustomizeContainersBottomSheetProps {
  containers: CardContainer[];
  onOrderChanged: (reordered: CardContainer[]) => void;
  onClose: () => void;
}

export default function CustomizeContainersBottomSheet({
  containers,
  onOrderChanged,
}: CustomizeContainersBottomSheetProps): React.ReactElement {
  const [data, setData] = useState<CardContainer[]>(containers);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number): void => {
      setData(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        onOrderChanged(next);
        void setCardContainerOrder(next.map(c => c.id));
        return next;
      });
    },
    [onOrderChanged],
  );

  return (
    <CyDView className='bg-n0'>
      {data.map((container, idx) => (
        <DraggableContainerRow
          key={container.id}
          container={container}
          index={idx}
          totalItems={data.length}
          isActive={activeIndex === idx}
          isDragging={activeIndex !== null}
          onReorder={handleReorder}
          onDragStart={() => setActiveIndex(idx)}
          onDragEnd={() => setActiveIndex(null)}
        />
      ))}
    </CyDView>
  );
}
