import React, {
  useContext,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { get, has, isEmpty, orderBy } from 'lodash';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { screenTitle } from '../../../constants';
import {
  CARD_IDS,
  CardOperationsAuthType,
  CardProviders,
  CardStatus,
  CardType,
  PhysicalCardType,
} from '../../../constants/enum';
import { GlobalContext } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { Card } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';
import { UserCardDetails } from '../../../models/userCardDetails.interface';
import {
  CyDIcons,
  CyDImage,
  CyDImageBackground,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { CardDesign } from '../../../models/cardDesign.interface';
import Loading from '../../../components/v2/loading';
import { getCardColorByHex } from '../../../constants/cardColours';
import CardTagBadge from '../../../components/CardTagBadge';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const CARD_STACK_POSITIONS = [
  { width: 364, height: 230, top: 43, borderRadius: 10 },
  { width: 307, height: 194, top: 27, borderRadius: 10 },
  { width: 256, height: 163, top: 10, borderRadius: 10 },
] as const;

const NEUTRAL_SHADE = {
  width: 230,
  height: 147,
  top: 0,
  borderRadius: 10,
} as const;

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
    borderColor: '#E0D9CC',
    backgroundColor: '#F0EBE0',
  },
  topCardBase: {
    position: 'absolute',
    borderRadius: CARD_STACK_POSITIONS[0].borderRadius,
    shadowColor: '#002AC1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 17,
    elevation: 8,
    overflow: 'hidden',
  },
  backgroundCardBase: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#E0D9CC',
    overflow: 'hidden',
  },
  cardImageBorderRadius: {
    borderRadius: 10,
  },
});

