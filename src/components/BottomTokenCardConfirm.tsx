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
import { formatAmount, limitDecimalPlaces } from '../core/util';
import { PayTokenModalParams } from '../models/card.model';
import LottieView from 'lottie-react-native';
import { get } from 'lodash';
import { ChainConfigMapping, ChainNameMapping } from '../constants/server';

export default function BottomCardConfirm({
  modalParams,
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  modalParams: PayTokenModalParams;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const {
    isModalVisible,
    quoteExpiry,
    hasSufficientBalanceAndGasFee,
    tokenSendParams,
  } = modalParams;
  const {
    chain,
    amountInCrypto,
    amountInFiat,
    symbol,
    gasFeeInCrypto,
    gasFeeInFiat,
    nativeTokenSymbol,
  } = tokenSendParams;
  const [tokenExpiryTime, setTokenExpiryTime] = useState(quoteExpiry);
  const [expiryTimer, setExpiryTimer] = useState<NodeJS.Timer>();
  const [isPayDisabled, setIsPayDisabled] = useState<boolean>(
    hasSufficientBalanceAndGasFee,
  );
  const chainLogo = get(
    ChainConfigMapping,
    get(ChainNameMapping, chain),
  )?.logo_url;

  useEffect(() => {
    let tempIsPayDisabled = false;
    tempIsPayDisabled = !hasSufficientBalanceAndGasFee;
    setIsPayDisabled(tempIsPayDisabled);
    if (isModalVisible && quoteExpiry && !tempIsPayDisabled) {
      let tempTokenExpiryTime = quoteExpiry;
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
    if (tokenExpiryTime === 0 && quoteExpiry) {
      clearInterval(expiryTimer);
      setIsPayDisabled(true);
    }
  }, [tokenExpiryTime]);

  const hideModal = () => {
    if (quoteExpiry && tokenExpiryTime !== 0) {
      clearInterval(expiryTimer);
    }
    setLoading(true);
    onCancel();
    setLoading(false);
  };

  const onLoadPress = () => {
    if (expiryTimer) {
      clearInterval(expiryTimer);
    }
    setLoading(true);
    onConfirm();
    setLoading(false);
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalContainer}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={() => {
        clearInterval(expiryTimer);
        onCancel();
      }}>
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
        <CyDText className='text-[18px] font-bold'>{t('LOAD_CARD')}</CyDText>
        <CyDView className={'mx-[16px]'}>
          <CyDView
            className={
              'flex flex-row justify-between items-center mt-[40px] pb-[16px]'
            }>
            <CyDText className={'font-bold text-[14px]'}>
              {t('SEND_ON')}
            </CyDText>
            <CyDView
              className={
                'flex flex-row justify-center items-center pl-[25px] max-w-[70%]'
              }>
              <CyDFastImage
                source={chainLogo}
                className={'w-[18px] h-[18px]'}
              />
              <CyDText className={'font-medium text-[14px] ml-[4px]'}>
                {chain}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDText className={'font-bold text-[14px]'}>{t('VALUE')}</CyDText>
            <CyDView
              className={
                'w-[70%] flex flex-row flex-wrap justify-between items-center'
              }>
              <CyDText
                className={' font-medium text-[14px] text-primaryTextColor'}>
                {String(formatAmount(amountInCrypto)) + ' ' + symbol}
              </CyDText>
              <CyDText className={' font-medium text-[14px]'}>
                {'$' + limitDecimalPlaces(amountInFiat, 4)}
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
                {String(gasFeeInCrypto) + ' ' + nativeTokenSymbol}
              </CyDText>
              <CyDText className={'font-medium text-[14px]'}>
                {'$' + String(formatAmount(gasFeeInFiat))}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row justify-between py-[16px]'}>
            <CyDView className='flex flex-row justify-start items-center w-[50%]'>
              <CyDText className={'font-bold text-[14px]'}>
                {t('ESTIMATED_TIME')}
              </CyDText>
              <LottieView
                source={AppImages.ESTIMATED_TIME}
                resizeMode={'contain'}
                autoPlay
                loop
                style={{ width: 20 }}
              />
            </CyDView>

            <CyDView className={'flex flex-row justify-between items-center'}>
              <CyDText className={'font-[16px] text-black font-bold ml-[12px]'}>
                ~ 4 mins
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        {!hasSufficientBalanceAndGasFee ? (
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
          className={'flex flex-row justify-between items-center px-[10px]'}>
          <Button
            title={t<string>('CANCEL')}
            titleStyle='text-[14px]'
            disabled={loading}
            type={ButtonType.SECONDARY}
            onPress={() => {
              hideModal();
            }}
            style={'h-[60px] w-[46%] mr-[6px]'}
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
            style={'h-[60px] w-[46%] ml-[6px]'}
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
