import { t } from 'i18next';
import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { GlobalContext } from '../../../core/globalContext';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { CardProviders, CardType } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import { CardProfile } from '../../../models/cardProfile.model';
import CyDModalLayout from '../../../components/v2/modal';
import { Card } from '../../../models/card.model';

export default function CardOptionsModal({
  isModalVisible,
  setShowModal,
  cardProvider,
  card,
  navigation,
  onPressPlanChange,
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  cardProvider: CardProviders;
  card: Card;
  navigation: any;
  onPressPlanChange: () => void;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const isPhoneVerified =
    cardProvider === CardProviders.REAP_CARD ||
    (cardProfile.pc?.phoneVerified ?? false);

  const cardOptions = [
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: 'Card Controls',
            description: "Edit your card's limit and behaviour",
            image: AppImages.CARD_CONTROLS,
            action: () => {
              navigation.navigate(screenTitle.CARD_CONTROLS_MENU, {
                currentCardProvider: cardProvider,
                card,
              });
              setShowModal(false);
            },
          },
        ]
      : []),
    ...(cardProvider === CardProviders.REAP_CARD ||
    card.type === CardType.PHYSICAL
      ? [
          {
            title: 'Set New Pin',
            description: 'Change pin for your card',
            image: AppImages.CIRCLE_WITH_DOTS,
            action: () => {
              navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
                currentCardProvider: cardProvider,
                card,
              });
              setShowModal(false);
            },
          },
        ]
      : []),
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: 'Lockdown Mode',
            description: 'Secure account by blocking all Card Functionalities',
            image: AppImages.LOCKDOWN_MODE_ICON,
            action: () => {
              navigation.navigate(screenTitle.LOCKDOWN_MODE, {
                currentCardProvider: cardProvider,
              });
              setShowModal(false);
            },
          },
        ]
      : []),
    {
      title: 'Withdraw Crypto',
      description: 'Convert your card balance to crypto',
      image: AppImages.CRYPTO_WITHDRAWAL,
      action: () => {
        navigation.navigate(screenTitle.CRYPTO_WITHDRAWAL, {
          currentCardProvider: cardProvider,
          card,
        });
        setShowModal(false);
      },
    },
  ];

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-cardBgTo mb-[6px] rounded-[16px] max-h-[80%] pb-[32px]'>
        <CyDScrollView className='flex flex-col'>
          <CyDView className='flex flex-row justify-between items-center rounded-t-[16px] bg-white px-[16px] pb-[16px] pt-[32px]'>
            <CyDText className='text-[16px] font-semibold font-manrope'>
              Card Options
            </CyDText>
            <CyDTouchView onPress={() => setShowModal(false)}>
              <CyDImage
                source={AppImages.CLOSE_CIRCLE}
                className='h-[28px] w-[28px]'
                resizeMode='contain'
              />
            </CyDTouchView>
          </CyDView>
          <CyDView className='px-[12px]'>
            {!isPhoneVerified && (
              <CyDTouchView
                onPress={() => {
                  navigation.navigate(
                    screenTitle.PHONE_NUMBER_VERIFICATION_SCREEN,
                    {
                      phoneNumber: cardProfile?.phone,
                    },
                  );
                  setShowModal(false);
                }}
                className='flex flex-row items-center m-[2px] py-[15px] bg-white w-full rounded-[6px]'>
                <CyDImage
                  source={AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW}
                  className={'h-[24px] w-[24px] mx-[12px]'}
                  resizeMode={'contain'}
                />
                <CyDView className='flex flex-col justify-between'>
                  <CyDText className='text-[16px] font-bold'>
                    {t<string>('VERIFY_PHONE_NUMBER_INIT_CAPS')}
                  </CyDText>
                  <CyDText className='text-[12px] font-semibold'>
                    {'Verify now to unlock all features'}
                  </CyDText>
                </CyDView>
              </CyDTouchView>
            )}
            {cardOptions.map((option, index) => {
              const { image, title, description, action } = option;
              return (
                <CyDTouchView
                  key={index}
                  onPress={action}
                  className='flex flex-row justify-between items-center bg-white rounded-[8px] p-[12px] mt-[16px]'>
                  <CyDView className='flex flex-row items-center w-[90%]'>
                    <CyDImage
                      source={image}
                      className={'h-[24px] w-[24px] mr-[8px]'}
                      resizeMode={'contain'}
                    />
                    <CyDView className='flex flex-col justify-between flex-1 px-[6px]'>
                      <CyDText className='text-[16px] font-medium text-base400'>
                        {title}
                      </CyDText>
                      <CyDText className='text-[12px] font-medium text-n50 flex-wrap'>
                        {description}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                  <CyDImage
                    source={AppImages.RIGHT_ARROW}
                    className='h-[24px] w-[24px] mr-[8px]'
                    resizeMode={'contain'}
                  />
                </CyDTouchView>
              );
            })}
          </CyDView>
        </CyDScrollView>
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
