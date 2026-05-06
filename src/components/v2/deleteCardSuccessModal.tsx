import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import CyDModalLayout from './modal';
import {
  CyDImage,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import AppImages from '../../../assets/images/appImages';

interface DeleteCardSuccessModalProps {
  isModalVisible: boolean;
  cardType: string;
  last4: string;
  onOkay: () => void;
  title?: string;
  description?: string;
}

export default function DeleteCardSuccessModal({
  isModalVisible,
  cardType,
  last4,
  onOkay,
  title,
  description,
}: DeleteCardSuccessModalProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={() => {
        onOkay();
      }}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      disableBackDropPress={true}
      style={styles.modalLayout}>
      <CyDView className='bg-n0 rounded-t-[20px] px-[24px] pt-[28px] pb-[32px]'>
        <CyDImage
          source={AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED}
          className='w-[54px] h-[54px]'
          resizeMode='contain'
        />

        <CyDText className='font-manrope font-medium text-[20px] leading-[130%] tracking-[-1px] text-base400 mt-[16px]'>
          {title ?? t('DELETE_CARD_SUCCESS_TITLE')}
        </CyDText>

        <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-n200 mt-[8px]'>
          {description ?? t('DELETE_CARD_SUCCESS_DESC', { cardType, last4 })}
        </CyDText>

        <CyDTouchView
          className='w-full h-[64px] rounded-[60px] bg-buttonColor items-center justify-center mt-[24px]'
          onPress={onOkay}>
          <CyDText className='font-manrope font-semibold text-[18px] leading-[145%] tracking-[-1px] text-black'>
            {'Okay'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
