import React, { useContext, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { t } from 'i18next';
import Button from '../../../components/v2/button';
import {
  ACCOUNT_STATUS,
  ButtonType,
  GlobalContextType,
} from '../../../constants/enum';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { get } from 'lodash';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import useCardUtilities from '../../../hooks/useCardUtilities';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { screenTitle } from '../../../constants';
import PageHeader from '../../../components/PageHeader';

interface RouteParams {
  currentCardProvider: string;
}

const loaderStyle = { height: 25, width: 25 };

export default function LockdownMode() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();
  const [loading, setLoading] = useState(false);
  const { currentCardProvider } = route.params;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile | undefined =
    globalContext?.globalState?.cardProfile;
  const { getWalletProfile } = useCardUtilities();
  const isFocused = useIsFocused();
  const [isLockdownModeEnabled, setIsLockdownModeEnabled] = useState(
    get(cardProfile, ['accountStatus'], ACCOUNT_STATUS.ACTIVE),
  );

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    setIsLockdownModeEnabled(
      get(data, ['accountStatus'], ACCOUNT_STATUS.ACTIVE),
    );
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const onRefresh = async () => {
    void refreshProfile();
  };

  useEffect(() => {
    if (isFocused) {
      void onRefresh();
      setLoading(false);
    }
  }, [isFocused]);

  const handleClickLockDownMode = async () => {
    const resp = await postWithAuth(
      `/v1/cards/${currentCardProvider}/account-status`,
      { status: ACCOUNT_STATUS.LOCKED },
    );
    void onRefresh();

    setLoading(false);
    if (!resp.isError) {
      showModal('state', {
        type: 'success',
        title: t('Lockdown mode enabled'),
        onSuccess: () => {
          hideModal();
          navigation.goBack();
        },
        onFailure: hideModal,
      });
    } else {
      showModal('state', {
        type: 'error',
        title: t('Failed to enable Lockdown mode. Contact Support.'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const verifyWithOTP = () => {
    navigation.navigate(screenTitle.LOCKDOWN_MODE_AUTH, {
      onSuccess: () => {
        showModal('state', {
          type: 'success',
          title: t('Lockdown mode disabled'),
          onSuccess: () => {
            hideModal();
            setLoading(false);
            void onRefresh();
          },
          onFailure: () => {
            hideModal();
            setLoading(false);
          },
        });
      },
      currentCardProvider,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });
  };

  return (
    <CyDSafeAreaView className='h-full bg-n0' edges={['top']}>
      <PageHeader title={t('LOCKDOWN_MODE')} navigation={navigation} />
      <CyDView className='flex-1 bg-n20 pt-[24px]'>
        <CyDView className='mt-[28px] rounded-[16px] bg-n0 items-center mx-[16px] py-[24px] px-[24px]'>
          <CyDView className='rounded-lg h-[112px] w-[112px] my-[24px] bg-n20 flex flex-row items-center justify-center'>
            <CyDMaterialDesignIcons
              name='hand-front-right'
              size={70}
              className='text-p100 self-center'
            />
          </CyDView>

          <CyDText className='text-[16px] text-center'>
            {t('LOCKDOWN_MODE_DESC_TEXT_1')}
          </CyDText>
          <CyDText className='text-[16px] mt-[16px] text-center'>
            {t('LOCKDOWN_MODE_DESC_TEXT_3')}
          </CyDText>
          <CyDText className='text-[12px] mt-[24px] mx-[4px] text-center text-yellow-600'>
            {`** ${t('LOCKDOWN_MODE_DESC_TEXT_2')}`}
          </CyDText>
          {isLockdownModeEnabled === ACCOUNT_STATUS.ACTIVE ? (
            <Button
              type={ButtonType.RED}
              title={t('TURN_ON_LOCKDOWN')}
              titleStyle='text-white text-[18px]'
              style='w-full mt-[16px] rounded-[12px]'
              loading={loading}
              loaderStyle={loaderStyle}
              onPress={() => {
                setLoading(true);
                showModal('state', {
                  type: 'warning',
                  title: t('ARE_YOU_SURE'),
                  description: t('ENABLING_LOCKDOWN_MODE_DESCRIPTION'),
                  onSuccess: () => {
                    hideModal();
                    void handleClickLockDownMode();
                  },
                  onFailure: hideModal,
                });
              }}
            />
          ) : (
            <Button
              type={ButtonType.PRIMARY}
              title={t('DISABLE_LOCKDOWN')}
              titleStyle='text-black text-[18px]'
              style='w-full mt-[16px] rounded-[12px]'
              loading={loading}
              loaderStyle={loaderStyle}
              onPress={() => {
                setLoading(true);
                void verifyWithOTP();
              }}
            />
          )}
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
