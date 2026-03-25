import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { get } from 'lodash';
import { Dimensions, StyleSheet } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import { getCardImageUri } from '../../../core/util';
import {
  CARD_IDS,
  CardProviders,
  CardStatus,
  CardType,
  PhysicalCardType,
} from '../../../constants/enum';
import { GlobalContext } from '../../../core/globalContext';
import { Card } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';
import {
  CyDImageBackground,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import Loading from '../../../components/v2/loading';
import { getCardColorByHex } from '../../../constants/cardColours';
import { CARD_IMAGE_ASPECT_RATIO } from '../../../constants/cardPageV2';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CARD_STACK_POSITIONS = [
  {
    width: SCREEN_WIDTH * 0.926,
    height: (SCREEN_WIDTH * 0.926) / CARD_IMAGE_ASPECT_RATIO,
    top: 43,
  },
  {
    width: SCREEN_WIDTH * 0.781,
    height: (SCREEN_WIDTH * 0.781) / CARD_IMAGE_ASPECT_RATIO,
    top: 27,
  },
  {
    width: SCREEN_WIDTH * 0.651,
    height: (SCREEN_WIDTH * 0.651) / CARD_IMAGE_ASPECT_RATIO,
    top: 10,
  },
];

const NEUTRAL_SHADE = {
  width: SCREEN_WIDTH * 0.585,
  height: (SCREEN_WIDTH * 0.585) / CARD_IMAGE_ASPECT_RATIO,
  top: 0,
  borderRadius: 10,
};

const STACK_CONTAINER_HEIGHT =
  CARD_STACK_POSITIONS[0].top + CARD_STACK_POSITIONS[0].height;

const stackStyles = StyleSheet.create({
  container: {
    height: STACK_CONTAINER_HEIGHT,
    alignItems: 'center',
  },
  neutralShade: {
    position: 'absolute',
    top: NEUTRAL_SHADE.top,
    width: NEUTRAL_SHADE.width,
    height: NEUTRAL_SHADE.height,
    borderRadius: NEUTRAL_SHADE.borderRadius,
    borderWidth: 1,
    borderColor: '#B3B9C4',
    backgroundColor: '#C2C7D0',
  },
  topCardBase: {
    position: 'absolute',
  },
  backgroundCardBase: {
    position: 'absolute',
  },
});

export default function CardScreen({
  currentCardProvider,
  isAccountLocked = false,
  initialCardIndex = 0,
  onCardIndexChange,
  onCardPress,
}: {
  currentCardProvider: CardProviders;
  isAccountLocked: boolean;
  initialCardIndex?: number;
  onCardIndexChange?: (index: number) => void;
  onCardPress?: () => void;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [currentCardIndex, setCurrentCardIndex] =
    useState<number>(initialCardIndex);
  const hasInitializedOrder = useRef(false);

  const getCardImage = (card: Card) => {
    if (currentCardProvider === CardProviders.REAP_CARD) {
      if (isAccountLocked) {
        if (card.type === CardType.PHYSICAL) {
          if (card?.physicalCardType === PhysicalCardType.METAL) {
            return AppImages.RC_METAL_DISABLED;
          }
          return AppImages.RC_PHYSICAL_DISABLED;
        }
        return AppImages.RC_VIRTUAL_DISABLED;
      }
      if (card.type === CardType.VIRTUAL && card.cardColor) {
        const colorData = getCardColorByHex(card.cardColor);
        return colorData.cardImage;
      }
      return getCardImageUri(card.type, card.designId ?? '');
    } else {
      if (card.type === CardType.PHYSICAL) {
        return AppImages.PHYSICAL_CARD_MASTER;
      }
      return AppImages.VIRTUAL_CARD_MASTER;
    }
  };

  const renderItem = ({ item, index }: { item: Card; index: number }) => {
    const card = item;

    const cardContent = (
      <CyDImageBackground
        key={index}
        className='w-full h-full flex flex-col justify-end'
        resizeMode='contain'
        source={getCardImage(card)}
      />
    );

    if (onCardPress) {
      return (
        <CyDTouchView
          key={index}
          className='w-full h-full'
          activeOpacity={0.9}
          onPress={onCardPress}>
          {cardContent}
        </CyDTouchView>
      );
    }

    return cardContent;
  };

  const cardsWithUpgrade = useMemo((): Card[] => {
    const cards = get(
      cardProfile,
      [currentCardProvider, 'cards'],
      [],
    ) as Card[];
    const filtered = cards.filter(
      (card: Card) =>
        card.cardId !== CARD_IDS.METAL_CARD &&
        card.status !== CardStatus.ADDITIONAL_CARD &&
        card.status !== CardStatus.RC_UPGRADABLE &&
        card.status !== CardStatus.HIDDEN,
    );
    const pending = filtered.filter(
      (card: Card) => card.status === CardStatus.PENDING_ACTIVATION,
    );
    const rest = filtered.filter(
      (card: Card) => card.status !== CardStatus.PENDING_ACTIVATION,
    );
    return [...pending, ...rest];
  }, [cardProfile, currentCardProvider]);

  const MAX_VISIBLE_CARDS = 3;
  const [cardOrderIndices, setCardOrderIndices] = useState<number[]>([]);

  useEffect(() => {
    if (cardsWithUpgrade.length > 0 && !hasInitializedOrder.current) {
      setCurrentCardIndex(0);
    }
  }, [cardsWithUpgrade]);

  useEffect(() => {
    if (cardsWithUpgrade.length > 0) {
      const indices = cardsWithUpgrade.map((_: Card, i: number) => i);
      if (hasInitializedOrder.current) {
        const idx = indices.indexOf(currentCardIndex);
        if (idx > 0) {
          const rotated = [...indices.slice(idx), ...indices.slice(0, idx)];
          setCardOrderIndices(rotated);
          return;
        }
      }
      hasInitializedOrder.current = true;
      setCardOrderIndices(indices);
    }
  }, [cardsWithUpgrade, currentCardIndex]);

  useEffect(() => {
    onCardIndexChange?.(currentCardIndex);
  }, [currentCardIndex]);

  return (
    <>
      {cardsWithUpgrade &&
      cardsWithUpgrade.length > 0 &&
      cardOrderIndices.length > 0 ? (
        <CyDView>
          <CyDView className='mt-[8px]' style={stackStyles.container}>
            {cardsWithUpgrade.length > MAX_VISIBLE_CARDS && (
              <CyDView style={stackStyles.neutralShade} />
            )}
            {cardOrderIndices
              .slice(0, MAX_VISIBLE_CARDS)
              .reverse()
              .map((cardIndex: number, stackPosition: number) => {
                const card = cardsWithUpgrade[cardIndex];
                if (!card) return null;

                const isTopCard = stackPosition === 0;
                const posConfig = CARD_STACK_POSITIONS[stackPosition];
                const zIndex = MAX_VISIBLE_CARDS - stackPosition;

                return (
                  <CyDView
                    key={`stack-${cardIndex}-${stackPosition}`}
                    style={[
                      isTopCard
                        ? stackStyles.topCardBase
                        : stackStyles.backgroundCardBase,
                      {
                        zIndex,
                        top: posConfig.top,
                        width: posConfig.width,
                        height: posConfig.height,
                      },
                    ]}>
                    <CyDView className='w-full h-full'>
                      {renderItem({ item: card, index: cardIndex })}
                    </CyDView>
                    {isTopCard && cardsWithUpgrade.length > 3 && (
                      <CyDView className='absolute top-[32px] self-center bg-white/80 px-[14px] py-[4px] rounded-full border border-[#EEEEEE]'>
                        <CyDText className='font-manrope text-[12px] font-medium text-black leading-[150%] tracking-[0px]'>
                          {`${cardsWithUpgrade.length} Cards`}
                        </CyDText>
                      </CyDView>
                    )}
                  </CyDView>
                );
              })}
          </CyDView>
        </CyDView>
      ) : (
        <CyDView>
          <Loading />
        </CyDView>
      )}
    </>
  );
}
