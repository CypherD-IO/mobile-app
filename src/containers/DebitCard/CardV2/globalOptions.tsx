import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDFastImage,
  CyDKeyboardAwareScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import AppImages from '../../../../assets/images/appImages';
import { t } from 'i18next';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Card } from '../../../models/card.model';
import { screenTitle } from '../../../constants';
import { CardProviders } from '../../../constants/enum';
import AutoLoadOptionsModal from '../bridgeCard/autoLoadOptions';
import { get } from 'lodash';
import { CardProfile } from '../../../models/cardProfile.model';

interface RouteParams {
  cardProvider: string;
  card: Card;
  onPressPlanChange: () => void;
  profile: CardProfile;
}

export default function GlobalOptions() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [isAutoLoadOptionsvisible, setIsAutoLoadOptionsVisible] =
    useState<boolean>(false);

  const { cardProvider, onPressPlanChange, card, profile } = route.params;

  const cardGlobalOptions = [
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
            },
          },
        ]
      : []),
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: t<string>('CHANGE_PLAN'),
            description: 'Change your plan',
            image: AppImages.UPGRADE_TO_PHYSICAL_CARD_ARROW,
            action: () => {
              onPressPlanChange();
            },
          },
        ]
      : []),
    {
      title: 'Auto Load',
      description: 'Manage auto load',
      image: AppImages.AUTOLOAD,
      action: () => {
        setIsAutoLoadOptionsVisible(true);
      },
    },
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: 'Withdraw Crypto',
            description: 'Convert your card balance to crypto',
            image: AppImages.CRYPTO_WITHDRAWAL,
            action: () => {
              navigation.navigate(screenTitle.CRYPTO_WITHDRAWAL, {
                currentCardProvider: cardProvider,
                card,
              });
            },
          },
          ...(get(profile, ['cardNotification', 'isTelegramAllowed'], false)
            ? [
                {
                  title: 'Set New Telegram Pin',
                  description: 'Access card functionalities from Telegram',
                  image: AppImages.TELEGRAM_OUTLINE_ICON,
                  action: () => {
                    navigation.navigate(screenTitle.TELEGRAM_PIN_SETUP);
                  },
                },
              ]
            : []),
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
      },
    },
    {
      title: 'Personal Information',
      description: 'Update personal information for your account',
      image: AppImages.PERSON,
      action: () => {
        navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN);
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
      },
    },
  ];

  const onPressUpdateAutoLoad = () => {
    setIsAutoLoadOptionsVisible(false);
    navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
  };

  return (
    <>
      <AutoLoadOptionsModal
        isModalVisible={isAutoLoadOptionsvisible}
        setShowModal={setIsAutoLoadOptionsVisible}
        onPressUpdateAutoLoad={onPressUpdateAutoLoad}
      />
      <CyDView
        className='flex flex-col justify-between h-full bg-n0'
        style={{ paddingTop: insets.top }}>
        <CyDView className='flex-1'>
          <CyDView className='flex flex-row items-center py-[16px] px-[16px] '>
            <CyDTouchView
              className='pr-[16px]'
              onPress={() => {
                navigation.goBack();
              }}>
              <CyDFastImage
                source={AppImages.LEFT_ARROW_LONG}
                className='w-[20px] h-[16px]'
              />
            </CyDTouchView>
            <CyDText className='text-[16px] font-bold text-base400'>
              {t('ACCOUNT_OPTIONS')}
            </CyDText>
          </CyDView>
          <CyDKeyboardAwareScrollView className='flex-1 bg-n30'>
            <CyDView className='px-[12px]'>
              {cardGlobalOptions.map((option, index) => {
                const { image, title, description, action } = option;
                return (
                  <CyDTouchView
                    key={index}
                    onPress={action}
                    className='flex flex-row justify-between items-center bg-white rounded-[8px] p-[12px] mt-[16px]'>
                    <CyDView className='flex flex-row items-center w-[90%]'>
                      <CyDFastImage
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
                    <CyDFastImage
                      source={AppImages.RIGHT_ARROW}
                      className='h-[24px] w-[24px] mr-[8px]'
                      resizeMode={'contain'}
                    />
                  </CyDTouchView>
                );
              })}
            </CyDView>
          </CyDKeyboardAwareScrollView>
        </CyDView>
      </CyDView>
    </>
  );
}
