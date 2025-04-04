import React from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
  CyDFastImage,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});

export default function HowReferralWorksModal({
  isModalVisible,
  setIsModalVisible,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
}) {
  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      setModalVisible={(_val: any) => {
        setIsModalVisible(_val);
      }}>
      <CyDView className='bg-n20 px-[20px] pt-[24px] pb-[36px] rounded-t-[16px]'>
        <CyDView className='flex flex-row items-center justify-between'>
          <CyDText className='font-semibold text-[18px]'>
            {t('HOW_REFERRAL_WORKS')}
          </CyDText>
          <CyDTouchView onPress={() => setIsModalVisible(false)}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='mt-[24px]'>
          <CyDView className='flex flex-co bg-n0 rounded-[8px] mt-[6px] p-[24px]'>
            <CyDView className='flex flex-row items-center justify-between'>
              <CyDFastImage
                className='h-[78px] w-[70px] mr-[20px]'
                source={AppImages.HOW_IT_WORKS_1}
              />
              <CyDText className='text-[12px] flex-1 text-center font-[500]'>
                {t('HOW_IT_WORKS_1')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
              <CyDText className='text-[12px] flex-1 text-center font-[500]'>
                {t('HOW_IT_WORKS_2')}
              </CyDText>
              <CyDFastImage
                className='h-[64px] w-[72px] ml-[8px]'
                source={AppImages.HOW_IT_WORKS_2}
              />
            </CyDView>
            <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
              <CyDFastImage
                className='h-[79px] w-[79px]'
                source={AppImages.HOW_IT_WORKS_3}
              />
              <CyDText className='text-[12px] flex-1 text-center font-[500] ml-[16px]'>
                {t('HOW_IT_WORKS_3')}
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
              <CyDText className='text-[12px] flex-1 text-center font-[500]'>
                {t('HOW_IT_WORKS_4')}
              </CyDText>
              <CyDFastImage
                className='h-[71px] w-[67px] ml-[13px]'
                source={AppImages.HOW_IT_WORKS_4}
              />
            </CyDView>
            <CyDView className='flex flex-row items-center justify-between mt-[24px]'>
              <CyDFastImage
                className='h-[50px] w-[48px] mr-[34px]'
                source={AppImages.HOW_IT_WORKS_5}
              />
              <CyDText className='text-[12px] flex-1 text-center font-[500]'>
                {t('HOW_IT_WORKS_5')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDModalLayout>
  );
}
