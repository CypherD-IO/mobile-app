import React, { useEffect, useState } from 'react';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import clsx from 'clsx';
import CyDModalLayout from '../modal';
import { showToast } from '../../../containers/utilities/toastUtility';
import { StyleSheet } from 'react-native';

export default function CardDetailsModal({
  isModalVisible,
  setShowModal,
  cardDetails,
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  cardDetails: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
}) {
  const [showDetails, setShowDetails] = useState({
    cardNumber: false,
    expiry: false,
    cvv: false,
  });
  const [hideTimer, setHideTimer] = useState(0);
  const [hideInterval, setHideInterval] = useState<NodeJS.Timeout>();
  const detailsAutoCloseTime = 60;

  useEffect(() => {
    if (isModalVisible) {
      let hideTime = detailsAutoCloseTime;
      setHideInterval(
        setInterval(() => {
          hideTime--;
          setHideTimer(hideTime);
        }, 1000),
      );
    }
    if (!isModalVisible) {
      clearInterval(hideInterval);
      setShowDetails({
        cardNumber: false,
        expiry: false,
        cvv: false,
      });
    }
    return () => {
      clearInterval(hideInterval);
      setShowDetails({
        cardNumber: false,
        expiry: false,
        cvv: false,
      });
    };
  }, [isModalVisible]);

  useEffect(() => {
    if (hideTimer === 0) {
      clearInterval(hideInterval);
      setShowModal(false);
    }
  }, [hideTimer]);

  const toggleCardDetail = (type: string) => {
    switch (type) {
      case 'cardNumber':
        setShowDetails({
          cardNumber: !showDetails.cardNumber,
          expiry: false,
          cvv: false,
        });
        break;
      case 'expiry':
        setShowDetails({
          cardNumber: false,
          expiry: !showDetails.expiry,
          cvv: false,
        });
        break;
      case 'cvv':
        setShowDetails({
          cardNumber: false,
          expiry: false,
          cvv: !showDetails.cvv,
        });
        break;
    }
  };

  const copyToClipboard = (type: string) => {
    switch (type) {
      case 'cardNumber':
        copyToClipboard(cardDetails.cardNumber);
        break;
      case 'expiry':
        copyToClipboard(cardDetails.expiryMonth + '/' + cardDetails.expiryYear);
        break;
      case 'cvv':
        copyToClipboard(cardDetails.cvv);
        break;
    }
    showToast('Copied to clipboard');
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-cardBgTo px-[12px] py-[24px] m-[2px] mb-[12px] rounded-[16px]'>
        <CyDView className='flex flex-row justify-between items-center mb-[24px]'>
          <CyDView className='flex-1 justify-center items-center'>
            <CyDText className='text-[22px] font-semibold ml-[24px]'>
              Card Details
            </CyDText>
          </CyDView>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CyDImage
              source={AppImages.CLOSE_CIRCLE}
              className='h-[28px] w-[28px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center w-full'>
          <CyDText className='text-center text-[14px] text-lightThemeGrayText w-full'>
            Details will be hidden in {hideTimer} sec
          </CyDText>
        </CyDView>
        <CyDView className='bg-n0 rounded-[12px] p-[8px] mt-[8px]'>
          <CyDText className='text-[18px] font-semibold'>Card Number</CyDText>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDText
              className={clsx('text-[18px]', {
                'text-[32px] mt-[-12px]': !showDetails.cardNumber,
              })}>
              {showDetails.cardNumber
                ? cardDetails.cardNumber
                : '.... .... .... ....'}
            </CyDText>
            <CyDView className='flex flex-row items-center gap-[12px]'>
              <CyDTouchView onPress={() => toggleCardDetail('cardNumber')}>
                <CyDImage
                  source={
                    showDetails.cardNumber
                      ? AppImages.EYE_CLOSE
                      : AppImages.EYE_OPEN
                  }
                  className='h-[24px] w-[24px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
              <CyDTouchView onPress={() => copyToClipboard('cardNumber')}>
                <CyDImage
                  source={AppImages.COPY}
                  className='h-[18px] w-[18px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='bg-n0 rounded-[12px] p-[8px] mt-[18px]'>
          <CyDText className='text-[18px] font-semibold'>Expiry Date</CyDText>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDText
              className={clsx('text-[18px]', {
                'text-[32px] mt-[-12px]': !showDetails.expiry,
              })}>
              {showDetails.expiry
                ? cardDetails.expiryMonth + ' / ' + cardDetails.expiryYear
                : '.. ....'}
            </CyDText>
            <CyDView className='flex flex-row items-center gap-[12px]'>
              <CyDTouchView onPress={() => toggleCardDetail('expiry')}>
                <CyDImage
                  source={
                    showDetails.expiry
                      ? AppImages.EYE_CLOSE
                      : AppImages.EYE_OPEN
                  }
                  className='h-[24px] w-[24px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
              <CyDTouchView onPress={() => copyToClipboard('expiry')}>
                <CyDImage
                  source={AppImages.COPY}
                  className='h-[18px] w-[18px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='bg-n0 rounded-[12px] px-[8px] py-[10px] mt-[18px]'>
          <CyDText className='text-[18px] ont-bold'>CVV</CyDText>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDText
              className={clsx('text-[18px]', {
                'text-[32px] mt-[-12px]': !showDetails.cvv,
              })}>
              {showDetails.cvv ? cardDetails.cvv : '...'}
            </CyDText>
            <CyDView className='flex flex-row items-center gap-[12px]'>
              <CyDTouchView onPress={() => toggleCardDetail('cvv')}>
                <CyDImage
                  source={
                    showDetails.cvv ? AppImages.EYE_CLOSE : AppImages.EYE_OPEN
                  }
                  className='h-[24px] w-[24px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
              <CyDTouchView onPress={() => copyToClipboard('cvv')}>
                <CyDImage
                  source={AppImages.COPY}
                  className='h-[18px] w-[18px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    marginBottom: 50,
    justifyContent: 'flex-end',
  },
});
