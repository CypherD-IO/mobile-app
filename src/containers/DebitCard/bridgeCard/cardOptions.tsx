import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GlobalContext } from '../../../core/globalContext';
import { CyDImage, CyDSwitch, CyDText, CyDTouchView, CyDView } from '../../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { getWalletProfile } from '../../../core/card';
import { CardProviders, GlobalContextType } from '../../../constants/enum';
import * as Sentry from '@sentry/react-native';
import useAxios from '../../../core/HttpRequest';
import { screenTitle } from '../../../constants';

export default function BridgeCardOptionsScreen (props: {
  navigation: any
  route: {
    params: {
      onSuccess: (data: any, provider: CardProviders) => {}
      currentCardProvider: CardProviders
      card: { cardId: string, status: string, type: string }
    }
  }
}) {
  const { route, navigation } = props;
  const { card, currentCardProvider, onSuccess } = route.params;
  const { cardId, status } = card;
  const [isCardBlocked, setIsCardBlocked] = useState(status === 'inactive');
  const globalContext = useContext<any>(GlobalContext);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const { patchWithAuth } = useAxios();

  const onCardStatusChange = async (blockCard: boolean) => {
    setIsStatusLoading(true);
    const url = `/v1/cards/${currentCardProvider}/card/${cardId}/status`;
    const payload = {
      status: blockCard ? 'inactive' : 'active'
    };

    try {
      const response = await patchWithAuth(url, payload);
      if (!response.isError) {
        setIsStatusLoading(false);
        setIsCardBlocked(blockCard);
        void refreshProfile();
        showModal('state', { type: 'success', title: t('CHANGE_CARD_STATUS_SUCCESS'), description: `Successfully ${blockCard ? 'blocked' : 'unblocked'} your card!`, onSuccess: hideModal, onFailure: hideModal });
      } else {
        showModal('state', { type: 'error', title: t('CHANGE_CARD_STATUS_FAIL'), description: t('UNABLE_TO_CHANGE_CARD_STATUE'), onSuccess: hideModal, onFailure: hideModal });
      }
    } catch (error) {
      Sentry.captureException(error);
      setIsStatusLoading(false);
      showModal('state', { type: 'error', title: t('CHANGE_CARD_STATUS_FAIL'), description: t('UNABLE_TO_CHANGE_CARD_STATUE'), onSuccess: hideModal, onFailure: hideModal });
    };
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({ type: GlobalContextType.CARD_PROFILE, cardProfile: data });
  };

  return (
    <CyDView className='h-full bg-white pt-[30px]'>
      <CyDView className='flex flex-row justify-between align-center mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
        <CyDView>
          <CyDText className='text-[18px] font-bold'>
            {t<string>('CARD_STATUS')}
          </CyDText>
        </CyDView>
        {
          isStatusLoading
            ? <LottieView style={styles.loader} autoPlay loop source={AppImages.LOADER_TRANSPARENT}/>
            : <CyDSwitch
                onValueChange={ () => { void onCardStatusChange(!isCardBlocked); }}
                value={!isCardBlocked}
              />
        }
      </CyDView>
      { !isCardBlocked && card.type === 'physical' &&
      <CyDTouchView onPress={() => navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, { onSuccess, currentCardProvider, card })} className='flex flex-row justify-between align-center mx-[20px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
          <CyDText className='text-[18px] font-bold'>
            {t<string>('SET_NEW_PIN')}
          </CyDText>
          <CyDImage source={AppImages.OPTIONS_ARROW} className={'w-[15%] h-[18px]'} resizeMode={'contain'} />
      </CyDTouchView>}
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    alignSelf: 'center',
    left: 75,
    top: -3
  }
});
