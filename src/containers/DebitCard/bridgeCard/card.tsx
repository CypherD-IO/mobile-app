import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useLayoutEffect,
  useState,
} from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import crypto from 'crypto';
import { get, has, isEmpty, isUndefined, orderBy, trim } from 'lodash';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import CardDetailsModal from '../../../components/v2/card/cardDetailsModal';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import HiddenCardModal from '../../../components/v2/HiddenCardModal';
import { screenTitle } from '../../../constants';
import {
  ButtonType,
  CARD_IDS,
  CardOperationsAuthType,
  CardProviders,
  CardStatus,
  CardType,
  GlobalContextType,
  PhysicalCardType,
} from '../../../constants/enum';
import {
  getCardRevealReuseToken,
  setCardRevealReuseToken,
} from '../../../core/asyncStorage';
import { GlobalContext } from '../../../core/globalContext';
import axios, { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import {
  copyToClipboard,
  decryptWithSecretKey,
  sleepFor,
} from '../../../core/util';
import { Card } from '../../../models/card.model';
import { CardProfile } from '../../../models/cardProfile.model';
import { UserCardDetails } from '../../../models/userCardDetails.interface';
import {
  CyDFastImage,
  CyDIcons,
  CyDImage,
  CyDImageBackground,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../utilities/toastUtility';
import { CardDesign } from '../../../models/cardDesign.interface';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';
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

interface CardSecrets {
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  cardNumber: string;
}

const initialCardDetails: CardSecrets = {
  cvv: 'xxx',
  expiryMonth: 'xx',
  expiryYear: 'xxxx',
  cardNumber: 'xxxx xxxx xxxx xxxx',
};

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
}: {
  navigation: any;
  currentCardProvider: CardProviders;
  onGetAdditionalCard: () => void;
  onPressActivateCard: (card: any) => void;
  refreshProfile: () => void;
  cardDesignData: CardDesign;
  isAccountLocked: boolean;
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
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [trackingDetails, setTrackingDetails] = useState({});
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
      setCurrentCardIndex(0);
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
      setCurrentCardIndex(1);
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
      setCardOrderIndices(indices);
    }
  }, [cardsWithUpgrade]);

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
                            // Card tap handler – will navigate to detail page (to be configured later)
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
              <CyDText className='font-manrope font-semibold text-[14px] text-black mr-[6px] leading-[145%] tracking-[-0.6px]'>
                {t('VIEW_ALL_CARDS')}
              </CyDText>
              <CyDMaterialDesignIcons
                name='arrow-down-circle'
                size={20}
                className='text-black'
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

