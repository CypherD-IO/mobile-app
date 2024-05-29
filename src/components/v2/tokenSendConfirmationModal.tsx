import React from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../../assets/images/appImages';
import { SepraterView } from '../../styles/viewStyle';
import { StyleSheet } from 'react-native';
import Button from './button';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { formatAmount } from '../../core/util';
import { ChainConfigMapping, ChainNameMapping } from '../../constants/server';
import { get } from 'lodash';
import { TokenSendConfirmationParams } from '../../models/tokenSendConfirmationParams.interface';

export default function TokenSendConfirmationModal(
  props: TokenSendConfirmationParams,
) {
  const { isModalVisible, tokenSendParams } = props;
  const {
    onConfirm,
    onCancel,
    chain,
    amountInCrypto,
    amountInFiat,
    symbol,
    toAddress,
    gasFeeInCrypto,
    gasFeeInFiat,
    nativeTokenSymbol,
  } = tokenSendParams;
  const { t } = useTranslation();

  const chainLogo = get(
    ChainConfigMapping,
    get(ChainNameMapping, chain.backendName),
  )?.logo_url;
  return (
    <CyDModalLayout
      setModalVisible={() => {
        onCancel();
      }}
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView
        className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
        <CyDTouchView onPress={() => onCancel()} className={'z-[50]'}>
          <CyDImage
            source={AppImages.CLOSE}
            className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '}
          />
        </CyDTouchView>
        <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
          {t('SEND')}
        </CyDText>
        <CyDView className={'p-[10px]'}>
          <CyDView className={'flex flex-row mt-[40px] pb-[15px]'}>
            <CyDText
              className={
                'font-bold text-[16px] ml-[5px] text-primaryTextColor'
              }>
              {t('SEND_ON')}
            </CyDText>
            <CyDView className={'flex flex-row pl-[15px]'}>
              <CyDImage
                source={chainLogo}
                className={'w-[16px] h-[16px] mt-[3px]'}
              />
              <CyDText
                className={
                  ' font-medium text-[15px] ml-[5px] text-primaryTextColor'
                }>
                {chain.backendName}
              </CyDText>
            </CyDView>
          </CyDView>
          <SepraterView className={'w-[100%]'} dynamic />
          <CyDView className={'flex flex-row mt-[20px] w-[95%] pb-[15px]'}>
            <CyDText
              className={
                ' font-bold text-[16px] ml-[5px] text-primaryTextColor'
              }>
              {t('VALUE')}
            </CyDText>
            <CyDView
              className={
                'flex flex-row flex-wrap justify-between w-[90%]  pl-[35px]'
              }>
              <CyDText
                className={' font-medium text-[15px] text-primaryTextColor'}>
                {String(formatAmount(amountInCrypto)) + ' ' + symbol}
              </CyDText>
              <CyDText
                className={' font-medium text-[14px] text-primaryTextColor'}>
                {'$' + amountInFiat}
              </CyDText>
            </CyDView>
          </CyDView>
          <SepraterView className={'w-[100%]'} dynamic />
          <CyDView className={'flex flex-row mt-[20px] pb-[15px]'}>
            <CyDText
              className={
                ' font-bold text-[16px] ml-[5px] text-primaryTextColor'
              }>
              {t('SEND_TO')}
            </CyDText>
            <CyDView
              className={
                'flex flex-row flex-wrap justify-between w-[80%] pl-[18px]'
              }>
              <CyDText
                className={' font-medium text-[16px] text-primaryTextColor'}>
                {toAddress}
              </CyDText>
            </CyDView>
          </CyDView>
          <SepraterView className={'w-[100%]'} dynamic />

          <CyDView className={'flex flex-row mt-[20px] w-[95%] pb-[15px]'}>
            <CyDText
              className={
                ' font-bold text-[16px] ml-[5px] text-primaryTextColor'
              }>
              {t('GAS')}
            </CyDText>
            <CyDView
              className={
                'flex flex-row flex-wrap justify-between w-[95%] pl-[50px]'
              }>
              <CyDText
                className={' font-medium text-[15px] text-primaryTextColor'}>
                {gasFeeInCrypto + ' ' + nativeTokenSymbol}
              </CyDText>
              <CyDText
                className={' font-medium text-[14px] text-primaryTextColor'}>
                {'$' + String(formatAmount(gasFeeInFiat))}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className={'flex flex-col w-[100%]'}>
          <Button
            sentry-label='send-bottom-confirm-pay-button'
            isPrivateKeyDependent={true}
            title={t('TRANSFER')}
            style={'py-[5%] mt-[10px]'}
            onPress={() => {
              onConfirm();
            }}
          />
          <Button
            sentry-label='send-bottom-confirm-cancel-button'
            title={t('CANCEL')}
            type={'secondary'}
            style={'py-[5%] mt-[10px]'}
            onPress={() => {
              onCancel();
            }}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
