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

interface DeleteCardResultModalProps {
  isModalVisible: boolean;
  cardType: string;
  last4: string;
  onOkay: () => void;
  title?: string;
  description?: string;
  type?: 'success' | 'error';
}

export default function DeleteCardResultModal({
  isModalVisible,
  cardType,
  last4,
  onOkay,
  title,
  description,
  type = 'success',
}: DeleteCardResultModalProps): React.JSX.Element {
  const { t } = useTranslation();

  const isError = type === 'error';
  const icon = isError
    ? AppImages.ERROR_EXCLAMATION_RED_BG_ROUNDED
    : AppImages.SUCCESS_TICK_GREEN_BG_ROUNDED;
  const defaultTitle = isError
    ? t('DELETE_CARD_FAILED')
    : t('DELETE_CARD_SUCCESS_TITLE');
  const defaultDescription = isError
    ? t('DELETE_CARD_SOMETHING_WENT_WRONG')
    : t('DELETE_CARD_SUCCESS_DESC', { cardType, last4 });

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
          source={icon}
          className='w-[54px] h-[54px]'
          resizeMode='contain'
        />

        <CyDText className='font-manrope font-medium text-[20px] leading-[130%] tracking-[-1px] text-base400 mt-[16px]'>
          {title ?? defaultTitle}
        </CyDText>

        <CyDText className='font-manrope font-medium text-[14px] leading-[145%] tracking-[-0.6px] text-n200 mt-[8px]'>
          {description ?? defaultDescription}
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
