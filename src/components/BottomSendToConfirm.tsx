import React from 'react';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { SepraterView } from '../styles/viewStyle';
import { StyleSheet } from 'react-native';
import Button from './v2/button';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';

export default function BottomSendToConfirm (props) {
  const { isModalVisible, onPayPress, onCancelPress, lowBalance, modalParams } = props;
  const { t } = useTranslation();

  return (
    <CyDModalLayout setModalVisible={() => { onCancelPress(); }} isModalVisible={isModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
      <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
          <CyDTouchView onPress={() => onCancelPress()} className={'z-[50]'}>
            <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
          </CyDTouchView>
          <CyDText className={'mt-[10] font-bold text-center text-[22px]'}>
                {t('SEND')}
          </CyDText>
          <CyDView className={'p-[10px]'}>
            <CyDView className={'flex flex-row mt-[40px] pb-[15px]'}>
              <CyDText className={'font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('SEND_ON')}</CyDText>
              <CyDView className={'flex flex-row pl-[15px]'}>
                <CyDImage source={modalParams.appImage} className={'w-[16px] h-[16px] mt-[3px]'} />
                <CyDText className={' font-medium text-[15px] ml-[5px] text-primaryTextColor'}>{modalParams.chain}</CyDText>
              </CyDView>
            </CyDView>
            <SepraterView className={'w-[100%]'} dynamic/>
            <CyDView className={'flex flex-row mt-[20px] w-[95%] pb-[15px]'}>
              <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('VALUE')}</CyDText>
              <CyDView className={'flex flex-row flex-wrap justify-between w-[90%]  pl-[35px]'}>
                  <CyDText className={' font-medium text-[15px] text-primaryTextColor'}>{parseFloat(modalParams.sentTokenAmount).toFixed(6)} {modalParams.sentTokenSymbol}</CyDText>
                  <CyDText className={' font-medium text-[14px] text-primaryTextColor'}>${modalParams.sentValueUSD}</CyDText>
              </CyDView>
            </CyDView>
            <SepraterView className={'w-[100%]'} dynamic/>
            <CyDView className={'flex flex-row mt-[20px] pb-[15px]'}>
              <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('SEND_TO')}</CyDText>
              <CyDView className={'flex flex-row flex-wrap justify-between w-[80%] pl-[18px]'}>
                  <CyDText className={' font-medium text-[16px] text-primaryTextColor'}>{modalParams?.to_address}</CyDText>
              </CyDView>
            </CyDView>
            <SepraterView className={'w-[100%]'} dynamic/>

            <CyDView className={'flex flex-row mt-[20px] w-[95%] pb-[15px]'}>
              <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('GAS')}</CyDText>
              <CyDView className={'flex flex-row flex-wrap justify-between w-[95%] pl-[50px]'}>
                  <CyDText className={' font-medium text-[15px] text-primaryTextColor'}>{modalParams.gasFeeNative} {modalParams.fromNativeTokenSymbol}</CyDText>
                  <CyDText className={' font-medium text-[14px] text-primaryTextColor'}>${modalParams.gasFeeDollar}</CyDText>
              </CyDView>
            </CyDView>
          </CyDView>
          <CyDView className={'flex flex-col w-[100%]'} >
            <Button sentry-label='send-bottom-confirm-pay-button' isPrivateKeyDependent={true}
                    title={t('TRANSFER')} style={'py-[5%] mt-[10px]'} onPress={() => {
                      onPayPress();
                    }}
            />
            <Button sentry-label='send-bottom-confirm-cancel-button'
                title={t('CANCEL')} type={'secondary'} style={'py-[5%] mt-[10px]'} onPress={() => {
                  onCancelPress();
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
    justifyContent: 'flex-end'
  }
});
