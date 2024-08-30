import { t } from 'i18next';
import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { GlobalContext } from '../../../core/globalContext';
import {
  CyDImage,
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
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  cardProvider: CardProviders;
  card: Card;
  navigation: any;
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
    ...(card.type === CardType.PHYSICAL
      ? [
          {
            title: 'Set New Pin',
            description: 'Change pin for your physical card',
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
    {
      title: 'Linked Wallets',
      description: 'Link another wallet to card',
      image: AppImages.WALLETS,
      action: () => {
        navigation.navigate(screenTitle.LINKED_WALLETS, {
          currentCardProvider: cardProvider,
          card,
        });
        setShowModal(false);
      },
    },
    {
      title: 'Personal Information',
      description: 'View and update your personal information',
      image: AppImages.PERSON,
      action: () => {
        navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN);
        setShowModal(false);
      },
    },
    {
      title: 'Notification Settings',
      description: 'Set how you want to get notified',
      image: AppImages.NOTIFICATION_BELL,
      action: () => {
        navigation.navigate(screenTitle.CARD_NOTIFICATION_SETTINGS, {
          currentCardProvider: cardProvider,
          card,
        });
        setShowModal(false);
      },
    },
    {
      title: 'Frequently Asked Questions',
      description: 'Clear your doubts',
      image: AppImages.DOCUMENT,
      action: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          title: 'Card FAQ',
          uri: 'https://www.cypherwallet.io/card#faq',
        });
        setShowModal(false);
      },
    },
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
      <CyDView className='bg-cardBgTo px-[12px] py-[24px] m-[2px] mb-[6px] rounded-[16px] flex items-center'>
        <CyDView className='flex flex-row justify-between items-center '>
          <CyDView className='flex-1 justify-center items-center'>
            <CyDText className='text-[22px] font-semibold ml-[28px]'>
              Card Options
            </CyDText>
          </CyDView>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CyDImage
              source={AppImages.CLOSE_CIRCLE}
              className='h-[28px] w-[28px]'
              resizeMode='contain'
            />
          </CyDTouchView>
        </CyDView>
        {/* <CyDView className='flex flex-row justify-center items-center mb-[8px] rounded-[6px] px-[12px] py-[4px]'>
          <CyDImage
            source={AppImages.MANAGE_CARD}
            className='h-[28px] w-[28px]'
          />
          <CyDText className='text-[14px] font-semibold ml-[8px]'>
            {'xxxx' + card.last4}
          </CyDText>
        </CyDView> */}
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
              className='flex flex-row items-center mt-[12px] py-[15px] bg-white rounded-[6px]'>
              <CyDImage
                source={image}
                className={'h-[24px] w-[24px] mx-[12px]'}
                resizeMode={'contain'}
              />
              <CyDView className='flex flex-col justify-between flex-1'>
                <CyDText className='text-[16px] font-bold'>{title}</CyDText>
                <CyDText className='text-[12px] font-semibold flex-wrap'>
                  {description}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          );
        })}
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    marginBottom: 30,
    justifyContent: 'flex-end',
  },
});
