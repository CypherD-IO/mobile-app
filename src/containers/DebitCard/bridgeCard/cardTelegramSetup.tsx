import React, { useContext, useEffect, useState } from 'react';
import { t } from 'i18next';
import AppImages from '../../../../assets/images/appImages';
import { CardProviders, GlobalContextType } from '../../../constants/enum';
import { copyToClipboard } from '../../../core/util';
import {
  CyDView,
  CyDTouchView,
  CyDImage,
  CyDText,
} from '../../../styles/tailwindStyles';
import { showToast } from '../../utilities/toastUtility';
import { get } from 'lodash';
import useAxios from '../../../core/HttpRequest';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import Button from '../../../components/v2/button';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import useCardUtilities from '../../../hooks/useCardUtilities';

export default function TelegramSetupSettings(props: {
  route: {
    params: {
      currentCardProvider: CardProviders;
      card: { cardId: string; status: string; type: string };
    };
  };
  navigation: any;
}) {
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile = globalContext.globalState.cardProfile;
  const { getWithAuth } = useAxios();
  const [telegramConnectionId, setTelegramConnectionId] = useState('');
  const [currentNotificationOption, setCurrentNotificationOption] = useState({
    email: get(cardProfile, ['cardNotification', 'isEmailAllowed'], true),
    sms: get(cardProfile, ['cardNotification', 'isSmsAllowed'], true),
    fcm: get(cardProfile, ['cardNotification', 'isFcmAllowed'], true),
    telegram: get(
      cardProfile,
      ['cardNotification', 'isTelegramAllowed'],
      false,
    ),
  });
  const [isLoading, setIsLoading] = useState(false);
  const { getWalletProfile } = useCardUtilities();

  const closeAndRefreshPortfolio = async () => {
    setIsLoading(true);
    await refreshProfile();
    setIsLoading(false);
  };

  useEffect(() => {
    setCurrentNotificationOption({
      email: get(cardProfile, ['cardNotification', 'isEmailAllowed'], true),
      sms: get(cardProfile, ['cardNotification', 'isSmsAllowed'], true),
      fcm: get(cardProfile, ['cardNotification', 'isFcmAllowed'], true),
      telegram: get(
        cardProfile,
        ['cardNotification', 'isTelegramAllowed'],
        false,
      ),
    });
  }, [globalContext]);

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    const telegramChanged = get(
      data,
      ['cardNotification', 'isTelegramAllowed'],
      false,
    );
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
    if (!telegramChanged) {
      Toast.show({
        text1: 'Have you completed all the steps?',
        text2: 'Pasted the command? Wait and click after confirmation.',
        type: 'error',
      });
    } else {
      showToast(t('Successfully Connected'));
      props.navigation.goBack();
    }
  };

  useEffect(() => {
    const getNewTelegramConnectionId = async () => {
      const { data, isError } = await getWithAuth('/v1/cards/tg-create');
      if (!isError) {
        setTelegramConnectionId(data);
      }
    };
    void getNewTelegramConnectionId();
  }, [currentNotificationOption.telegram]);

  return (
    <CyDView className='h-full bg-white px-[22px] pt-[32px] flex flex-row'>
      <CyDView className='flex flex-col justify-start items-center'>
        <CyDView className='h-[14px] w-[14px] rounded-[20px] border-[1px] border-inputBorderColor' />
        <CyDView className='h-[74px] w-[1px] border-[0.5px] border-inputBorderColor' />
        <CyDView className='h-[14px] w-[14px] rounded-[20px] border-[1px] border-inputBorderColor' />
        <CyDView className='h-[200px] w-[1px] border-[0.5px] border-inputBorderColor' />
        <CyDView className='h-[14px] w-[14px] rounded-[20px] border-[1px] border-inputBorderColor' />
      </CyDView>
      <CyDView className='flex flex-col'>
        <CyDView className='mx-[8px] rounded-[5px] px-[12px]'>
          <CyDText className='font-extrabold text-[16px]'>
            Step1: Connect
          </CyDText>
          <CyDText
            className='mt-[2px]'
            onPress={() => {
              void Linking.openURL('https://t.me/CypherHQBot');
            }}>
            Connect to{'  '}
            <CyDText className='text-blue-600 underline px-[6px]'>
              CypherHQ Bot{' '}
              <CyDImage
                source={AppImages.BROWSER_REDIRECT}
                className='h-[12px] w-[12px]'
                resizeMode='contain'
              />
            </CyDText>
            {'  '}
            using the telegram account where you want to receive notifications
          </CyDText>
        </CyDView>

        <CyDView className='mx-[8px] rounded-[5px] px-[12px] mt-[22px]'>
          <CyDText className='font-extrabold text-[16px]'>Step2: Link</CyDText>
          <CyDText className='mt-[2px]'>
            Click on Start (if visible), Copy and paste the below bot command to
            begin receiving notifications
          </CyDText>
        </CyDView>

        <CyDTouchView
          className='flex flex-col justify-center items-center mt-[26px] mx-[54px] py-[12px] border-[1px] rounded-[6px] border-inputBorderColor'
          onPress={() => {
            copyToClipboard(`/link ${telegramConnectionId}`);
            showToast(t('Bot Command Copied'));
          }}>
          <CyDText className='text-[26px] font-bold text-mandarin'>
            {t<string>(`/link ${telegramConnectionId}`)}
          </CyDText>
          <CyDView className='flex flex-row items-start'>
            <CyDText>Copy</CyDText>
            <CyDImage
              source={AppImages.COPY}
              className={'w-[12px] h-[16px] mt-[3px] ml-[6px]'}
              resizeMode='contain'
            />
          </CyDView>
        </CyDTouchView>

        <CyDView className='mx-[8px] rounded-[5px] px-[12px] mt-[26px]'>
          <CyDText className='font-extrabold text-[16px]'>
            Step3: Confirm
          </CyDText>
          <CyDText className='mt-[2px]'>
            {`Click on 'Verify' after you have got the confirmation!`}
          </CyDText>
        </CyDView>

        <CyDView className='mt-[22px]'>
          <Button
            title={t('VERIFY')}
            loading={isLoading}
            onPress={() => {
              void closeAndRefreshPortfolio();
            }}
            style='h-[54px]'
            isPrivateKeyDependent={true}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
