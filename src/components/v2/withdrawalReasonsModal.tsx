import React, { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, StyleSheet } from 'react-native';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AppImages from '../../../assets/images/appImages';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    marginHorizontal: 2,
  },
});

export default function WithdrawalReasonsModal(props: {
  isModalVisible: boolean;
  setIsModalVisible: Dispatch<SetStateAction<boolean>>;
  reason: string[];
}) {
  const { isModalVisible, setIsModalVisible, reason } = props;
  const { t } = useTranslation();

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
          <CyDView className='bg-n0 px-[16px] py-[24px] rounded-t-[16px]'>
            <CyDView className='flex flex-row justify-between items-center mb-[12px]'>
              <CyDView className='flex-1 justify-center items-center'>
                <CyDText className='text-[18px] font-[600] ml-[24px]'>
                  {t('CRYPTO_WITHDRAWAL')}
                </CyDText>
              </CyDView>

              <CyDTouchView
                onPress={() => {
                  setIsModalVisible(false);
                }}>
                <CyDImage
                  source={AppImages.CLOSE_CIRCLE}
                  className='h-[28px] w-[28px]'
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
            <CyDText className='text-[14px] mb-[16px]'>
              {t('LIMITATIONS_AROUND_CRYPTO_WITHDRAWAL')} :
            </CyDText>

            <CyDView className='mb-[32px]'>
              {reason.map((item, index) => (
                <CyDView key={index} className='flex-row mb-[8px]'>
                  <CyDText className='mr-2'>•</CyDText>
                  <CyDText className='text-[14px] flex-1'>{item}</CyDText>
                </CyDView>
              ))}
            </CyDView>
          </CyDView>
        </ScrollView>
      </View>
    </CyDModalLayout>
  );
}
