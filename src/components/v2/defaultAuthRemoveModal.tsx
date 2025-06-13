import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  CyDText,
  CyDView,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { removeCredentialsFromKeychain } from '../../core/Keychain';
import { clearAllData } from '../../core/asyncStorage';
import RNRestart from 'react-native-restart';
import RNExitApp from 'react-native-exit-app';
import useAxios from '../../core/HttpRequest';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import clsx from 'clsx';

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
  const [hasConsent, setHasConsent] = useState(false);

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
        <CyDText className='text-center text-[19px] font-bold text-red-600'>
          {t('BIOMETRIC_AUTH_CHANGED')}
        </CyDText>

        <CyDText className='text-center px-[8%] mt-[20px] text-[16px] mb-[10px] leading-[22px]'>
          {t('BIOMETRIC_AUTH_CHANGED_DESCRIPTION')}
        </CyDText>

        {/* Options explanation */}
        <CyDView className='px-[8%] w-full mt-[15px]'>
          <CyDText className='text-[16px] font-semibold mb-[10px]'>
            {t('BIOMETRIC_AUTH_TWO_OPTIONS')}
          </CyDText>

          <CyDView className='mb-[15px]'>
            <CyDText className='text-[15px] font-medium mb-[5px]'>
              {t('BIOMETRIC_AUTH_OPTION_1_TITLE')}
            </CyDText>
            <CyDText className='text-[14px] leading-[18px]'>
              {t('BIOMETRIC_AUTH_OPTION_1_DESCRIPTION')}
            </CyDText>
          </CyDView>

          <CyDView className='mb-[15px]'>
            <CyDText className='text-[15px] font-medium mb-[5px]'>
              {t('BIOMETRIC_AUTH_OPTION_2_TITLE')}
            </CyDText>
            <CyDText className='text-[14px] leading-[18px]'>
              {t('BIOMETRIC_AUTH_OPTION_2_DESCRIPTION')}
            </CyDText>
          </CyDView>
        </CyDView>

        {/* Consent Checkbox */}
        <CyDTouchView
          className='flex flex-row items-start mt-[20px] px-[8%] w-full'
          onPress={() => {
            setHasConsent(!hasConsent);
          }}>
          <CyDView
            className={clsx(
              'h-[20px] w-[20px] border-[1.5px] border-base100 rounded-[4px] mr-[12px] mt-[2px]',
              {
                'bg-p50': hasConsent,
              },
            )}>
            {hasConsent && (
              <CyDMaterialDesignIcons
                name='check-bold'
                size={14}
                className='text-white ml-[2px]'
              />
            )}
          </CyDView>
          <CyDText className='text-[14px] flex-1 leading-[20px]'>
            {t(
              'I_UNDERSTAND_THAT_CLICKING_DELETE_WALLET_START_OVER_WILL_PERMANENTLY_DELETE_MY_CURRENT_WALLET_DATA_AND_I_WILL_NEED_MY_SEED_PHRASE_TO_RECOVER_IT',
            )}
          </CyDText>
        </CyDTouchView>

        <CyDView className='flex w-[90%] px-[10px] mt-[25px]'>
          <Button
            style={clsx('py-[15px]', {
              'opacity-50': !hasConsent,
            })}
            type={ButtonType.RED}
            title={t('DELETE_WALLET_START_OVER')}
            disabled={!hasConsent}
            onPress={() => {
              if (hasConsent) {
                void onProceedPress();
              }
            }}
          />
          <Button
            style='mt-[10px]'
            type={ButtonType.SECONDARY}
            title={t('CLOSE_APP')}
            onPress={onCancelPress}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
