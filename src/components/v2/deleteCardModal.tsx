import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import CyDModalLayout from './modal';
import {
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';

interface DeleteCardModalProps {
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  onDeleteCard: () => void;
}

export default function DeleteCardModal({
  isModalVisible,
  setIsModalVisible,
  onDeleteCard,
}: DeleteCardModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');

  const isDeleteEnabled = confirmText === 'delete';

  const handleClose = (): void => {
    setConfirmText('');
    setIsModalVisible(false);
  };

  const handleDelete = (): void => {
    if (!isDeleteEnabled) return;
    setConfirmText('');
    onDeleteCard();
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={(visible: boolean) => {
        if (!visible) handleClose();
      }}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      avoidKeyboard={true}
      style={styles.modalLayout}>
      <CyDView className='bg-n0 rounded-[16px] mx-[16px] px-[24px] py-[28px] items-center'>
        
        <CyDText className='font-manrope font-medium text-[20px] leading-[130%] tracking-[-1px] text-center text-base400'>
          {t('DELETE_CARD_TITLE')}
        </CyDText>

        <CyDText className='font-manrope font-normal text-[16px] leading-[140%] tracking-[-0.4px] text-center text-base200 mt-[16px]'>
          {t('DELETE_CARD_WARNING')}
        </CyDText>

        <CyDView className='w-full mt-[20px]'>
          <CyDTextInput
            className='w-full h-[54px] border border-n40 rounded-[12px] px-[16px] font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] bg-n10'
            placeholder={t('DELETE_CARD_PLACEHOLDER')}
            placeholderTextColor='#999999'
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize='none'
            autoCorrect={false}
          />
        </CyDView>

        <CyDTouchView
          className='w-full h-[52px] rounded-[62px] bg-n30 items-center justify-center mt-[16px]'
          onPress={handleClose}>
          <CyDText className='font-manrope font-medium text-[18px] leading-[145%] tracking-[-0.4px] text-center text-base400'>
            {t('DELETE_CARD_CANCEL')}
          </CyDText>
        </CyDTouchView>

        <CyDTouchView
          className='w-full h-[52px] rounded-[62px] bg-red200 items-center justify-center mt-[12px]'
          style={!isDeleteEnabled ? styles.disabledButton : undefined}
          onPress={handleDelete}
          disabled={!isDeleteEnabled}>
          <CyDText className='font-manrope font-medium text-[18px] leading-[145%] tracking-[-0.4px] text-center text-n0'>
            {t('DELETE_CARD')}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
