import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, StyleSheet } from 'react-native';
import Button from '../../../components/v2/button';
import CyDModalLayout from '../../../components/v2/modal';
import { ButtonType } from '../../../constants/enum';
import { isAndroid } from '../../../misc/checkers';
import {
  CyDKeyboardAvoidingView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';

export default function PreferredNameModal({
  isModalVisible,
  setShowModal,
  onSetPreferredName,
}: {
  isModalVisible: boolean;
  setShowModal: (isModalVisible: boolean) => void;
  onSetPreferredName: (preferredName: string) => void;
}) {
  const [preferredName, setPreferredName] = useState<string>('');
  const { t } = useTranslation();
  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDKeyboardAvoidingView
        behavior={isAndroid() ? 'height' : 'padding'}
        className='flex flex-1 flex-col justify-end'>
        <CyDView className='bg-n20 p-[16px] rounded-t-[24px]'>
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDView className=''>
              <CyDText className='text-[16px] font-bold'>
                {t('PREFERRED_NAME')}
              </CyDText>
            </CyDView>
            <CyDTouchView onPress={() => setShowModal(false)}>
              <CyDMaterialDesignIcons
                name={'close'}
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='mt-[12px]'>
            <CyDText className='text-[14px] text-n70'>
              {t('PREFERRED_NAME_SUB')}
            </CyDText>
          </CyDView>
          <CyDView className='mt-[24px]'>
            <CyDView className='flex flex-row justify-between items-center'>
              <CyDText className='text-[16px] font-semibold'>
                {t('PREFERRED_NAME')}
              </CyDText>
              <CyDText className='text-[16px] font-semibold'>
                Max - 27 characters
              </CyDText>
            </CyDView>
            <CyDView
              className={
                'bg-n0 h-[60px]  py-[4px] px-[10px] mt-[2px] rounded-[8px] flex flex-row justify-between items-center'
              }>
              <CyDView className='flex flex-row justify-between items-center'>
                <CyDTextInput
                  className='w-[100%] text-[16px]'
                  inputMode='text'
                  autoFocus={true}
                  value={preferredName}
                  onChangeText={text => setPreferredName(text)}
                />
              </CyDView>
            </CyDView>
            {preferredName.length > 27 && (
              <CyDText className='text-[12px] text-errorTextRed'>
                Preferred name cannot be empty
              </CyDText>
            )}
          </CyDView>
          <CyDView className='mt-[24px]'>
            <Button
              onPress={() => {
                Keyboard.dismiss();
                onSetPreferredName(preferredName);
              }}
              type={ButtonType.PRIMARY}
              title={t('CONTINUE')}
              style={'h-[60px] w-full py-[10px]'}
            />
          </CyDView>
        </CyDView>
      </CyDKeyboardAvoidingView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
