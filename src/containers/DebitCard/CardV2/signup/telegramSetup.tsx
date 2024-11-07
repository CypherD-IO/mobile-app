import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { t } from 'i18next';
import { get } from 'lodash';
import LottieView from 'lottie-react-native';
import React, { useContext, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppImages from '../../../../../assets/images/appImages';
import CardProviderSwitch from '../../../../components/cardProviderSwitch';
import Button from '../../../../components/v2/button';
import { ButtonType, GlobalContextType } from '../../../../constants/enum';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import useAxios from '../../../../core/HttpRequest';
import { copyToClipboard } from '../../../../core/util';
import useCardUtilities from '../../../../hooks/useCardUtilities';
import {
  CyDImage,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../../styles/tailwindStyles';
import { showToast } from '../../../utilities/toastUtility';

interface RouteParams {
  showSetupLaterOption?: boolean;
  navigateTo?: string;
  enableBackButton?: boolean;
}

export default function TelegramSetup() {
  const { globalState, globalDispatch } = useContext(
    GlobalContext,
  ) as GlobalContextDef;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const {
    showSetupLaterOption = true,
    navigateTo,
    enableBackButton = false,
  } = route.params ?? {};
  const { getWithAuth } = useAxios();
  const insets = useSafeAreaInsets();
  const { getWalletProfile } = useCardUtilities();

  const [telegramConnectionId, setTelegramConnectionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);

  const refreshProfile = async () => {
    setIsLoading(true);
    const data = await getWalletProfile(globalState.token);
    const telegramChanged =
      get(data, ['isTelegramSetup'], false) &&
      get(data, ['cardNotification', 'isTelegramAllowed'], false);
    globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
    setIsLoading(false);
    setIsTelegramConnected(telegramChanged);
  };

  const getNewTelegramConnectionId = async () => {
    const { data, isError } = await getWithAuth('/v1/cards/tg-create');
    if (!isError) {
      setTelegramConnectionId(data);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      void getNewTelegramConnectionId();
      void refreshProfile();
    }, []),
  );

  const handleConnectToTelegram = async () => {
    try {
      const botCommand = `/link ${telegramConnectionId}`;
      await Linking.openURL(
        `tg://openmessage?user_id=CypherHQBot&text=${encodeURIComponent(botCommand)}`,
      );
    } catch (err) {
      showToast('Failed to open telegram', 'error');
      Sentry.captureException(err);
    }
  };

  return (
    <CyDView
      className='flex-1 flex flex-col justify-between bg-[#F1F0F5]'
      style={{ paddingTop: insets.top }}>
      <CyDView className='p-[16px] flex-1'>
        {/* remove the CardProviderSwitch after sunsetting PC */}
        <CyDView className='flex-row justify-center items-center'>
          <CardProviderSwitch />
        </CyDView>

        <CyDView className='flex-row items-center my-[12px]'>
          {enableBackButton && (
            <CyDTouchView
              className=' mr-[10px]'
              onPress={() => {
                navigation.goBack();
              }}>
              <CyDImage
                source={AppImages.BACK_ARROW_GRAY}
                className='w-[32px] h-[32px]'
              />
            </CyDTouchView>
          )}
          <CyDText className='text-[14px] font-normal font-manrope'>
            {t('SETUP_TELEGRAM_BOT')}
          </CyDText>
        </CyDView>
        <CyDText className='text-[28px] font-bold mb-[16px]'>
          {t('CONNECT_TO_TELEGRAM')}
        </CyDText>

        <CyDScrollView
          showsVerticalScrollIndicator={false}
          className='rounded-[6px]'>
          <CyDView className='flex-row bg-n0 border border-n30 rounded-[6px] p-[14px]'>
            <CyDView className='w-[10px] mx-[16px] flex-col items-center'>
              <CyDView className='bg-[#D9D9D9] h-[10px] w-[10px] rounded-full mt-[70px]' />
              <CyDView className='h-[100px] border border-[#B3B9C4] border-dashed' />
              <CyDView className='bg-[#D9D9D9] h-[10px] w-[10px] rounded-full' />
              <CyDView className='h-[160px] border border-[#B3B9C4] border-dashed' />
              <CyDView className='bg-[#D9D9D9] h-[10px] w-[10px] rounded-full' />
              <CyDView className='h-[100px] border border-[#B3B9C4] border-dashed' />
              <CyDView className='bg-[#D9D9D9] h-[10px] w-[10px] rounded-full' />
            </CyDView>
            <CyDView className=' w-[270px]'>
              <CyDView className='border border-[#F0EFF4] p-[12px] rounded-[8px]'>
                <CyDView className='flex-row items-center justify-center mb-[12px]'>
                  <CyDText className='text-center '>
                    Click the below button to connect
                  </CyDText>
                  <CyDImage
                    source={AppImages.RIGHT_ARROW_LONG}
                    className='w-[12px] h-[10px] mt-[4px] ml-[4px] rotate-90'
                  />
                </CyDView>
                <CyDTouchView
                  className={clsx(
                    'flex-row items-center justify-center bg-[#54A9EB] p-[12px] rounded-[12px]',
                    isTelegramConnected && 'opacity-50',
                  )}
                  onPress={() => {
                    void handleConnectToTelegram();
                  }}
                  disabled={isTelegramConnected}>
                  <CyDImage
                    source={AppImages.TELEGRAM_BLUE}
                    className='w-[24px] h-[24px] mr-[8px]'
                  />
                  <CyDText className='text-white font-bold text-[18px] font-manrope'>
                    {t('Connect to telegram')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>

              <CyDView className='border border-n30 rounded-[8px] p-[14px] bg-n0 mt-[16px]'>
                <CyDText className='flex-row items-center'>
                  <CyDText>Once you find the</CyDText>
                  <CyDImage
                    source={AppImages.CYPHER_TELEGRAM_BOT_LOGO}
                    className='w-[20px] h-[20px] mx-[4px]'
                    resizeMode='contain'
                  />
                  <CyDText>
                    Cypher bot on Telegram, you will find a start button to the
                    bottom of the chat.
                  </CyDText>
                </CyDText>
                <CyDView className='flex-row items-center mt-[12px]'>
                  <CyDText>{'Just press the button'}</CyDText>
                  <CyDView className='mx-[4px] bg-[#54A9EB] rounded-[6px] px-[8px] py-[2px] text-white'>
                    <CyDText className=' text-white text-[10px]'>
                      {'Send'}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>

              <CyDView className='border border-n30 rounded-[8px] p-[14px] bg-n0 mt-[16px]'>
                <CyDText className='flex-row items-center'>
                  After seeing the welcome message, your message box will be
                  automatically pre-filled with the link code
                </CyDText>
                <CyDTouchView
                  className='mx-[4px] bg-n30 border border-n50 rounded-[6px] px-[8px] py-[2px] text-white w-[120px] flex-row items-center mt-[12px]'
                  onPress={() => {
                    copyToClipboard(`/link ${telegramConnectionId}`);
                    showToast(t('Bot Command Copied'));
                  }}>
                  <CyDText className=' text-base400 text-[14px] font-bold'>
                    {'/link ' + telegramConnectionId}
                  </CyDText>
                  <CyDImage
                    source={AppImages.COPY_DARK}
                    className='w-[16px] h-[16px] ml-[6px]'
                  />
                </CyDTouchView>
                <CyDView className='flex-row items-center mt-[8px]'>
                  <CyDText className='text-[14px] '>Just press send</CyDText>
                  <CyDImage
                    source={AppImages.BACK_ARROW_GRAY}
                    className='rotate-90 h-[24px] w-[24px] ml-[4px]'
                  />
                </CyDView>
              </CyDView>

              <CyDText className='font-normal text-[14px] mt-[16px]'>
                🎉 Hurray! your are connected the cypher bot successfully{' '}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDScrollView>

        <CyDView className='bg-n0 p-[12px] rounded-[16px] flex-row items-center justify-between mt-[12px]'>
          <CyDView>
            <CyDText className='text-[14px] font-medium text-base100 font-manrope'>
              {t('CONNECTION_STATUS')}
            </CyDText>
            <CyDText className='text-black text-[18px] font-bold font-manrope'>
              {isTelegramConnected ? t('CONNECTED') : t('NOT_CONNECTED')}
            </CyDText>
          </CyDView>
          <CyDTouchView
            className='flex-row items-center p-[6px] rounded-[6px] bg-n30'
            onPress={() => {
              void refreshProfile();
            }}>
            {!isLoading && (
              <CyDImage
                source={AppImages.REFRESH_BROWSER}
                className='w-[18px] h-[18px]'
              />
            )}
            {isLoading && (
              <LottieView
                source={AppImages.LOADER_TRANSPARENT}
                autoPlay
                loop
                style={styles.lottie}
              />
            )}
            <CyDText className='font-manrope text-black ml-[4px] text-bold font-black text-[12px]'>
              {t('REFRESH')}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDView>

      <CyDView className='px-[16px] pb-[40px] bg-white rounded-t-[16px]'>
        <CyDView className='pt-[14px] flex flex-row w-full justify-between'>
          {showSetupLaterOption && (
            <Button
              type={ButtonType.SECONDARY}
              title={t('SETUP_LATER')}
              onPress={() => {
                if (navigateTo) {
                  navigation.navigate(navigateTo);
                }
              }}
              style='w-[48%]'
            />
          )}
          <Button
            title={t('CONTINUE')}
            onPress={() => {
              if (navigateTo) {
                navigation.navigate(navigateTo);
              }
            }}
            style={clsx('p-[3%]', showSetupLaterOption ? 'w-[48%]' : 'w-full')}
            disabled={!isTelegramConnected}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: 20,
  },
});
