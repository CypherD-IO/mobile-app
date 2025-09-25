import React, { useContext } from 'react';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import {
  useNavigation,
  ParamListBase,
  NavigationProp,
  RouteProp,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CardDesign,
  CardDesignCardMetaData,
} from '../../../../models/cardDesign.interface';
import {
  CardProviders,
  CardType,
  CypherPlanId,
} from '../../../../constants/enum';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../../assets/images/appImages';
import { capitalize, get, isUndefined } from 'lodash';
import { CardProfile } from '../../../../models/cardProfile.model';
import {
  GlobalContextDef,
  GlobalContext,
} from '../../../../core/globalContext';
import clsx from 'clsx';
import { screenTitle } from '../../../../constants';
import {
  AnalyticEvent,
  logAnalyticsToFirebase,
} from '../../../../core/analytics';
import { t } from 'i18next';

interface RouteParams {
  currentCardProvider: CardProviders;
  cardDesignData: CardDesign;
  cardBalance: number;
}

const getCardImage = (type: CardType, designId: string) => {
  const cardType = type === 'virtual' ? 'virtual' : 'physical';
  const cardImage = `${CYPHER_CARD_IMAGES}/${cardType}-${designId}.png`;
  return {
    uri: cardImage,
  };
};

const RenderPrice = ({
  price,
  cardType,
}: {
  price: number;
  cardType: CardType;
}) => {
  if (price > 0) {
    return (
      <CyDText className='text-[16px] font-bold'>
        {`$${price}`}
        <CyDText className='text-[12px] font-normal text-base150'>
          {'/card'}
        </CyDText>
      </CyDText>
    );
  } else {
    return <CyDText className='text-[13px] font-bold'>{'🎉  Free'}</CyDText>;
  }
};

const RenderCard = ({
  metaData,
  price,
  cardType,
  cardCount,
  hasStock,
  isPremiumPlan,
  onSelectCard,
}: {
  metaData: CardDesignCardMetaData;
  price: number;
  cardType: CardType;
  cardCount: number;
  hasStock: boolean;
  isPremiumPlan: boolean;
  onSelectCard: (
    card: CardDesignCardMetaData,
    cardType: CardType,
    price: number,
  ) => void;
}) => {
  const isMetalCard = cardType === CardType.METAL;
  const isMetalCardNonPremiumUser = () => {
    if (isMetalCard) {
      return !isPremiumPlan;
    }
    return false;
  };

  const isGetCardLimitReached = () => {
    if (!isPremiumPlan) {
      // am letting the users to go into the description page and see the card details but
      // the next page will not allow to proceed rather it will ask to upgrade to the premium plan
      if (cardType === CardType.METAL && cardCount === 0) {
        return false;
      }
    }
    // for other card types if the count has reached the limit then it should be disabled
    if (cardCount === 0) {
      return true;
    }
    return false;
  };

  hasStock = !isUndefined(hasStock) ? hasStock : true;

  const showWarningMessage =
    isGetCardLimitReached() || isMetalCardNonPremiumUser() || !hasStock;

  return (
    <CyDView className='mt-[8px] p-[16px] bg-n0 rounded-xl'>
      <CyDTouchView
        onPress={() => onSelectCard(metaData, cardType, price)}
        className={clsx(
          'flex flex-row gap-[12px] items-center justify-between',
          {
            'opacity-50': isGetCardLimitReached(),
          },
        )}
        disabled={isGetCardLimitReached() || !hasStock}>
        <CyDView className='flex flex-row gap-x-[12px] items-center'>
          <CyDImage
            source={getCardImage(cardType, get(metaData, 'id', ''))}
            className={clsx('h-[44px] w-[60px]', {
              'border border-n40 rounded-[4px]': cardType === CardType.PHYSICAL,
            })}
            resizeMode='contain'
          />
          <CyDView>
            <CyDText className='font-medium text-[14px]'>
              {`${capitalize(cardType)} Card`}
            </CyDText>
            <CyDView className='flex flex-row gap-x-[4px] items-center'>
              <CyDImage
                source={AppImages.VISA_LOGO_GREY}
                className='h-[8px] w-[24px]'
                resizeMode='contain'
              />
              <CyDText className='text-n200 font-normal text-[10px]'>
                {'Platinum'}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className=''>
          <CyDView className='flex flex-row gap-x-[4px] items-center text-base400'>
            <RenderPrice price={price} cardType={cardType} />
            <CyDMaterialDesignIcons
              name='chevron-right'
              size={20}
              className='text-base400'
            />
          </CyDView>
        </CyDView>
      </CyDTouchView>

      {showWarningMessage && (
        <>
          <CyDView className='my-[12px] h-[1px] bg-n30 w-full' />
          <CyDView className='flex flex-row gap-x-[4px] items-center text-base400'>
            <CyDMaterialDesignIcons
              name='information-outline'
              size={20}
              className='text-n200'
            />
            <CyDView>
              {!hasStock && (
                <CyDText className='text-[12px] font-normal text-n200'>
                  {t('CARD_OUT_OF_STOCK')}
                </CyDText>
              )}
              {hasStock && isMetalCardNonPremiumUser() && (
                <CyDText className='text-[12px] font-normal text-n200'>
                  {t('METAL_CARD_FOR_PREMIUM_USERS')}
                </CyDText>
              )}
              {hasStock && isGetCardLimitReached() && (
                <CyDText className='text-[12px] font-normal text-n200'>
                  {t('MAXIMUM_CARD_LIMIT_REACHED')}
                </CyDText>
              )}
            </CyDView>
          </CyDView>
        </>
      )}
    </CyDView>
  );
};

