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
  CyDFastImage,
} from '../../../styles/tailwindStyles';
import { showToast } from '../../utilities/toastUtility';
import { get } from 'lodash';
import useAxios from '../../../core/HttpRequest';
import { getWalletProfile } from '../../../core/card';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import Button from '../../../components/v2/button';
import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';

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
    <CyDView className='h-full bg-white p-[30px] flex flex-row'>
      <CyDFastImage
        className='h-[247px] w-[10px] mr-3 mt-[54px]'
        source={AppImages.TELEGRAM_SETUP_STATUSBAR}
      />
      <CyDView className='p-[15px] flex flex-col'>
        <CyDView className='border-[1px] border-cardBgTo m-[8px] rounded-[5px] p-[12px]'>
          <CyDText className='text-[15px] font-nunito text-primaryTextColor'>
            {t<string>(
              `Step 1: Connect\nConnect to CypherHQ bot, using the telegram account where you want to receive notifications,`,
            )}
          </CyDText>
          <CyDText
            className='text-blue-600 underline cursor-pointer text-[15px]'
            onPress={() => {
              void Linking.openURL('https://t.me/CypherHQBot');
            }}>
            CypherHQBot{' '}
          </CyDText>
          <CyDText className='text-[15px] font-nunito text-primaryTextColor'>
            {t<string>(
              `\nStep 2: Link\nAfter clicking on Start (if visible), Copy and paste the following bot command below to begin receiving notifications.\n\nStep 3: Confirm\nClick on 'Proceed' after you have got the confirmation!`,
            )}
          </CyDText>
        </CyDView>

        <CyDText className='ml-[8px] text-primaryText text-[10px]'>
          Bot Command
        </CyDText>
        <CyDView className='border-[1px] border-cardBgTo m-[8px] rounded-[5px] p-[6px]'>
          <CyDTouchView
            className='text-[15x] font-nunito text-primaryTextColor justify-between flex flex-row'
            onPress={() => {
              copyToClipboard(`/link ${telegramConnectionId}`);
              showToast(t('Bot Command Copied'));
            }}>
            <CyDText className='text-center font-nunito text-[15px] font-bold mt-[3px]'>
              {t<string>(`/link ${telegramConnectionId}`)}
            </CyDText>
            <CyDImage
              source={AppImages.COPY}
              className={'w-[16px] h-[18px] mt-[3px]'}
            />
          </CyDTouchView>
        </CyDView>
        <CyDView className='pt-[10px]'>
          <Button
            title={t('Proceed')}
            loading={isLoading}
            onPress={() => {
              void closeAndRefreshPortfolio();
            }}
            style='h-[55px] px-[55px]'
            isPrivateKeyDependent={true}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
