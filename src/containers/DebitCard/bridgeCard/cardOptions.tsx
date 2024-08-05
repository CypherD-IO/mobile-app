import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GlobalContext } from '../../../core/globalContext';
import {
  CyDImage,
  CyDSwitch,
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
import useAxios from '../../../core/HttpRequest';
import { get } from 'lodash';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';

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
  const { postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const isPhoneVerified =
    cardProvider === CardProviders.REAP_CARD ||
    (cardProfile.pc?.phoneVerified ?? false);

  const [is3DSecureSet, setIs3DSecureSet] = useState<boolean>(
    get(card, 'is3dsEnabled', false),
  );

  const toggle3DSecure = async () => {
    const response = await postWithAuth(
      `/v1/cards/${cardProvider}/card/${card.cardId}/update3ds`,
      { status: !is3DSecureSet },
    );

    if (!response.isError) {
      const current3DSecureValue = is3DSecureSet;
      setIs3DSecureSet(!current3DSecureValue);
      showModal('state', {
        type: 'success',
        title: !current3DSecureValue
          ? '3D Secure has been setup successfully'
          : '3D Secure Toggle successfull',
        description: !current3DSecureValue
          ? get(cardProfile, ['cardNotification', 'isTelegramAllowed'], false)
            ? "You'll receive 3Ds notifications through Telegram & Email."
            : "You'll receive 3Ds notifications through Cypher Wallet App notifications & Email"
          : '3D Secure has been turned off successfully',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('3D Secure Toggle Successfull'),
        description:
          response.error.errors[0].message ??
          'Could not toggle 3D secure. Please contact support.',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

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
      <CyDView className='bg-cardBgTo px-[12px] py-[24px] m-[2px] mb-[6px] rounded-[16px]'>
        <CyDView className='flex flex-row justify-between items-center mb-[24px]'>
          <CyDView className='flex-1 justify-center items-center'>
            <CyDText className='text-[22px] font-semibold ml-[24px]'>
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
            className='flex flex-row items-center m-[2px] py-[15px] bg-white rounded-[6px]'>
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
        {cardProvider === CardProviders.REAP_CARD && (
          <CyDTouchView
            onPress={() => {
              void toggle3DSecure();
            }}
            className='flex flex-row items-center m-[2px] py-[15px] bg-white rounded-[6px]'>
            <CyDImage
              source={AppImages.THREE_D_SECURE}
              className={'h-[24px] w-[24px] mx-[12px]'}
              resizeMode={'contain'}
            />
            <CyDView className='flex flex-col justify-between mr-[6px]'>
              <CyDText className='text-[16px] font-bold'>{'3D Secure'}</CyDText>
              <CyDText className='text-[12px] font-semibold'>
                {'Cardholder authentication for transactions.'}
              </CyDText>
            </CyDView>
            <CyDSwitch
              value={is3DSecureSet}
              onValueChange={() => {
                void toggle3DSecure();
              }}
            />
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
              <CyDView className='flex flex-col justify-between'>
                <CyDText className='text-[16px] font-bold'>{title}</CyDText>
                <CyDText className='text-[12px] font-semibold'>
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
    marginBottom: 50,
    justifyContent: 'flex-end',
  },
});
