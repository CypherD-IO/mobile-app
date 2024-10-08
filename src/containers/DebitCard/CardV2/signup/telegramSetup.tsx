import React, { useContext, useState } from 'react';
import { t } from 'i18next';
import { Linking, StyleSheet } from 'react-native';
import AppImages from '../../../../../assets/images/appImages';
import {
  CyDView,
  CyDTouchView,
  CyDImage,
  CyDText,
  CyDFastImage,
} from '../../../../styles/tailwindStyles';
import Button from '../../../../components/v2/button';
import { showToast } from '../../../utilities/toastUtility';
import {
  GlobalContext,
  GlobalContextDef,
} from '../../../../core/globalContext';
import useAxios from '../../../../core/HttpRequest';
import { copyToClipboard } from '../../../../core/util';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { screenTitle } from '../../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ButtonType, GlobalContextType } from '../../../../constants/enum';
import { get } from 'lodash';
import useCardUtilities from '../../../../hooks/useCardUtilities';
import LottieView from 'lottie-react-native';
import clsx from 'clsx';
import CardProviderSwitch from '../../../../components/cardProviderSwitch';

export default function TelegramSetup() {
  const { globalState, globalDispatch } = useContext(
    GlobalContext,
  ) as GlobalContextDef;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { getWithAuth } = useAxios();
  const insets = useSafeAreaInsets();
  const { getWalletProfile } = useCardUtilities();

  const [telegramConnectionId, setTelegramConnectionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);

  const refreshProfile = async () => {
    setIsLoading(true);
    const data = await getWalletProfile(globalState.token);
    const telegramChanged = get(data, ['isTelegramSetup'], false);
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
      copyToClipboard(botCommand);
      showToast(t('Bot Command Copied'));
      await Linking.openURL('https://t.me/CypherHQBot');
    } catch (err) {
      console.error('Failed to open Telegram:', err);
      Sentry.captureException(err);
    }
  };

  return (
    <CyDView
      className='flex-1 flex flex-col justify-between bg-[#F1F0F5]'
      style={{ paddingTop: insets.top }}>
      <CyDView className='p-[16px]'>
        {/* remove the CardProviderSwitch after sunsetting PC */}
        <CyDView className='flex-row justify-between items-center'>
          <CyDTouchView
            className=''
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: screenTitle.PORTFOLIO }],
              });
            }}>
            <CyDFastImage
              className={'w-[32px] h-[32px]'}
              resizeMode='cover'
              source={AppImages.BACK_ARROW_GRAY}
            />
          </CyDTouchView>
          <CardProviderSwitch />
          <CyDView />
        </CyDView>

        <CyDText className='text-[28px] font-bold mt-[12px] mb-[16px] font-manrope'>
          {t('SETUP_TELEGRAM')}
        </CyDText>

        <CyDView className='bg-white p-[12px] rounded-[16px]'>
          <CyDView className='flex-row items-start'>
            <CyDImage
              source={AppImages.INFO_CIRCLE}
              className='w-[24px] h-[24px] mr-[8px]'
            />
            <CyDText className='font-medium text-[12px] text-black w-[90%]'>
              {t('TELEGRAM_DESCRIPTION')}
            </CyDText>
          </CyDView>
        </CyDView>

        <CyDTouchView
          className={clsx(
            'flex-row items-center justify-center bg-[#54A9EB] p-[12px] rounded-[8px] mt-[24px]',
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

        <CyDView className='bg-white p-[12px] rounded-[16px] flex-row items-center justify-between mt-[24px] '>
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
        {/* <CyDText className='mt-[14px] text-[12px] font-bold font-manrope'>
          {'Verify Telegram'}
        </CyDText> */}
        <CyDView className='pt-[14px] flex flex-row w-full justify-between'>
          <Button
            type={ButtonType.SECONDARY}
            title={t('SETUP_LATER')}
            onPress={() => {
              navigation.navigate(screenTitle.KYC_VERIFICATION);
            }}
            style='w-[48%]'
          />
          <Button
            title={t('CONTINUE')}
            onPress={() => {
              navigation.navigate(screenTitle.KYC_VERIFICATION);
            }}
            style='p-[3%] w-[48%]'
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
