/* eslint-disable react-native/no-raw-text */
import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';
import Button from './button';
import moment from 'moment';
import { onShare } from '../../containers/utilities/socialShareUtility';
import { useTranslation } from 'react-i18next';
import { copyToClipboard, generateUserInviteLink } from '../../core/util';
import { showToast } from '../../containers/utilities/toastUtility';
import { round } from 'lodash';
import { ActivityStatus } from '../../reducers/activity_reducer';

export default function ActivityInfoModal({
  isModalVisible,
  setModalVisible,
  params,
}: {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  params: {
    datetime: Date;
    amount: string;
    symbol: string;
    amountInUsd: string;
    gasAmount: string;
    quoteId?: string;
    txnHash?: string;
    status?: ActivityStatus;
  } | null;
}) {
  const { t } = useTranslation();
  async function referFriend() {
    try {
      const referralInviteLink = generateUserInviteLink();
      void onShare(
        t('RECOMMEND_TITLE'),
        t('RECOMMEND_MESSAGE'),
        referralInviteLink,
      );
    } catch (error) {
      // Ignore if the link generation fails
    }
  }

  if (params !== null) {
    const {
      datetime,
      amount,
      symbol,
      amountInUsd,
      gasAmount = 'Not Available',
      quoteId,
      txnHash,
      status,
    } = params;
    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-white pb-[30px] rounded-[20px] max-h-[90%]'}>
          <CyDTouchView
            className={'flex flex-row justify-end z-10'}
            onPress={() => {
              setModalVisible(false);
            }}>
            <CyDImage
              source={AppImages.CLOSE}
              className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
            />
          </CyDTouchView>
          <CyDView className='flex mt-[5%] flex-row justify-center items-center '>
            <CyDImage
              source={AppImages.CARD_SUCCESS}
              className={'w-[21px] h-[21px] right-[9px]'}
            />
            <CyDView className='flex mt-[5%] justify-center items-center '>
              <CyDText className='text-center font-nunito text-[20px] font-extrabold  '>
                {t<string>('DEBIT_CARD_TRANSACTION')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[12px] font-extrabold text-successTextGreen'>
                {t<string>('SUCCESSFUL')}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDScrollView className='flex flex-col px-[40px]'>
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                {t<string>('DATE')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[14px] mt-[4.5px] font-bold  '>
                {moment(datetime).format('MMM DD, h:mm a')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                {t<string>('WITHDRAWN')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[14px] mt-[5px] font-bold  '>{`${amount} ${symbol}`}</CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                {t<string>('RECEIVED')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[14px] mt-[5px] font-bold mt-[5px]  '>{`$${amountInUsd}`}</CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                {t<string>('GAS_FEE')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[14px] mt-[5px] font-bold mt-[5px]  '>{`${gasAmount} ${gasAmount === 'Not Available' ? '' : 'USD'}`}</CyDText>
            </CyDView>
            <CyDTouchView
              className='flex flex-row mt-[10%] justify-start'
              onPress={() => {
                copyToClipboard(txnHash);
                showToast(t('SEED_PHARSE_COPY'));
              }}>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                {t<string>('TRANSACTION_HASH')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[14px] mt-[5px] font-bold mt-[3px]  '>
                {txnHash
                  ? `${txnHash.substring(0, 8)}...${txnHash.substring(txnHash.length - 6, txnHash.length)}\t`
                  : 'TBD\t'}
                <CyDImage
                  source={AppImages.COPY}
                  className={'relative left-[20px] w-[16px] h-[18px]'}
                />
              </CyDText>
            </CyDTouchView>
            {status === ActivityStatus.INPROCESS && (
              <CyDTouchView
                className='flex flex-row mt-[10%] justify-start'
                onPress={() => {
                  copyToClipboard(quoteId);
                  showToast(t('QUOTE_ID_COPY'));
                }}>
                <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                  {t<string>('QUOTE_UUID')}
                </CyDText>
                <CyDText className='text-center font-nunito text-[14px] mt-[5px] font-bold mt-[3px]  '>
                  {`${quoteId.substring(0, 8)}...${quoteId.substring(quoteId.length - 6, quoteId.length)}      `}
                  <CyDImage
                    source={AppImages.COPY}
                    className={'relative left-[20px] w-[16px] h-[18px]'}
                  />
                </CyDText>
              </CyDTouchView>
            )}

            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className='font-nunito text-[16px] mt-[3px] w-[30%]  '>
                {t<string>('EXCHANGE_RATE')}
              </CyDText>
              <CyDText className='text-center font-nunito text-[14px] mt-[3px] font-bold mt-[5px]  '>{`${String(round((parseFloat(amountInUsd) - parseFloat(gasAmount === 'Not Available' ? '0' : gasAmount)) / parseFloat(amount), 6))} USD`}</CyDText>
            </CyDView>

            <CyDImage
              source={AppImages.CYPHER_LOVE}
              className={'w-[98%] h-[90px] mt-[15px]'}
            />
            <CyDText
              className={
                'text-center font-nunito font-extrabold text-[20px] mt-[10px]'
              }>
              {t<string>('LOVE_CYPHERD_APP')}
            </CyDText>
            <CyDText className={'text-center font-nunito mt-[10px]'}>
              {t<string>('SHARE_WITH_FRIENDS')}
            </CyDText>

            <CyDView className='w-[100%] mt-[10%]'>
              <Button
                onPress={() => {
                  void referFriend();
                }}
                style={'py-[5%] mx-[0px]'}
                image={AppImages.REFER}
                title={t('RECOMMEND_FRIEND')}
                titleStyle={'text-[14px]'}
                isLottie={false}
              />
            </CyDView>
          </CyDScrollView>
        </CyDView>
      </CyDModalLayout>
    );
  }
  return <></>;
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
