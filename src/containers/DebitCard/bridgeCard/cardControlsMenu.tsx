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
import { CardControlTypes } from '../../../constants/enum';
import { ProgressCircle } from 'react-native-svg-charts';
import useAxios from '../../../core/HttpRequest';
import { get } from 'lodash';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import LottieView from 'lottie-react-native';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';

export default function CardControlsMenu({ route, navigation }) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const { currentCardProvider, card } = route.params;
  const [limits, setLimits] = useState();
  const [limitApplicable, setLimitApplicable] = useState('planLimit');
  const [loading, setLoading] = useState(true);
  const { getWithAuth, postWithAuth } = useAxios();
  const [loading3DSecure, setLoading3DSecure] = useState(false);
  const [is3DSecureSet, setIs3DSecureSet] = useState<boolean>(
    get(card, 'is3dsEnabled', false),
  );
  const { showModal, hideModal } = useGlobalModalContext();

  const toggle3DSecure = async () => {
    setLoading3DSecure(true);
    const response = await postWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/update3ds`,
      { status: !is3DSecureSet },
    );
    setLoading3DSecure(false);
    if (!response.isError) {
      const current3DSecureValue = is3DSecureSet;
      setIs3DSecureSet(!current3DSecureValue);
      showModal('state', {
        type: 'success',
        title: !current3DSecureValue
          ? '3D Secure has been setup successfully'
          : '3D Secure Toggle successfull',
        description: !current3DSecureValue
          ? get(cardProfile, ['cardNotification', 'isTelegramAllowed'], false)
            ? "You'll receive 3Ds notifications through Telegram & Email."
            : "You'll receive 3Ds notifications through Cypher Wallet App notifications & Email"
          : '3D Secure has been turned off successfully',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('3D Secure Toggle Successfull'),
        description:
          response.error.errors[0].message ??
          'Could not toggle 3D secure. Please contact support.',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

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
    }
    setLoading(false);
  };

  useEffect(() => {
    void getCardLimits();
  }, []);

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
                <CyDText className='text-[10px] font-[500]'>
                  {'This Month'}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='mt-[24px] ml-[24px]'>
              <CyDText className='font-[500] text-n200 text-[10px]'>
                {'Limit per month'}
              </CyDText>
              <CyDText className='font-[500] text-[16px] '>{`$${get(limits, [limitApplicable, 'm'], 0)}`}</CyDText>
              <CyDText className='font-[500] text-n200 text-[10px] mt-[12px]'>
                {'Limit per day'}
              </CyDText>
              <CyDText className='font-[500] text-[16px]'>{`$${get(limits, [limitApplicable, 'd'], 0)}`}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDText className='text-[12px] text-n200 mt-[16px] font-bold'>
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
            <CyDText className='text-[18px] font-medium '>
              Domestic Transactions
            </CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.RIGHT_ARROW}
            className='w-[12px] h-[12px]'></CyDImage>
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
            <CyDText className='text-[18px] font-medium '>
              International Transactions
            </CyDText>
          </CyDView>
          <CyDImage
            source={AppImages.RIGHT_ARROW}
            className='w-[12px] h-[12px]'></CyDImage>
        </CyDTouchView>
        <CyDText className='text-[12px] text-n200 mt-[16px] font-bold'>
          Security
        </CyDText>
        <CyDTouchView
          onPress={() => {
            void toggle3DSecure();
          }}
          className='flex flex-row items-center justify-between m-[2px] py-[15px] px-[12px] bg-white rounded-[6px]'>
          <CyDView className='flex flex-row'>
            <CyDImage
              source={AppImages.THREE_D_SECURE}
              className={'h-[24px] w-[24px] mr-[12px]'}
              resizeMode={'contain'}
            />
            <CyDView className='flex flex-col justify-between mr-[6px]'>
              <CyDText className='text-[16px] font-bold'>{'3D Secure'}</CyDText>
              <CyDText className='text-[12px] font-semibold'>
                {'Cardholder authentication for transactions.'}
              </CyDText>
            </CyDView>
          </CyDView>
          {loading3DSecure ? (
            <LottieView
              source={AppImages.LOADER_TRANSPARENT}
              autoPlay
              loop
              style={{ height: 24, width: 24, marginLeft: -24 }}
            />
          ) : (
            <CyDSwitch
              value={is3DSecureSet}
              onValueChange={() => {
                void toggle3DSecure();
              }}
            />
          )}
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
