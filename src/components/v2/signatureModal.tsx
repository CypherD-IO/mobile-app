import React from 'react';
import CyDModalLayout from './modal';
import { CyDImage, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import AppImages from './../../../assets/images/appImages';

export default function SignatureModal({
  isModalVisible,
  setModalVisible,
  children,
  onCancel,
  avoidKeyboard = false,
}) {
  return (
    <CyDModalLayout
      setModalVisible={setModalVisible}
      isModalVisible={isModalVisible}
      style={{
        margin: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      avoidKeyboard={avoidKeyboard}>
      <CyDView className={'bg-white rounded-t-[20px]'}>
        <CyDTouchView
          onPress={() => {
            setModalVisible(false);
            if (onCancel) {
              onCancel();
            }
          }}
          className={'flex flex-row justify-end z-10'}>
          <CyDImage
            source={AppImages.CLOSE}
            className={'w-[20px] h-[20px] top-[20px] right-[20px]'}
          />
        </CyDTouchView>
        {children}
      </CyDView>
    </CyDModalLayout>
  );
}
