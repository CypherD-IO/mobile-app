import React, { useState, useCallback } from 'react';
import {
  CyDFastImage,
  CyDKeyboardAwareScrollView,
  CydMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from 'i18next';
import Button from '../../../../components/v2/button';
import useAxios from '../../../../core/HttpRequest';
import { Card } from '../../../../models/card.model';
import * as Sentry from '@sentry/react-native';
import { ceil, isEmpty } from 'lodash';
import Loading from '../../../../components/v2/loading';
import { screenTitle } from '../../../../constants';
import WithdrawalReasonsModal from '../../../../components/v2/withdrawalReasonsModal';
import { CyDIconsPack } from '../../../../customFonts';

interface RouteParams {
  currentCardProvider: string;
  card: Card;
}

export default function CryptoWithdrawal() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { currentCardProvider, card } = route.params ?? {};
  const { getWithAuth } = useAxios();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [availableAmountLoading, setAvailableAmountLoading] = useState(false);
  const [availableAmount, setAvailableAmount] = useState('');
  const [reason, setReason] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const getAvailableAmount = async () => {
    setAvailableAmountLoading(true);
    const url = `/v1/cards/crypto-withdrawal/eligibility`;
    try {
      const response = await getWithAuth(url);
      if (
        !response.isError &&
        response?.data &&
        response.data.withdrawableAmount
      ) {
        setAvailableAmount(String(response.data.withdrawableAmount));
        setReason(response.data.reasons);
      } else {
        setAvailableAmount('');
      }
    } catch (error) {
      Sentry.captureException(error);
      setAvailableAmount('');
    }
    setAvailableAmountLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      void getAvailableAmount();
    }, []),
  );

  if (availableAmountLoading) {
    return <Loading />;
  }

  return (
    <CyDView
      className='flex flex-col justify-between h-full bg-n0'
      style={{ paddingTop: insets.top }}>
      <WithdrawalReasonsModal
        isModalVisible={isModalVisible}
        setIsModalVisible={setIsModalVisible}
        reason={reason}
      />
      <CyDView className='flex-1 bg-n20'>
        <CyDView className='flex flex-row items-center justify-between py-[16px] px-[16px] bg-n0'>
          <CyDView className='flex flex-row items-center justify-start'>
            <CyDTouchView
              className='pr-[16px]'
              onPress={() => {
                navigation.goBack();
              }}>
              <CyDIconsPack
                name='arrow-left'
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
            <CyDText className='text-[16px] font-bold text-base400'>
              {t('WITHDRAW_CRYPTO')}
            </CyDText>
          </CyDView>
          <CyDTouchView
            className='pr-[16px]'
            onPress={() => {
              navigation.navigate(screenTitle.WITHDRAW_HISTORY, {
                card,
                currentCardProvider,
              });
            }}>
            <CydMaterialDesignIcons
              name={'history'}
              size={32}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDKeyboardAwareScrollView className='flex-1 bg-20 px-[16px]'>
          <CyDView className='mt-[18px]'>
            <CyDText className='font-bold text-[12px] text-base400'>
              {t('AMOUNT_TO_BE_WITHDRAWN')}
            </CyDText>
            <CyDView className='mt-[8px] rounded-[16px] p-[24px] bg-n0'>
              <CyDTextInput
                className='text-[44px] p-[12px] text-base400 font-bold bg-n10 border-n40 border-[1px] rounded-[8px]'
                value={`$${amount}`}
                onChangeText={text => setAmount(text.replace(/^\$/, ''))}
                placeholder='$0'
                returnKeyType='done'
              />
              {!isEmpty(availableAmount) && (
                <CyDText className='text-[12px] text-n200 font-medium mt-[8px]'>
                  {' You have '}
                  <CyDText className='font-bold text-base400'>
                    {`$${availableAmount}`}
                  </CyDText>
                  {' available for withdrawal.'}
                  {reason.length > 0 && (
                    <CyDTouchView
                      onPress={() => {
                        setIsModalVisible(true);
                      }}>
                      <CyDText className='text-[#0061A7] underline font-medium text-[11px] ml-[4px] mt-[4px]'>
                        {'Learn more'}
                      </CyDText>
                    </CyDTouchView>
                  )}
                </CyDText>
              )}
              <CyDView className='mt-[16px] flex flex-row justify-evenly'>
                {[0.05, 0.1, 0.2, 0.3, 0.5].map(percentage => (
                  <CyDTouchView
                    key={percentage}
                    className='px-[10px] py-[6px] bg-n30 rounded-[4px]'
                    onPress={() => {
                      setAmount(
                        ceil(
                          Number(availableAmount) * percentage,
                          2,
                        ).toString(),
                      );
                    }}>
                    <CyDText className='text-[14px] font-bold text-base400'>
                      {`${percentage * 100}%`}
                    </CyDText>
                  </CyDTouchView>
                ))}
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row justify-between items-center mt-[24px]'>
              <CyDView className='flex flex-row items-center '>
                <CyDView className='bg-n0 rounded-full w-[20px] h-[20px] flex flex-col items-center justify-center mr-[8px]'>
                  <CyDText className=' text-[14px] font-bold text-base400 text-center '>
                    {'%'}
                  </CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-bold text-base400'>
                  {t('0.5')}
                </CyDText>
              </CyDView>
              <CyDText className='text-[12px] font-medium text-base400'>
                {t('Conversion rate')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
              <CyDView className='flex flex-row items-center '>
                <CyDView className='bg-n0 rounded-full w-[20px] h-[20px] flex flex-col items-center justify-center mr-[8px]'>
                  <CyDText className=' text-[14px] font-bold text-base400 text-center '>
                    {'-'}
                  </CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-bold text-base400'>
                  {`$ ${ceil(parseFloat(amount || '0') * 0.005, 2)}`}
                </CyDText>
              </CyDView>
              <CyDText className='text-[12px] font-medium text-base400'>
                {t('Fee amount')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row justify-between items-center mt-[12px]'>
              <CyDView className='flex flex-row items-center '>
                <CyDView className='bg-n0 rounded-full w-[20px] h-[20px] flex flex-col items-center justify-center mr-[8px]'>
                  <CyDText className=' text-[14px] font-bold text-base400 text-center '>
                    {'='}
                  </CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-bold text-base400'>
                  {`$ ${ceil(ceil(parseFloat(amount || '0'), 2) - ceil(parseFloat(amount || '0') * 0.005, 2), 2)}`}
                </CyDText>
              </CyDView>
              <CyDText className='text-[12px] font-medium text-base400'>
                {t('Total crypto you will receive')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDKeyboardAwareScrollView>
      </CyDView>

      <CyDView className='bg-n0 px-[16px] pb-[32px] pt-[24px] rounded-t-[16px]'>
        <Button
          title={t('CONTINUE')}
          disabled={
            isEmpty(amount) || parseFloat(amount) > parseFloat(availableAmount)
          }
          onPress={() => {
            navigation.navigate(screenTitle.WITHDRAW_CONFIRMATION, {
              amount,
              availableAmount,
              currentCardProvider,
              card,
            });
          }}
        />
      </CyDView>
    </CyDView>
  );
}
