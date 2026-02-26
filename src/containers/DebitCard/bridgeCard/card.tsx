import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { get, isEmpty, orderBy } from 'lodash';
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
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { CardDesign } from '../../../models/cardDesign.interface';
import Loading from '../../../components/v2/loading';
import { getCardColorByHex } from '../../../constants/cardColours';

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
    borderColor: '#B3B9C4',
    backgroundColor: '#C2C7D0',
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
  onCardPress,
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
  onCardPress?: () => void;
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
  useEffect(() => {
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

    const cardContent = (
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

    if (card.status !== CardStatus.ADDITIONAL_CARD && onCardPress) {
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

  const cardsWithUpgrade = useMemo(() => {
    return userCardDetails.cards.filter(
      card =>
        card.cardId !== CARD_IDS.METAL_CARD &&
        card.status !== CardStatus.ADDITIONAL_CARD &&
        card.status !== CardStatus.RC_UPGRADABLE &&
        card.status !== CardStatus.HIDDEN,
    );
  }, [currentCardProvider, userCardDetails.cards, cardProfile]);

  // Reset card index on first initialization — kept outside useMemo to avoid side effects during render
  useEffect(() => {
    if (!hasInitializedOrder.current) {
      setCurrentCardIndex(0);
    }
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
                        borderRadius: posConfig.borderRadius,
                      },
                    ]}>
                    <CyDView className='w-full h-full'>
                      {renderItem({ item: card, index: cardIndex })}
                    </CyDView>
                    {isTopCard && cardsWithUpgrade.length > 3 && (
                      <CyDView className='absolute top-[32px] self-center bg-white/80 px-[14px] py-[4px] rounded-full'>
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
