import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
import { IconNames } from '../../customFonts/type';
import AppImages from '../../../assets/images/appImages';
import { getMaskedAddress, HdWalletContext } from '../../core/util';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import GradientText from '../../components/gradientText';
import {
  ButtonType,
  CardProviders,
  CardStatus,
  CypherPlanId,
  GlobalContextType,
} from '../../constants/enum';
import { t } from 'i18next';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../core/analytics';
import SelectPlanModal from '../../components/selectPlanModal';
import Button from '../../components/v2/button';
import {
  NavigationProp,
  ParamListBase,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { screenTitle } from '../../constants';
import AutoLoadOptionsModal from '../DebitCard/bridgeCard/autoLoadOptions';
import TelegramOptionsModal from '../../components/telegramOptionsModal';
import { sendFirebaseEvent } from '../utilities/analyticsUtility';
import Intercom from '@intercom/intercom-react-native';
import { get } from 'lodash';
import useCardUtilities from '../../hooks/useCardUtilities';
import useAxios from '../../core/HttpRequest';
import clsx from 'clsx';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DeviceInfo from 'react-native-device-info';
import SpInAppUpdates from 'sp-react-native-in-app-updates';
import { isAndroid } from '../../misc/checkers';
import { Linking, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { getDeveloperMode, setDeveloperMode } from '../../core/asyncStorage';

const RenderOptions = ({
  isLoading,
  icon,
  title,
  onPress,
  apiDependent,
}: {
  isLoading: boolean;
  icon: IconNames;
  title: string;
  onPress: () => void;
  apiDependent: boolean;
}) => {
  return (
    <CyDView className='items-center justify-center w-[100px]'>
      <CyDTouchView
        className={clsx(
          'rounded-full border border-base80 p-[12px] items-center justify-center',
          {
            'animate-pulse': apiDependent && isLoading,
            'animate-none': !apiDependent,
          },
        )}
        onPress={onPress}
        disabled={apiDependent && isLoading}>
        <CyDIcons name={icon} size={24} className='text-base400' />
      </CyDTouchView>
      <CyDText className='text-[14px] font-normal text-center mt-[6px] tracking-[-0.2px]'>
        {title}
      </CyDText>
    </CyDView>
  );
};

const RenderSocialMedia = ({
  imageUri,
  onPress,
}: {
  imageUri: string;
  onPress: () => void;
}) => {
  return (
    <CyDTouchView onPress={onPress}>
      <CyDImage source={{ uri: imageUri }} className='w-[32px] h-[32px]' />
    </CyDTouchView>
  );
};

export default function OptionsHub() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { state: hdWallet } = hdWalletContext;
  const { globalState, globalDispatch } = useContext(
    GlobalContext,
  ) as GlobalContextDef;
  const cardProfile = globalState.cardProfile;
  const currentCardProvider = cardProfile?.provider;
  const card = cardProfile?.rc?.cards?.[0];
  const hasHiddenCard = cardProfile?.rc?.cards?.some(
    _card => _card.status === CardStatus.HIDDEN,
  );
  const cardId = card?.cardId;
  const planInfo = cardProfile?.planInfo;
  const isPremiumUser = planInfo?.planId === CypherPlanId.PRO_PLAN;
  const { cardProfileModal } = useCardUtilities();
  const { getWithAuth } = useAxios();
  const isFocused = useIsFocused();
  const inAppUpdates = new SpInAppUpdates(
    false, // isDebug
  );

  const address =
    hdWallet.wallet.ethereum.address ?? hdWallet.wallet.solana.address ?? '';

  const [planChangeModalVisible, setPlanChangeModalVisible] = useState(false);
  const [isAutoLoadOptionsvisible, setIsAutoLoadOptionsVisible] =
    useState<boolean>(false);
  const [isTelegramOptionsVisible, setIsTelegramOptionsVisible] =
    useState<boolean>(false);
  const [isAutoloadConfigured, setIsAutoloadConfigured] = useState<boolean>(
    get(cardProfile, ['isAutoloadConfigured'], false),
  );
  const [isTelegramLinked, setIsTelegramLinked] = useState<boolean>(
    get(cardProfile, ['isTelegramSetup'], false),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updateModal, setUpdateModal] = useState<boolean>(false);

  // Developer mode toggle state
  const [versionClickCount, setVersionClickCount] = useState<number>(0);
  const [isDeveloperMode, setIsDeveloperMode] = useState<boolean>(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // const premiumBenefits = [];

  const cypherCardOptions = [
    ...(currentCardProvider === CardProviders.REAP_CARD
      ? [
          {
            icon: 'withdraw1',
            apiDependent: true,
            title: t('WITHDRAW_CRYPTO'),
            onPress: () => {
              navigation.navigate(screenTitle.CRYPTO_WITHDRAWAL, {
                currentCardProvider,
                card,
              });
            },
          },
        ]
      : []),
    ...(!hasHiddenCard
      ? [
          {
            icon: 'loop-object',
            apiDependent: true,
            title: t('AUTO_LOAD'),
            onPress: () => {
              isAutoloadConfigured
                ? setIsAutoLoadOptionsVisible(true)
                : navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
            },
          },
        ]
      : []),
    {
      icon: 'connect-link',
      apiDependent: true,
      title: t('LINK_ANOTHER_WALLET'),
      onPress: () => {
        navigation.navigate(screenTitle.LINKED_WALLETS, {
          currentCardProvider,
        });
      },
    },
  ];

  const accountAndSecurityOptions = [
    {
      icon: 'profile',
      apiDependent: true,
      title: t('PERSONAL_INFO'),
      onPress: () => {
        navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN);
      },
    },
    {
      icon: 'card-wallet',
      title: t('MANAGE_WALLET'),
      apiDependent: false,
      onPress: () => {
        navigation.navigate(screenTitle.MANAGE_WALLET);
      },
    },
    ...(currentCardProvider === CardProviders.REAP_CARD
      ? [
          {
            icon: 'left-hand-pamp-filled',
            apiDependent: true,
            title: t('LOCKDOWN_MODE'),
            onPress: () => {
              navigation.navigate(screenTitle.LOCKDOWN_MODE, {
                currentCardProvider,
              });
            },
          },
        ]
      : []),
    ...(currentCardProvider === CardProviders.REAP_CARD && isPremiumUser
      ? [
          {
            icon: 'manage-premium',
            apiDependent: true,
            title: t('MANAGE_SUBSCRIPTION'),
            onPress: () => {
              navigation.navigate(screenTitle.MANAGE_SUBSCRIPTION);
            },
          },
        ]
      : []),
    {
      icon: 'settings',
      apiDependent: false,
      title: t('ADVANCED_SETTINGS'),
      onPress: () => {
        navigation.navigate(screenTitle.ADVANCED_SETTINGS);
      },
    },
  ];

  const notificationsAndIntegrationsOptions = [
    ...(currentCardProvider === CardProviders.REAP_CARD
      ? [
          {
            icon: 'telegram',
            apiDependent: true,
            title: isTelegramLinked
              ? t('TELEGRAM_BOT')
              : t('SETUP_TELEGRAM_BOT'),
            onPress: () => {
              if (isTelegramLinked) {
                setIsTelegramOptionsVisible(true);
              } else {
                navigation.navigate(screenTitle.TELEGRAM_SETUP, {
                  navigateTo: screenTitle.TELEGRAM_PIN_SETUP,
                  showSetupLaterOption: false,
                  enableBackButton: true,
                });
              }
            },
          },
        ]
      : []),
    {
      icon: 'card-success',
      apiDependent: true,
      title: t('CARD_NOTIFICATION'),
      onPress: () => {
        navigation.navigate(screenTitle.CARD_NOTIFICATION_SETTINGS, {
          currentCardProvider,
        });
      },
    },
    // {
    //   icon: 'bell',
    //   title: 'App Notification',
    //   onPress: () => {
    //     navigation.navigate(screenTitle.NOTIFICATION_SETTINGS);
    //   },
    // },
  ];

  const supportAndOtherOptions = [
    {
      icon: 'web-filled',
      title: t('BROWSER'),
      apiDependent: false,
      onPress: () => {
        logAnalyticsToFirebase(AnalyticEvent.BROWSER_CLICK, {});
        navigation.navigate(screenTitle.BROWSER);
      },
    },
    {
      icon: 'headphone',
      title: t('SUPPORT'),
      apiDependent: false,
      onPress: async () => {
        void Intercom.present();
        sendFirebaseEvent(hdWalletContext, 'support');
      },
    },
    {
      icon: 'documents',
      title: t('LEGAL'),
      apiDependent: false,
      onPress: () => {
        navigation.navigate(screenTitle.LEGAL_SCREEN);
      },
    },
    {
      icon: 'bookmark',
      title: t('FAQ'),
      apiDependent: false,
      onPress: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          title: 'Card FAQ',
          uri: 'https://cypherhq.io/card#faq',
        });
      },
    },
    {
      icon: 'verified',
      title: t('THEME'),
      apiDependent: false,
      onPress: () => {
        navigation.navigate(screenTitle.THEME);
      },
    },
  ];

  const socialMediaOptions = [
    {
      title: 'DISCORD',
      imageUri: 'https://public.cypherd.io/icons/discord.png',
      onPress: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          uri: 'https://cypherhq.io/discord',
          title: 'DISCORD',
        });
      },
    },
    {
      title: 'TWITTER',
      imageUri: 'https://public.cypherd.io/icons/twitter.png',
      onPress: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          uri: 'https://cypherhq.io/twitter',
          title: 'TWITTER',
        });
      },
    },
    {
      title: 'REDDIT',
      imageUri: 'https://public.cypherd.io/icons/reddit.png',
      onPress: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          uri: 'https://cypherhq.io/reddit',
          title: 'REDDIT',
        });
      },
    },
    {
      title: 'MEDIUM',
      imageUri: 'https://public.cypherd.io/icons/medium.png',
      onPress: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          uri: 'https://cypherhq.io/medium',
          title: 'MEDIUM',
        });
      },
    },
    {
      title: 'YOUTUBE',
      imageUri: 'https://public.cypherd.io/icons/youtube.png',
      onPress: () => {
        navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
          uri: 'https://cypherhq.io/youtube',
          title: 'YOUTUBE',
        });
      },
    },
  ];

  const refreshProfile = async () => {
    setIsLoading(true);
    const response = await getWithAuth('/v1/authentication/profile');
    setIsLoading(false);
    if (!response.isError) {
      const tempProfile = await cardProfileModal(response.data);
      setIsTelegramLinked(get(tempProfile, ['isTelegramSetup'], false));
      setIsAutoloadConfigured(
        get(tempProfile, ['isAutoloadConfigured'], false),
      );
      globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: tempProfile,
      });
    }
  };

  const onPressUpdateAutoLoad = () => {
    setIsAutoLoadOptionsVisible(false);
    navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
  };

  const onTelegramDisconnected = () => {
    // Refresh the profile to update telegram state
    void refreshProfile();
    void inAppUpdates.checkNeedsUpdate().then(result => {
      if (result.shouldUpdate) {
        setUpdateModal(true);
      }
    });
  };

  useEffect(() => {
    if (isFocused) {
      void refreshProfile();
    }
  }, [isFocused]);

  /**
   * Load developer mode state on component mount
   * Checks AsyncStorage for the current developer mode setting
   */
  useEffect(() => {
    const loadDeveloperMode = async () => {
      try {
        const devMode = await getDeveloperMode();
        setIsDeveloperMode(devMode);
      } catch (error) {
        // Log error to Sentry for debugging
        Sentry.captureException(error);
        console.error('Failed to load developer mode:', error);
      }
    };
    void loadDeveloperMode();
  }, []);

  /**
   * Handle version text click to toggle developer mode
   * Requires 5 consecutive clicks within a time window to toggle
   * Resets counter after 2 seconds of inactivity
   */
  const handleVersionClick = async (): Promise<void> => {
    try {
      // Clear any existing timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      const newCount = versionClickCount + 1;
      setVersionClickCount(newCount);

      // Check if we've reached the required number of clicks
      if (newCount >= 5) {
        const newDeveloperMode = !isDeveloperMode;

        // Update AsyncStorage with new developer mode state
        await setDeveloperMode(newDeveloperMode);
        setIsDeveloperMode(newDeveloperMode);

        // Reset click counter
        setVersionClickCount(0);

        // Show alert to user indicating the mode change
        Alert.alert(
          newDeveloperMode
            ? 'Developer Mode Enabled'
            : 'Developer Mode Disabled',
          newDeveloperMode
            ? 'Developer options are now available in Advanced Settings.'
            : 'Developer options have been disabled.',
          [{ text: 'OK' }],
        );
      } else {
        // Set a timeout to reset the click counter after 2 seconds
        // This ensures clicks must be consecutive within a reasonable timeframe
        clickTimeoutRef.current = setTimeout(() => {
          setVersionClickCount(0);
        }, 2000);
      }
    } catch (error) {
      // Handle any errors during toggle operation
      Sentry.captureException(error);
      console.error('Error toggling developer mode:', error);
      Alert.alert(
        'Error',
        'Failed to toggle developer mode. Please try again.',
      );
      setVersionClickCount(0);
    }
  };

  /**
   * Cleanup timeout on component unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <CyDSafeAreaView className='bg-base20' edges={['top']}>
      <CyDScrollView
        className='bg-base20 '
        contentContainerStyle={{ paddingBottom: insets.bottom }}>
        {planChangeModalVisible && (
          <SelectPlanModal
            isModalVisible={planChangeModalVisible}
            setIsModalVisible={setPlanChangeModalVisible}
            cardProvider={currentCardProvider}
            cardId={cardId}
          />
        )}

        {isAutoLoadOptionsvisible && (
          <AutoLoadOptionsModal
            isModalVisible={isAutoLoadOptionsvisible}
            setShowModal={setIsAutoLoadOptionsVisible}
            onPressUpdateAutoLoad={onPressUpdateAutoLoad}
          />
        )}

        {isTelegramOptionsVisible && (
          <TelegramOptionsModal
            isModalVisible={isTelegramOptionsVisible}
            setShowModal={setIsTelegramOptionsVisible}
            navigation={navigation}
            onTelegramDisconnected={onTelegramDisconnected}
          />
        )}

        <CyDView className='bg-base20 p-10'>
          <CyDImage
            source={AppImages.PROFILE_AVATAR}
            className='w-[145px] h-[145px] self-center'
          />
          <CyDText className='text-center mt-[24px] font-semibold text-[20px]'>
            {getMaskedAddress(address)}
          </CyDText>

          {isPremiumUser && (
            <GradientText
              textElement={
                <CyDText className='font-extrabold text-[14px] text-center'>
                  {'Premium Member'}
                </CyDText>
              }
              gradientColors={['#FA9703', '#F89408', '#F6510A']}
              locations={[0, 0.3, 0.6]}
            />
          )}

          <CyDView className='mt-[32px] flex flex-row items-center justify-around'>
            <CyDTouchView
              className='flex flex-col items-center justify-center'
              onPress={() => {
                navigation.navigate(screenTitle.MY_ADDRESS, {
                  indexValue: 0,
                });
              }}>
              <CyDView className='w-[54px] h-[54px] bg-base400 rounded-[12px] !bg-[#469AFA] flex items-center justify-center'>
                <CyDIcons name='address-book' size={30} color='white' />
              </CyDView>
              <CyDText className='text-[12px] font-semibold text-center mt-[6px]'>
                {t('ADDRESS_BOOK')}
              </CyDText>
            </CyDTouchView>

            <CyDTouchView
              className='flex flex-col items-center justify-center'
              onPress={() => {
                navigation.navigate(screenTitle.ACTIVITIES);
              }}>
              <CyDView className='w-[54px] h-[54px] bg-base400 rounded-[12px] !bg-[#FFB700] flex items-center justify-center'>
                <CyDIcons name='activity' size={30} color='white' />
              </CyDView>
              <CyDText className='text-[12px] font-semibold text-center mt-[6px]'>
                {t('ACTIVITIES')}
              </CyDText>
            </CyDTouchView>

            <CyDTouchView
              className='flex flex-col items-center justify-center'
              onPress={() => {
                navigation.navigate(screenTitle.WALLET_CONNECT);
              }}>
              <CyDView className='w-[54px] h-[54px] bg-base400 rounded-[12px] !bg-[#30C9C9] flex items-center justify-center'>
                <CyDIcons name='wallet-connect' size={30} color='white' />
              </CyDView>
              <CyDText className='text-[12px] font-semibold text-center mt-[6px]'>
                {t('WALLET_CONNECT_SMALL')}
              </CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
        <CyDView className='bg-base350 p-[16px] pb-[50px]'>
          {updateModal && (
            <CyDView className='flex-row justify-between items-center p-[16px] rounded-[8px] bg-n0'>
              <CyDText className='text-[14px] font-bold '>
                {t<string>('NEW_VERSION_AVAILABLE')}
              </CyDText>

              <CyDTouchView
                className='py-[4px] px-[6px] bg-blue20 rounded-[4px] '
                onPress={() => {
                  if (isAndroid()) {
                    void Linking.openURL(
                      'market://details?id=com.cypherd.androidwallet',
                    );
                  } else {
                    const link =
                      'itms-apps://apps.apple.com/app/cypherd-wallet/id1604120414';
                    Linking.canOpenURL(link).then(
                      () => {
                        void Linking.openURL(link);
                      },
                      err => Sentry.captureException(err),
                    );
                  }
                }}>
                <CyDText className='text-[14px] font-bold '>
                  {t<string>('UPDATE')}
                </CyDText>
              </CyDTouchView>
            </CyDView>
          )}

          {!isPremiumUser && (
            <CyDView className='bg-base20 p-6 rounded-[8px] border border-base200'>
              <CyDView className='flex flex-row items-center gap-x-[4px] justify-start'>
                <CyDText className='font-extrabold text-[20px]'>
                  {'Get'}
                </CyDText>
                <GradientText
                  textElement={
                    <CyDText className='font-extrabold text-[20px]'>
                      {'Premium'}
                    </CyDText>
                  }
                  gradientColors={['#FA9703', '#F89408', '#F6510A']}
                />
              </CyDView>
              <CyDView className='mt-[16px]'>
                <CyDView className='self-center'>
                  <CyDText className='font-medium text-[14px] text-center text-base200'>
                    {
                      'Save more on each transaction and get a free premium metal card'
                    }
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='mt-[16px] flex flex-row justify-between items-center mx-[16px]'>
                <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                  <CyDMaterialDesignIcons
                    name='check-bold'
                    size={18}
                    className='text-base400'
                  />
                  <CyDText className='font-semibold text-[12px]'>
                    {'Zero Forex Markup'}
                  </CyDText>
                </CyDView>
                <CyDView className='flex flex-row justify-center items-center gap-x-[4px]'>
                  <CyDMaterialDesignIcons
                    name='check-bold'
                    size={18}
                    className='text-base400'
                  />
                  <CyDText className='font-semibold text-[12px]'>
                    {'Zero USDC Load Fee'}
                  </CyDText>
                </CyDView>
              </CyDView>

              <Button
                title={'Explore Premium'}
                type={ButtonType.DARK}
                onPress={() => {
                  setPlanChangeModalVisible(true);
                  void logAnalyticsToFirebase(
                    AnalyticEvent.EXPLORE_PREMIUM_CARD_PAGE_CTA,
                  );
                }}
                style='h-[42px] py-[8px] px-[12px] rounded-[4px] mt-[16px] bg-black'
                titleStyle='text-[14px] text-white font-semibold'
              />
            </CyDView>
          )}

          {/* {isPremiumUser && (
            <CyDView className='mt-[44px]'>
              <CyDText className='text-[12px] text-n200 tracking-[2px]'>
                {'PREMIUM BENEFITS'}
              </CyDText>

              <CyDView className='mt-[16px] flex flex-wrap flex-row items-start gap-x-[24px] gap-y-[16px]'>
                {premiumBenefits.map(benefit => (
                  <RenderOptions
                    isLoading={isLoading}
                    apiDependent={benefit.apiDependent}
                    key={benefit.title}
                    icon={benefit.icon as IconNames}
                    title={benefit.title}
                    onPress={benefit.onPress}
                  />
                ))}
              </CyDView>
            </CyDView>
          )} */}

          <CyDView className='mt-[44px]'>
            <CyDText className='text-[12px] text-n200 tracking-[2px]'>
              {'CYPHER CARD'}
            </CyDText>

            <CyDView className='mt-[16px] flex flex-wrap flex-row items-start gap-x-[24px] gap-y-[16px]'>
              {cypherCardOptions.map(benefit => (
                <RenderOptions
                  isLoading={isLoading}
                  apiDependent={benefit.apiDependent}
                  key={benefit.title}
                  icon={benefit.icon as IconNames}
                  title={benefit.title}
                  onPress={benefit.onPress}
                />
              ))}
            </CyDView>
          </CyDView>

          <CyDView className='mt-[44px]'>
            <CyDText className='text-[12px] text-n200 tracking-[2px]'>
              {'ACCOUNT & SECURITY'}
            </CyDText>

            <CyDView className='mt-[16px] flex flex-wrap flex-row items-start gap-x-[24px] gap-y-[16px]'>
              {accountAndSecurityOptions.map(benefit => (
                <RenderOptions
                  isLoading={isLoading}
                  apiDependent={benefit.apiDependent}
                  key={benefit.title}
                  icon={benefit.icon as IconNames}
                  title={benefit.title}
                  onPress={benefit.onPress}
                />
              ))}
            </CyDView>
          </CyDView>

          <CyDView className='mt-[44px]'>
            <CyDText className='text-[12px] text-n200 tracking-[2px]'>
              {'NOTIFICATIONS & INTEGRATIONS'}
            </CyDText>

            <CyDView className='mt-[16px] flex flex-wrap flex-row items-start gap-x-[24px] gap-y-[24px]'>
              {notificationsAndIntegrationsOptions.map(benefit => (
                <RenderOptions
                  isLoading={isLoading}
                  key={benefit.title}
                  icon={benefit.icon as IconNames}
                  title={benefit.title}
                  onPress={benefit.onPress}
                  apiDependent={benefit.apiDependent}
                />
              ))}
            </CyDView>
          </CyDView>

          <CyDView className='mt-[44px]'>
            <CyDText className='text-[12px] text-n200 tracking-[2px]'>
              {'SUPPORT & OTHER'}
            </CyDText>

            <CyDView className='mt-[16px] flex flex-wrap flex-row items-start gap-x-[24px] gap-y-[24px]'>
              {supportAndOtherOptions.map(benefit => (
                <RenderOptions
                  isLoading={true}
                  key={benefit.title}
                  icon={benefit.icon as IconNames}
                  title={benefit.title}
                  onPress={benefit.onPress}
                  apiDependent={benefit.apiDependent}
                />
              ))}
            </CyDView>
          </CyDView>

          <CyDView className='mt-[24px] pt-[24px]'>
            <CyDView className='flex flex-row gap-x-[12px] items-center'>
              <CyDView className='flex-1 bg-base200 h-[0.5px]' />
              <CyDTouchView
                onPress={() => {
                  void handleVersionClick();
                }}>
                <CyDText className='text-[10px] font-regular text-base300'>
                  {t<string>('VERSION')} {DeviceInfo.getVersion()}
                  {isDeveloperMode && ' 🔧'}
                </CyDText>
              </CyDTouchView>
              <CyDView className='flex-1 bg-base200 h-[0.5px]' />
            </CyDView>
            <CyDView className='flex flex-row items-center justify-center gap-x-[24px] mt-[24px]'>
              {socialMediaOptions.map(benefit => (
                <RenderSocialMedia
                  key={benefit.title}
                  imageUri={benefit.imageUri}
                  onPress={benefit.onPress}
                />
              ))}
            </CyDView>
          </CyDView>
        </CyDView>
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
