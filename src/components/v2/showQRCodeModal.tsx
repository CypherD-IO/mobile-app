import React from 'react';
import {
  CyDView,
  CyDText,
  CyDTouchView,
  CyDMaterialDesignIcons,
} from '../../styles/tailwindComponents';
import CyDModalLayout from './modal';
import { t } from 'i18next';
import { QRCode } from 'react-native-custom-qr-codes';
import { StyleSheet } from 'react-native';
import { AppImagesMap } from '../../../assets/images/appImages';

const styles = StyleSheet.create({
  modalLayout: {
    justifyContent: 'center',
  },
});

export default function NewReferralCodeModal({
  isModalVisible,
  setIsModalVisible,
  referralUrl,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (val: boolean) => void;
  referralUrl: string;
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
      <CyDView className='bg-n20 px-[16px] pt-[24px] pb-[36px] rounded-[16px] items-center'>
        <CyDView className='flex flex-row items-center justify-between w-full'>
          <CyDText className='font-semibold text-[18px]'>
            {t('REFERRAL_CODE')}
          </CyDText>
          <CyDTouchView onPress={() => setIsModalVisible(false)}>
            <CyDMaterialDesignIcons
              name={'close'}
              size={16}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        <CyDText className='text-n200 font-[500] text-[14px] mt-[16px] mb-[24px]'>
          {t('REFERRAL_CODE_QR_SUB')}
        </CyDText>
        <QRCode
          content={referralUrl}
          codeStyle='dot'
          logo={AppImagesMap.common.QR_LOGO}
          logoSize={60}
        />
      </CyDView>
    </CyDModalLayout>
  );
}
