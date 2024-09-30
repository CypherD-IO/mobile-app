import React, { useCallback, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { t } from 'i18next';
import { parseErrorMessage } from '../../../core/util';
import Button from '../../../components/v2/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import moment from 'moment';
import { get, isEmpty } from 'lodash';
import CyDModalLayout from '../../../components/v2/modal';
import * as Sentry from '@sentry/react-native';
import Loading from '../../../components/v2/loading';

interface MoveFundsPost {
  idempotencyKey: string;
  amount: number;
  isCompleteMigration: boolean;
}

interface MigrationData {
  requestId: string;
  amount: number;
  isCompleteMigration: boolean;
  batchId: string;
  status: 'IN_PROGRESS' | 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: number;
}

interface RouteParams {
  currentCardProvider: string;
  cardId: string;
}

const statuses: Record<string, string> = {
  PENDING: 'Pending',
  SUCCESS: 'Succcess',
  FAILED: 'Failed',
  DELAYED: 'Delayed',
  IN_PROGRESS: 'In Progress',
};

export default function MigratePCFunds() {
  const insets = useSafeAreaInsets();
  const { postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const [moveCustomAmount, setMoveCustomAmount] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [gaveConsent, setGaveConsent] = useState(false);
  const [migrationData, setMigrationData] = useState<MigrationData[]>([]);

  const { cardId, currentCardProvider } = route.params ?? {};
  const [cardBalance, setCardBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const getMigrationData = async () => {
    const { isError, data } = await getWithAuth('/v1/cards/migration');
    if (!isError && data) {
      setMigrationData(
        data.sort(
          (a: MigrationData, b: MigrationData) => b.createdAt - a.createdAt,
        ),
      );
    }
  };

  const fetchCardBalance = useCallback(async () => {
    setBalanceLoading(true);
    const url = `/v1/cards/${currentCardProvider}/card/${String(cardId)}/balance`;
    try {
      const response = await getWithAuth(url);
      if (!response.isError && response?.data && response.data.balance) {
        setCardBalance(Number(response.data.balance));
      } else {
        setCardBalance(0);
      }
      setBalanceLoading(false);
    } catch (error) {
      Sentry.captureException(error);
      setCardBalance(0);
    }
    setBalanceLoading(false);
  }, [currentCardProvider, cardId]);

  useFocusEffect(
    useCallback(() => {
      void fetchCardBalance();
      void getMigrationData();
    }, []),
  );

  const handleMoveFunds = async () => {
    setIsLoading(true);
    const postData: MoveFundsPost = {
      idempotencyKey: uuidv4(),
      amount: moveCustomAmount ? Number(inputValue) : cardBalance,
      isCompleteMigration: false,
    };
    const { isError, error } = await postWithAuth(
      '/v1/cards/migration',
      postData,
    );

    if (isError) {
      showModal('state', {
        type: 'error',
        title: t('MIGRATION_ERROR'),
        description: parseErrorMessage(error) ?? t('CONTACT_SUPPORT'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      setShowSuccess(true);
      await getMigrationData();
      setTimeout(() => {
        setShowSuccess(false);
        if (!isEmpty(inputValue)) setInputValue('');
        void fetchCardBalance();
      }, 2000);
    }
    setIsLoading(false);
  };

  if (balanceLoading) {
    return <Loading />;
  }

  return (
    <CyDView
      style={{ paddingTop: insets.top + 50 }}
      className={clsx('h-full flex flex-col justify-between', {
        'justify-center': showSuccess,
      })}>
      <CyDModalLayout
        isModalVisible={showConsentModal}
        style={styles.modalLayout}
        setModalVisible={setShowConsentModal}>
        <CyDView className={'bg-white rounded-t-[20px] p-[16px] pb-[40px]'}>
          <CyDView className={'flex flex-row items-center'}>
            <CyDView className='flex-1'>
              <CyDText className='text-[24px] pl-[16px] font-bold text-center'>
                {t('MIGRATE_FUNDS')}
              </CyDText>
            </CyDView>
            <CyDTouchView
              onPress={() => {
                setShowConsentModal(false);
              }}
              className={'text-black'}>
              <CyDView className='w-[24px] h-[24px] z-[50]'>
                <CyDImage
                  source={AppImages.CLOSE}
                  className={'w-[16px] h-[16px]'}
                />
              </CyDView>
            </CyDTouchView>
          </CyDView>
          <CyDView>
            <CyDView className='flex flex-row justify-center my-[24px]'>
              <CyDImage
                source={AppImages.CYPHER_INFO}
                className='h-[100px] w-[160px]'
                resizeMode='contain'
              />
            </CyDView>
            <CyDText className='text-[12px] font-medium text-center self-center w-[75%]'>
              {`You are about to migrate `}
              <CyDText className='text-[14px] font-bold text-center'>{`"$${moveCustomAmount ? inputValue : cardBalance}"`}</CyDText>
              {' of your funds to a new VISA® card account.'}
            </CyDText>
            <CyDView className='p-[8px] mt-[24px]'>
              <CyDView className='flex flex-row items-center '>
                <CyDTouchView
                  className={clsx(
                    'h-[20px] w-[20px] border-[1px] rounded-[4px]',
                    {
                      'bg-black': gaveConsent,
                    },
                  )}
                  onPress={() => {
                    setGaveConsent(!gaveConsent);
                  }}>
                  {gaveConsent && (
                    <CyDImage
                      source={AppImages.CORRECT}
                      className='h-[15px] w-[15px] ml-[2px]'
                      resizeMode='contain'
                    />
                  )}
                </CyDTouchView>
                <CyDView className='w-[95%] ml-[12px] relative'>
                  <CyDText className='px-[12px] text-[12px]'>
                    {
                      'I agree that this action cannot be undone and give my consent to migrate the funds'
                    }
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>

            <CyDView className='mt-[18px]'>
              <Button
                disabled={!gaveConsent}
                title={t('CONTINUE_ALL_CAPS')}
                onPress={() => {
                  setShowConsentModal(false);
                  void handleMoveFunds();
                }}
              />
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      {!showSuccess && (
        <CyDKeyboardAwareScrollView className=''>
          <CyDView className='mx-[16px] mb-[25px]'>
            <CyDText
              className={'font-semibold text-[14px] text-base100 mt-[12px]'}>
              {'Choose your preferred option'}
            </CyDText>
            <CyDTouchView
              className={clsx('bg-white rounded-[16px] p-[16px] mt-[16px]', {
                'border-[1px] border-[#FFBF15]': !moveCustomAmount,
                'border-[1px] border-white': moveCustomAmount,
              })}
              onPress={() => {
                setMoveCustomAmount(false);
              }}>
              <CyDView className='flex flex-row items-start justify-between'>
                <CyDText className='font-bold text-[18px] text-black w-[300px] font-manrope'>
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
                  <CyDText className='font-semibold text-[14px] text-base200 w-[90%]'>
                    {
                      "You'll be able to spend your funds with the new card as soon as the "
                    }
                    <CyDText className='font-bold'>
                      {' funds are transferred.'}
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
                  className={clsx('text-[12px] font-semibold text-black', {
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
                    {moment.unix(item.createdAt).format('DD/MM/YYYY HH:mm')}
                  </CyDText>
                  <CyDText
                    className={clsx('text-black font-regular text-[12px]', {
                      'text-orange-400':
                        item.status === 'IN_PROGRESS' ||
                        item.status === 'PENDING',
                      'text-red-500': item.status === 'FAILED',
                      'text-emerald-700': item.status === 'SUCCESS',
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
            source={AppImages.SUCCESS_TICK_GREEN_BG}
            className='w-[72px] h-[72px] self-center'
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
              setShowConsentModal(true);
            }}
            disabled={
              (!inputValue && moveCustomAmount) || Number(cardBalance) === 0
            }
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
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
