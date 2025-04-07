import React from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import Button from './button';
export default function RemoveSocialAuthWalletModal(store: {
  isModalVisible: boolean;
  onSuccess: () => void;
  onFailure: () => void;
}) {
  const { t } = useTranslation();
  const { isModalVisible, onSuccess } = store;

  return (
    <CyDModalLayout
      setModalVisible={() => {
        onSuccess();
      }}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}
      isModalVisible={isModalVisible}
      disableBackDropPress={true}>
      <CyDView
        className={'bg-n20 p-[25px] pb-[30px] rounded-t-[20px] relative'}>
        {
          <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
            {t('SESSION_EXPIRED')}
          </CyDText>
        }
        <CyDView className=''>
          <CyDText className='mt-[12px] mb-[24px] text-center text-[16px] font-medium'>
            {t('SESSION_EXPIRED_SUB')}
          </CyDText>
        </CyDView>
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[12px]'
            title={t('LOGIN_AGAIN')}
            onPress={() => {
              onSuccess();
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