export default function CardScreen({
  navigation,
  currentCardProvider,
  onGetAdditionalCard,
  onPressActivateCard,
  refreshProfile,
  cardDesignData,
  isAccountLocked = false,
  initialCardIndex = 0,
  onCardIndexChange,
}: {
  navigation: any;
  currentCardProvider: CardProviders;
  onGetAdditionalCard: () => void;
  onPressActivateCard: (card: any) => void;
  refreshProfile: () => void;
  cardDesignData: CardDesign;
  isAccountLocked: boolean;
  initialCardIndex?: number;
  onCardIndexChange?: (index: number) => void;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const { getWithAuth } = useAxios();
  const [userCardDetails, setUserCardDetails] = useState<UserCardDetails>({
    cards: [],
    personId: '',
    currentCardRevealedDetails: {
      cardNumber: 'XXXX XXXX XXXX',
      type: t('VIRTUAL'),
      cvv: 'XXX',
      expiryMonth: 'XX',
      expiryYear: 'XX',
      cardId: '',
    },
    hideCardDetails: true,
    showCVVAndExpiry: false,
    isFetchingCardDetails: false,
  });
  const [currentCardIndex, setCurrentCardIndex] =
    useState<number>(initialCardIndex);
  const hasInitializedOrder = useRef(false);
  const [isRcUpgradableCardShown, setIsRcUpgradableCardShown] = useState(false);

  useEffect(() => {
    const checkIsRcUpgradableCardShown = async () => {
      setIsRcUpgradableCardShown(
        !has(cardProfile, CardProviders.REAP_CARD) &&
          has(cardProfile, CardProviders.PAYCADDY),
      );
    };

    void checkIsRcUpgradableCardShown();

    if (isFocused && !isEmpty(currentCardProvider)) {
      const cardConfig = get(cardProfile, currentCardProvider);
      if (cardConfig?.cards) {
        const { type }: { last4: string; type: string } =
          cardConfig?.cards?.[0];
        setUserCardDetails({
          ...userCardDetails,
          hideCardDetails: true,
          showCVVAndExpiry: false,
          cards: orderBy(
            cardConfig?.cards,
            card => (card.status === CardStatus.ACTIVE ? 0 : 1),
            'asc',
          ),
          // `personId` is required by downstream card flows. Guard against undefined values
          // (some backend responses omit it for certain providers).
          personId: cardConfig.personId ?? '',
          currentCardRevealedDetails: {
            cardNumber: 'XXXX XXXX XXXX ',
            type,
            cvv: 'XXX',
            expiryMonth: 'XX',
            expiryYear: 'XX',
            cardId: '',
          },
        });
        void getTrackingDetails();
      }
    }
  }, [currentCardProvider, isFocused, cardProfile]);

  const getCardImage = (card: Card) => {
    if (currentCardProvider === CardProviders.REAP_CARD) {
      if (isAccountLocked) {
        if (card.type === CardType.PHYSICAL) {
          if (card?.physicalCardType === PhysicalCardType.METAL) {
            return AppImages.RC_METAL_DISABLED;
          }
          return AppImages.RC_PHYSICAL_DISABLED;
        } else if (card.type === CardType.VIRTUAL) {
          return AppImages.RC_VIRTUAL_DISABLED;
        }
        return AppImages.RC_VIRTUAL_DISABLED;
      }
      if (card.status === CardStatus.ADDITIONAL_CARD) {
        return AppImages.ADDITIONAL_CARD;
      }
      if (card.type === CardType.VIRTUAL && card.cardColor) {
        const colorData = getCardColorByHex(card.cardColor);
        return colorData.cardImage;
      }
      const cardImage = `${CYPHER_CARD_IMAGES}/${card.type}-${
        card.designId ?? ''
      }.png`;
      return {
        uri: cardImage,
      };
    } else {
      if (card.status === CardStatus.RC_UPGRADABLE) {
        return AppImages.RC_VIRTUAL;
      } else if (card.type === CardType.PHYSICAL) {
        return AppImages.PHYSICAL_CARD_MASTER;
      } else {
        return AppImages.VIRTUAL_CARD_MASTER;
      }
    }
  };

  const renderItem = ({ item, index }: { item: Card; index: number }) => {
    const card = item;
    // Some API models type `status` as string; normalize to our enum for comparisons.
    const cardStatus = card?.status as CardStatus;

    return (
      <CyDImageBackground
        key={index}
        className={clsx('w-full h-full flex flex-col rounded-[10px]', {
          'justify-center items-center':
            [
              CardStatus.IN_ACTIVE,
              CardStatus.HIDDEN,
              CardStatus.BLOCKED,
              CardStatus.RC_UPGRADABLE,
            ].includes(cardStatus) || isAccountLocked,
          'justify-end': ![
            CardStatus.IN_ACTIVE,
            CardStatus.HIDDEN,
            CardStatus.BLOCKED,
            CardStatus.RC_UPGRADABLE,
          ].includes(cardStatus),
        })}
        resizeMode='cover'
        imageStyle={stackStyles.cardImageBorderRadius}
        source={getCardImage(card)}>
        {card.cardTag &&
          card.status !== CardStatus.HIDDEN &&
          card.status !== CardStatus.ADDITIONAL_CARD && (
            <CyDView className='absolute top-[105px] right-[14px]'>
              <CardTagBadge tag={card.cardTag} />
            </CyDView>
          )}
        {(card.status === CardStatus.IN_ACTIVE ||
          card.status === CardStatus.BLOCKED) && (
          <CyDTouchView
            className='flex items-center bg-base400 p-[6px] rounded-[6px]'
            onPress={() => {
              navigation.navigate(screenTitle.CARD_UNLOCK_AUTH, {
                onSuccess: () => {
                  showModal('state', {
                    type: 'success',
                    title: t('Card Successfully Activated'),
                    description: `Your card is active now!`,
                    onSuccess: hideModal,
                    onFailure: hideModal,
                  });
                },
                currentCardProvider,
                card,
                authType:
                  card.status === CardStatus.BLOCKED
                    ? CardOperationsAuthType.UNBLOCK
                    : CardOperationsAuthType.UNLOCK,
              });
            }}>
            <CyDIcons name='freeze' size={32} className='text-n0' />
            <CyDText className='font-extrabold text-[12px] mt-[4px] text-n0'>
              Frozen
            </CyDText>
          </CyDTouchView>
        )}
        {isAccountLocked && (
          <CyDView className='flex flex-row items-center bg-white px-[12px] py-[6px] rounded-[6px]'>
            <CyDIcons
              name='lock-1'
              size={20}
              className='text-red400 mr-[4px]'
            />
            <CyDText className='font-medium mt-[1px] text-red400 text-[12px]'>
              {t('LOCKED')}
            </CyDText>
          </CyDView>
        )}
        {card.status === CardStatus.RC_UPGRADABLE && (
          <CyDView className='flex flex-row items-center bg-n30 px-[12px] py-[6px] rounded-[6px]'>
            <CyDImage
              source={AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW}
              className='h-[24px] w-[24px]'
              resizeMode='contain'
            />
            <CyDText className='font-extrabold mt-[1px] ml-[2px]'>
              {'Upgrade to a new card'}
            </CyDText>
          </CyDView>
        )}
        {card.status !== CardStatus.HIDDEN &&
          card.status !== CardStatus.RC_UPGRADABLE &&
          card.status !== CardStatus.ADDITIONAL_CARD &&
          cardProfile.provider === CardProviders.REAP_CARD && (
            <CyDView className='absolute bottom-[14px] left-[14px]'>
              <CyDText
                className='font-semibold text-[14px]'
                style={{
                  color:
                    card.type === CardType.VIRTUAL && card.cardColor
                      ? getCardColorByHex(card.cardColor).textColor
                      : card.type === CardType.PHYSICAL
                      ? '#000000'
                      : '#FFFFFF',
                }}>
                {' xxxx ' + card.last4}
              </CyDText>
            </CyDView>
          )}
        {card.status === CardStatus.ADDITIONAL_CARD && (
          <CyDTouchView
            className='bg-transparent w-full h-full '
            onPress={() => {
              onGetAdditionalCard();
            }}
          />
        )}
      </CyDImageBackground>
    );
  };

  const cardsWithUpgrade = useMemo(() => {
    // dont show metal card in teh stack if it is not issued yet
    const actualCards = userCardDetails.cards
      .filter(card => card.cardId !== CARD_IDS.METAL_CARD)
      .map(card => card);

    const hasHiddenCard = actualCards.some(
      card => card.status === CardStatus.HIDDEN,
    );

    if (
      actualCards.length > 0 &&
      currentCardProvider === CardProviders.REAP_CARD &&
      !hasHiddenCard
    ) {
      actualCards.push({
        cardId: '',
        bin: '',
        last4: '',
        network: 'rc',
        status: CardStatus.ADDITIONAL_CARD,
        type: CardType.PHYSICAL,
        designId: 'a8b91672-ba1d-4e70-8f19-eaf50797eb22',
        cardProvider: currentCardProvider,
      });
      if (!hasInitializedOrder.current) {
        setCurrentCardIndex(0);
      }
    }

    if (isRcUpgradableCardShown) {
      actualCards.unshift({
        cardId: '',
        bin: '',
        last4: '',
        network: 'rc',
        cardProvider: currentCardProvider,
        status: CardStatus.RC_UPGRADABLE,
        type: CardType.VIRTUAL,
        designId: 'a8b91672-ba1d-4e70-8f19-eaf50797eb22',
      });
      if (!hasInitializedOrder.current) {
        setCurrentCardIndex(1);
      }
    }
    return actualCards;
  }, [currentCardProvider, userCardDetails.cards, cardProfile]);

  const getTrackingDetails = async (): Promise<any> => {
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/tracking`,
    );
    if (!response.error) {
      const tempTrackingDetails = response.data;
      setTrackingDetails(tempTrackingDetails);
    }
    return response;
  };

  const MAX_VISIBLE_CARDS = 3;
  const [cardOrderIndices, setCardOrderIndices] = useState<number[]>([]);
  const [pendingEntryAnimation, setPendingEntryAnimation] = useState(false);
  const [pendingEntryFromBack, setPendingEntryFromBack] = useState(false);

  const translateY = useSharedValue(0);
  const dragScale = useSharedValue(1);

  const topCardOpacity = useSharedValue(1);
  const topCardZIndex = useSharedValue(10);

  const isAnimating = useSharedValue(false);
  const SWIPE_THRESHOLD = 80;

  const EXIT_DURATION = 350;
  useEffect(() => {
    if (cardsWithUpgrade && cardsWithUpgrade.length > 0) {
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
  }, [cardsWithUpgrade]);

  useEffect(() => {
    onCardIndexChange?.(currentCardIndex);
  }, [currentCardIndex]);

  const cycleCardToBack = (): void => {
    setCardOrderIndices(prev => {
      if (prev.length <= 1) return prev;
      const [topIndex, ...rest] = prev;
      const newOrder = [...rest, topIndex];
      setCurrentCardIndex(newOrder[0]);
      return newOrder;
    });

    translateY.value = 0;
    dragScale.value = 0.843;
    topCardOpacity.value = 1;
    topCardZIndex.value = 10;

    setPendingEntryFromBack(true);
  };

  const cycleCardToFront = (): void => {
    setCardOrderIndices(prev => {
      if (prev.length <= 1) return prev;
      const lastIndex = prev[prev.length - 1];
      const newOrder = [lastIndex, ...prev.slice(0, -1)];
      setCurrentCardIndex(newOrder[0]);
      return newOrder;
    });

    setPendingEntryAnimation(true);
  };

  useLayoutEffect(() => {
    if (!pendingEntryAnimation) return;
    setPendingEntryAnimation(false);

    translateY.value = -89;
    dragScale.value = 0.63;
    topCardOpacity.value = 0;
    topCardZIndex.value = 10;
    translateY.value = withSequence(
      withTiming(-110, { duration: 150, easing: Easing.out(Easing.ease) }),
      withSpring(0, { damping: 14, stiffness: 120, mass: 0.8 }),
    );
    dragScale.value = withSpring(
      1,
      { damping: 14, stiffness: 120, mass: 0.8 },
      () => {
        isAnimating.value = false;
      },
    );
    topCardOpacity.value = withTiming(1, { duration: 200 });
  }, [pendingEntryAnimation]);

  useLayoutEffect(() => {
    if (!pendingEntryFromBack) return;
    setPendingEntryFromBack(false);

    dragScale.value = withSpring(
      1,
      { damping: 14, stiffness: 120, mass: 0.8 },
      () => {
        isAnimating.value = false;
      },
    );
  }, [pendingEntryFromBack]);

  const panGesture = Gesture.Pan()
    .enabled(!isAccountLocked)
    .onUpdate(event => {
      if (isAnimating.value) return;
      const MAX_DRAG_DOWN = 120;
      const MAX_DRAG_UP = -150;
      const clampedY = Math.min(
        Math.max(event.translationY, MAX_DRAG_UP),
        MAX_DRAG_DOWN,
      );
      translateY.value = clampedY;
      dragScale.value = 1 - Math.abs(clampedY) * 0.001;
    })
    .onEnd(event => {
      if (isAnimating.value) return;

      const commitEasing = Easing.out(Easing.ease);

      if (event.translationY < -SWIPE_THRESHOLD) {
        isAnimating.value = true;
        topCardZIndex.value = -1;

        translateY.value = withTiming(-89, {
          duration: EXIT_DURATION,
          easing: commitEasing,
        });

        dragScale.value = withTiming(0.63, {
          duration: EXIT_DURATION,
          easing: commitEasing,
        });

        topCardOpacity.value = withTiming(
          0,
          { duration: EXIT_DURATION, easing: commitEasing },
          () => {
            scheduleOnRN(cycleCardToBack);
          },
        );
      } else if (event.translationY > SWIPE_THRESHOLD) {
        isAnimating.value = true;
        scheduleOnRN(cycleCardToFront);
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        dragScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      }
    });

  const topCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: dragScale.value }],
    opacity: topCardOpacity.value,
    zIndex: topCardZIndex.value,
  }));

  const nonTopCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 0 }, { scale: 1 }],
    opacity: 1,
  }));

  const onPressFundCard = (): void => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      currentCardProvider,
      currentCardIndex: 0,
    });
  };
  return (
    <>
      {cardsWithUpgrade &&
      cardsWithUpgrade.length > 0 &&
      cardOrderIndices.length > 0 ? (
        <CyDView>
          <CyDView className='mt-[8px]' style={stackStyles.container}>
            <CyDView style={stackStyles.neutralShade} />
            {cardOrderIndices
              .slice(0, MAX_VISIBLE_CARDS)
              .map((cardIndex: number, stackPosition: number) => {
                const card = cardsWithUpgrade[cardIndex];
                if (!card) return null;

                const isTopCard = stackPosition === 0;
                const posConfig = CARD_STACK_POSITIONS[stackPosition];
                const zIndex = MAX_VISIBLE_CARDS - stackPosition;

                return (
                  <GestureDetector
                    key={`stack-${cardIndex}-${stackPosition}`}
                    gesture={
                      isTopCard ? panGesture : Gesture.Pan().enabled(false)
                    }>
                    <Animated.View
                      entering={!isTopCard ? FadeIn.duration(300) : undefined}
                      style={[
                        isTopCard
                          ? stackStyles.topCardBase
                          : stackStyles.backgroundCardBase,
                        {
                          zIndex,
                          top: posConfig.top,
                          width: posConfig.width,
                          height: posConfig.height,
                          borderRadius: posConfig.borderRadius,
                        },
                        isTopCard
                          ? topCardAnimatedStyle
                          : nonTopCardAnimatedStyle,
                      ]}>
                      <CyDTouchView
                        activeOpacity={isTopCard ? 0.95 : 1}
                        disabled={!isTopCard}
                        className='w-full h-full'
                        onPress={() => {
                          if (isTopCard) {
                            navigation.navigate(screenTitle.CARD_CONTROLS, {
                              cardId: card.cardId,
                              currentCardProvider,
                              card,
                              showAsSheet: true,
                            });
                          }
                        }}>
                        {renderItem({ item: card, index: cardIndex })}
                      </CyDTouchView>
                    </Animated.View>
                  </GestureDetector>
                );
              })}
          </CyDView>

          <CyDView className='items-center mt-[4px] mb-[2px]'>
            <CyDText className='text-[13px] text-n100 font-medium'>
              {`${
                cardsWithUpgrade
                  .slice(0, currentCardIndex + 1)
                  .filter(c => c.status !== CardStatus.ADDITIONAL_CARD).length
              }/${
                cardsWithUpgrade.filter(
                  c => c.status !== CardStatus.ADDITIONAL_CARD,
                ).length
              }`}
            </CyDText>
          </CyDView>

          <CyDView className='flex flex-row justify-center items-center gap-x-[12px] mt-[8px] mx-[16px]'>
            <CyDTouchView
              className='flex-1 flex-row items-center justify-center bg-p50 py-[10px] px-[16px] rounded-[24px]'
              onPress={onPressFundCard}
              disabled={isAccountLocked}>
              <CyDText className='font-manrope font-semibold text-[14px] text-black mr-[6px] leading-[145%] tracking-[-0.6px]'>
                {t('LOAD_CARD')}
              </CyDText>
              <CyDMaterialDesignIcons
                name='plus-circle'
                size={20}
                className='text-black'
              />
            </CyDTouchView>

            <CyDTouchView
              className='flex-1 flex-row items-center justify-center bg-n30 py-[12px] px-[16px] rounded-[24px]'
              onPress={() => {
                // "View all cards" action – will be connected to a full card list page later
              }}>
              <CyDText className='font-manrope font-semibold text-[14px] text-base400 mr-[6px] leading-[145%] tracking-[-0.6px]'>
                {t('VIEW_ALL_CARDS')}
              </CyDText>
              <CyDMaterialDesignIcons
                name='arrow-down-circle'
                size={20}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='items-center mt-[4px]'>
            <CyDText className='font-manrope font-semibold text-[14px] text-n100 mr-[6px] leading-[145%] tracking-[-0.6px]'>
              {t('TAP_CARD_HINT')}
            </CyDText>
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
