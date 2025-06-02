import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { ButtonType } from '../../constants/enum';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../../styles/tailwindComponents';
import Button from './button';
import CyDModalLayout from './modal';
import React from 'react';

interface HiddenCardModalProps {
  isModalVisible: boolean;
  setIsModalVisible: (visible: boolean) => void;
  onLoadCard: () => void;
}

export default function HiddenCardModal({
  isModalVisible,
  setIsModalVisible,
  onLoadCard,
}: HiddenCardModalProps) {
  const { t } = useTranslation();

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setIsModalVisible}
      style={styles.modalLayout}
      animationIn='slideInUp'
      animationOut='slideOutDown'
      swipeDirection={['down']}
      onSwipeComplete={() => setIsModalVisible(false)}
      propagateSwipe={true}>
      <CyDView className='bg-n0 rounded-t-[24px] p-[24px]'>
        {/* Drag handle indicator */}
        <CyDView className='h-[4px] w-[40px] bg-n40 rounded-[2px] self-center' />

        {/* Wallet/Card Icon */}
        <CyDView className='mb-[4px]'>
          <CyDMaterialDesignIcons
            name='cash'
            size={60}
            className='text-base400'
          />
        </CyDView>

        {/* Title */}
        <CyDText className='text-[20px] font-semibold mb-[12px]'>
          {t('LOAD_YOUR_CARD')}
        </CyDText>

        {/* Description */}
        <CyDText className='text-[14px] text-n200 mb-[12px]'>
          {t('LOAD_YOUR_CARD_DESCRIPTION_2')}
        </CyDText>

        {/* Reward Points Info Box
        <CyDView className='bg-[#E8F5EC] rounded-[12px] p-[16px] mb-[30px] flex-row items-center'>
          <CyDView className='bg-[#4D8B6F] h-[40px] w-[40px] items-center justify-center rounded-[8px] mr-[12px]'>
            <CyDIcons name='credit' size={24} className='text-white' />
          </CyDView>
          <CyDText className='text-[#4D8B6F] text-[16px] flex-1'>
            Earn 20 reward points when you load your card for the first time!
            Don&apos;t miss out—this offer is available for a limited time.
          </CyDText>
        </CyDView> */}

        {/* Load Card Button */}
        <CyDView className='my-[32px]'>
          <Button
            title={t('Load Card')}
            type={ButtonType.PRIMARY}
            style='rounded-full'
            paddingY={14}
            onPress={() => {
              setIsModalVisible(false);
              onLoadCard();
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
