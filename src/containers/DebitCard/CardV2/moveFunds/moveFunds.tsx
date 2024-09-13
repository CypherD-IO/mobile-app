import React, { useCallback, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import AppImages from '../../../../../assets/images/appImages';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import useAxios from '../../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import { t } from 'i18next';
import { parseErrorMessage } from '../../../../core/util';
import Button from '../../../../components/v2/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { ActivityStatus } from '../../../../reducers/activity_reducer';
import moment from 'moment';
import { get } from 'lodash';

interface MoveFundsPost {
  idempotencyKey: string;
  amount: number;
  isCompleteMigration: boolean;
}

interface RouteParams {
  cardBalance?: number;
}

const statuses: Record<string, string> = {
  [ActivityStatus.PENDING]: 'PENDING',
  [ActivityStatus.SUCCESS]: 'SUCCESS',
  [ActivityStatus.FAILED]: 'FAILED',
  [ActivityStatus.INPROCESS]: 'IN PROCESS',
  [ActivityStatus.DELAYED]: 'DELAYED',
};

export default function MigratePCFunds() {
  const insets = useSafeAreaInsets();
  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const [moveCustomAmount, setMoveCustomAmount] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [migrationData, setMigrationData] = useState<
    Array<{
      requestId: string;
      amount: number;
      isCompleteMigration: boolean;
      batchId: string;
      status: ActivityStatus;
      updatedAt: number;
    }>
  >([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const { cardBalance = 0 } = route.params;

  const handleMoveFunds = async () => {
    setIsLoading(true);
    const postData: MoveFundsPost = {
      idempotencyKey: uuidv4(),
      amount: moveCustomAmount ? Number(inputValue) : cardBalance,
      isCompleteMigration: true,
    };
    const { isError, error } = await postWithAuth(
      '/v1/cards/migration',
      postData,
    );

    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('MIGRATION_ERROR'),
        description:
          parseErrorMessage(error) ?? t('MIGRATION_ERROR_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }
    setIsLoading(false);
  };

  const getMigrationData = async () => {
    const { data, isError } = await getWithAuth('/v1/cards/migration');
    if (!isError) {
      setMigrationData(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void getMigrationData();
    }, []),
  );

  return (
    <CyDView
      style={{ paddingTop: insets.top + 50 }}
      className={clsx('h-full flex flex-col justify-between', {
        'justify-center': showSuccess,
      })}>
      {!showSuccess && (
        <CyDKeyboardAwareScrollView className=''>
          <CyDView className='mx-[16px] mb-[25px]'>
            <CyDText
              className={'font-semibold text-[14px] text-base100 mt-[12px]'}>
              {'Choose your preferred option'}
            </CyDText>
            <CyDTouchView
              className={clsx('bg-white rounded-[16px] p-[16px] mt-[26px]', {
                'border-[1px] border-[#FFBF15]': !moveCustomAmount,
                'border-[1px] border-white': moveCustomAmount,
              })}
              onPress={() => {
                setMoveCustomAmount(false);
              }}>
              <CyDView className='flex flex-row items-start justify-between'>
                <CyDText className='font-bold text-[18px] text-black w-[300px]'>
                  {'Move all the funds to new VISA® card account'}
                </CyDText>
                <CyDImage
                  source={
                    !moveCustomAmount
                      ? AppImages.RADIO_CHECK
                      : AppImages.RADIO_UNCHECK
                  }
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex flex-row items-start mt-[12px]'>
                <CyDImage
                  source={AppImages.FOREX_FEE}
                  className='w-[24px] h-[24px] mr-[12px]'
                />
                <CyDText className='font-semibold text-[14px] text-base200 w-[90%]'>
                  {'Your '}
                  <CyDText className='font-bold'>{`$${cardBalance}`}</CyDText>
                  {' will be transferred to the new VISA card account within '}
                  <CyDText className='font-bold'>{'3-5 business days'}</CyDText>
                  {'.'}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row items-start mt-[12px]'>
                <CyDImage
                  source={AppImages.MANAGE_CARD}
                  className='w-[24px] h-[24px] mr-[12px]'
                />
                <CyDView className='w-[90%]'>
                  <CyDText className='font-semibold text-[14px] text-base200 '>
                    {'Your '}
                    <CyDText className='font-bold'>{'existing card'}</CyDText>
                    {' will be '}
                    <CyDText className='font-bold'>
                      {'instantly blocked'}
                    </CyDText>
                    {'.'}
                  </CyDText>
                  <CyDText className='font-semibold text-[14px] text-base200 w-[90%]'>
                    {"You'll be able to spend with the new card as soon as the"}
                    <CyDText className='font-bold'>
                      {'funds are transferred.'}
                    </CyDText>
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDTouchView>
            <CyDTouchView
              className={clsx('bg-white rounded-[16px] p-[16px] mt-[16px]', {
                'border-[1px] border-[#FFBF15]': moveCustomAmount,
                'border-[1px] border-white': !moveCustomAmount,
              })}
              onPress={() => {
                setMoveCustomAmount(true);
              }}>
              <CyDView className='flex flex-row items-start justify-between'>
                <CyDText className='font-bold text-[18px] text-black w-[85%]'>
                  {'Move Custom Amount'}
                </CyDText>
                <CyDImage
                  source={
                    moveCustomAmount
                      ? AppImages.RADIO_CHECK
                      : AppImages.RADIO_UNCHECK
                  }
                  className='w-[24px] h-[24px]'
                />
              </CyDView>
              <CyDView className='flex flex-row items-start mt-[12px]'>
                <CyDImage
                  source={AppImages.FOREX_FEE}
                  className='w-[24px] h-[24px] mr-[12px]'
                />
                <CyDText className='font-semibold text-[14px] text-base200 w-[90%]'>
                  {
                    'Your requested amount will be transferred to the new VISA card account within '
                  }
                  <CyDText className='font-bold'>{'3-5 business days'}</CyDText>
                  {'.'}
                </CyDText>
              </CyDView>
              <CyDView className='mt-[10px] flex flex-row justify-between items-center'>
                <CyDText
                  className={clsx('text-[12px] font-bold text-black', {
                    'opacity-50': !moveCustomAmount,
                  })}>
                  {'Funds to move'}
                </CyDText>
                <CyDText
                  className={clsx('text-[12px] font-light text-black', {
                    'opacity-50': !moveCustomAmount,
                  })}>
                  {`BAL: $${cardBalance}`}
                </CyDText>
              </CyDView>
              <CyDView className='flex flex-row items-center border-[1px] border-n40 rounded-[8px] mt-[4px]'>
                <CyDText
                  className={clsx(
                    'text-[16px] text-black font-semibold ml-[12px] mr-[8px]',
                    {
                      'opacity-50': !moveCustomAmount,
                    },
                  )}>
                  {'$'}
                </CyDText>
                <CyDTextInput
                  className='text-[16px] text-black w-[85%] font-semibold py-[12px] pr-[12px]'
                  keyboardType='numeric'
                  value={inputValue}
                  onChangeText={text => {
                    const numericValue = parseFloat(text);
                    if (
                      text === '' ||
                      (!isNaN(numericValue) && numericValue <= cardBalance)
                    ) {
                      setInputValue(text);
                    }
                  }}
                  placeholder='Amount'
                  returnKeyType='done'
                  onFocus={() => {
                    if (!moveCustomAmount) setMoveCustomAmount(true);
                  }}
                />
              </CyDView>
            </CyDTouchView>

            <CyDView className='mt-[24px]'>
              {migrationData.length > 0 && (
                <CyDText className='text-n100 text-[12px] font-medium'>
                  {'Previous movements'}
                </CyDText>
              )}
              {migrationData.map(item => (
                <CyDView
                  className='mt-[12px] flex flex-row justify-between items-center bg-white rounded-[8px] p-[12px]'
                  key={item.requestId}>
                  <CyDText className='text-black font-semibold text-[14px]'>
                    {`$${item.amount.toLocaleString()}`}
                  </CyDText>
                  <CyDText className='text-black font-medium text-[10px]'>
                    {moment(item.updatedAt).format('DD/MM/YYYY HH:mm')}
                  </CyDText>
                  <CyDText
                    className={clsx('text-black font-regular text-[12px]', {
                      'text-orange-400':
                        ActivityStatus.INPROCESS === item.status ||
                        ActivityStatus.PENDING === item.status,
                      'text-red-500': ActivityStatus.FAILED === item.status,
                      'text-emerald-700':
                        ActivityStatus.SUCCESS === item.status,
                    })}>
                    {get(statuses, item.status, '')}
                  </CyDText>
                </CyDView>
              ))}
            </CyDView>
          </CyDView>
        </CyDKeyboardAwareScrollView>
      )}
      {showSuccess && (
        <CyDView className=' mx-[25px]'>
          <CyDImage
            source={AppImages.CYPHER_SUCCESS}
            className='w-[72px h-[72px] self-center'
          />
          <CyDText className='text-base400 text-[16px] font-bold mt-[16px] text-center'>
            {'Your request has been placed'}
          </CyDText>
          <CyDText className='text-base400 text-[14px] font-medium mt-[16px] text-center'>
            {`Your request has been placed. The requested amount of $${moveCustomAmount ? inputValue : cardBalance} will be transferred to your VISA® card account within 3 to 5 business days.`}
          </CyDText>
        </CyDView>
      )}
      {!showSuccess && (
        <CyDView className='flex flex-row justify-between items-center bg-white rounded-t-[16px] px-[16px] py-[32px] w-full'>
          <Button
            title={t('CONTINUE')}
            onPress={() => {
              void handleMoveFunds();
            }}
            disabled={!inputValue && moveCustomAmount}
            style='w-full'
            loading={isLoading}
            loaderStyle={styles.loading}
          />
        </CyDView>
      )}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loading: {
    height: 22,
    width: 22,
  },
});
