import clsx from 'clsx';
import { t } from 'i18next';
import { capitalize, round } from 'lodash';
import moment from 'moment';
import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Share from 'react-native-share';
import Toast from 'react-native-toast-message';
import { captureRef } from 'react-native-view-shot';
import { SHARE_TRANSACTION_TIMEOUT } from '../../core/Http';
import {
  copyToClipboard,
  getExplorerUrl,
  getExplorerUrlFromChainId,
  getMaskedAddress,
} from '../../core/util';
import { isAndroid } from '../../misc/checkers';
import { ActivityStatus, ActivityType } from '../../reducers/activity_reducer';
import {
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';
import Button from './button';
import CyDModalLayout from './modal';
import { screenTitle } from '../../constants';

const statuses: Record<string, string> = {
  [ActivityStatus.PENDING]: 'PENDING',
  [ActivityStatus.SUCCESS]: 'SUCCESS',
  [ActivityStatus.FAILED]: 'FAILED',
  [ActivityStatus.INPROCESS]: 'IN PROCESS',
  [ActivityStatus.DELAYED]: 'DELAYED',
};

export default function ActivityBridgeInfoModal({
  isModalVisible,
  setModalVisible,
  params,
  navigationRef,
}: {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  params: any;
  navigationRef: any;
}) {
  const viewRef = useRef();
  const [isCapturingDetails, setIsCapturingDetails] = useState<boolean>(false);

  async function shareTransactionImage() {
    try {
      // Check if viewRef.current exists
      if (!viewRef.current) {
        return;
      }

      const url = await captureRef(viewRef.current, {
        format: 'png',
        quality: 0.7,
        result: 'base64',
      });

      const shareImage = {
        title: t('SHARE_TITLE'),
        message: params?.transactionHash,
        subject: t('SHARE_TITLE'),
        url: `data:image/jpeg;base64,${url}`,
      };

      if (!isAndroid()) {
        delete shareImage.message;
      }

      await Share.open(shareImage)
        .then(res => {
          return res;
        })
        .catch(err => {
          return err;
        });
      setIsCapturingDetails(false);
      setModalVisible(false);
    } catch (error) {
      setIsCapturingDetails(false);
      setModalVisible(false);
    }
  }

  async function referFriend() {
    setIsCapturingDetails(true);
    setTimeout(() => {
      void shareTransactionImage();
    }, SHARE_TRANSACTION_TIMEOUT);
  }

  const copyHash = (url: string) => {
    copyToClipboard(url);
    Toast.show(t('COPIED_TO_CLIPBOARD'));
  };

  if (params) {
    const {
      fromTokenAmount,
      toTokenAmount,
      quoteData,
      fromChain,
      fromSymbol,
      toChain,
      toSymbol,
      status,
      type,
      transactionHash,
      fromChainId,
    } = params;
    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-n20 pb-[30px] rounded-t-[20px]'} ref={viewRef}>
          <CyDTouchView
            className={'flex flex-row justify-end z-10'}
            onPress={() => {
              setModalVisible(false);
            }}>
            {!isCapturingDetails && (
              <CyDImage
                source={AppImages.CLOSE}
                className={'w-[16px] h-[16px] top-[20px] right-[20px] '}
              />
            )}
          </CyDTouchView>
          <CyDView
            className={clsx('flex mt-[5%] justify-center items-center ', {
              'flex-row': !isCapturingDetails,
              'flex-col': isCapturingDetails,
            })}>
            {!isCapturingDetails && (
              <CyDView>
                {type === ActivityType.BRIDGE ? (
                  <CyDFastImage
                    source={
                      status === ActivityStatus.SUCCESS ||
                      status === ActivityStatus.INPROCESS
                        ? AppImages.BRIDGE_SUCCESS
                        : AppImages.BRIDGE_PENDING
                    }
                    className={'w-[22px] h-[22px] right-[9px]'}
                  />
                ) : (
                  <CyDFastImage
                    source={
                      status === ActivityStatus.SUCCESS ||
                      status === ActivityStatus.INPROCESS
                        ? AppImages.SWAP_SUCCESS
                        : AppImages.SWAP_PENDING
                    }
                    className='w-[22px] h-[22px] right-[9px]'
                  />
                )}
              </CyDView>
            )}
            {isCapturingDetails && (
              <CyDImage
                source={AppImages.CYPHERD}
                className={'w-[80px] h-[80px] top-[10px] self-center'}
              />
            )}
            <CyDView className='flex mt-[5%] justify-center items-center '>
              <CyDText className='text-center text-[20px] font-extrabold font-primaryTextColor'>
                {t<string>(
                  type === ActivityType.BRIDGE
                    ? 'BRIDGE_TRANSACTION'
                    : 'SWAP_TRANSACTION',
                )}
              </CyDText>
              <CyDText
                className={clsx('text-center text-[12px] font-extrabold ', {
                  'text-successTextGreen':
                    status === ActivityStatus.SUCCESS ||
                    status === ActivityStatus.INPROCESS,
                  'text-amber-400': status === ActivityStatus.DELAYED,
                })}>
                {statuses[status]}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView className='flex flex-col px-[40px]'>
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className=' text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>
                {t<string>('DATE')}
              </CyDText>
              <CyDText className='text-center  text-[14px] font-bold font-primaryTextColor'>
                {moment(new Date()).format('MMM DD, h:mm a')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start items-center'>
              <CyDText className=' text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>
                {t<string>('SENT')}
              </CyDText>
              <CyDView className='flex items-start'>
                <CyDText className='text-center  text-[14px] font-bold font-primaryTextColor'>{`${round(parseFloat(fromTokenAmount), 3)} ${String(fromSymbol)} (${capitalize(fromChain)})`}</CyDText>
                <CyDText className='text-center  text-[13px] font-primaryTextColor'>{`${round(parseFloat(quoteData.fromAmountUsd), 3)} USD`}</CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row mt-[10%] justify-start'>
              <CyDText className=' text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>
                {t<string>('RECEIVED')}
              </CyDText>
              <CyDView className='flex items-start'>
                <CyDText className='text-center  text-[14px] font-bold font-primaryTextColor'>{`${round(parseFloat(toTokenAmount), 3)} ${String(toSymbol)} (${capitalize(toChain)})`}</CyDText>
                <CyDText className='text-center  text-[13px] font-primaryTextColor'>{`${round(parseFloat(quoteData.toAmountUsd), 3)} USD`}</CyDText>
              </CyDView>
            </CyDView>
            {quoteData.gasFee && (
              <CyDView className='flex flex-row mt-[10%] justify-start'>
                <CyDText className=' text-[16px] mt-[3px] w-[50%] font-primaryTextColor'>
                  {t<string>('GAS_FEE')}
                </CyDText>
                <CyDText className='text-center  text-[14px] font-bold mt-[3px] font-primaryTextColor'>
                  {quoteData.gasFee
                    ? `${round(parseFloat(quoteData.gasFee), 6)} USD`
                    : ''}
                </CyDText>
              </CyDView>
            )}
            {transactionHash && (
              <CyDView className='flex flex-row mt-[10%] justify-star items-center'>
                <CyDText className=' text-[16px] w-[50%] text-activityFontColor'>
                  {t<string>('HASH')}
                </CyDText>
                <CyDText
                  onPress={() => {
                    setModalVisible(false);
                    navigationRef.navigate(screenTitle.TRANS_DETAIL, {
                      url: getExplorerUrlFromChainId(
                        fromChainId,
                        transactionHash,
                      ),
                    });
                  }}
                  className=' text-[14px] w-[40%] text-blue-500 underline font-bold '>
                  {getMaskedAddress(transactionHash)}
                </CyDText>
                <CyDTouchView
                  onPress={() =>
                    copyHash(
                      String(
                        getExplorerUrlFromChainId(fromChainId, transactionHash),
                      ),
                    )
                  }>
                  <CyDImage source={AppImages.COPY} />
                </CyDTouchView>
              </CyDView>
            )}
            <CyDImage
              source={AppImages.CYPHER_LOVE}
              className={'w-[98%] h-[90px] mt-[15px]'}
            />
            <CyDText
              className={'text-center  font-extrabold text-[20px] mt-[10px]'}>
              {t<string>('LOVE_CYPHERD_APP')}
            </CyDText>
            <CyDText className={'text-center  mt-[10px]'}>
              {t<string>('SHARE_WITH_FRIENDS')}
            </CyDText>
            {!isCapturingDetails && (
              <CyDView className='w-[100%] mt-[10%]'>
                <Button
                  onPress={() => {
                    void referFriend();
                  }}
                  style={'py-[5%] mx-[0px]'}
                  image={AppImages.SHARE}
                  imageStyle='h-[18px] w-[18px] mt-[3px] mr-[10px]'
                  title={t('SHARE_DETAILS')}
                  titleStyle='text-[14px]'
                />
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      </CyDModalLayout>
    );
  } else {
    return <></>;
  }
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
