import React, { useContext, useEffect, useMemo, useState } from 'react';
import { GlobalContextType } from '../../../constants/enum';
import { GlobalContext } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import AppImages from '../../../../assets/images/appImages';
import CyDModalLayout from '../../../components/v2/modal';
import {
  CyDImage,
  CydMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { StyleSheet } from 'react-native';
import useAxios from '../../../core/HttpRequest';
import { IAutoLoadConfig } from '../../../models/autoLoad.interface';
import Toast from 'react-native-toast-message';
import LottieView from 'lottie-react-native';
import useTransactionManager from '../../../hooks/useTransactionManager';
import { getChain } from '../../../core/util';
import {
  ChainConfigMapping,
  ChainNameMapping,
} from '../../../constants/server';
import { get } from 'lodash';
import useCardUtilities from '../../../hooks/useCardUtilities';
import clsx from 'clsx';

export default function AutoLoadOptionsModal({
  isModalVisible,
  setShowModal,
  onPressUpdateAutoLoad,
}: {
  isModalVisible: boolean;
  setShowModal: (arg1: boolean) => void;
  onPressUpdateAutoLoad: () => void;
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [autoLoadConfig, setAutoLoadConfig] = useState<IAutoLoadConfig>();
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const { getWithAuth, postWithAuth } = useAxios();
  const { revokeAutoLoad } = useTransactionManager();
  const { getWalletProfile } = useCardUtilities();

  useEffect(() => {
    if (isModalVisible && cardProfile.isAutoloadConfigured) {
      void getAutoLoadConfig();
    }
  }, [isModalVisible]);

  const getAutoLoadConfig = async () => {
    const response = await getWithAuth('/v1/cards/autoLoad');
    if (!response.isError) {
      setAutoLoadConfig(response.data);
    }
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const toggleAutoLoad = async () => {
    setIsToggling(true);
    const response = await postWithAuth('/v1/cards/autoLoad/toggle', {
      isPaused: !autoLoadConfig?.isPaused,
    });
    if (!response.isError) {
      setIsToggling(false);
      setShowModal(false);
      Toast.show({
        type: 'success',
        text2: `Auto load has been ${autoLoadConfig?.isPaused ? 'resumed' : 'paused'} successfully`,
        position: 'bottom',
      });
    } else {
      setIsToggling(false);
      Toast.show({
        type: 'error',
        text2: `Error while ${autoLoadConfig?.isPaused ? 'resuming' : 'pausing'} auto load`,
        position: 'top',
      });
    }
  };

  const cancelAutoLoad = async () => {
    setIsCancelling(true);
    if (autoLoadConfig) {
      const revokeResponse = await revokeAutoLoad({
        chain: getChain(autoLoadConfig.chain),
        granter: autoLoadConfig?.granterAddress,
        grantee: autoLoadConfig?.granteeAddress,
        contractAddress: autoLoadConfig?.assetId,
        chainDetails: get(
          ChainConfigMapping,
          get(ChainNameMapping, [autoLoadConfig?.chain]),
        ),
      });
      if (!revokeResponse.isError) {
        const response = await postWithAuth('/v1/cards/autoLoad/revoke', {});
        if (!response.isError) {
          await refreshProfile();
          setIsCancelling(false);
          setShowModal(false);
          Toast.show({
            type: 'success',
            text2: 'Auto load has been cancelled successfully',
            position: 'bottom',
          });
        } else {
          setIsCancelling(false);
          Toast.show({
            type: 'error',
            text2: 'Error while cancelling auto load',
            position: 'bottom',
          });
        }
      } else {
        setIsCancelling(false);
        Toast.show({
          type: 'error',
          text2: 'Error while cancelling auto load',
          position: 'bottom',
        });
      }
    }
  };

  const cardOptions = useMemo(() => {
    return [
      {
        title: 'Update Auto Load',
        description: 'Update auto load configuration',
        image: 'update',
        action: () => {
          onPressUpdateAutoLoad();
        },
      },
      {
        title: (autoLoadConfig?.isPaused ? 'Resume' : 'Pause') + ' Auto Load',
        description: 'Pause/Resume Auto load',
        image: autoLoadConfig?.isPaused ? 'play' : 'pause',
        action: () => {
          void toggleAutoLoad();
        },
      },
      {
        title: 'Cancel Auto Load',
        description: 'Permanently cancel auto load',
        image: 'cancel',
        action: () => {
          void cancelAutoLoad();
        },
      },
    ];
  }, [autoLoadConfig]);

  return (
    <CyDModalLayout
      isModalVisible={isModalVisible}
      setModalVisible={setShowModal}
      animationIn={'slideInUp'}
      animationOut={'slideOutDown'}
      animationInTiming={300}
      animationOutTiming={300}
      style={styles.modalLayout}>
      <CyDView className='bg-n20 mb-[6px] rounded-[16px] max-h-[80%] pb-[32px]'>
        <CyDView className='flex flex-row justify-between items-center rounded-t-[16px] bg-n0 px-[16px] pb-[16px] pt-[32px]'>
          <CyDText className='text-[16px] font-semibold font-manrope'>
            Auto Load
          </CyDText>
          <CyDTouchView onPress={() => setShowModal(false)}>
            <CydMaterialDesignIcons
              name={'close'}
              size={24}
              className='text-base400'
            />
          </CyDTouchView>
        </CyDView>
        {cardOptions.map((option, index) => {
          const { image, title, description, action } = option;
          return (
            <CyDTouchView
              key={index}
              onPress={action}
              className='flex flex-row justify-start items-center mt-[12px] py-[15px] bg-n0 rounded-[6px] mx-[12px]'>
              {(index === 1 && isToggling) || (index === 2 && isCancelling) ? (
                <CyDView className='relative w-[48px]'>
                  <LottieView
                    source={AppImages.LOADER_TRANSPARENT}
                    autoPlay
                    loop
                    style={styles.loaderStyle}
                  />
                </CyDView>
              ) : (
                <CydMaterialDesignIcons
                  name={image}
                  size={24}
                  className={clsx('text-base400 mx-[12px]', {
                    'text-red400': index === 2,
                  })}
                />
              )}

              <CyDView className='flex flex-col justify-between'>
                <CyDText className='text-[16px] font-medium text-base400'>
                  {title}
                </CyDText>
                <CyDText className='text-[12px] font-medium text-n50 flex-wrap'>
                  {description}
                </CyDText>
              </CyDView>
            </CyDTouchView>
          );
        })}
      </CyDView>
    </CyDModalLayout>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  loaderStyle: {
    height: 32,
    width: 32,
    left: -2,
  },
});
