import React from 'react';
import { t } from 'i18next';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDFastImage,
} from '../styles/tailwindComponents';
import AppImages from '../../assets/images/appImages';
import { get } from 'lodash';
import clsx from 'clsx';
import { useNavigation } from '@react-navigation/native';
import { CardProviders, CardType, CypherPlanId } from '../constants/enum';
import { screenTitle } from '../constants';
import { CardProfile } from '../models/cardProfile.model';
import { CardDesign } from '../models/cardDesign.interface';

export const GetPhysicalCardComponent = ({
  cardProfile,
  cardProvider,
  cardDesignData,
  cardBalance,
}: {
  cardProfile: CardProfile | undefined;
  cardProvider: CardProviders;
  cardDesignData: CardDesign | undefined;
  cardBalance: string;
}) => {
  const navigation = useNavigation<any>();
  const cards = get(cardProfile, [cardProvider, 'cards'], []);
  const metalCardCount = get(cardDesignData, ['allowedCount', 'metal'], 0);
  const metalCardFee = get(cardDesignData, ['feeDetails', 'metal'], 0);
  const metalCardStockAvailable = get(
    cardDesignData,
    ['metal', 0, 'isStockAvailable'],
    false,
  );
  const isMetalFreeCardEligible =
    metalCardCount > 0 && metalCardFee === 0 && metalCardStockAvailable;
  const showGetFirstPvcCard =
    !cards.some((card: any) => card.type === CardType.PHYSICAL) &&
    !isMetalFreeCardEligible &&
    get(cardProfile, ['planInfo', 'planId'], '') !== CypherPlanId.PRO_PLAN &&
    get(cardDesignData, ['allowedCount', CardType.PHYSICAL], 0) > 0 &&
    get(cardDesignData, ['physical', 0, 'isStockAvailable'], false);

  const componentContent = showGetFirstPvcCard
    ? {
        title: t('GET_FIRST_PVC_CARD_TITLE'),
        buttonText: t('GET_FIRST_PVC_CARD_BUTTON_TEXT'),
        cost: get(cardDesignData, ['feeDetails', CardType.PHYSICAL]),
        image: AppImages.GET_PVC_CARD,
        buttonAction: () => {
          navigation.navigate(screenTitle.SELECT_ADDITIONAL_CARD, {
            currentCardProvider: cardProvider,
            cardDesignData,
            cardBalance,
          });
        },
      }
    : {
        title: t('GET_FREE_METAL_CARD_TITLE'),
        buttonText: t('GET_METAL_CARD_BUTTON_TEXT'),
        cost: get(cardDesignData, ['feeDetails', CardType.METAL]),
        image: AppImages.GET_METAL_CARD,
        buttonAction: () => {
          navigation.navigate(screenTitle.SELECT_ADDITIONAL_CARD, {
            currentCardProvider: cardProvider,
            cardDesignData,
            cardBalance,
          });
        },
      };

  return showGetFirstPvcCard || isMetalFreeCardEligible ? (
    <CyDView className='flex flex-col mt-4 mx-4 border border-[1px] border-n40 rounded-[8px] p-4'>
      <CyDView className='flex flex-row items-center justify-between mb-[6px] gap-2'>
        <CyDText className='break-words'>{componentContent.title}</CyDText>
        <CyDView
          className={clsx(
            'rounded-full py-[5px] px-[12px] whitespace-nowrap flex-shrink-0',
            {
              'bg-green20 text-green400 font-semibold':
                componentContent.cost === 0,
              'bg-n30 text-primaryText': componentContent.cost > 0,
            },
          )}>
          <CyDText>
            {componentContent.cost === 0
              ? '🎉  Free'
              : `$${String(componentContent.cost)}`}
          </CyDText>
        </CyDView>
      </CyDView>
      <CyDFastImage
        source={componentContent.image}
        className='w-full h-[90px] mb-4'
        resizeMode='contain'
      />
      <CyDTouchView
        className='bg-p150 py-[11px] rounded-full'
        onPress={() => {
          componentContent.buttonAction();
        }}>
        <CyDText className='text-black text-[16px] font-bold text-center'>
          {componentContent.buttonText}
        </CyDText>
      </CyDTouchView>
    </CyDView>
  ) : (
    <></>
  );
};
