import React, { useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDFastImage,
  CyDIcons,
  CydMaterialDesignIcons,
  CyDScrollView,
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
import {
  CardProviders,
  CypherPlanId,
  GlobalContextType,
} from '../../../constants/enum';
import AutoLoadOptionsModal from '../bridgeCard/autoLoadOptions';
import { get, isEqual } from 'lodash';
import { CardProfile } from '../../../models/cardProfile.model';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { showToast } from '../../utilities/toastUtility';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { StyleSheet } from 'react-native';
import SelectPlanModal from '../../../components/selectPlanModal';
import { useTheme } from '../../../reducers/themeReducer';
import clsx from 'clsx';
import { CyDIconsPack } from '../../../customFonts';

interface RouteParams {
  cardProvider: string;
  card: Card;
}

export default function GlobalOptions() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const [isAutoLoadOptionsvisible, setIsAutoLoadOptionsVisible] =
    useState<boolean>(false);

  const { cardProvider, card } = route.params;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const { cardProfileModal } = useCardUtilities();
  const isFocused = useIsFocused();
  const [isTelegramLinked, setIsTelegramLinked] = useState<boolean>(
    get(cardProfile, ['isTelegramSetup'], false),
  );
  const [isAutoloadConfigured, setIsAutoloadConfigured] = useState<boolean>(
    get(cardProfile, ['isAutoloadConfigured'], false),
  );
  const [planInfo, setPlanInfo] = useState<{
    expiresOn: number;
    metalCardEligible: boolean;
    optedPlanId: CypherPlanId;
    planId: CypherPlanId;
    updatedOn: number;
  } | null>(get(cardProfile, ['planInfo'], null));

  const { deleteWithAuth, getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const [planChangeModalVisible, setPlanChangeModalVisible] =
    useState<boolean>(false);
  const [openComparePlans, setOpenComparePlans] = useState<boolean>(false);

  const refreshProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    if (!response.isError) {
      const tempProfile = await cardProfileModal(response.data);
      setIsTelegramLinked(get(tempProfile, ['isTelegramSetup'], false));
      setIsAutoloadConfigured(
        get(tempProfile, ['isAutoloadConfigured'], false),
      );
      setPlanInfo(get(tempProfile, ['planInfo'], null));
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

  const accountSecurityOptions = [
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: 'Lockdown Mode',
            description: 'Secure account by blocking all Card Functionalities',
            image: 'left-hand-pamp' as const,
            action: () => {
              navigation.navigate(screenTitle.LOCKDOWN_MODE, {
                currentCardProvider: cardProvider,
              });
            },
          },
        ]
      : []),
    {
      title: 'Auto Load',
      description: 'Manage auto load',
      image: 'card-load' as const,
      action: () => {
        isAutoloadConfigured
          ? setIsAutoLoadOptionsVisible(true)
          : navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
      },
    },
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: 'Withdraw Crypto',
            description: 'Convert your card balance to crypto',
            image: 'withdraw' as const,
            action: () => {
              navigation.navigate(screenTitle.CRYPTO_WITHDRAWAL, {
                currentCardProvider: cardProvider,
                card,
              });
            },
          },
        ]
      : []),
    {
      title: 'Linked Wallets',
      description: 'Link another wallet to card',
      image: 'wallet-multiple' as const,
      action: () => {
        navigation.navigate(screenTitle.LINKED_WALLETS, {
          currentCardProvider: cardProvider,
        });
      },
    },
    ...(cardProvider === CardProviders.REAP_CARD &&
    planInfo?.planId === CypherPlanId.PRO_PLAN
      ? [
          {
            title: 'Manage Premium',
            description: '',
            image: 'bookmark' as const,
            action: () => {
              navigation.navigate(screenTitle.MANAGE_SUBSCRIPTION, {
                currentCardProvider: cardProvider,
                card,
                planInfo,
              });
            },
          },
        ]
      : []),
  ];

  const notificationPersonalInformationOptions = [
    ...(cardProvider === CardProviders.REAP_CARD
      ? [
          {
            title: 'Telegram Bot',
            description: 'Manage your account with telegram',
            image: 'telegram' as const,
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
      title: 'Notification Settings',
      description: 'Set how you want to get notified',
      image: 'notification' as const,
      action: () => {
        navigation.navigate(screenTitle.CARD_NOTIFICATION_SETTINGS, {
          currentCardProvider: cardProvider,
        });
      },
    },
    {
      title: 'Personal Information',
      description: 'Update personal information for your account',
      image: 'account' as const,
      action: () => {
        navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN);
      },
    },
  ];

  const othersOptions = [
    {
      title: 'Frequently Asked Questions',
      description: 'Clear your doubts',
      image: 'message-outline',
      action: () => {
        navigation.navigate(screenTitle.OPTIONS, {
          screen: screenTitle.SOCIAL_MEDIA_SCREEN,
          params: {
            title: 'Card FAQ',
            uri: 'https://cypherhq.io/card#faq',
          },
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
      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        openComparePlans={openComparePlans}
        deductAmountNow={true}
        cardProvider={cardProvider}
        cardId={card.cardId}
      />
      <CyDView
        className='flex flex-col justify-between h-full bg-n0'
        style={{ paddingTop: insets.top }}>
        <CyDView className='flex flex-row items-center py-[16px] px-[16px] '>
          <CyDTouchView
            className='pr-[16px]'
            onPress={() => {
              navigation.goBack();
            }}>
            <CyDIconsPack
              name='arrow-left'
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
          <CyDText className='text-[16px] font-bold text-base400'>
            {t('ACCOUNT_OPTIONS')}
          </CyDText>
        </CyDView>
        <CyDScrollView className='flex-1 bg-n20 px-[16px]'>
          {planInfo?.planId !== CypherPlanId.PRO_PLAN && (
            <CyDView
              className={clsx('rounded-[16px] p-[16px] mt-[30px]', {
                'bg-n0': theme === 'dark',
                'bg-p0': theme === 'light',
              })}
              style={styles.shadow}>
              <CyDView className='p-[12px]'>
                <CyDText className='text-[12px] font-medium text-center'>
                  {'Go premium for just'}
                  <CyDText className='font-extrabold'>{' $199/year'}</CyDText>
                  {' and '}
                  <CyDText className='font-extrabold'>
                    {'Maximize Your Saving!'}
                  </CyDText>
                </CyDText>
                <CyDView className='mt-[12px] flex flex-row justify-center items-center'>
                  <CyDTouchView
                    style={styles.buttonShadow}
                    className='flex flex-row items-center bg-n40 px-[10px] py-[6px] rounded-full w-[105px] mr-[12px]'
                    onPress={() => {
                      setOpenComparePlans(false);
                      setPlanChangeModalVisible(true);
                    }}>
                    <CyDText className='text-[14px] font-extrabold mr-[2px]'>
                      {'Go'}
                    </CyDText>
                    <CyDFastImage
                      source={AppImages.PREMIUM_TEXT_GRADIENT}
                      className='w-[60px] h-[10px]'
                    />
                  </CyDTouchView>
                  <CyDTouchView
                    style={styles.buttonShadow}
                    className=' bg-n40 px-[10px] py-[6px] rounded-full'
                    onPress={() => {
                      setOpenComparePlans(true);
                      setPlanChangeModalVisible(true);
                    }}>
                    <CyDText className=' text-center text-[14px] font-semibold text-n100 mr-[2px]'>
                      {t('COMPARE_PLANS')}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>
          )}

          <CyDView className='mt-[16px]'>
            <CyDText className='text-n200 font-medium text-[12px]'>
              Account & Security
            </CyDText>
            <CyDView className='mt-[6px] rounded-[6px] bg-n0'>
              {accountSecurityOptions.map((option, index) => {
                const { image, title, action } = option;
                return (
                  <CyDTouchView
                    key={index}
                    onPress={action}
                    className='flex flex-row bg-n0 rounded-[8px] px-[16px] pt-[16px]'>
                    <CyDIcons
                      name={image}
                      size={20}
                      className='text-base400 mr-[8px] pb-[16px]'
                    />
                    {/* <CyDFastImage
                      source={image}
                      className={'h-[24px] w-[24px] mr-[8px] pb-[16px]'}
                      resizeMode={'contain'}
                    /> */}
                    <CyDView className='flex flex-row items-center justify-between flex-1 border-b-[0.5px] border-n30 pb-[16px]'>
                      <CyDText className='text-[16px] font-regular text-base400'>
                        {title}
                      </CyDText>
                      {!isAutoloadConfigured && title === 'Auto Load' ? (
                        <CyDText className='text-[14px] font-bold text-blue300'>
                          {'Enable'}
                        </CyDText>
                      ) : (
                        <CydMaterialDesignIcons
                          name='chevron-right'
                          size={20}
                          className='text-base400'
                        />
                      )}
                    </CyDView>
                  </CyDTouchView>
                );
              })}
            </CyDView>
          </CyDView>

          <CyDView className='mt-[16px]'>
            <CyDText className='text-n200 font-medium text-[12px]'>
              Notification & Personal Information
            </CyDText>
            <CyDView className='mt-[6px] rounded-[6px] bg-n0'>
              {notificationPersonalInformationOptions.map((option, index) => {
                const { image, title, action } = option;
                if (title === 'Telegram Bot') {
                  return (
                    <CyDView key={index} className=''>
                      <CyDTouchView
                        key={index}
                        onPress={() => {
                          if (!isTelegramLinked) {
                            void action();
                          }
                        }}
                        className='flex flex-row bg-n0 rounded-[8px] px-[16px] pt-[16px]'>
                        <CyDIcons
                          name={image}
                          size={24}
                          className='text-base400 mr-[8px] pb-[16px]'
                        />
                        <CyDView className='flex flex-row items-center justify-between flex-1 border-b-[0.5px] border-n30 pb-[16px]'>
                          <CyDText className='text-[16px] font-regular text-base400'>
                            {title}
                          </CyDText>
                          {!isTelegramLinked && (
                            <CyDText className='text-[14px] font-bold text-blue300'>
                              {'Setup'}
                            </CyDText>
                          )}
                        </CyDView>
                      </CyDTouchView>
                      {isTelegramLinked && (
                        <CyDView className='pl-[16px]'>
                          <CyDTouchView
                            onPress={() => {
                              navigation.navigate(
                                screenTitle.TELEGRAM_PIN_SETUP,
                              );
                            }}
                            className='flex flex-row bg-n0 rounded-[8px] px-[16px] pt-[16px]'>
                            <CyDView
                              className={'h-[24px] w-[24px] mr-[8px] pb-[16px]'}
                            />
                            <CyDView className='flex flex-row items-center justify-between flex-1 border-b-[0.5px] border-n30 pb-[16px]'>
                              <CyDText className='text-[16px] font-regular text-base400'>
                                {'Reset Telegram Pin'}
                              </CyDText>
                              <CydMaterialDesignIcons
                                name='chevron-right'
                                size={20}
                                className='text-base400'
                              />
                            </CyDView>
                          </CyDTouchView>
                          <CyDTouchView
                            onPress={() => {
                              void disconnectTelegram();
                            }}
                            className='flex flex-row bg-n0 rounded-[8px] px-[16px] pt-[16px]'>
                            <CyDView
                              className={'h-[24px] w-[24px] mr-[8px] pb-[16px]'}
                            />
                            <CyDView className='flex flex-row items-center justify-between flex-1 border-b-[0.5px] border-n30 pb-[16px]'>
                              <CyDText className='text-[16px] font-regular text-red400'>
                                {'Disconnect Telegram'}
                              </CyDText>
                            </CyDView>
                          </CyDTouchView>
                        </CyDView>
                      )}
                    </CyDView>
                  );
                }
                return (
                  <CyDTouchView
                    key={index}
                    onPress={action}
                    className='flex flex-row bg-n0 rounded-[8px] px-[16px] pt-[16px]'>
                    <CyDIcons
                      name={image}
                      size={24}
                      className='text-base400 mr-[8px] pb-[16px]'
                    />
                    <CyDView className='flex flex-row items-center justify-between flex-1 border-b-[0.5px] border-n30 pb-[16px]'>
                      <CyDText className='text-[16px] font-regular text-base400'>
                        {title}
                      </CyDText>
                      {!isAutoloadConfigured && title === 'Auto Load' ? (
                        <CyDText className='text-[14px] font-bold text-blue300'>
                          {'Enable'}
                        </CyDText>
                      ) : (
                        <CydMaterialDesignIcons
                          name='chevron-right'
                          size={20}
                          className='text-base400'
                        />
                      )}
                    </CyDView>
                  </CyDTouchView>
                );
              })}
            </CyDView>
          </CyDView>

          <CyDView className='mt-[16px] mb-[44px]'>
            <CyDText className='text-n200 font-medium text-[12px]'>
              Others
            </CyDText>
            <CyDView className='mt-[6px] rounded-[6px] bg-n0'>
              {othersOptions.map((option, index) => {
                const { image, title, action } = option;
                return (
                  <CyDTouchView
                    key={index}
                    onPress={action}
                    className='flex flex-row bg-n0 rounded-[8px] px-[16px] pt-[16px]'>
                    <CydMaterialDesignIcons
                      name={image}
                      size={20}
                      className='text-base400 mr-[8px] pb-[16px]'
                    />
                    <CyDView className='flex flex-row items-center justify-between flex-1 border-b-[0.5px] border-n30 pb-[16px]'>
                      <CyDText className='text-[16px] font-regular text-base400'>
                        {title}
                      </CyDText>
                      <CydMaterialDesignIcons
                        name='chevron-right'
                        size={20}
                        className='text-base400'
                      />
                    </CyDView>
                  </CyDTouchView>
                );
              })}
            </CyDView>
          </CyDView>
        </CyDScrollView>
      </CyDView>
    </>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
