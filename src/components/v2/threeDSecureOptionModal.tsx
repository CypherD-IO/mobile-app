import React, { useState } from 'react';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { StyleSheet } from 'react-native';
import Button from './button';
import { ButtonType, CardProviders } from '../../constants/enum';
import useAxios from '../../core/HttpRequest';
import AppImages from '../../../assets/images/appImages';
import { showToast } from '../../containers/utilities/toastUtility';
import { Card } from '../../models/card.model';

export default function ThreeDSecureOptionModal({
  isModalVisible,
  setModalVisible,
  card,
  currentCardProvider,
  isTelegramEnabled,
  setIsTelegramEnabled,
}: {
  isModalVisible: boolean;
  setModalVisible: (value: boolean) => void;
  card: Card;
  currentCardProvider: CardProviders;
  isTelegramEnabled: boolean;
  setIsTelegramEnabled: (value: boolean) => void;
}) {
  const [isTelegramSelected, setIsTelegramSelected] =
    useState<boolean>(isTelegramEnabled);
  const [loading3DSecure, setLoading3DSecure] = useState(false);
  const { postWithAuth } = useAxios();

  const set3DSecureNotificationOption = async () => {
    setLoading3DSecure(true);
    const response = await postWithAuth(
      `/v1/cards/${currentCardProvider}/card/${card.cardId}/update3ds`,
      { status: isTelegramSelected },
    );
    setLoading3DSecure(false);
    if (!response.isError) {
      setIsTelegramEnabled(isTelegramSelected);
      setModalVisible(false);
      showToast(
        isTelegramSelected
          ? 'Alerts will be sent through Telegram & Email'
          : 'Verification will be code sent through SMS',
      );
    } else {
      showToast('Failed to update. Contact Support', 'error');
    }
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      setModalVisible={setModalVisible}
      disableBackDropPress={true}>
      <CyDView
        className={
          'bg-n20 px-[16px] py-[24px] m-[2px] mb-[6px] rounded-[16px]'
        }>
        <CyDView className='flex flex-row justify-between items-center mb-[24px]'>
          <CyDView className='flex-1 justify-center items-center'>
            <CyDText className='text-[18px] font-[600] ml-[24px]'>
              Online Payment Authentication
            </CyDText>
          </CyDView>
          <CyDTouchView
            onPress={() => {
              setIsTelegramSelected(isTelegramEnabled);
              setModalVisible(false);
            }}>
            <CyDImage
              source={AppImages.CLOSE_CIRCLE}
              className='h-[28px] w-[28px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        </CyDView>
        <CyDTouchView
          className='bg-n0 px-[12px] py-[14px] mb-[8px] rounded-[10px] flex flex-row justify-between items-center'
          onPress={() => {
            setIsTelegramSelected(false);
          }}>
          <CyDText className='text-[18px] font-[500]'>SMS</CyDText>
          <CyDView
            className={
              'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-borderColor flex flex-row justify-center items-center'
            }>
            {!isTelegramSelected ? (
              <CyDView
                className={'h-[10px] w-[10px] rounded-[5px] bg-appColor'}
              />
            ) : null}
          </CyDView>
        </CyDTouchView>
        <CyDTouchView
          className='bg-n0 px-[12px] py-[14px] mb-[16px] rounded-[10px] flex flex-row justify-between items-center'
          onPress={() => {
            setIsTelegramSelected(true);
          }}>
          <CyDText className='text-[18px] font-[500]'>Telegram & Email</CyDText>
          <CyDView
            className={
              'h-[22px] w-[22px] rounded-[11px] border-[1.5px] border-borderColor flex flex-row justify-center items-center'
            }>
            {isTelegramSelected ? (
              <CyDView
                className={'h-[10px] w-[10px] rounded-[5px] bg-appColor'}
              />
            ) : null}
          </CyDView>
        </CyDTouchView>
        <Button
          type={ButtonType.PRIMARY}
          title='Select'
          loading={loading3DSecure}
          paddingY={14}
          style='py-[14px]'
          loaderStyle={{ height: 22, width: 22 }}
          onPress={() => {
            void set3DSecureNotificationOption();
          }}
        />
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
