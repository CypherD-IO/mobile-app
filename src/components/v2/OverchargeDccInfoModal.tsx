import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { screenTitle } from '../../constants';
import { ButtonType } from '../../constants/enum';
import { setOverchargeDccInfoModalShown } from '../../core/asyncStorage';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from './button';
import CyDModalLayout from './modal';
import React from 'react';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';

interface OverchargeDccInfoModalProps {
  isModalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
  transactionId?: string;
}

export default function OverchargeDccInfoModal({
  isModalVisible,
  setModalVisible,
  transactionId,
}: OverchargeDccInfoModalProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const handleClose = () => {
    setModalVisible(false);
  };

  // Wrapper function to handle async promises in event handlers
  const handleIUnderstood = () => {
    void logAnalyticsToFirebase(
      AnalyticEvent.DCC_OVERCHARGE_INFO_MODAL_UNDERSTOOD,
      {
        category: 'transaction_detail',
        action: 'dcc_overcharge_info_modal_understood',
        label: 'overcharged_transaction_info_section',
      },
    );
    if (transactionId) {
      void setOverchargeDccInfoModalShown(transactionId);
    }
    handleClose();
  };

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setModalVisible}
      style={styles.modalLayout}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      swipeDirection={['down']}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          void handleClose();
        }
      }}
      propagateSwipe={true}>
      <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pt-[12px] pb-[32px]'>
        {/* Handle indicator for swipe down */}
        <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mb-[50px]' />

        {/* Main content */}
        <CyDView className='mb-[44px] w-full'>
          <CyDFastImage
            source={AppImages.CARDS_WITH_EXCLAMATION}
            className='h-[160px] w-full mb-[4px]'
            resizeMode='contain'
          />

          <CyDView className='flex flex-row justify-center items-center mb-[24px]'>
            <CyDMaterialDesignIcons
              name='exclamation'
              size={24}
              className='text-red300'
            />
            <CyDText className='text-[24px] font-bold text-base400 tracking-[2px]'>
              {t('ATTENTION')}
            </CyDText>
          </CyDView>

          <CyDText className='text-[14px] text-n200 w-full text-center font-medium mb-[44px] max-w-[350px] self-center mx-auto'>
            {t('OVERCHARGE_DCC_INFO_TEXT_1')}
          </CyDText>

          <CyDView className='flex flex-row items-center mb-[8px]'>
            <CyDText className='text-[12px] font-medium text-base400'>
              💡 {t('PRO_TIP')}
            </CyDText>
            <CyDText className='text-[12px] text-base400'>
              {t('DURING_A_TRANSACTION_OR_ATM_WITHDRAWAL')}
            </CyDText>
          </CyDView>
          <CyDView className='bg-n20 p-[16px] rounded-[12px]'>
            <CyDView className='flex flex-row items-center mb-[8px]'>
              <CyDMaterialDesignIcons
                name='check'
                size={20}
                className='text-green400 mr-[8px]'
              />
              <CyDText className='text-[16px] text-green400 font-medium'>
                {t('ALWAYS_CHOOSE_TO_PAY_IN_THE_LOCAL_CURRENCY')}
              </CyDText>
            </CyDView>

            <CyDView className='flex flex-row items-center mb-[8px]'>
              <CyDMaterialDesignIcons
                name='close'
                size={20}
                className='text-red400 mr-[8px]'
              />
              <CyDText className='text-[16px] text-red400 font-medium'>
                {t('AVOID_USING_HKD_OR_USD_IN_TRANSACTIONS')}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Buttons */}
        <CyDView className='flex flex-row gap-[12px] mb-[24px]'>
          <Button
            title={t('I_UNDERSTOOD')}
            type={ButtonType.SECONDARY}
            style='flex-1'
            onPress={handleIUnderstood}
          />

          <Button
            title={t('KNOW_MORE')}
            type={ButtonType.PRIMARY}
            style='flex-1'
            onPress={() => {
              void logAnalyticsToFirebase(AnalyticEvent.DCC_KNOW_MORE_CLICKED, {
                category: 'transaction_detail',
                action: 'dcc_know_more_clicked',
                label: 'overcharged_transaction_info_section',
              });

              navigation.navigate(screenTitle.CARD_FAQ_SCREEN, {
                uri: 'https://help.cypherhq.io/en/articles/11133566-forex-transactions',
                title: 'Help Center',
              });

              handleClose();
            }}
          />
        </CyDView>
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
