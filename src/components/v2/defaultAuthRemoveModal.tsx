import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { removeCredentialsFromKeychain } from '../../core/Keychain';
import { clearAllData } from '../../core/asyncStorage';
import RNRestart from 'react-native-restart';
import RNExitApp from 'react-native-exit-app';
import useAxios from '../../core/HttpRequest';
import Button from './button';
import { ButtonType } from '../../constants/enum';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function DefaultAuthRemoveModal(props: {
  isModalVisible: boolean;
}) {
  const { isModalVisible } = props;
  const { t } = useTranslation();
  const { deleteWithAuth } = useAxios();

  const onProceedPress = async () => {
    await removeCredentialsFromKeychain();
    await clearAllData();
    await deleteWithAuth('/v1/configuration/device');
    RNRestart.Restart();
  };

  const onCancelPress = () => {
    RNExitApp.exitApp();
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        onCancelPress();
      }}>
      <CyDView
        className={
          'bg-n0 flex flex-col items-center rounded-t-[20px] pt-[15px] pb-[30px]'
        }>
        <CyDText className='text-center  text-[19px] font-bold  '>
          {t('DEFAULT_AUTH_REMOVE_TITLE')}
        </CyDText>

        <CyDText className='text-center  px-[8%] mt-[20px] text-[16px] mb-[10px]  '>
          {t('DEFAULT_AUTH_REMOVE')}
        </CyDText>

        <CyDView className='flex w-[90%] px-[10px] mt-[45px]'>
          <Button
            style='py-[15px]'
            type={ButtonType.RED}
            title={t('PROCEED')}
            onPress={() => void onProceedPress()}
          />
          <Button
            style='mt-[10px]'
            type={ButtonType.SECONDARY}
            title={t('CANCEL')}
            onPress={onCancelPress}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
