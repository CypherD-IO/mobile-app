import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { Card } from '../../../models/card.model';
import { CardType, PhysicalCardType } from '../../../constants/enum';
import { parseCardTag } from '../../../constants/cardTags';
import { truncate } from 'lodash';

/**
 * Approximate height of each card row (py-16 top + py-16 bottom + text ≈ 52px)
 * plus the 1px separator.
 */
const ITEM_HEIGHT = 53;

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

  /**
   * Returns a cached Pan gesture for the given card.  Gestures are created
   * once per cardId and reused across re-renders so that an active drag is
   * never interrupted by React reconciliation.  All mutable state is read
   * through refs to stay up-to-date.
   */
  const getGesture = useCallback((cardId: string) => {
    if (!gestureCache.current.has(cardId)) {
      const gesture = Gesture.Pan()
        .activateAfterLongPress(200)
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
      {data.map((card, index) => {
        const label = getCardTypeLabel(card);
        const last4 = card.last4 ? `** ${card.last4}` : '';
        const parsed = card.cardTag ? parseCardTag(card.cardTag) : null;
        const isActive = activeId === card.cardId;

        return (
          <React.Fragment key={card.cardId}>
            <GestureDetector gesture={getGesture(card.cardId)}>
              <Animated.View>
                <CyDView
                  className={`flex-row items-center px-[16px] py-[16px] ${
                    isActive ? 'bg-n20' : 'bg-n0'
                  }`}>
                  <CyDMaterialDesignIcons
                    name='menu'
                    size={20}
                    className='text-n100 mr-[12px]'
                  />
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
            </GestureDetector>
            {index < data.length - 1 ? (
              <CyDView className='h-[1px] bg-n30 mx-[16px]' />
            ) : null}
          </React.Fragment>
        );
      })}
    </CyDView>
  );
}
