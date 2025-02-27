import React, { useContext, useEffect, useState } from 'react';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
  CyDLottieView,
  CyDSafeAreaView,
} from '../../../styles/tailwindComponents';
import { t } from 'i18next';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
  CommonActions,
} from '@react-navigation/native';
import {
  CardType,
  CardStatus,
  CardProviders,
  GlobalContextType,
  ButtonType,
  CardControlTypes,
  NavigateToScreenOnOpen,
} from '../../../constants/enum';
import AppImages, {
  CYPHER_CARD_IMAGES,
} from '../../../../assets/images/appImages';
import { Card } from '../../../models/card.model';
import useCardUtilities from '../../../hooks/useCardUtilities';
import { GlobalContextDef, GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import { ICountry } from '../../../models/cardApplication.model';
import useAxios from '../../../core/HttpRequest';
import axios from 'axios';
import Button from '../../../components/v2/button';
import { get } from 'lodash';
import clsx from 'clsx';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { screenTitle } from '../../../constants';
import { SafeAreaView } from '../../../styles/viewStyle';

interface RouteParams {
  provider: CardProviders;
  card: Card;
}

// Create a simple checkbox component since the imported one isn't available
const SimpleCheckbox = ({ onChange, checked, label = '' }) => {
  return (
    <TouchableOpacity
      onPress={onChange}
      style={{ flexDirection: 'row', alignItems: 'center' }}>
      <CyDView
        className={clsx(
          'w-[20px] h-[20px] border-[1px] rounded-[4px] mr-[8px] flex items-center justify-center',
          {
            'bg-base400 border-base400': checked,
            'bg-transparent border-n200': !checked,
          },
        )}>
        {checked && (
          <CyDMaterialDesignIcons
            name='check'
            size={16}
            className='text-white'
          />
        )}
      </CyDView>
      {label && <CyDText>{label}</CyDText>}
    </TouchableOpacity>
  );
};

export default function DefaultLimitSetup(props: any) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<{ params: { state: RouteParams } }, 'params'>>();
  const routeParams = route?.params;
  const { provider, card } = routeParams.state;
  const { getWalletProfile } = useCardUtilities();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const { getWithAuth, patchWithAuth } = useAxios();
  const isFocused = useIsFocused();

  const [limits, setLimits] = useState<any>(null);
  const [domesticCountry, setDomesticCountry] = useState<ICountry | null>(null);
  const [acceptCheck, setAcceptCheck] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);

  // console.log('card in default limit setup : ', card);

  const isNavigatingToTelegram = React.useRef(false);

  useEffect(() => {
    // This will run whenever the screen comes into focus
    if (isFocused) {
      console.log('fetchlimits and refreshprofile called in isFocused');
      void fetchLimits();
      void refreshProfile();
    }
  }, [isFocused]);

  // Keep the initial data loading for first render
  useEffect(() => {
    console.log('fetchlimits and refreshprofile called in useEffect');
    void fetchLimits();
    void refreshProfile();
  }, []);

  useEffect(() => {
    // Only update the telegram connection status if we're currently focused
    // AND not in the middle of navigating to the Telegram setup screen
    if (isFocused && cardProfile) {
      if (!isNavigatingToTelegram.current) {
        console.log('CARD PROFILE update - normal flow');
        setIsTelegramConnected(
          get(cardProfile, ['cardNotification', 'isTelegramAllowed'], false),
        );
      } else {
        console.log('CARD PROFILE update - skipping during navigation');
      }
    }

    // Reset the navigation flag when we regain focus
    if (isFocused) {
      isNavigatingToTelegram.current = false;
    }
  }, [cardProfile, isFocused]);

  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //     // This will run when returning to DefaultLimitSetup
  //     console.log('DefaultLimitSetup focused');
  //     void refreshProfile();
  //   });

  //   return unsubscribe;
  // }, [navigation]);

  const fetchLimits = async () => {
    const response = await getWithAuth(
      `/v1/cards/${provider}/card/${card.cardId}/limits`,
    );
    console.log('response in fetchLimits : ', response);
    setLimits(response.data);
    await fetchCountriesList(response.data);
  };

  const fetchCountriesList = async (limitsValue = limits) => {
    const response = await axios.get(
      `https://public.cypherd.io/js/countryMaster.js?${String(new Date())}`,
    );
    // console.log('response in fetchCountriesList : ', response);
    console.log(
      'response in fetchCountriesList : ',
      get(limitsValue, 'cCode', ''),
    );
    if (response?.data) {
      const tempCountries = response.data;
      const matchingCountry = tempCountries.find(
        (country: ICountry) => country.Iso2 === get(limitsValue, 'cCode', ''),
      );
      console.log('matchingCountry : ', matchingCountry);
      if (matchingCountry) {
        setDomesticCountry(matchingCountry);
      }
    }
  };

  const refreshProfile = async () => {
    setIsProfileLoading(true);
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
    setIsProfileLoading(false);
  };

  const getCardImage = (card: Card) => {
    if (provider === CardProviders.REAP_CARD) {
      const cardImage = `${CYPHER_CARD_IMAGES}/${card.type}-${card.designId ?? ''}.png`;
      return {
        uri: cardImage,
      };
    } else {
      if (card.status === CardStatus.RC_UPGRADABLE) {
        return AppImages.RC_VIRTUAL;
      } else if (card.type === CardType.PHYSICAL) {
        return AppImages.PHYSICAL_CARD_MASTER;
      } else {
        return AppImages.VIRTUAL_CARD_MASTER;
      }
    }
  };

  const handleSetupUsageLimits = () => {
    navigation.navigate(screenTitle.EDIT_USAGE_LIMITS, {
      currentCardProvider: provider,
      card,
    });
  };

  const handleEditSpendControl = () => {
    navigation.navigate(screenTitle.CARD_CONTROLS_MENU, {
      currentCardProvider: provider,
      cardId: card.cardId,
      // initialOptionOpened: CARD_CONTROL_INITIAL_OPTION_OPENED.DOMESTIC,
    });
  };

  const handleSetupTelegram = () => {
    console.log('handleSetupTelegram called');
    // Set the flag before navigating
    isNavigatingToTelegram.current = true;
    navigation.navigate(screenTitle.TELEGRAM_SETUP, {
      showSetupLaterOption: false,
      state: { provider, card },
    });
  };

  const handleStartUsingCard = async () => {
    if (limits?.isDefaultSetting) {
      const response = await patchWithAuth(
        `/v1/cards/${provider}/card/${card.cardId}/limits`,
        {
          isDefaultSetting: false,
        },
      );

      if (!response.isError) {
        navigation.navigate(screenTitle.CARD_SCREEN, {
          cardProvider: provider,
        });
      }
    } else {
      navigation.navigate(screenTitle.CARD_SCREEN, {
        cardProvider: provider,
      });
    }
  };

  const handleChooseDomesticCountry = () => {
    navigation.navigate(screenTitle.DOMESTIC_CARD_CONTROLS, {
      cardControlType: CardControlTypes.DOMESTIC,
      currentCardProvider: provider,
      cardId: card.cardId,
      navigateToOnOpen: NavigateToScreenOnOpen.DOMESTIC_COUNTRY,
    });
  };

  return (
    <>
      <CyDSafeAreaView>
        <ScrollView>
          <CyDView className='bg-n40 pb-[126px]'>
            <CyDView className={'bg-n40 px-[24px] pb-[28px] pt-[24px]'}>
              <CyDText className={'text-[28px] font-bold'}>
                {t('LETS_SETUP_YOUR_CARD')}
              </CyDText>
              <CyDView className='flex flex-row justify-between mt-[24px]'>
                <CyDImage
                  source={getCardImage(card)}
                  className='w-[171px] h-[108px]'
                />
                <CyDView className='flex flex-col justify-center gap-y-[12px]'>
                  <CyDView className='flex flex-row items-center justify-center gap-x-[10px] bg-n0 rounded-[9px] px-[16px] py-[12px]'>
                    <CyDImage
                      source={AppImages.VERIFIED_BY_VISA_WHITE}
                      className='w-[50px] h-[16px]'
                    />
                    <CyDView className='flex flex-row items-center gap-x-[2px]'>
                      <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
                      <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
                      <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
                      <CyDView className='w-[4px] h-[4px] rounded-full bg-black' />
                    </CyDView>
                    <CyDText className='text-[14px] font-bold'>
                      {card.last4}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
              <CyDView className='flex flex-row items-center justify-center gap-x-[10px] bg-n0 rounded-[9px] px-[16px] py-[12px] mt-[18px]'>
                <CyDView className='flex-1 flex-row justify-between items-center mt-[4px]'>
                  <CyDText className='text-[12px] font-semibold text-borderColor'>
                    {t('DOMESTIC_COUNTRY')}
                  </CyDText>
                  <CyDTouchView
                    className={'flex flex-row items-center '}
                    onPress={handleChooseDomesticCountry}>
                    <CyDText className={'text-[14px]'}>
                      {domesticCountry?.unicode_flag}
                    </CyDText>
                    <CyDText className={'ml-[4px] font-semibold text-[14px]'}>
                      {domesticCountry?.name}
                    </CyDText>
                    <CyDMaterialDesignIcons
                      name='chevron-down'
                      size={20}
                      className='text-base400 mr-2'
                    />
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>
            <CyDView className='bg-n0 px-[24px] py-[24px]'>
              <CyDView className='flex flex-col mb-[32px]'>
                <CyDText className='text-[28px] font-medium'>
                  {t('DAILY_AND_MONTHLY_USAGE_LIMIT')}
                </CyDText>
                <CyDView className='flex flex-col mt-[24px]'>
                  <CyDText className='text-[14px] font-semibold text-n200'>
                    {t('DEFAULT_LIMIT')}
                  </CyDText>
                  <CyDView className='flex flex-row items-center justify-between gap-x-[12px] w-full mt-[8px]'>
                    <CyDView className='flex flex-col px-[16px] py-[12px] bg-n20 rounded-[9px] w-[48%]'>
                      <CyDText className='text-[12px] font-medium'>
                        {t('DAILY_LIMIT')}
                      </CyDText>
                      <CyDText className='text-semibold'>
                        ${get(limits, ['currentLimit', 'd'], 0)}
                      </CyDText>
                    </CyDView>

                    <CyDView className='flex flex-col px-[16px] py-[12px] bg-n20 rounded-[9px] w-[48%]'>
                      <CyDText className='text-[12px] font-medium'>
                        {t('MONTHLY_LIMIT')}
                      </CyDText>
                      <CyDText className='text-semibold'>
                        ${get(limits, ['currentLimit', 'm'], 0)}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                  <CyDText className='text-[14px] text-n200 mt-[12px]'>
                    {t('SETUP_LIMITS_DESC')}
                  </CyDText>
                  <CyDView className='mt-[24px]'>
                    <Button
                      title={t('SETUP_USAGE_LIMIT')}
                      onPress={handleSetupUsageLimits}
                      type={ButtonType.GREY_FILL}
                    />
                  </CyDView>
                </CyDView>
              </CyDView>

              <CyDView className='flex flex-col mb-[32px]'>
                <CyDText className='text-[28px] font-medium'>
                  {t('SETUP_SPEND_CONTROL')}
                </CyDText>
                <CyDView className='flex flex-col mt-[24px]'>
                  <CyDView className='flex flex-row mt-[8px]'>
                    <CyDView className='w-[40%]'></CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDText className='text-[12px] font-medium text-n200'>
                        {t('DOMESTIC')}
                      </CyDText>
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDText className='text-[12px] font-medium text-n200'>
                        {t('INTERNATIONAL')}
                      </CyDText>
                    </CyDView>
                  </CyDView>

                  <CyDView className='flex flex-row items-center mt-[12px]'>
                    <CyDView className='w-[40%]'>
                      <CyDText className='text-[14px] text-n200'>
                        {t('ONLINE_TRANSACTIONS')}
                      </CyDText>
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDMaterialDesignIcons
                        name='shield-check'
                        size={24}
                        className='text-green-600'
                      />
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDMaterialDesignIcons
                        name='shield-check'
                        size={24}
                        className='text-green-600'
                      />
                    </CyDView>
                  </CyDView>

                  <CyDView className='flex flex-row items-center mt-[12px]'>
                    <CyDView className='w-[40%]'>
                      <CyDText className='text-[14px] text-n200'>
                        {t('APPLE_PAY_GOOGLE_PAY')}
                      </CyDText>
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDMaterialDesignIcons
                        name='shield-check'
                        size={24}
                        className='text-green-600'
                      />
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDMaterialDesignIcons
                        name='shield-check'
                        size={24}
                        className='text-green-600'
                      />
                    </CyDView>
                  </CyDView>

                  <CyDView className='flex flex-row items-center mt-[12px]'>
                    <CyDView className='w-[40%]'>
                      <CyDText className='text-[14px] text-n200'>
                        {t('ATM_WITHDRAWALS')}
                      </CyDText>
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDMaterialDesignIcons
                        name='shield-check'
                        size={24}
                        className='text-green-600'
                      />
                    </CyDView>
                    <CyDView className='w-[30%] items-center'>
                      <CyDMaterialDesignIcons
                        name='shield-check'
                        size={24}
                        className='text-green-600'
                      />
                    </CyDView>
                  </CyDView>

                  <CyDView className='mt-[24px]'>
                    <Button
                      title={t('EDIT_SPEND_CONTROL')}
                      onPress={handleEditSpendControl}
                      type={ButtonType.GREY_FILL}
                    />
                  </CyDView>
                </CyDView>
              </CyDView>

              <CyDView className='flex flex-col'>
                <CyDText className='text-[28px] font-medium'>
                  {t('SETUP_TELEGRAM_BOT')}
                </CyDText>
                <CyDView className='flex flex-col mt-[24px]'>
                  <CyDText className='text-[14px] font-semibold text-n200'>
                    {t('CONNECTION_STATUS')}
                  </CyDText>
                  <CyDView className='flex flex-row justify-between items-center mt-[8px]'>
                    <CyDView className='flex flex-row items-center bg-n20 rounded-[8px] px-[16px] py-[12px]'>
                      <CyDView
                        className={clsx(
                          'w-[8px] h-[8px] rounded-full mr-[8px]',
                          {
                            'bg-green-600': isTelegramConnected,
                            'bg-red-500': !isTelegramConnected,
                          },
                        )}
                      />
                      <CyDText
                        className={clsx('text-[14px] font-semibold', {
                          'text-green-600': isTelegramConnected,
                          'text-red-500': !isTelegramConnected,
                        })}>
                        {isTelegramConnected
                          ? t('CONNECTED')
                          : t('NOT_CONNECTED')}
                      </CyDText>
                    </CyDView>
                    <CyDTouchView
                      className='flex flex-row items-center p-[6px] rounded-[6px] bg-n30'
                      onPress={() => {
                        void refreshProfile();
                      }}>
                      {!isProfileLoading ? (
                        <CyDMaterialDesignIcons
                          name='refresh'
                          size={18}
                          className='text-base400'
                        />
                      ) : (
                        <CyDLottieView
                          source={AppImages.LOADER_TRANSPARENT}
                          autoPlay
                          loop
                          style={styles.lottie}
                        />
                      )}
                      <CyDText className='text-base400 ml-[4px] font-bold text-[12px]'>
                        {t('REFRESH')}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                  <CyDText className='text-[14px] text-n200 mt-[12px]'>
                    {t('TELEGRAM_BOT_DESC')}
                  </CyDText>
                  <CyDView className='mt-[24px]'>
                    <Button
                      title={t('SETUP_TELEGRAM_BOT')}
                      onPress={handleSetupTelegram}
                      type={ButtonType.GREY_FILL}
                      disabled={isTelegramConnected}
                    />
                  </CyDView>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        </ScrollView>

        <CyDView className='bg-n0 p-[24px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] absolute bottom-0 left-0 right-0'>
          <CyDView className='flex flex-row items-center mb-[16px]'>
            <SimpleCheckbox
              onChange={() => setAcceptCheck(!acceptCheck)}
              checked={acceptCheck}
            />
            <CyDText className='text-[12px] ml-[8px]'>
              {t('CARD_SETTINGS_ACKNOWLEDGMENT')}
            </CyDText>
          </CyDView>
          <Button
            title={t('START_USING_CARD')}
            onPress={handleStartUsingCard}
            disabled={!acceptCheck}
          />
        </CyDView>
      </CyDSafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  lottie: {
    height: 18,
    width: 18,
  },
});
