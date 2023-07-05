import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppImages from '../../assets/images/appImages';
import { SepraterView } from '../styles/viewStyle';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../styles/tailwindStyles';
import CyDModalLayout from './v2/modal';
import Button from './v2/button';
import { ButtonType } from '../constants/enum';

export default function BottomCardConfirm (props) {
  const { isModalVisible, onPayPress, onCancelPress, lowBalance, modalParams } = props;
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [tokenExpiryTime, setTokenExpiryTime] = useState(modalParams?.tokenQuoteExpiry ? modalParams?.tokenQuoteExpiry : 0);
  const [expiryTimer, setExpiryTimer] = useState();
  const [isPayDisabled, setIsPayDisabled] = useState(false);
  const currentTimeStamp = new Date();

  useEffect(() => {
    if (isModalVisible && modalParams?.tokenQuoteExpiry) {
      let tempTokenExpiryTime = modalParams.tokenQuoteExpiry;
      setIsPayDisabled(false);
      setTokenExpiryTime(tempTokenExpiryTime);
      setExpiryTimer(setInterval(() => { tempTokenExpiryTime--; setTokenExpiryTime(tempTokenExpiryTime); }, 1000));
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
    onCancelPress();
  };

  const onLoadPress = () => {
    if (expiryTimer) {
      clearInterval(expiryTimer);
    }
    onPayPress();
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalContainer}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        onCancelPress();
      }}
    >
      <CyDView className={'bg-white pb-[30px] flex items-center rounded-[20px]'}>
        <CyDTouchView className={'flex flex-row pl-[95%] justify-end z-10'}
          onPress={onCancelPress}
        >
          <CyDImage
            source={AppImages.CLOSE}
            className={'w-[20px] h-[20px] top-[20px] right-[20px] '}
          />
        </CyDTouchView>
        <CyDText className='text-[20px] font-nunito font-bold'>
          {t('CONFIRM_PAYMENT')}
        </CyDText>
        <CyDView className={'p-[10px] px-[20px]'}>
          <CyDView className={'flex flex-row mt-[40px] pb-[15px] border-b-[1px] border-sepratorColor'}>
            <CyDText className={'font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('SEND_ON')}</CyDText>
            <CyDView className={'flex flex-row pl-[25px] max-w-[70%]'}>
              <CyDImage source={modalParams.appImage} className={'w-[16px] h-[16px] mt-[3px]'} />
              <CyDText className={' font-medium text-[15px] ml-[5px] text-primaryTextColor'}>{modalParams.networkName}</CyDText>
            </CyDView>
          </CyDView>
          {modalParams.cardNumber && <CyDView className={'flex flex-row w-[95%] py-[25px]'}>
            <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('CARD')}</CyDText>
            <CyDView className={'flex flex-row flex-wrap justify-between w-[90%]  pl-[55px]'}>
                <CyDText className={' font-medium text-[15px] text-primaryTextColor'}>{modalParams.cardNumber}</CyDText>
            </CyDView>
          </CyDView>}
          <CyDView className={'flex flex-row w-[95%] py-[25px]'}>
            <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('VALUE')}</CyDText>
            <CyDView className={'flex flex-row flex-wrap justify-between w-[90%]  pl-[45px]'}>
                <CyDText className={' font-medium text-[15px] text-primaryTextColor'}>{parseFloat(modalParams.totalValueTransfer).toFixed(6)} {modalParams.tokenSymbol}</CyDText>
                <CyDText className={' font-medium text-[15px] text-primaryTextColor mr-[10px]'}>${modalParams.totalValueDollar}</CyDText>
            </CyDView>
          </CyDView>
          <CyDView className={'flex flex-row  w-[95%] py-[25px] border-b-[1px] border-sepratorColor'}>
            <CyDText className={' font-bold text-[16px] ml-[5px] text-primaryTextColor'}>{t('GAS')}</CyDText>
            <CyDView className={'flex flex-row flex-wrap justify-between w-[95%] pl-[60px]'}>
                <CyDText className={' font-medium text-[15px] text-primaryTextColor'}>{modalParams.gasFeeETH} {modalParams.networkCurrency}</CyDText>
                <CyDText className={' font-medium text-[15px] text-primaryTextColor mr-[10px]'}>$ {modalParams.gasFeeDollar}</CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView
            className={
              'flex flex-row justify-center items-center px-[20px] pb-[10px] mt-[20px]'
            }
          >
            <Button
              title={t<string>('CANCEL')}
              disabled={loading}
              type={ButtonType.SECONDARY}
              onPress={() => {
                hideModal();
              }}
              style={'h-[60px] w-[166px] mr-[9px]'}
            />
            <Button
              title={t<string>('LOAD') + (tokenExpiryTime ? ' (' + tokenExpiryTime + ')' : '')}
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
    alignItems: 'center'
  }
});