export default function SelectAdditionalCardType() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { top } = useSafeAreaInsets();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;

  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;

  const { currentCardProvider, cardDesignData, cardBalance } = route.params;
  const isPremiumPlan =
    get(cardProfile, ['planInfo', 'planId'], '') === CypherPlanId.PRO_PLAN;
  const virtualCard = cardDesignData.virtual;
  const physicalCard = cardDesignData.physical;
  const metalCard = cardDesignData.metal;

  const onSelectCard = (
    card: CardDesignCardMetaData,
    cardType: CardType,
    price: number,
  ) => {
    logAnalyticsToFirebase(AnalyticEvent.GET_NEW_CARD, {
      from: 'get_new_card_explore',
      type: cardType,
      price,
      address: cardProfile?.primaryAddress,
    });
    navigation.navigate(screenTitle.ADDITIONAL_CARD_DESCRIPTION, {
      cardMetaData: card,
      currentCardProvider,
      cardType,
      price,
      cardBalance,
    });
  };

  return (
    <CyDView className='bg-n20 flex-1 px-[16px]' style={{ paddingTop: top }}>
      <CyDTouchView
        onPress={() => navigation.goBack()}
        className='w-[32px] h-[32px] bg-n40 rounded-full flex items-center justify-center'>
        <CyDMaterialDesignIcons
          name='arrow-left'
          size={20}
          className='text-base400'
        />
      </CyDTouchView>
      <CyDText className='mt-[12px] text-[28px] font-bold'>
        Select your card
      </CyDText>

      <CyDView className='mt-[18px]'>
        <CyDView>
          <CyDText className='text-[14px] font-medium text-n200'>
            {'Virtual Cards'}
          </CyDText>
          {virtualCard.map((card: CardDesignCardMetaData, index: number) => (
            <RenderCard
              key={index}
              metaData={card}
              price={get(cardDesignData, 'feeDetails.virtual', 10)}
              cardType={CardType.VIRTUAL}
              cardCount={get(cardDesignData, ['allowedCount', 'virtual'], 0)}
              hasStock={
                get(cardDesignData, 'virtual')?.[index]?.isStockAvailable
              }
              isPremiumPlan={isPremiumPlan}
              onSelectCard={onSelectCard}
            />
          ))}
        </CyDView>
        <CyDView className='mt-[16px]'>
          <CyDText className='text-[14px] font-medium text-n200'>
            {'Physical Cards'}
          </CyDText>
          {physicalCard.map((card: CardDesignCardMetaData, index: number) => (
            <RenderCard
              key={index}
              metaData={card}
              price={get(cardDesignData, 'feeDetails.physical', 50)}
              cardType={CardType.PHYSICAL}
              cardCount={get(cardDesignData, ['allowedCount', 'physical'], 0)}
              hasStock={
                get(cardDesignData, 'physical')?.[index]?.isStockAvailable
              }
              isPremiumPlan={isPremiumPlan}
              onSelectCard={onSelectCard}
            />
          ))}
        </CyDView>
        <CyDView className='mt-[16px]'>
          <CyDText className='text-[14px] font-medium text-n200'>
            {'Metal Cards'}
          </CyDText>
          {metalCard.map((card: CardDesignCardMetaData, index: number) => (
            <RenderCard
              key={index}
              metaData={card}
              price={get(cardDesignData, 'feeDetails.metal', 150)}
              cardType={CardType.METAL}
              cardCount={get(cardDesignData, ['allowedCount', 'metal'], 0)}
              hasStock={get(cardDesignData, 'metal')?.[index]?.isStockAvailable}
              isPremiumPlan={isPremiumPlan}
              onSelectCard={onSelectCard}
            />
          ))}
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
