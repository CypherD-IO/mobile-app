import React from 'react';
import { CyDText, CyDView } from '../../styles/tailwindComponents';
import { StyleSheet } from 'react-native';
import { Card } from '../../models/card.model';
import CyDModalLayout from './modal';
import { ButtonType } from '../../constants/enum';
import { t } from 'i18next';
import Button from './button';
import { capitalize } from 'lodash';

export default function SaveChangesModal({
  isModalVisible,
  setIsModalVisible,
  card,
  onApplyToAllCards,
  onApplyToCard,
}: {
  isModalVisible: boolean;
  setIsModalVisible: (isModalVisible: boolean) => void;
  card: Card;
  onApplyToAllCards: () => void;
  onApplyToCard: () => void;
}) {
  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setIsModalVisible}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      onSwipeComplete={({ swipingDirection }) => {
        if (swipingDirection === 'down') {
          setIsModalVisible(false);
        }
      }}
      swipeDirection={['down']}
      propagateSwipe={true}
      style={styles.modalLayout}>
      <CyDView
        className={'bg-n30 rounded-t-[20px] p-[16px] pb-[28px] h-[340px]'}>
        <CyDView className='w-[32px] h-[4px] bg-[#d9d9d9] self-center mb-[16px] rounded-full' />
        <CyDText className='text-[16px] font-bold mt-[20px] text-center'>
          {t('SAVE_CHANGES_DESC', {
            cardType: capitalize(card.type),
            last4: card.last4,
          })}
        </CyDText>
        <CyDView className='flex flex-col gap-[10px] mt-[40px]'>
          <Button
            title={t('APPLY_TO_ALL_CARDS')}
            type={ButtonType.GREY_FILL}
            onPress={() => {
              onApplyToAllCards();
            }}
          />
          <Button
            title={capitalize(t('CANCEL'))}
            type={ButtonType.PRIMARY}
            onPress={() => {
              onApplyToCard();
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
