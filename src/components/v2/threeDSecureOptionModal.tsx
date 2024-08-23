import React, { useEffect, useState } from 'react';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { StyleSheet } from 'react-native';
import { get } from 'lodash';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import useAxios from '../../core/HttpRequest';
import { t } from 'i18next';
import { useGlobalModalContext } from './GlobalModal';
import AppImages from '../../../assets/images/appImages';
import { useIsFocused } from '@react-navigation/native';

export default function ThreeDSecureOptionModal({
  isModalVisible,
  setModalVisible,
  card,
  currentCardProvider,
  isTelegramEnabled,
  setIsTelegramEnabled,
}) {
  const [isTelegramSelected, setIsTelegramSelected] =
    useState<boolean>(isTelegramEnabled);
  const [loading3DSecure, setLoading3DSecure] = useState(false);
  const { postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

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
    } else {
      showModal('state', {
        type: 'error',
        title: "Couldn't update 3D secure notification option",
        description:
          response.error.errors[0].message ?? 'Please contact support.',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
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
          'bg-cardBgTo px-[16px] py-[24px] m-[2px] mb-[6px] rounded-[16px]'
        }>
        <CyDView className='flex flex-row justify-between items-center mb-[24px]'>
          <CyDView className='flex-1 justify-center items-center'>
            <CyDText className='text-[18px] font-[600] ml-[24px]'>
              3D Secure Notification
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
          className='bg-white px-[12px] py-[14px] mb-[8px] rounded-[10px] flex flex-row justify-between items-center'
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
          className='bg-white px-[12px] py-[14px] mb-[16px] rounded-[10px] flex flex-row justify-between items-center'
          onPress={() => {
            setIsTelegramSelected(true);
          }}>
          <CyDText className='text-[18px] font-[500]'>Telegram</CyDText>
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
