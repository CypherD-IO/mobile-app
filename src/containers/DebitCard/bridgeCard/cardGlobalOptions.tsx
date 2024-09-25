import { t } from 'i18next';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { CardProviders } from '../../../constants/enum';
import { screenTitle } from '../../../constants';
import CyDModalLayout from '../../../components/v2/modal';
import AutoLoadOptionsModal from './autoLoadOptions';

export default function CardGlobalOptionsModal({
  isModalVisible,
  setShowModal,
  cardProvider,
  navigation,
  onPressPlanChange,
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  cardProvider: CardProviders;
  navigation: any;
  onPressPlanChange: () => void;
}) {
  const [isAutoLoadOptionsvisible, setIsAutoLoadOptionsVisible] =
    useState(false);
  const cardGlobalOptions = [
    {
      title: 'Auto Load',
      description: 'Manage auto load',
      image: AppImages.AUTOLOAD,
      action: () => {
        // navigation.navigate(screenTitle.LINKED_WALLETS, {
        //   currentCardProvider: cardProvider,
        // });
        setIsAutoLoadOptionsVisible(true);
        //setShowModal(false);
      },
    },
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: t<string>('CHANGE_PLAN'),
            description: 'Change your plan',
            image: AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW,
            action: () => {
              setShowModal(false);
              onPressPlanChange();
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
        });
        setShowModal(false);
      },
    },
    {
      title: 'Personal Information',
      description: 'Update personal information for your account',
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
      <AutoLoadOptionsModal
        isModalVisible={isAutoLoadOptionsvisible}
        setShowModal={setIsAutoLoadOptionsVisible}
        onPressUpdateAutoLoad={() => {
          setIsAutoLoadOptionsVisible(false);
          setShowModal(false);
          navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
        }}
      />
      <CyDView className='bg-cardBgTo mb-[6px] rounded-[16px] max-h-[80%] pb-[32px]'>
        <CyDScrollView className='flex flex-col'>
          <CyDView className='flex flex-row justify-between items-center rounded-t-[16px] bg-white px-[16px] pb-[16px] pt-[32px]'>
            <CyDText className='text-[16px] font-semibold font-manrope'>
              Account Options
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
            {cardGlobalOptions.map((option, index) => {
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
