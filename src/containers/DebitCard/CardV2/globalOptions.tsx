import React, { useContext, useEffect, useState } from 'react';
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
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Card } from '../../../models/card.model';
import { screenTitle } from '../../../constants';
import { CardProviders, GlobalContextType } from '../../../constants/enum';
import AutoLoadOptionsModal from '../bridgeCard/autoLoadOptions';
import { get, isEqual } from 'lodash';
import { CardProfile } from '../../../models/cardProfile.model';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { showToast } from '../../utilities/toastUtility';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';

interface RouteParams {
  cardProvider: string;
  card: Card;
  onPressPlanChange: () => void;
}

export default function GlobalOptions() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [isAutoLoadOptionsvisible, setIsAutoLoadOptionsVisible] =
    useState<boolean>(false);

  const { cardProvider, onPressPlanChange, card } = route.params;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const { cardProfileModal } = useCardUtilities();
  const isFocused = useIsFocused();
  const [isTelegramLinked, setIsTelegramLinked] = useState<boolean>(
    get(cardProfile, ['isTelegramSetup'], false),
  );
  const { deleteWithAuth, postWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();

  const refreshProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const tempProfile = await cardProfileModal(response.data);
      setIsTelegramLinked(get(tempProfile, ['isTelegramSetup'], false));

      // Compare the new profile with the existing one
      if (!isEqual(tempProfile, globalContext.globalState.cardProfile)) {
        globalContext.globalDispatch({
          type: GlobalContextType.CARD_PROFILE,
          cardProfile: tempProfile,
        });
      }
      return true;
    }
    return false;
  };

  const onRefresh = async () => {
    await refreshProfile();
  };

  useEffect(() => {
    if (isFocused) {
      void onRefresh();
    }
  }, [isFocused]);

  const disconnectTelegram = async () => {
    const response = await deleteWithAuth('/v1/cards/tg');
    if (!response.isError) {
      showToast('Telegram disconnected successfully', 'success');
      await onRefresh();
    } else {
      showModal('state', {
        type: 'error',
        title: 'Unable to disconnect Telegram',
        description:
          response.error?.message ||
          'Could not disconnect from Telegram. Please contact support',
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

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
          {
            title: 'Telegram Bot',
            description: 'Manage your account with telegram',
            image: AppImages.TELEGRAM_OUTLINE_ICON,
            action: () => {
              navigation.navigate(screenTitle.TELEGRAM_SETUP, {
                navigateTo: screenTitle.TELEGRAM_PIN_SETUP,
                showSetupLaterOption: false,
                enableBackButton: true,
              });
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
      title: 'Personal Information',
      description: 'Update personal information for your account',
      image: AppImages.PERSON,
      action: () => {
        navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN);
      },
    },
    {
      title: 'Frequently Asked Questions',
      description: 'Clear your doubts',
      image: AppImages.DOCUMENT,
      action: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          title: 'Card FAQ',
          uri: 'https://cypherhq.io/card#faq',
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
          <CyDKeyboardAwareScrollView className='flex-1 bg-n30 pb-[16px]'>
            <CyDView className='px-[12px] mb-[22px]'>
              {cardGlobalOptions.map((option, index) => {
                const { image, title, description, action } = option;

                if (title === 'Telegram Bot') {
                  return (
                    <CyDView
                      key={index}
                      className='bg-white rounded-[8px] mt-[16px]'>
                      <CyDTouchView
                        onPress={() => {
                          if (!isTelegramLinked) {
                            void action();
                          }
                        }}
                        className='flex flex-row justify-between items-center m-[12px]'>
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
                        {!isTelegramLinked && (
                          <CyDView>
                            <CyDText className='font-semibold text-blue-700 text-[12px]'>
                              {'Setup'}
                            </CyDText>
                          </CyDView>
                        )}
                      </CyDTouchView>
                      {isTelegramLinked && (
                        <>
                          <CyDTouchView
                            onPress={() => {
                              navigation.navigate(
                                screenTitle.TELEGRAM_PIN_SETUP,
                              );
                            }}
                            className='flex flex-row justify-between items-center border-t border-n30 p-[12px]'>
                            <CyDView className='flex flex-row items-center w-[90%]'>
                              <CyDView className='flex flex-col justify-between flex-1 px-[6px]'>
                                <CyDText className='text-[16px] font-medium text-base400'>
                                  {'Reset Telegram Pin'}
                                </CyDText>
                              </CyDView>
                            </CyDView>
                            <CyDFastImage
                              source={AppImages.RIGHT_ARROW}
                              className='h-[24px] w-[24px] mr-[8px]'
                              resizeMode={'contain'}
                            />
                          </CyDTouchView>
                          <CyDTouchView
                            onPress={() => {
                              void disconnectTelegram();
                            }}
                            className='flex flex-row justify-between items-center border-t border-n30 p-[12px]'>
                            <CyDView className='flex flex-row items-center w-[90%]'>
                              <CyDView className='flex flex-col justify-between flex-1 px-[6px]'>
                                <CyDText className='text-[16px] font-medium text-red-700'>
                                  {'Disconnect Telegram'}
                                </CyDText>
                              </CyDView>
                            </CyDView>
                          </CyDTouchView>
                        </>
                      )}
                    </CyDView>
                  );
                }

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
