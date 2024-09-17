import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
  CyDKeyboardAvoidingView,
  CyDTextInput,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { Platform, StyleSheet } from 'react-native';
import { sampleSize } from 'lodash';
import Button from './button';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});

export default function NewReferralCodeModal({
  isModalVisible,
  setIsModalVisible,
  createReferralCode,
  code,
  setCode,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
  createReferralCode: () => Promise<void>;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
}) {
  useEffect(() => {
    setCode(generateCode());
  }, []);

  const generateCode = () => {
    const letters = sampleSize('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4);
    const numbers = sampleSize('0123456789', 4);
    return [...letters, ...numbers].join(``);
  };

  const handleCodeChange = (text: string) => {
    const formattedText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(formattedText.slice(0, 12));
  };

  const isCodeValid = code.length >= 6;

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <CyDKeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <CyDView className='bg-cardBg px-[16px] py-[24px] rounded-t-[16px]'>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDText className='font-semibold text-[18px] tracking-tight'>
              {t('CREATE_REFERRAL_CODE')}
            </CyDText>
            <CyDTouchView onPress={() => setIsModalVisible(false)}>
              <CyDImage
                source={AppImages.BLACK_CLOSE}
                className='h-[12px] w-[12px]'
              />
            </CyDTouchView>
          </CyDView>
          <CyDText className='text-n200 font-[500] text-[14px] mt-[4px]'>
            {t('CREATE_REFERRAL_CODE_SUB')}
          </CyDText>
          <CyDText className='font-[700] text-[12px] mt-[16px]'>
            {t('REFERRAL_CODE')}
          </CyDText>
          <CyDView className='flex flex-row items-center justify-between'>
            <CyDTextInput
              className='bg-white rounded-[8px] px-[12px] py-[15px] mt-[4px] flex-1 mr-[12px]'
              placeholder={t('NEWCODE10')}
              value={code}
              onChangeText={handleCodeChange}
              autoFocus={true}
            />
            <Button
              title={''}
              image={AppImages.RIGHT_ARROW_LONG}
              imageStyle={'my-[5px]'}
              onPress={() => {
                setIsModalVisible(false);
                void createReferralCode();
              }}
              disabled={!isCodeValid}
            />
          </CyDView>
          {!isCodeValid && (
            <CyDText className='text-red-500 font-[500] text-[12px] mt-[4px]'>
              {t('REFERRAL_CODE_LENGTH_INFO')}
            </CyDText>
          )}
        </CyDView>
      </CyDKeyboardAvoidingView>
    </CyDModalLayout>
  );
}
