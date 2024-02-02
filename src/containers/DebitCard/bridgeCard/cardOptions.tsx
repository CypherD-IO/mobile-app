import { t } from 'i18next';
import React, { useContext, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GlobalContext } from '../../../core/globalContext';
import {
  CyDImage,
  CyDSwitch,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { getWalletProfile } from '../../../core/card';
import {
  CardDetails,
  CardProviders,
  CardStatus,
  GlobalContextType,
} from '../../../constants/enum';
import * as Sentry from '@sentry/react-native';
import useAxios from '../../../core/HttpRequest';
import { screenTitle } from '../../../constants';
import { CardProfile } from '../../../models/cardProfile.model';

export default function BridgeCardOptionsScreen(props: {
  navigation: any;
  route: {
    params: {
      currentCardProvider: CardProviders;
      card: { cardId: string; status: string; type: string };
    };
  };
}) {
  const { route, navigation } = props;
  const { card, currentCardProvider } = route.params;
  const { cardId, status } = card;
  const [isCardBlocked, setIsCardBlocked] = useState(status === 'inactive');
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const { patchWithAuth } = useAxios();
  const [cardUpdateToStatus, setCardUpdateToStatus] = useState(
    card.status === CardStatus.ACTIVE ? 'lock' : 'unlock',
  );

  const onCardStatusChange = async (blockCard: boolean) => {
    hideModal();
    const url = `/v1/cards/${currentCardProvider}/card/${cardId}/status`;
    const payload = {
      status: blockCard ? 'inactive' : 'active',
    };

    try {
      const response = await patchWithAuth(url, payload);
      if (!response.isError) {
        setIsStatusLoading(false);
        void refreshProfile();
        showModal('state', {
          type: 'success',
          title: t('CHANGE_CARD_STATUS_SUCCESS'),
          description: `Successfully ${
            blockCard ? 'locked' : 'unlocked'
          } your card!`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        setIsCardBlocked(blockCard);
        setCardUpdateToStatus(blockCard ? 'unlock' : 'lock');
      } else {
        showModal('state', {
          type: 'error',
          title: t('CHANGE_CARD_STATUS_FAIL'),
          description:
            response.error.message ?? t('UNABLE_TO_CHANGE_CARD_STATUE'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      setIsStatusLoading(false);
      showModal('state', {
        type: 'error',
        title: t('CHANGE_CARD_STATUS_FAIL'),
        description: t('UNABLE_TO_CHANGE_CARD_STATUE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const refreshProfile = async () => {
    const data = await getWalletProfile(globalContext.globalState.token);
    globalContext.globalDispatch({
      type: GlobalContextType.CARD_PROFILE,
      cardProfile: data,
    });
  };

  const updateCardStatus = (status: string, blockCard: boolean) => {
    setIsStatusLoading(true);
    showModal('state', {
      type: 'warning',
      title: `${t('CARD_STATUS_UPDATE')}`,
      description:
        `Are you sure you want to ${status} your card?` +
        (blockCard
          ? 'This is just a temporary lock. You can unlock it anytime'
          : ''),
      onSuccess: () => {
        void onCardStatusChange(blockCard);
      },
      onFailure: () => {
        hideModal();
        setIsStatusLoading(false);
      },
    });
  };

  return (
    <CyDView className='h-full bg-white pt-[30px]'>
      <CyDView className='flex flex-row justify-between align-center mx-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
        <CyDView>
          <CyDText className='text-[16px] font-bold'>
            {isCardBlocked ? t<string>('UNLOCK_CARD') : t<string>('LOCK_CARD')}
          </CyDText>
        </CyDView>
        {isStatusLoading ? (
          <LottieView
            style={styles.loader}
            autoPlay
            loop
            source={AppImages.LOADER_TRANSPARENT}
          />
        ) : (
          <CyDSwitch
            onValueChange={() => {
              void updateCardStatus(cardUpdateToStatus, !isCardBlocked);
            }}
            value={!isCardBlocked}
          />
        )}
      </CyDView>
      {!isCardBlocked && card.type === 'physical' && (
        <CyDTouchView
          onPress={() =>
            navigation.navigate(screenTitle.CARD_SET_PIN_SCREEN, {
              currentCardProvider,
              card,
            })
          }
          className='flex flex-row justify-between align-center ml-[20px] mr-[4px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
          <CyDText className='text-[16px] font-bold'>
            {t<string>('SET_NEW_PIN')}
          </CyDText>
          <CyDImage
            source={AppImages.OPTIONS_ARROW}
            className={'w-[15%] h-[18px]'}
            resizeMode={'contain'}
          />
        </CyDTouchView>
      )}
      {!cardProfile.child && (
        <CyDTouchView
          onPress={() =>
            navigation.navigate(screenTitle.LINKED_WALLETS, {
              currentCardProvider,
              card,
            })
          }
          className='flex flex-row justify-between align-center ml-[20px] mr-[4px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
          <CyDText className='text-[16px] font-bold'>
            {t<string>('LINKED_WALLETS')}
          </CyDText>
          <CyDImage
            source={AppImages.OPTIONS_ARROW}
            className={'w-[15%] h-[18px]'}
            resizeMode={'contain'}
          />
        </CyDTouchView>
      )}
      <CyDTouchView
        onPress={() =>
          navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN, {
            type: CardDetails.PHONE,
          })
        }
        className='flex flex-row justify-between align-center ml-[20px] mr-[4px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
        <CyDText className='text-[16px] font-bold'>
          {t<string>('CHANGE_PHONE_NUMBER')}
        </CyDText>
        <CyDImage
          source={AppImages.OPTIONS_ARROW}
          className={'w-[15%] h-[18px]'}
          resizeMode={'contain'}
        />
      </CyDTouchView>
      <CyDTouchView
        onPress={() =>
          navigation.navigate(screenTitle.CARD_UPDATE_CONTACT_DETAILS_SCREEN, {
            type: CardDetails.EMAIL,
          })
        }
        className='flex flex-row justify-between align-center ml-[20px] mr-[4px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
        <CyDText className='text-[16px] font-bold'>
          {t<string>('CHANGE_EMAIL_ADDRESS')}
        </CyDText>
        <CyDImage
          source={AppImages.OPTIONS_ARROW}
          className={'w-[15%] h-[18px]'}
          resizeMode={'contain'}
        />
      </CyDTouchView>
      <CyDTouchView
        onPress={() =>
          navigation.navigate(screenTitle.CARD_NOTIFICATION_SETTINGS, {
            currentCardProvider,
            card,
          })
        }
        className='flex flex-row justify-between align-center ml-[20px] mr-[4px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
        <CyDText className='text-[16px] font-bold'>
          {t<string>('CARD_NOTIFICATION_SETTINGS')}
        </CyDText>
        <CyDImage
          source={AppImages.OPTIONS_ARROW}
          className={'w-[15%] h-[18px]'}
          resizeMode={'contain'}
        />
      </CyDTouchView>
      <CyDTouchView
        onPress={() =>
          navigation.navigate(screenTitle.SOCIAL_MEDIA_SCREEN, {
            title: 'Card FAQ',
            uri: 'https://www.cypherwallet.io/card#faq',
          })
        }
        className='flex flex-row justify-between align-center ml-[20px] mr-[4px] pt-[20px] pb-[15px] border-b-[1px] border-sepratorColor'>
        <CyDText className='text-[16px] font-bold'>{t<string>('FAQ')}</CyDText>
        <CyDImage
          source={AppImages.LINK}
          className={'w-[15%] h-[18px]'}
          resizeMode={'contain'}
        />
      </CyDTouchView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  loader: {
    alignSelf: 'center',
    left: 75,
    top: -3,
  },
});
