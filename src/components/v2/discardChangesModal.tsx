import React from 'react';
import { useTranslation } from 'react-i18next';
import CyDModalLayout from './modal';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import Button from './button';
import { ButtonType } from '../../constants/enum';
import { useNavigation } from '@react-navigation/native';

interface DiscardChangesModalProps {
  isModalVisible: boolean;
  setIsModalVisible: (isModalVisible: boolean) => void;
}

export default function DiscardChangesModal({
  isModalVisible,
  setIsModalVisible,
}: DiscardChangesModalProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setIsModalVisible}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      style={{ margin: 0, justifyContent: 'flex-end' }}>
      <CyDView className={'bg-n0 rounded-t-[20px] p-[16px] pb-[28px]'}>
        <CyDView className='flex-row justify-center items-center gap-[4px] mb-[16px]'>
          <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
          <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
          <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
          <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
        </CyDView>
        <CyDText className='text-[16px] font-bold mt-[20px] text-center'>
          {t(
            'You have unsaved changes. Leaving now will discard them. Do you want to save before exiting?',
          )}
        </CyDText>
        <CyDView className='flex flex-col gap-[10px] mt-[40px]'>
          <Button
            title={t('DISCARD_CHANGES')}
            type={ButtonType.RED}
            onPress={() => {
              setIsModalVisible(false);
              navigation.goBack();
            }}
          />
          <Button
            title={t('CANCEL')}
            type={ButtonType.SECONDARY}
            onPress={() => {
              setIsModalVisible(false);
            }}
          />
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
