import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { Card } from '../../../models/card.model';
import { CardType, PhysicalCardType } from '../../../constants/enum';
import { parseCardTag } from '../../../constants/cardTags';
import { truncate } from 'lodash';

const ITEM_HEIGHT = 53;

const LIFT_SPRING: WithSpringConfig = {
  damping: 20,
  stiffness: 300,
  mass: 0.6,
};

interface ArrangeCardsBottomSheetProps {
  cards: Card[];
  onOrderChanged: (reorderedCards: Card[]) => void;
  onClose: () => void;
}

const getCardTypeLabel = (card: Card): string => {
  if (card.type === CardType.PHYSICAL) {
    if (card.physicalCardType === PhysicalCardType.METAL) {
      return 'Metal cards';
    }
    return 'Physical cards';
  }
  return 'Virtual cards';
};

function DraggableCardRow({
  card,
  isActive,
  isDragging,
  gesture,
  isLast,
}: {
  card: Card;
  isActive: boolean;
  isDragging: boolean;
  gesture: ReturnType<typeof Gesture.Pan>;
  isLast: boolean;
}): React.ReactElement {
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.06, LIFT_SPRING);
      lift.value = withSpring(1, LIFT_SPRING);
      opacity.value = withSpring(1, LIFT_SPRING);
    } else if (isDragging) {
      scale.value = withSpring(1, LIFT_SPRING);
      lift.value = withSpring(0, LIFT_SPRING);
      opacity.value = withSpring(0.4, LIFT_SPRING);
    } else {
      scale.value = withSpring(1, LIFT_SPRING);
      lift.value = withSpring(0, LIFT_SPRING);
      opacity.value = withSpring(1, LIFT_SPRING);
    }
  }, [isActive, isDragging, scale, lift, opacity]);
  const animatedStyle = useAnimatedStyle(() => {
    const isLifted = lift.value > 0.5;

    if (Platform.OS === 'android') {
      return {
        transform: [{ scale: scale.value }, { translateY: lift.value * -2 }],
        opacity: opacity.value,
        zIndex: isLifted ? 999 : 0,
      };
    }

    return {
      transform: [{ scale: scale.value }, { translateY: lift.value * -2 }],
      opacity: opacity.value,
      shadowOpacity: lift.value * 0.18,
      shadowRadius: lift.value * 10,
      shadowOffset: { width: 0, height: lift.value * 6 },
      zIndex: isLifted ? 999 : 0,
    };
  });

  const label = getCardTypeLabel(card);
  const last4 = card.last4 ? `** ${card.last4}` : '';
  const parsed = card.cardTag ? parseCardTag(card.cardTag) : null;

  return (
    <React.Fragment>
      <Animated.View style={[liftStyles.row, animatedStyle]}>
        <CyDView className='flex-row items-center px-[16px] py-[16px]'>
          <GestureDetector gesture={gesture}>
            <Animated.View hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
              <CyDMaterialDesignIcons
                name='menu'
                size={20}
                className='text-n100 mr-[12px]'
              />
            </Animated.View>
          </GestureDetector>
          <CyDView className='flex-1 flex-row items-center'>
            <CyDText className='font-manrope text-[14px] font-medium text-base400 leading-[145%] tracking-[-0.6px]'>
              {`${label} ${last4}`}
            </CyDText>
            {parsed?.name ? (
              <CyDText className='ml-[6px] text-[12px] font-medium text-n200'>
                {`(${parsed.emoji ? parsed.emoji + ' ' : ''}${truncate(
                  parsed.name,
                  { length: 14 },
                )})`}
              </CyDText>
            ) : null}
          </CyDView>
        </CyDView>
      </Animated.View>
      {!isLast ? <CyDView className='h-[1px] bg-n30 mx-[16px]' /> : null}
    </React.Fragment>
  );
}

const liftStyles = StyleSheet.create({
  row: {
    backgroundColor: 'transparent',
    shadowColor: '#000',
  },
});

export default function ArrangeCardsBottomSheet({
  cards,
  onOrderChanged,
}: ArrangeCardsBottomSheetProps): React.ReactElement {
  const [data, setData] = useState<Card[]>(cards);
  const [activeId, setActiveId] = useState<string | null>(null);

  const dataRef = useRef<Card[]>(cards);
  const onOrderChangedRef = useRef(onOrderChanged);
  const dragRef = useRef({ startIndex: -1, currentIndex: -1 });
  const gestureCache = useRef(
    new Map<string, ReturnType<typeof Gesture.Pan>>(),
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    onOrderChangedRef.current = onOrderChanged;
  }, [onOrderChanged]);

  const getGesture = useCallback((cardId: string) => {
    if (!gestureCache.current.has(cardId)) {
      const gesture = Gesture.Pan()
        .runOnJS(true)
        .onStart(() => {
          const idx = dataRef.current.findIndex(c => c.cardId === cardId);
          dragRef.current = { startIndex: idx, currentIndex: idx };
          setActiveId(cardId);
        })
        .onUpdate(event => {
          const { startIndex, currentIndex } = dragRef.current;
          const currentData = dataRef.current;
          const targetIndex = Math.min(
            Math.max(
              0,
              startIndex + Math.round(event.translationY / ITEM_HEIGHT),
            ),
            currentData.length - 1,
          );
          if (targetIndex !== currentIndex) {
            const next = [...currentData];
            const [item] = next.splice(currentIndex, 1);
            next.splice(targetIndex, 0, item);
            dataRef.current = next;
            dragRef.current.currentIndex = targetIndex;
            setData(next);
          }
        })
        .onEnd(() => {
          setActiveId(null);
          onOrderChangedRef.current(dataRef.current);
        })
        .onFinalize(() => {
          setActiveId(null);
        });

      gestureCache.current.set(cardId, gesture);
    }
    return gestureCache.current.get(cardId) as ReturnType<typeof Gesture.Pan>;
  }, []);

  return (
    <CyDView className='bg-n0'>
      {data.map((card, index) => (
        <DraggableCardRow
          key={card.cardId}
          card={card}
          isActive={activeId === card.cardId}
          isDragging={activeId !== null}
          gesture={getGesture(card.cardId)}
          isLast={index === data.length - 1}
        />
      ))}
    </CyDView>
  );
}
