import React, { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, ScrollView, View, StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';
import CheckBoxes from '../checkBoxes';
import { ButtonType } from '../../constants/enum';
import Button from './button';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    marginHorizontal: 2,
  },
});

export default function ZeroRestrictionModeConfirmationModal(props: {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  onPressProceed: () => void;
  setLoader: Dispatch<SetStateAction<boolean>>;
}) {
  const { isModalVisible, setIsModalVisible, setLoader, onPressProceed } =
    props;
  const { t } = useTranslation();
  const [isChecked, setIsChecked] = useState(false);

  const handleProceedClick = async () => {
    await onPressProceed();
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <View style={styles.modalContainer}>
        <ScrollView bounces={false}>
          <CyDView className='bg-white px-[16px] py-[24px] rounded-t-[16px]'>
            <CyDView className='flex flex-row justify-between items-center mb-[12px]'>
              <CyDView className='flex-1 justify-center items-center'>
                <CyDText className='text-[18px] font-[600] ml-[24px]'>
                  {t('ZERO_RESTRICTION_MODE_TITLE')}
                </CyDText>
              </CyDView>

              <CyDTouchView
                onPress={() => {
                  setIsModalVisible(false);
                  setLoader(false);
                }}>
                <CyDImage
                  source={AppImages.CLOSE_CIRCLE}
                  className='h-[28px] w-[28px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
            <CyDText className='text-[14px] mb-[16px]'>
              By enabling this option, you are activating a mode that bypasses
              all configured limits and allows international transactions for
              all countries. Please read the following information carefully:
            </CyDText>

            <CyDView className='space-y-2 mb-4'>
              <CyDView className='flex-row mb-[8px]'>
                <CyDText className='font-semibold mr-2 text-[14px]'>1]</CyDText>
                <CyDText className='text-[14px] flex-1'>
                  {' '}
                  This mode should be only used when you are unsure of the
                  reason for transaction failure or which specific country needs
                  to be enabled for an international transaction.
                </CyDText>
              </CyDView>
              <CyDView className='flex-row mb-[8px]'>
                <CyDText className='font-semibold mr-2'>2]</CyDText>
                <CyDText className='text-[14px]'>
                  {' '}
                  The unrestricted mode will be active for a{' '}
                  <CyDText className='font-bold'>15-minute</CyDText> window
                  only. During this time, you can turn it off at any moment by
                  toggling this option off.
                </CyDText>
              </CyDView>
              <CyDView className='flex-row mb-[8px]'>
                <CyDText className='font-semibold mr-2'>3]</CyDText>
                <CyDText className='text-[14px]'>
                  {' '}
                  While active, this mode may increase your exposure to
                  potential{' '}
                  <CyDText className='font-bold'>
                    fraudulent activities.
                  </CyDText>
                </CyDText>
              </CyDView>
              <CyDView className='flex-row mb-[8px] text-[14px]'>
                <CyDText className='font-semibold mr-2'>4]</CyDText>
                <CyDText className='flex-1'>
                  {' '}
                  Please note the{' '}
                  <CyDText className='font-bold'>
                    fraud protection coverage
                  </CyDText>{' '}
                  will not be applicable for any incidents that occur when zero
                  restriction mode is active{' '}
                </CyDText>
              </CyDView>
            </CyDView>
            <CyDView className='flex flex-row justify-center items-start mx-[10px] mt-[12px]'>
              <CyDTouchView
                onPress={() => {
                  setIsChecked(!isChecked);
                }}>
                <CyDView
                  className={`h-[21px] w-[21px] mt-[4px] ${isChecked ? 'bg-appColor' : ''} rounded-[4px] border-[1.5px] border-borderColor flex flex-row justify-center items-center`}>
                  <CyDImage
                    source={AppImages.WHITE_CHECK_MARK}
                    className='h-[18px] w-[18px]'
                  />
                </CyDView>
              </CyDTouchView>
              <CyDText
                className={
                  'text-center ml-[8px] text-[12px] font-semibold text-left'
                }>
                {
                  'I understand the potential risks involved and choose to proceed with enabling this feature. I acknowledge that this may allow transactions that are usually limited for security purposes. I understand that the fraud protection coverage will not apply during this time window.'
                }
              </CyDText>
            </CyDView>
            <Button
              title='Proceed'
              onPress={() => {
                void handleProceedClick();
              }}
              titleStyle={isChecked ? 'text-white' : 'text-black'}
              type={ButtonType.RED}
              disabled={!isChecked}
              style='mt-[20px]'
            />
            <Button
              title='Cancel'
              onPress={() => {
                setIsModalVisible(false);
                setLoader(false);
              }}
              type={ButtonType.GREY}
              style='mt-[12px]'
            />
          </CyDView>
        </ScrollView>
      </View>
    </CyDModalLayout>
  );
}
