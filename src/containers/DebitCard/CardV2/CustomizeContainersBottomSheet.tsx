import React, { useCallback, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { setCardContainerOrder } from '../../../core/asyncStorage';

const ITEM_HEIGHT = 53;

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
  onReorder: (from: number, to: number) => void;
}

function DraggableContainerRow({
  container,
  index,
  totalItems,
  onReorder,
}: DraggableContainerRowProps): React.ReactElement {
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const gesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(200)
    .onStart(() => {
      isActive.value = true;
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
      isActive.value = false;

      if (newIndex !== index) {
        onReorder(index, newIndex);
      }
    })
    .onFinalize(() => {
      translateY.value = 0;
      isActive.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isActive.value ? 999 : 0,
    elevation: isActive.value ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <CyDView className='flex-row items-center px-[16px] py-[16px] bg-n0'>
          <CyDMaterialDesignIcons
            name='menu'
            size={20}
            className='text-n100 mr-[12px]'
          />
          <CyDText className='font-manrope text-[14px] font-medium text-base400 leading-[145%] tracking-[-0.6px]'>
            {container.label}
          </CyDText>
        </CyDView>
        <CyDView className='h-[1px] bg-n30 mx-[16px]' />
      </Animated.View>
    </GestureDetector>
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
          onReorder={handleReorder}
        />
      ))}
    </CyDView>
  );
}
