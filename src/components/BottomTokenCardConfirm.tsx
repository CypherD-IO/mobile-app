import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import {
  CyDFastImage,
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
import Button from './v2/button';
import { ButtonType } from '../constants/enum';
import { formatAmount } from '../core/util';
import { PayTokenModalParams } from '../models/card.model';

interface BottomCardConfirmProps {
  isModalVisible: boolean;
  onPayPress: () => void;
  onCancelPress: () => void;
  modalParams: PayTokenModalParams;
}

export default function BottomCardConfirm({
  isModalVisible,
  onPayPress,
  onCancelPress,
  modalParams,
}: BottomCardConfirmProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [tokenExpiryTime, setTokenExpiryTime] = useState(
    modalParams.tokenQuoteExpiry,
  );
  const [expiryTimer, setExpiryTimer] = useState<NodeJS.Timer>();
  const [isPayDisabled, setIsPayDisabled] = useState<boolean>(
    !modalParams.hasSufficientBalanceAndGasFee,
  );

  useEffect(() => {
    let tempIsPayDisabled = false;
    tempIsPayDisabled = !modalParams?.hasSufficientBalanceAndGasFee;
    setIsPayDisabled(tempIsPayDisabled);
    if (isModalVisible && modalParams?.tokenQuoteExpiry && !tempIsPayDisabled) {
      let tempTokenExpiryTime = modalParams.tokenQuoteExpiry;
      setIsPayDisabled(false);
      setTokenExpiryTime(tempTokenExpiryTime);
      setExpiryTimer(
        setInterval(() => {
          tempTokenExpiryTime--;
          setTokenExpiryTime(tempTokenExpiryTime);
        }, 1000),
      );
    }
  }, [isModalVisible]);

  useEffect(() => {
    if (tokenExpiryTime === 0 && modalParams?.tokenQuoteExpiry) {
      clearInterval(expiryTimer);
      setIsPayDisabled(true);
    }
  }, [tokenExpiryTime]);

  const hideModal = () => {
    if (modalParams.tokenQuoteExpiry && tokenExpiryTime !== 0) {
      clearInterval(expiryTimer);
    }
    setLoading(true);
    onCancelPress();
    setLoading(false);
  };

  const onLoadPress = () => {
    if (expiryTimer) {
      clearInterval(expiryTimer);
    }
    setLoading(true);
    onPayPress();
    setLoading(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalContainer}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={onCancelPress}>
      <CyDView
        className={'bg-white pb-[30px] flex items-center rounded-t-[24px]'}>
        <CyDTouchView
          className={'flex flex-row pl-[95%] justify-end z-10'}
          onPress={hideModal}>
          <CyDImage
            source={AppImages.CLOSE}
            className={'w-[18px] h-[18px] top-[20px] right-[20px] '}
          />
        </CyDTouchView>
        <CyDText className='text-[18px] font-nunito font-bold'>
          {t('CONFIRM_PAYMENT')}
        </CyDText>
        <CyDView className={'mx-[16px]'}>
          <CyDView
            className={
              'flex flex-row justify-between items-center mt-[40px] pb-[16px]'
            }>
            <CyDText className={'font-bold text-[14px]'}>
              {t('SEND_ON')}
            </CyDText>
            <CyDView className={'flex flex-row pl-[25px] max-w-[70%]'}>
              <CyDFastImage
                source={modalParams.appImage}
                className={'w-[18px] h-[18px] mt-[3px]'}
              />
              <CyDText className={'font-medium text-[14px] ml-[4px]'}>
                {modalParams.networkName}
              </CyDText>
            </CyDView>
          </CyDView>
          {modalParams.cardNumber && (
            <CyDView
              className={
                'flex flex-row justify-between items-center py-[16px]'
              }>
              <CyDText className={'font-bold text-[14px]'}>{t('CARD')}</CyDText>
              <CyDText className={'font-medium text-[14px]'}>
                {modalParams.cardNumber}
              </CyDText>
            </CyDView>
          )}
          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDText className={'font-bold text-[14px]'}>{t('VALUE')}</CyDText>
            <CyDView
              className={
                'w-[70%] flex flex-row flex-wrap justify-between items-center'
              }>
              <CyDText
                className={' font-medium text-[14px] text-primaryTextColor'}>
                {parseFloat(modalParams.tokenAmount)} {modalParams.tokenSymbol}
              </CyDText>
              <CyDText className={' font-medium text-[14px]'}>
                {'$'}
                {modalParams.totalValueDollar}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDText className={'font-bold text-[14px] w-[26%]'}>
              {t('ESTIMATED_GAS')}
            </CyDText>
            <CyDView
              className={
                'flex flex-row flex-wrap justify-between items-center w-[70%]'
              }>
              <CyDText
                className={'font-medium text-[14px] text-primaryTextColor'}>
                {modalParams.gasFeeETH} {modalParams.networkCurrency}
              </CyDText>
              <CyDText className={'font-medium text-[14px]'}>
                ${formatAmount(modalParams.gasFeeDollar)}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        {!modalParams?.hasSufficientBalanceAndGasFee ? (
          <CyDView className='flex flex-row items-center rounded-[8px] justify-center py-[15px] mt-[20px] mb-[10px] bg-warningRedBg'>
            <CyDFastImage
              source={AppImages.CYPHER_WARNING_RED}
              className='h-[20px] w-[20px] ml-[13px] mr-[13px]'
              resizeMode='contain'
            />
            <CyDText className='text-red-500 font-medium text-[14px] px-[10px] w-[80%]'>
              {t<string>('INSUFFICIENT_BALANCE_CARD')}
            </CyDText>
          </CyDView>
        ) : null}
        <CyDView
          className={
            'flex flex-row justify-center items-center px-[20px] pb-[10px] mt-[20px]'
          }>
          <Button
            title={t<string>('CANCEL')}
            titleStyle='text-[14px]'
            disabled={loading}
            type={ButtonType.SECONDARY}
            onPress={() => {
              hideModal();
            }}
            style={'h-[60px] w-[166px] mr-[9px]'}
          />
          <Button
            title={
              t<string>('LOAD_ALL_CAPS') +
              (!isPayDisabled
                ? tokenExpiryTime
                  ? ' (' + String(tokenExpiryTime) + ')'
                  : ''
                : '')
            }
            titleStyle='text-[14px]'
            loading={loading}
            disabled={isPayDisabled}
            onPress={() => {
              if (!isPayDisabled) {
                onLoadPress();
              }
            }}
            isPrivateKeyDependent={true}
            style={'h-[60px] w-[166px] ml-[9px]'}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
