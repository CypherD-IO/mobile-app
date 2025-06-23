import React, { useCallback, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDImageBackground,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import clsx from 'clsx';
import CyDModalLayout from '../modal';
import { showToast } from '../../../containers/utilities/toastUtility';
import { StyleSheet } from 'react-native';
import { Card } from '../../../models/card.model';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../assets/images/appImages';
import { useTranslation } from 'react-i18next';
import {
  CardDesignType,
  CardProviders,
  PhysicalCardType,
} from '../../../constants/enum';
import WebView from 'react-native-webview';
import Loading from '../loading';
import { copyToClipboard as copyToClipboardUtil } from '../../../core/util';

export default function CardDetailsModal({
  isModalVisible,
  setShowModal,
  card,
  cardDetails,
  userName,
  webviewUrl,
  manageLimits,
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  card: Card;
  cardDetails: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  userName: string;
  webviewUrl?: string;
  manageLimits?: () => void;
}) {
  const [hideTimer, setHideTimer] = useState(0);
  const [hideInterval, setHideInterval] = useState<NodeJS.Timeout>();
  const detailsAutoCloseTime = 60;
  const { t } = useTranslation();
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
    }
    return () => {
      clearInterval(hideInterval);
    };
  }, [isModalVisible]);

  useEffect(() => {
    if (hideTimer === 0) {
      clearInterval(hideInterval);
      setShowModal(false);
    }
  }, [hideTimer]);

  const getCardImage = () => {
    const cardImage = `${CYPHER_CARD_IMAGES}/${card.type}-reveal-${card.designId ?? ''}.png`;
    return {
      uri: cardImage,
    };
  };

  const RenderCardDetails = useCallback(
    ({
      card,
      cardDetails,
      webviewUrl,
    }: {
      card: Card;
      cardDetails: {
        cardNumber: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
      };
      webviewUrl?: string;
    }) => {
      const copyToClipboard = (type: string) => {
        switch (type) {
          case 'cardNumber':
            copyToClipboardUtil(cardDetails.cardNumber);
            break;
          case 'expiry':
            copyToClipboardUtil(
              cardDetails.expiryMonth + '/' + cardDetails.expiryYear,
            );
            break;
          case 'cvv':
            copyToClipboardUtil(cardDetails.cvv);
            break;
        }
        showToast('Copied to clipboard');
      };
      if (card.cardProvider === CardProviders.RAIN_CARD) {
        return (
          <CyDView className='w-full h-full flex flex-col justify-center p-[32px]'>
            <CyDView className='mt-[-12px]'>
              <CyDView className='flex flex-row items-center gap-[12px]'>
                <CyDText
                  className={clsx('text-[16px] text-black', {
                    'text-white':
                      card.physicalCardType === PhysicalCardType.METAL,
                  })}>
                  {cardDetails.cardNumber
                    .match(/.{1,4}/g)
                    ?.map((part, index) => (
                      <CyDText
                        key={index}
                        className={clsx('text-[16px] text-black', {
                          'text-white':
                            card.physicalCardType === PhysicalCardType.METAL,
                        })}>
                        {part}
                        {index < 3 ? ' ' : ''}
                      </CyDText>
                    ))}
                </CyDText>
                <CyDView className='flex flex-row items-center gap-[12px]'>
                  <CyDTouchView onPress={() => copyToClipboard('cardNumber')}>
                    <CyDMaterialDesignIcons
                      name={'content-copy'}
                      size={18}
                      className={clsx('text-[12px] font-semibold text-black', {
                        'text-white':
                          card.physicalCardType === PhysicalCardType.METAL,
                      })}
                    />
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row items-center mt-[22px] gap-[54px]'>
              <CyDView className='flex flex-row items-center gap-[8px]'>
                <CyDText
                  className={clsx('text-[12px] font-semibold text-black', {
                    'text-white':
                      card.physicalCardType === PhysicalCardType.METAL,
                  })}>
                  Expiry
                </CyDText>
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDText
                    className={clsx('text-[16px] text-black', {
                      'text-white':
                        card.physicalCardType === PhysicalCardType.METAL,
                    })}>
                    {cardDetails.expiryMonth + ' / ' + cardDetails.expiryYear}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='flex flex-row items-center gap-[8px]'>
                <CyDText
                  className={clsx('text-[12px] font-semibold text-black', {
                    'text-white':
                      card.physicalCardType === PhysicalCardType.METAL,
                  })}>
                  CVV
                </CyDText>
                <CyDView className='flex flex-row justify-between items-center'>
                  <CyDText
                    className={clsx('text-[16px] text-black', {
                      'text-white':
                        card.physicalCardType === PhysicalCardType.METAL,
                    })}>
                    {cardDetails.cvv}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        );
      } else if (card.cardProvider === CardProviders.REAP_CARD && webviewUrl) {
        return (
          <CyDView className='w-full h-[220px] self-center'>
            <WebView
              renderLoading={() => {
                return <Loading isTransparent={true} />;
              }}
              source={{ uri: webviewUrl }}
              scalesPageToFit={true}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                height: '100%',
                width: '100%',
                backgroundColor: 'transparent',
                padding: 12,
                margin: 0,
                borderRadius: 16,
              }}
              androidLayerType='software'
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
            />
          </CyDView>
        );
      }
      return <></>;
    },
    [card.cardProvider, cardDetails, webviewUrl, isModalVisible],
  );

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-n20 h-[85%] px-[24px] py-[24px] mx-[2px] rounded-[16px]'>
        <CyDView className='flex flex-row justify-between items-center mb-[24px]'>
          <CyDView className='flex-1 justify-center items-center'>
            <CyDText className='text-[22px] font-semibold ml-[24px]'>
              Card Details
            </CyDText>
          </CyDView>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex flex-row justify-between items-center w-full'>
          <CyDText className='text-center text-[14px] text-lightThemeGrayText w-full'>
            Details will be hidden in {hideTimer} sec
          </CyDText>
        </CyDView>
        <CyDImageBackground
          source={getCardImage()}
          className='w-[380px] h-[246px] rounded-[12px] mt-[8px] self-center'
          resizeMode='stretch'>
          <RenderCardDetails
            card={card}
            cardDetails={cardDetails}
            webviewUrl={webviewUrl}
          />
        </CyDImageBackground>

        <CyDView className='mt-[8px] bg-base40 border-[0.5px] border-base80 px-[6px] py-[8px] rounded-[6px]'>
          <CyDText className='text-[14px] font-semibold'>
            {t('NAME_ON_CARD')}
          </CyDText>
          <CyDText className='text-[14px] mt-[4px]'>{userName}</CyDText>
        </CyDView>

        <CyDView className='mt-[22px] bg-base40 border-[0.5px] border-base80 p-[8px] rounded-[6px]'>
          <CyDView className='flex flex-row justify-start items-center gap-[8px]'>
            <CyDImage
              source={AppImages.APPLE_AND_GOOGLE_PAY}
              className='w-[42px] h-[42px]'
              resizeMode='contain'
            />
            <CyDView className='w-[82%]'>
              <CyDText className='text-[14px] font-semibold'>
                {t('APPLE_GOOGLE_PAY')}
              </CyDText>
              <CyDText className='text-[14px] mt-[4px]'>
                {t('MANUAL_ADD_APPLE_GOOGLE_PAY')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    // marginBottom: 50,
    height: '100%',
    margin: 0,
    justifyContent: 'flex-end',
  },
});
