import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { ButtonType, ConnectionTypes } from '../../constants/enum';
import { useTranslation } from 'react-i18next';
import Button from './button';
import clsx from 'clsx';
export default function RemoveWalletModal(store: {
  isModalVisible: boolean;
  onSuccess: () => void;
  onFailure: () => void;
  connectionType: ConnectionTypes;
}) {
  const { t } = useTranslation();
  const { isModalVisible, onSuccess, onFailure, connectionType } = store;
  const title =
    connectionType === ConnectionTypes.WALLET_CONNECT
      ? t('DISCONNECT_WALLET')
      : t('DELETE_WALLET');
  const [hasConsent, setHasConsent] = useState(false);
  const isSocialLogin =
    connectionType === ConnectionTypes.SOCIAL_LOGIN_EVM ||
    connectionType === ConnectionTypes.SOCIAL_LOGIN_SOLANA;

  const RenderContent = useCallback(() => {
    return (
      <CyDView className=''>
        {connectionType === ConnectionTypes.WALLET_CONNECT && (
          <CyDText className='mt-[12px] mb-[50px] text-center font-bold'>
            {t('DISCONNECT_WALLET_SUB')}
          </CyDText>
        )}
        {isSocialLogin && (
          <CyDView>
            <CyDText className='mt-[12px] text-center font-medium'>
              {t('DELETE_WALLET_SUB_SOCIAL')}
            </CyDText>
            <CyDText className='mt-[12px] text-center font-medium text-[10px]'>
              {t('SOCIAL_AUTH_MFA_REMINDER')}
            </CyDText>
          </CyDView>
        )}
        {connectionType !== ConnectionTypes.WALLET_CONNECT &&
          !isSocialLogin && (
            <CyDText className='mt-[12px] text-center font-bold'>
              {t('DELETE_WALLET_SUB')}
            </CyDText>
          )}
        {connectionType !== ConnectionTypes.WALLET_CONNECT &&
          !isSocialLogin && (
            <CyDView className='flex flex-row items-center mt-[32px]'>
              <CyDTouchView
                className={clsx(
                  'h-[20px] w-[20px] border-base400 border-[1px] rounded-[4px]',
                  {
                    'bg-n0': hasConsent,
                  },
                )}
                onPress={() => {
                  setHasConsent(!hasConsent);
                }}>
                {hasConsent && (
                  <CyDMaterialDesignIcons
                    name='check'
                    size={18}
                    className='text-base400'
                  />
                )}
              </CyDTouchView>
              <CyDText className='px-[12px] text-[12px]'>
                {t('REMOVE_WALL_ACC')}
              </CyDText>
            </CyDView>
          )}
      </CyDView>
    );
  }, [hasConsent, setHasConsent, connectionType, isSocialLogin]);
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
        <CyDTouchView onPress={() => onFailure()} className={'z-[50] self-end'}>
          <CyDMaterialDesignIcons
            name={'close'}
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        {
          <CyDText className={'mt-[10px] font-bold text-center text-[22px]'}>
            {title}
          </CyDText>
        }
        <RenderContent />
        <CyDView className={'w-[100%]'}>
          <Button
            style='h-[54px] mt-[12px]'
            title={t('PROCEED')}
            titleStyle='text-white'
            disabled={
              connectionType !== ConnectionTypes.WALLET_CONNECT &&
              !isSocialLogin &&
              !hasConsent
            }
            onPress={() => {
              onSuccess();
            }}
            type={ButtonType.RED}
          />
          <Button
            style='h-[54px] mt-[15px]'
            title={t('CANCEL')}
            onPress={() => {
              onFailure();
            }}
            type={ButtonType.SECONDARY}
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
