import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDSwitch,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { screenTitle } from '../../../constants';
import { transactionType } from 'viem';
import { CARD_LIMIT_TYPE, CardControlTypes } from '../../../constants/enum';
import { ProgressCircle } from 'react-native-svg-charts';
import useAxios from '../../../core/HttpRequest';
import { get } from 'lodash';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import LottieView from 'lottie-react-native';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { useIsFocused } from '@react-navigation/native';

export default function CardControlsMenu({ route, navigation }) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { currentCardProvider, card } = route.params;
  const [limits, setLimits] = useState();
  const [limitApplicable, setLimitApplicable] = useState('planLimit');
  const [loading, setLoading] = useState(true);
  const [
    isInternationalTransactionEnabled,
    setIsInternationalTransactionEnabled,
  ] = useState(false);
  const { getWithAuth } = useAxios();
  const isFocused = useIsFocused();

  const getCardLimits = async () => {
    setLoading(true);
    const response = await getWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/limits`,
    );

    if (!response.isError) {
      const limitValue = response.data;
      setLimits(limitValue);
      if (get(limitValue, 'cydL')) {
        setLimitApplicable('cydL');
      } else if (get(limitValue, 'advL')) {
        setLimitApplicable('advL');
      } else {
        setLimitApplicable('planLimit');
      }
      setIsInternationalTransactionEnabled(
        !get(
          limitValue,
          ['cusL', CardControlTypes.INTERNATIONAL, CARD_LIMIT_TYPE.DISABLED],
          true,
        ),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isFocused) {
      void getCardLimits();
    }
  }, [isFocused]);

  const getMonthlyLimitPercentage = () => {
    const percentage =
      get(limits, ['sSt', 'm'], 0) / get(limits, [limitApplicable, 'm'], 1);
    return percentage;
  };

  return (
    <CyDSafeAreaView className={'h-full bg-cardBgFrom pt-[10px]'}>
      <CyDView className='mx-[16px] mt-[16px]'>
        <CyDView className='p-[12px] rounded-[10px] bg-white relative'>
          <CyDText className='font-bold text-[16px]'>{'Card Limits'}</CyDText>
          <CyDImage
            source={AppImages.GOLD_LINE_MEMBER}
            className='absolute right-0 top-0 h-[75px] w-[83px]'
          />
          <CyDView className='flex flex-row'>
            <CyDView>
              <ProgressCircle
                className={'h-[130px] w-[130px] mt-[12px]'}
                progress={getMonthlyLimitPercentage()}
                strokeWidth={13}
                cornerRadius={30}
                progressColor={'#F7C645'}
              />
              <CyDView className='absolute top-[10px] left-0 right-0 bottom-0 flex items-center justify-center text-center'>
                <CyDText className='text-[16px] font-bold'>{`$${get(limits, ['sSt', 'm'], 0)}`}</CyDText>
                <CyDText className='text-[14px] font-[500]'>
                  {'This Month'}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='mt-[24px] ml-[24px]'>
              <CyDText className='font-[500] text-n200 text-[14px]'>
                {'Limit per month'}
              </CyDText>
              <CyDText className='font-[500] text-[16px] '>{`$${get(limits, [limitApplicable, 'm'], 0)}`}</CyDText>
              <CyDText className='font-[500] text-n200 text-[14px] mt-[12px]'>
                {'Limit per day'}
              </CyDText>
              <CyDText className='font-[500] text-[16px]'>{`$${get(limits, [limitApplicable, 'd'], 0)}`}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
          Spend Category
        </CyDText>
        <CyDTouchView
          className='flex flex-row mt-[8px] bg-white rounded-[10px] px-[12px] py-[16px] justify-between items-center'
          onPress={() => {
            navigation.navigate(screenTitle.DOMESTIC_CARD_CONTROLS, {
              cardControlType: CardControlTypes.DOMESTIC,
              currentCardProvider,
              card,
            });
          }}>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              className='w-[24px] h-[24px] mr-[8px]'
              source={AppImages.DOMESTIC_ICON}
            />
            <CyDText className='text-[18px] font-[500] '>
              Domestic Transactions
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDText className='text-[14px] text-b150'>{'Enabled'}</CyDText>
            <CyDImage
              source={AppImages.RIGHT_ARROW}
              className='w-[12px] h-[12px] ml-[8px]'
            />
          </CyDView>
        </CyDTouchView>
        <CyDTouchView
          className='flex flex-row mt-[12px] bg-white rounded-[10px] px-[12px] py-[16px] justify-between items-center'
          onPress={() => {
            navigation.navigate(screenTitle.INTERNATIONAL_CARD_CONTROLS, {
              cardControlType: CardControlTypes.INTERNATIONAL,
              currentCardProvider,
              card,
            });
          }}>
          <CyDView className='flex flex-row items-center'>
            <CyDImage
              className='w-[24px] h-[24px] mr-[8px]'
              source={AppImages.INTERNATIONAL_ICON}
            />
            <CyDText className='text-[18px] font-[500] '>
              International Transactions
            </CyDText>
          </CyDView>
          <CyDView className='flex flex-row items-center'>
            <CyDText className='text-[14px] text-b150'>
              {isInternationalTransactionEnabled ? 'Enabled' : 'Disabled'}
            </CyDText>
            <CyDImage
              source={AppImages.RIGHT_ARROW}
              className='w-[12px] h-[12px] ml-[8px]'
            />
          </CyDView>
        </CyDTouchView>
        <CyDText className='text-[14px] text-n200 mt-[16px] font-[600]'>
          Security
        </CyDText>
        <CyDTouchView
          onPress={() => {
            navigation.navigate(screenTitle.THREE_D_SECURE, {
              currentCardProvider,
              card,
            });
          }}
          className='flex flex-row items-center justify-between m-[2px] py-[15px] px-[12px] bg-white rounded-[6px] mt-[8px]'>
          <CyDView className='flex flex-row'>
            <CyDImage
              source={AppImages.THREE_D_SECURE}
              className={'h-[24px] w-[24px] mr-[12px]'}
              resizeMode={'contain'}
            />
            <CyDView className='flex flex-col justify-between mr-[6px]'>
              <CyDText className='text-[16px] font-bold'>{'3D Secure'}</CyDText>
            </CyDView>
          </CyDView>
          <CyDImage
            source={AppImages.RIGHT_ARROW}
            className='w-[12px] h-[12px]'></CyDImage>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
