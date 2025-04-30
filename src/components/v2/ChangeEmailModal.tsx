import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, StyleSheet } from 'react-native';
import {
  CyDView,
  CyDText,
  CyDTextInput,
} from '../../styles/tailwindComponents';
import Button from './button';
import CyDModalLayout from './modal';

interface ChangeEmailModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUpdate: (email: string) => Promise<void>;
  loading: boolean;
}

const ChangeEmailModal = ({
  isVisible,
  onClose,
  onUpdate,
  loading,
}: ChangeEmailModalProps) => {
  const { t } = useTranslation();
  const [newEmail, setNewEmail] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleUpdate = async () => {
    await onUpdate(newEmail);
    setNewEmail('');
  };

  return (
    <CyDModalLayout
      isModalVisible={isVisible}
      setModalVisible={onClose}
      style={[styles.modalLayout, { marginBottom: keyboardHeight }]}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}>
      <CyDView className='bg-n0 rounded-t-[20px] p-[25px] pb-[30px] min-h-[300px]'>
        <CyDText className='font-bold text-center text-[22px] mb-[20px]'>
          {t('CHANGE_EMAIL')}
        </CyDText>

        <CyDView className='mb-[20px]'>
          <CyDTextInput
            className='border-[1px] border-base80 rounded-[8px] p-[12px] text-[16px] w-full bg-n20'
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder={t('ENTER_NEW_EMAIL')}
            placeholderTextColor='#A0A0A0'
            keyboardType='email-address'
            autoCapitalize='none'
            autoCorrect={false}
          />
        </CyDView>

        <Button
          title={t('UPDATE_EMAIL')}
          onPress={handleUpdate}
          disabled={!newEmail || loading}
          loading={loading}
          style='mt-[10px]'
        />
      </CyDView>
    </CyDModalLayout>
  );
};

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default ChangeEmailModal;
