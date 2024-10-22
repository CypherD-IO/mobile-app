import React from 'react';
import {
  CyDView,
  CyDText,
  CyDImage,
  CyDTouchView,
} from '../../styles/tailwindStyles';
import CyDModalLayout from './modal';
import { t } from 'i18next';
import AppImages from '../../../assets/images/appImages';
import QRCode from 'react-native-qrcode-svg';
import { StyleSheet } from 'react-native';

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
      <CyDView className='bg-cardBg px-[16px] pt-[24px] pb-[36px] rounded-[16px] items-center'>
        <CyDView className='flex flex-row items-center justify-between w-full'>
          <CyDText className='font-semibold text-[18px]'>
            {t('REFERRAL_CODE')}
          </CyDText>
          <CyDTouchView onPress={() => setIsModalVisible(false)}>
            <CyDImage
              source={AppImages.BLACK_CLOSE}
              className='h-[12px] w-[12px]'
            />
          </CyDTouchView>
        </CyDView>
        <CyDText className='text-n200 font-[500] text-[14px] mt-[16px] mb-[24px]'>
          {t('REFERRAL_CODE_QR_SUB')}
        </CyDText>
        <QRCode
          value={referralUrl}
          logo={AppImages.QR_LOGO}
          logoSize={40}
          size={200}
          logoBorderRadius={5}
          logoBackgroundColor='transparent'
          logoMargin={3}
        />
      </CyDView>
    </CyDModalLayout>
  );
}
