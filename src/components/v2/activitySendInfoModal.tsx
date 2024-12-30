import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';
import Button from './button';
import moment from 'moment';
import {
  getMaskedAddress,
  getExplorerUrl,
  copyToClipboard,
} from '../../core/util';
import { useTranslation } from 'react-i18next';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { SHARE_TRANSACTION_TIMEOUT } from '../../core/Http';
import clsx from 'clsx';
import * as C from '../../constants';
import { isAndroid } from '../../misc/checkers';
import Toast from 'react-native-toast-message';

export default function ActivitySendInfoModal({
  isModalVisible,
  setModalVisible,
  params,
  navigationRef,
}: {
  isModalVisible: boolean;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  params: {
    datetime: Date;
    amount: string;
    symbol: string;
    chainLogo: string;
    chainName: string;
    transactionHash: string;
    gasAmount: string;
    toAddress: string;
    fromAddress: string;
    tokenName: string;
    tokenLogo: string;
  } | null;
  navigationRef: any;
}) {
  const viewRef = useRef();
  const { t } = useTranslation();
  const [isCapturingDetails, setIsCapturingDetails] = useState<boolean>(false);

  async function shareTransactionImage() {
    const url = await captureRef(viewRef, {
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

  if (params !== null) {
    const {
      datetime,
      amount,
      symbol,
      toAddress,
      fromAddress,
      chainName,
      chainLogo,
      transactionHash,
      gasAmount = 'Not Available',
      tokenName,
      tokenLogo,
    } = params;
    return (
      <CyDModalLayout
        setModalVisible={setModalVisible}
        isModalVisible={isModalVisible}
        style={
          isCapturingDetails ? styles.captureModalLayout : styles.modalLayout
        }
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView className={'bg-n0 pb-[30px] rounded-t-[20px]'} ref={viewRef}>
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
          {!isCapturingDetails && (
            <CyDView className='flex mt-[5%] justify-center items-center '>
              <CyDText className='text-center  text-[20px] font-extrabold text-activityFontColor'>
                {t<string>('SEND')}
              </CyDText>
              <CyDText className='text-center  text-[12px] ml-[5px] font-extrabold text-successTextGreen'>
                {t<string>('SUCCESSFUL')}
              </CyDText>
            </CyDView>
          )}
          {isCapturingDetails && (
            <CyDImage
              source={AppImages.CYPHERD}
              className={'w-[80px] h-[80px] top-[10px] self-center'}
            />
          )}
          <CyDView className='flex flex-col px-[40px]'>
            <CyDView className='flex flex-row justify-start align-center'>
              <CyDView className='w-[100%] justify-center items-center'>
                <CyDView
                  className={clsx(
                    'flex flex-row flex-wrap w-[100%] mt-[7%] items-center',
                    {
                      'justify-start w-[100%]': !isCapturingDetails,
                      'justify-center': isCapturingDetails,
                    },
                  )}>
                  <CyDView className='flex flex-row'>
                    {tokenLogo && (
                      <CyDImage
                        source={{ uri: tokenLogo }}
                        className={'w-[25px] h-[25px]'}
                      />
                    )}
                    {tokenName && (
                      <CyDText className=' text-[16px] ml-[10px] mt-[2px] font-bold text-activityFontColor'>
                        {tokenName.toUpperCase()}
                      </CyDText>
                    )}
                  </CyDView>
                  {isCapturingDetails && (
                    <CyDText className=' text-[16px] mt-[2px] ml-[5px] font-bold  text-successTextGreen'>
                      {t<string>('TRANSACTION_SUCCESS')}
                    </CyDText>
                  )}
                </CyDView>
                <CyDView
                  className={clsx('flex flex-row flex-wrap items-center ', {
                    'justify-start w-[100%] mt-[15px]': !isCapturingDetails,
                    'justify-center mt-[10px]': isCapturingDetails,
                  })}>
                  <CyDText className=' text-[12px]'>
                    {t<string>('SENT_ON')}
                  </CyDText>
                  {chainLogo && (
                    <CyDImage
                      source={chainLogo}
                      className={'ml-[10px] mr-[3px] w-[15px] h-[15px]'}
                    />
                  )}
                  {chainName && (
                    <CyDText className=' text-[12px]'>
                      {chainName.toUpperCase()}
                    </CyDText>
                  )}
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView
              className={
                'flex flex-row mt-[10%] justify-start items-center pb-[12px] border-b-[1px] border-n40'
              }>
              <CyDText className=' text-[16px] mt-[1px] w-[30%] text-activityFontColor'>
                {t<string>('DATE')}
              </CyDText>
              <CyDText className=' text-[14px] font-bold text-activityFontColor'>
                {moment(datetime).format('MMM DD, h:mm a')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-n40'>
              <CyDText className=' text-[16px] w-[30%] text-activityFontColor'>
                {t<string>('VALUE')}
              </CyDText>
              <CyDText
                numberOfLines={1}
                className='w-[70%]  text-[14px] font-bold text-activityFontColor'>{`${amount} ${tokenName}`}</CyDText>
            </CyDView>
            <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-n40'>
              <CyDText className=' text-[16px] w-[30%] text-activityFontColor'>
                {t<string>('HASH')}
              </CyDText>
              <CyDText
                onPress={() => {
                  setModalVisible(false);
                  navigationRef.navigate(C.screenTitle.TRANS_DETAIL, {
                    url: getExplorerUrl(symbol, chainName, transactionHash),
                  });
                }}
                className=' text-[14px] w-[65%] text-blue-500 underline font-bold '>
                {getMaskedAddress(transactionHash)}
              </CyDText>
              <CyDTouchView
                onPress={() =>
                  copyHash(
                    String(getExplorerUrl(symbol, chainName, transactionHash)),
                  )
                }>
                <CyDImage source={AppImages.COPY} />
              </CyDTouchView>
            </CyDView>
            <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-n40'>
              <CyDText className=' text-[16px] w-[30%] text-activityFontColor'>
                {t<string>('SENDER')}
              </CyDText>
              <CyDText className=' text-[16px] font-bold text-activityFontColor'>
                {getMaskedAddress(fromAddress)}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row h-[60px] justify-start items-center border-b-[1px] border-n40'>
              <CyDText className=' text-[16px] w-[30%] text-activityFontColor'>
                {t<string>('RECEIVER')}
              </CyDText>
              <CyDText className=' text-[16px] font-bold text-activityFontColor'>
                {getMaskedAddress(toAddress)}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row h-[50px] justify-start items-center'>
              <CyDText className=' text-[16px] mt-[1px] w-[30%] text-activityFontColor'>
                {t<string>('GAS_FEE')}
              </CyDText>
              <CyDText className=' text-[14px] font-bold mt-[3px] text-activityFontColor'>{`${gasAmount} ${gasAmount === 'Not Available' ? '' : 'USD'}`}</CyDText>
            </CyDView>
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
  }
  return <></>;
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  captureModalLayout: {
    top: '100%',
  },
});
