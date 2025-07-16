import React, { useEffect, useState, useCallback } from 'react';
import {
  CyDFastImage,
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Loading from '../../../../components/v2/loading';
import useAxios from '../../../../core/HttpRequest';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import AppImages from '../../../../../assets/images/appImages';
import * as Sentry from '@sentry/react-native';
import { useGlobalModalContext } from '../../../../components/v2/GlobalModal';
import { getExplorerUrl, parseErrorMessage } from '../../../../core/util';
import { t } from 'i18next';
import clsx from 'clsx';
import { get, isEmpty } from 'lodash';
import moment from 'moment';
import { screenTitle } from '../../../../constants';
import { CHAIN_BASE } from '../../../../constants/server';
import { Card } from '../../../../models/card.model';
import { CyDIconsPack } from '../../../../customFonts';

interface RouteParams {
  amount: string;
  card: Card;
  currentCardProvider: string;
}

interface Transaction {
  createdAt: number;
  requestId: string;
  requestedAmount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  transactionHash: '';
  withdrawableAmount: 0.4975;
}
const statusText = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export default function WithdrawHistory() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const [loading, setLoading] = useState(false);
  const [transactionData, setTransactionData] = useState<Transaction[]>([]);

  const { card, currentCardProvider } = route.params ?? {};

  const fetchTransactionData = useCallback(async () => {
    setLoading(true);
    const { isError, error, data } = await getWithAuth(
      '/v1/cards/crypto-withdrawal',
    );

    if (!isError) {
      setTransactionData(
        data.sort(
          (a: Transaction, b: Transaction) => b.createdAt - a.createdAt,
        ),
      );
    } else {
      showModal('state', {
        type: 'error',
        title: t('WITHDRAW_ERROR'),
        description: parseErrorMessage(error) ?? t('TRANSACTION_FETCH_ERROR'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      Sentry.captureException(error);
    }
    setLoading(false);
  }, [getWithAuth, hideModal, showModal]);

  useFocusEffect(
    useCallback(() => {
      void fetchTransactionData();
    }, []),
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <CyDView className='h-full bg-n0' style={{ paddingTop: insets.top }}>
      <CyDView className='flex flex-row items-center justify-between py-[16px] px-[16px] '>
        <CyDView className='flex flex-row items-center justify-start'>
          <CyDTouchView
            className='pr-[16px]'
            onPress={() => {
              navigation.navigate(screenTitle.CRYPTO_WITHDRAWAL, {
                card,
                currentCardProvider,
              });
            }}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[16px] font-bold text-base400'>
            {t('WITHDRAW_HISTORY')}
          </CyDText>
        </CyDView>
      </CyDView>
      <CyDKeyboardAwareScrollView className='flex-1 bg-n30 px-[16px]'>
        {transactionData.map(transaction => {
          return (
            <CyDView
              key={transaction.requestId}
              className='flex flex-row items-center justify-between mt-[16px] p-[12px] bg-n0 rounded-[12px]'>
              <CyDView className='flex flex-row'>
                <CyDView className='bg-n30 rounded-tl-[8px] rounded-br-[8px] p-[7px] mr-[8px] w-[34px] h-[34px]'>
                  <CyDFastImage
                    source={AppImages.FLYING_MONEY}
                    className='w-[20px] h-[20px]'
                  />
                </CyDView>
                <CyDView>
                  <CyDText
                    className={clsx('text-[14px] font-semibold', {
                      'text-yellow-600': transaction.status === 'PENDING',
                      'text-orange500': transaction.status === 'IN_PROGRESS',
                      'text-emerald-500': transaction.status === 'COMPLETED',
                      'text-red-500': transaction.status === 'FAILED',
                    })}>
                    {get(statusText, transaction.status, transaction.status)}
                  </CyDText>
                  <CyDText className='text-[11px] text-base150 font-normal'>
                    {moment
                      .unix(transaction.createdAt)
                      .format('DD MMM YYYY HH:mm')}
                  </CyDText>
                  {!isEmpty(transaction.transactionHash) && (
                    <CyDView className='flex flex-row items-center '>
                      <CyDText
                        className='text-[10px] underline mr-[4px]'
                        onPress={() => {
                          navigation.navigate(screenTitle.TRANS_DETAIL, {
                            url: getExplorerUrl(
                              CHAIN_BASE.symbol,
                              CHAIN_BASE.backendName,
                              transaction.transactionHash,
                            ),
                          });
                        }}>
                        {transaction.transactionHash}
                      </CyDText>
                      <CyDMaterialDesignIcons
                        name='open-in-new'
                        size={14}
                        className='text-base400'
                      />
                    </CyDView>
                  )}
                </CyDView>
              </CyDView>
              <CyDView>
                <CyDText className='text-[14px] font-semibold text-base400'>{`$ ${transaction.withdrawableAmount}`}</CyDText>
              </CyDView>
            </CyDView>
          );
        })}
      </CyDKeyboardAwareScrollView>
    </CyDView>
  );
}