const RenderCardActions = ({
  card,
  cardProvider,
  navigation,
  refreshProfile,
  onGetAdditionalCard,
  onPressActivateCard,
  cardProfile,
  trackingDetails,
  cardDesignData,
  isAccountLocked,
}: {
  card: Card;
  cardProvider: CardProviders;
  navigation: any;
  refreshProfile: () => void;
  onGetAdditionalCard: () => void;
  onPressActivateCard: (card: Card) => void;
  cardProfile: CardProfile;
  trackingDetails: any;
  cardDesignData: CardDesign;
  isAccountLocked: boolean;
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const { postWithAuth, patchWithAuth } = useAxios();
  const [cardDetailsModal, setCardDetailsModal] = useState({
    showCardDetailsModal: false,
    card,
    cardDetails: initialCardDetails,
    webviewUrl: '',
    userName: '',
  });
  const [showHiddenCardModal, setShowHiddenCardModal] =
    useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const [isFetchingCardDetails, setIsFetchingCardDetails] =
    useState<boolean>(false);
  const [isStatusLoading, setIsStatusLoading] = useState<boolean>(false);
  const { type, last4, status, cardId } = card;
  const isFocused = useIsFocused();
  const globalContext = useContext<any>(GlobalContext);
  const [isRcUpgradableCardShown, setIsRcUpgradableCardShown] = useState(false);

  useEffect(() => {
    const checkIsRcUpgradableCardShown = async () => {
      setIsRcUpgradableCardShown(
        !has(cardProfile, CardProviders.REAP_CARD) &&
          has(cardProfile, CardProviders.PAYCADDY),
      );
    };

    void checkIsRcUpgradableCardShown();

    if (isFocused && isFetchingCardDetails) {
      setIsFetchingCardDetails(false);
    }
  }, [isFocused]);

  const copyTrackingNumber = (trackingNumber: string) => {
    copyToClipboard(trackingNumber);
    showToast('Tracking number copied to clipboard');
  };

  const RenderTrackingItem = useCallback(() => {
    const physicalCard = get(trackingDetails, cardId);
    const trackingNumber = get(trackingDetails, cardId)?.trackingId;
    return (
      <CyDView className='flex flex-row bg-n0 self-center items-center w-[300px] mx-[20px] my-[12px] pt-[12px] pr-[12px] rounded-[12px]'>
        <CyDFastImage
          source={AppImages.CARD_SHIPMENT_ENVELOPE}
          className='h-[64px] w-[64px] rounded-bl-[12px]'
        />
        <CyDView className='w-[72%] ml-[12px] pb-[4px]'>
          <CyDText className='font-bold text-[14px]'>
            {t('CARD_ON_WAY')}
          </CyDText>
          {trackingDetails &&
          isUndefined(get(trackingDetails, physicalCard.cardId)?.trackingId) ? (
            <CyDView>
              <CyDText className='text-[12px] mt-[6px]'>
                {t('CARD_PRINTING_DESCRIPTION_SUB1') +
                  String(physicalCard.last4) +
                  t('CARD_PRINTING_DESCRIPTION_SUB2')}
              </CyDText>
            </CyDView>
          ) : (
            <CyDView className='mt-[6px]'>
              <CyDText className=''>{t('FEDEX_TRACKING_NO')}</CyDText>
              <CyDView className='flex flex-row items-center'>
                <CyDText className='max-w-[50%] text-highlightText mt-[4px]'>
                  {trackingNumber}
                </CyDText>
                <CyDTouchView
                  onPress={() => copyTrackingNumber(trackingNumber)}>
                  <CyDMaterialDesignIcons
                    name={'content-copy'}
                    size={14}
                    className='text-base400'
                  />
                </CyDTouchView>
              </CyDView>
            </CyDView>
          )}
        </CyDView>
      </CyDView>
    );
  }, [trackingDetails, cardId]);

  const getThemeToInject = (): Exclude<Theme, Theme.SYSTEM> => {
    if (theme === Theme.SYSTEM) {
      return colorScheme === 'dark' ? Theme.DARK : Theme.LIGHT;
    }
    return theme;
  };

  const getThemeColor = (): {
    bg: string;
    color: string;
    border: string;
  } => {
    let themeColor = '';
    if (theme === Theme.SYSTEM) {
      themeColor = colorScheme === 'dark' ? Theme.DARK : Theme.LIGHT;
    } else {
      themeColor = theme;
    }

    if (themeColor === Theme.DARK) {
      return {
        bg: '#0d0d0d',
        color: '#ffffff',
        border: '#24292e',
      };
    } else {
      return {
        bg: '#ffffff',
        color: '#000000',
        border: '#dfe2e6',
      };
    }
  };

  const validateReuseToken = async () => {
    setIsFetchingCardDetails(true);
    const cardRevealReuseToken = await getCardRevealReuseToken(cardId);
    if (
      (card.cardProvider || cardProfile.provider) === CardProviders.REAP_CARD &&
      cardRevealReuseToken
    ) {
      const verifyReuseTokenUrl = `/v1/cards/${card.cardProvider}/card/${String(
        cardId,
      )}/verify/reuse-token`;
      const payload = {
        reuseToken: cardRevealReuseToken,
        stylesheetUrl: `https://public.cypherd.io/css/${
          card.physicalCardType === PhysicalCardType.METAL
            ? 'cardRevealMobileOnMetal.css'
            : 'cardRevealMobileOnCard.css'
        }`,
      };
      try {
        const response = await postWithAuth(verifyReuseTokenUrl, payload);
        setIsFetchingCardDetails(false);
        if (!response.isError) {
          if (card.cardProvider === CardProviders.REAP_CARD) {
            setCardDetailsModal({
              ...cardDetailsModal,
              showCardDetailsModal: true,
              card,
              webviewUrl: trim(response.data.token, '"'),
              userName: response.data.userName,
            });
          } else {
            void sendCardDetails(response.data);
          }
        } else {
          verifyWithOTP();
        }
      } catch (e: any) {
        verifyWithOTP();
      }
    } else {
      verifyWithOTP();
    }
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.CARD_REVEAL_AUTH_SCREEN, {
      onSuccess: (data: any, cardProvider: CardProviders) => {
        if (card.cardProvider === CardProviders.REAP_CARD) {
          void decryptMessage(data);
        } else if (card.cardProvider === CardProviders.RAIN_CARD) {
          void decryptSecretKey(data);
        } else if (card.cardProvider === CardProviders.PAYCADDY) {
          void sendCardDetails(data);
        }
      },
      currentCardProvider: cardProvider,
      card,
      triggerOTPParam: 'verify/show-token',
      verifyOTPPayload: { isMobile: true },
    });
  };

  const decryptMessage = async ({
    privateKey,
    base64Message,
    reuseToken,
    userNameValue,
  }: {
    privateKey: string;
    base64Message: string;
    reuseToken?: string;
    userNameValue?: string;
  }) => {
    try {
      await sleepFor(1000);
      setIsFetchingCardDetails(true);
      if (reuseToken) {
        await setCardRevealReuseToken(cardId, reuseToken);
      }
      const buffer = Buffer.from(base64Message, 'base64');

      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: 4,
        },
        buffer,
      );
      const decryptedBuffer = decrypted.toString('utf8');
      setCardDetailsModal({
        ...cardDetailsModal,
        card,
        showCardDetailsModal: true,
        webviewUrl: trim(decryptedBuffer, '"'),
        userName: userNameValue ?? '',
      });
      setIsFetchingCardDetails(false);
      return decryptedBuffer;
    } catch (error) {}
  };

  const decryptSecretKey = async ({
    secretKey,
    sessionId,
    encryptedPan,
    encryptedCvc,
    expirationMonth,
    expirationYear,
    userNameValue,
  }: {
    secretKey: string;
    sessionId: string;
    encryptedPan: { data: string; iv: string };
    encryptedCvc: { data: string; iv: string };
    expirationMonth: string;
    expirationYear: string;
    userNameValue: string;
  }) => {
    try {
      setIsFetchingCardDetails(true);
      const decryptedPan = decryptWithSecretKey(
        secretKey,
        encryptedPan.data,
        encryptedPan.iv,
      );
      const decryptedCvc = decryptWithSecretKey(
        secretKey,
        encryptedCvc.data,
        encryptedCvc.iv,
      );
      const tempCardDetails = {
        cvv: decryptedCvc,
        expiryMonth: expirationMonth,
        expiryYear: expirationYear,
        cardNumber: decryptedPan,
      };
      setCardDetailsModal({
        ...cardDetailsModal,
        card,
        showCardDetailsModal: true,
        cardDetails: tempCardDetails,
        userName: userNameValue,
      });
    } catch (error) {
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_REVEAL_CARD_DETAILS'),
        description: t('CONTACT_CYPHERD_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(error);
    } finally {
      setIsFetchingCardDetails(false);
    }
  };

  const sendCardDetails = async ({
    vaultId,
    cardId,
    token,
    reuseToken,
  }: {
    vaultId: string;
    cardId: string;
    token: string;
    reuseToken?: string;
  }) => {
    await sleepFor(1000);
    setIsFetchingCardDetails(true);
    if (reuseToken) {
      await setCardRevealReuseToken(cardId, reuseToken);
    }
    const response = await axios.post(
      vaultId,
      { cardId, isProd: true },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setIsFetchingCardDetails(false);
    if (response?.data) {
      if (response?.data.result) {
        const { result } = response.data;
        const tempCardDetails = {
          cvv: result.cvv,
          expiryMonth: result.expDate.slice(-2),
          expiryYear: result.expDate.slice(0, 4),
          cardNumber: result.pan.match(/.{1,4}/g).join(' '),
        };
        setCardDetailsModal({
          ...cardDetailsModal,
          card,
          showCardDetailsModal: true,
          cardDetails: tempCardDetails,
        });
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('UNABLE_TO_REVEAL_CARD_DETAILS'),
        description: t('CONTACT_CYPHERD_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const verifyCardUnlock = () => {
    hideModal();
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
      currentCardProvider: cardProvider,
      card,
      authType:
        card.status === CardStatus.BLOCKED
          ? CardOperationsAuthType.UNBLOCK
          : CardOperationsAuthType.UNLOCK,
    });
  };

  const onCardStatusChange = async () => {
    hideModal();
    setIsStatusLoading(true);
    const url = `/v1/cards/${cardProvider}/card/${cardId}/status`;
    const payload = {
      status:
        status === CardStatus.ACTIVE ? CardStatus.IN_ACTIVE : CardStatus.ACTIVE,
    };

    try {
      const response = await patchWithAuth(url, payload);
      if (!response.isError) {
        setIsStatusLoading(false);

        showModal('state', {
          type: 'success',
          title:
            status === CardStatus.ACTIVE
              ? 'Card Successfully Frozen'
              : 'Card Successfully Activated',
          description: `${
            status === CardStatus.ACTIVE
              ? "Your card is successfully frozen. You can't make any transactions. You can unfreeze it anytime."
              : 'Your card is active now'
          }`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        void refreshProfile();
      } else {
        setIsStatusLoading(false);
        showModal('state', {
          type: 'error',
          title:
            status === CardStatus.ACTIVE
              ? 'Card Freeze Failed'
              : 'Card Activation Failed',
          description:
            response.error.message ??
            (status === CardStatus.ACTIVE
              ? 'Unable to freeze card. Please try again later.'
              : 'Unable to activate card. Please try again later.'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      setIsStatusLoading(false);
      const errMessage =
        typeof error === 'object' && error && 'message' in error
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            String((error as any).message ?? '')
          : '';
      showModal('state', {
        type: 'error',
        title:
          status === CardStatus.ACTIVE
            ? 'Card Freeze Failed'
            : 'Card Activation Failed',
        description:
          errMessage ||
          (status === CardStatus.ACTIVE
            ? 'Unable to freeze card. Please try again later.'
            : 'Unable to activate card. Please try again later.'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const toggleCardStatus = () => {
    showModal('state', {
      type: 'warning',
      title: `Are you sure you want to ${
        status === CardStatus.ACTIVE ? 'freeze' : 'unfreeze'
      } your card?`,
      description: CardStatus.ACTIVE
        ? 'This is just a temporary freeze. You can unfreeze it anytime'
        : '',
      onSuccess: onCardStatusChange,
      onFailure: hideModal,
    });
  };

  const handleCardActionClick = (functionToCall: () => void) => {
    if (card.status === CardStatus.HIDDEN) {
      setShowHiddenCardModal(true);
    } else {
      void functionToCall();
    }
  };

  const onLoadCard = () => {
    navigation.navigate(screenTitle.BRIDGE_FUND_CARD_SCREEN, {
      currentCardProvider: cardProvider,
      currentCardIndex: 0,
    });
  };

  if (card.status === CardStatus.ADDITIONAL_CARD) {
    // if (shouldShowGetPhysicalCardInStack(cardProfile, cardDesignData)) {
    return (
      <CyDView className='flex flex-col justify-center items-center mx-[20px] mt-[-20px]'>
        <Button
          title={'Get New Card'}
          style='px-[28px] w-[300px] mt-[24px]'
          onPress={() => {
            logAnalyticsToFirebase(AnalyticEvent.GET_NEW_CARD, {
              from: 'card_stack',
              type: 'new_card',
              address: cardProfile.primaryAddress,
            });
            onGetAdditionalCard();
          }}
        />
      </CyDView>
    );
    // }
  } else if (status === CardStatus.PENDING_ACTIVATION) {
    return (
      <CyDView className='flex flex-col justify-center items-center mx-[20px] mt-[-20px]'>
        {get(trackingDetails, cardId) ? (
          <RenderTrackingItem />
        ) : (
          <CyDView className='flex flex-col justify-center items-center mx-[20px] w-[300px]'>
            <CyDText className='text-[14px] font-semibold text-center mt-[6px]'>
              Activate Physical card and enjoy the convenience of making
              purchases worldwide
            </CyDText>
          </CyDView>
        )}
        <Button
          title='Activate Card'
          type={ButtonType.PRIMARY}
          style='px-[28px] w-[300px] mt-[12px]'
          onPress={() => {
            void onPressActivateCard(card);
          }}
        />
      </CyDView>
    );
  } else if (isRcUpgradableCardShown && !card.cardId) {
    return (
      <CyDView className='flex flex-col justify-center items-center mx-[20px] mt-[-32px]'>
        <CyDView className='flex flex-col justify-center items-center mb-[24px]'>
          <CyDText className='text-[16px] font-bold text-center my-[12px]'>
            Now get access to the much awaited {'\n'} Apple and Google pay
          </CyDText>
          <CyDImage
            source={AppImages.UPGRADE_CARD_TIMELINE}
            className='w-[272px] h-[12px] mb-[8px]'
          />
          <CyDView className='flex flex-row'>
            <CyDText className='text-[12px] ml-[15px]'>{'Register'}</CyDText>
            <CyDText className='text-[12px] ml-[55px] mr-[45px]'>
              {'Complete your KYC'}
            </CyDText>
            <CyDText className='text-[12px]'>{'Get your card'}</CyDText>
          </CyDView>
        </CyDView>
        <Button
          title='UPGRADE'
          style='px-[88px]'
          onPress={() => {
            const tempProfile = cardProfile;
            tempProfile.provider = CardProviders.REAP_CARD;
            globalContext.globalDispatch({
              type: GlobalContextType.CARD_PROFILE,
              cardProfile: tempProfile,
            });
            navigation.navigate(screenTitle.CARD_APPLICATION_WELCOME);
          }}
        />
      </CyDView>
    );
  }

  return (
    <CyDView className='w-full'>
      <CardDetailsModal
        isModalVisible={cardDetailsModal.showCardDetailsModal}
        setShowModal={(isModalVisible: boolean) => {
          setCardDetailsModal({
            ...cardDetailsModal,
            cardDetails: initialCardDetails,
            showCardDetailsModal: isModalVisible,
          });
        }}
        card={cardDetailsModal.card}
        cardDetails={cardDetailsModal.cardDetails}
        webviewUrl={cardDetailsModal.webviewUrl}
        manageLimits={() => {
          setCardDetailsModal({
            ...cardDetailsModal,
            cardDetails: initialCardDetails,
            showCardDetailsModal: false,
          });
          setTimeout(() => {
            navigation.navigate(screenTitle.CARD_CONTROLS, {
              currentCardProvider: cardProvider,
              cardId: card.cardId,
            });
          }, MODAL_HIDE_TIMEOUT_250);
        }}
        userName={cardDetailsModal.userName}
      />

      <HiddenCardModal
        isModalVisible={showHiddenCardModal}
        setIsModalVisible={setShowHiddenCardModal}
        onLoadCard={onLoadCard}
      />

      {cardProfile.provider === CardProviders.PAYCADDY && (
        <CyDView className='flex flex-row justify-center items-center mb-[14px] mt-[-42px]'>
          <CyDText className='font-bold text-[14px]'>
            {t<string>(
              type === CardType.VIRTUAL ? 'VIRTUAL_CARD' : 'PHYSICAL_CARD',
            )}
          </CyDText>
          <CyDText className='font-bold text-[14px]'>
            {' xxxx ' + last4}
          </CyDText>
        </CyDView>
      )}

      <CyDView className='flex flex-row justify-center items-center gap-x-[24px]'>
        <CyDTouchView
          className='flex flex-col justify-center items-center w-[72px]'
          disabled={isAccountLocked}
          onPress={() => {
            handleCardActionClick(() => {
              if (status === CardStatus.IN_ACTIVE) {
                showModal('state', {
                  type: 'error',
                  title: t('UNLOCK_CARD_TO_REVEAL_CARD_DETAILS'),
                  onSuccess: hideModal,
                  onFailure: hideModal,
                });
              } else {
                void validateReuseToken();
              }
            });
          }}>
          <CyDView
            className={`${
              isAccountLocked ? 'bg-n50' : 'bg-p50'
            } h-[54px] w-[54px] items-center justify-center rounded-[50px]`}>
            {isFetchingCardDetails ? (
              <>
                <ActivityIndicator size='small' color='#000000' />
              </>
            ) : (
              <CyDIcons name='card' className='text-black text-[36px]' />
            )}
          </CyDView>
          <CyDView className='mt-[6px]'>
            <CyDText className='font-semibold text-[12px]'>
              {'Reveal Card'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
        <CyDTouchView
          className='flex flex-col justify-center items-center w-[72px]  ml-[24px]'
          disabled={isAccountLocked}
          onPress={() => {
            handleCardActionClick(() => {
              if (status === CardStatus.ACTIVE) {
                toggleCardStatus();
              } else {
                verifyCardUnlock();
              }
            });
          }}>
          <CyDView
            className={clsx(
              'h-[54px] w-[54px] items-center justify-center rounded-[50px]',
              isAccountLocked
                ? 'bg-n50'
                : status !== CardStatus.ACTIVE
                ? 'bg-base100'
                : 'bg-p50',
            )}>
            {isStatusLoading ? (
              <>
                <ActivityIndicator size='small' color='#000000' />
              </>
            ) : (
              <CyDImage
                source={
                  status === CardStatus.ACTIVE
                    ? AppImages.FREEZE_ICON_BLACK
                    : AppImages.UNFREEZE_ICON_BLACK
                }
                className='h-[24px] w-[24px]'
                resizeMode='contain'
              />
              // <CydIcons
              //   name={
              //     status === CardStatus.ACTIVE ? 'freeze' : 'unfreeze'
              //   }
              //   className='text-black text-[36px]'
              // />
            )}
          </CyDView>
          <CyDView className='mt-[6px]'>
            <CyDText className='font-semibold text-[12px]'>
              {status === CardStatus.ACTIVE ? 'Freeze' : 'Unfreeze'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
        <CyDTouchView
          className='flex flex-col justify-center items-center ml-[24px]'
          disabled={isAccountLocked}
          onPress={() => {
            handleCardActionClick(() => {
              cardProvider === CardProviders.REAP_CARD
                ? navigation.navigate(screenTitle.CARD_CONTROLS, {
                    currentCardProvider: cardProvider,
                    cardId: card.cardId,
                  })
                : navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
                    currentCardProvider: cardProvider,
                    card,
                  });
            });
          }}>
          <CyDView
            className={`${
              isAccountLocked ? 'bg-n50' : 'bg-p50'
            } h-[54px] w-[54px] items-center justify-center rounded-[50px]`}>
            {cardProvider === CardProviders.REAP_CARD ? (
              <CyDIcons name='settings' className='text-black text-[28px]' />
            ) : (
              <CyDMaterialDesignIcons
                name={'dots-vertical'}
                size={32}
                className={'text-black'}
              />
            )}
          </CyDView>
          <CyDView className='mt-[6px]'>
            <CyDText className='font-semibold text-[12px]'>
              {cardProvider === CardProviders.REAP_CARD
                ? 'Controls'
                : 'Set Pin'}
            </CyDText>
          </CyDView>
        </CyDTouchView>
      </CyDView>
    </CyDView>
  );
};
