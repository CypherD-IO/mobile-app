import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GlobalContext } from '../../../core/globalContext';
import axios from '../../../core/Http';
import { CyDSwitch, CyDText, CyDView } from '../../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { getWalletProfile } from '../../../core/card';
import { GlobalContextType } from '../../../constants/enum';
import * as Sentry from '@sentry/react-native';
import { hostWorker } from '../../../global';

export default function BridgeCardOptionsScreen ({ route }) {
  const { cardId, status } = route.params;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const [isCardBlocked, setIsCardBlocked] = useState(status === 'inactive');
  const globalContext = useContext<any>(GlobalContext);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();

  const onCardStatusChange = async (blockCard: boolean) => {
    setIsStatusLoading(true);
    const url = `${ARCH_HOST}/v1/cards/${cardId}/status`;
    const headers = {
      headers: {
        Authorization: `Bearer ${String(globalContext.globalState.token)}`
      }
    };
    const body = {
      status: blockCard ? 'inactive' : 'active'
    };

    try {
      await axios.patch(url, body, headers);
      setIsStatusLoading(false);
      setIsCardBlocked(blockCard);
      void refreshProfile();
    } catch (error) {
      Sentry.captureException(error);
      setIsStatusLoading(false);
      showModal('state', { type: 'error', title: '', description: t('UNABLE_TO_CHANGE_CARD_STATUE'), onSuccess: hideModal, onFailure: hideModal });
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
      <CyDText></CyDText>
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
