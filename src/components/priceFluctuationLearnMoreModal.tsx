import React from 'react';
import CyDModalLayout from './v2/modal';
import {
  CyDMaterialDesignIcons,
  CyDText,
  CyDView,
} from '../styles/tailwindStyles';
import { t } from 'i18next';
import { StyleSheet } from 'react-native';
export default function PriceFluctuationLearnMoreModal(props: any) {
  const { isModalVisible, setModalVisible } = props;

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setModalVisible}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          setModalVisible(false);
        }
      }}
      swipeDirection={['down']}
      propagateSwipe={true}
      style={styles.modalLayout}>
      <CyDView className={'bg-n30 rounded-t-[20px] p-[16px] pb-[28px]'}>
        <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mb-[16px] rounded-full' />
        <CyDMaterialDesignIcons name='alert' size={28} className='text-p150' />
        <CyDText className='text-[20px] leading-[26px] tracking-[-1.2px] font-bold mt-[4px]'>
          {t('PRICE_FLUCTUATION_LEARN_MORE_TITLE')}
        </CyDText>
        <CyDText className='mt-[12px]'>
          {t('PRICE_FLUCTUATION_LEARN_MORE_DESCRIPTION_1')}
        </CyDText>
        <CyDText className='mt-[16px]'>
          {t('PRICE_FLUCTUATION_LEARN_MORE_DESCRIPTION_2')}
        </CyDText>
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
