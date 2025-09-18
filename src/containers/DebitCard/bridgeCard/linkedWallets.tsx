import * as React from 'react';
import { useContext } from 'react';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { screenTitle } from '../../../constants';
import { t } from 'i18next';
import { CardProfile } from '../../../models/cardProfile.model';
import { HdWalletContext, copyToClipboard } from '../../../core/util';
import { showToast } from '../../utilities/toastUtility';
import { sendFirebaseEvent } from '../../utilities/analyticsUtility';
import { GlobalContextType } from '../../../constants/enum';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useCardUtilities from '../../../hooks/useCardUtilities';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import EmptyContent from '../../../components/emptyContent';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import PageHeader from '../../../components/PageHeader';

export function LinkedWallets() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const cardProfile: CardProfile = globalContext.globalState
    .cardProfile as CardProfile;
  const hdWalletContext = useContext(HdWalletContext) as HdWalletContextDef;
  const { getWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const { cardProfileModal } = useCardUtilities();

  const refreshProfile = async () => {
    const response = await getWithAuth('/v1/authentication/profile');
    const tempProfile = await cardProfileModal(response.data);
    if (!response.isError) {
      globalContext.globalDispatch({
        type: GlobalContextType.CARD_PROFILE,
        cardProfile: tempProfile,
      });
      return true;
    }
  };

  const onUnlinkWallet = (walletAddress: string) => {
    void refreshProfile();
    showModal('state', {
      type: 'success',
      title: t('SUCCESS'),
      description: t('WALLET_DELETED_SUCCESSFULLY'),
      onSuccess: hideModal,
      onFailure: hideModal,
    });
  };
  return (
    <CyDSafeAreaView className={'h-full bg-n0'} edges={['top']}>
      <PageHeader title={'LINKED_WALLETS'} navigation={navigation} />

      <CyDView className={'flex-1 bg-n20 pt-[24px] px-[16px]'}>
        <CyDTouchView
          className='flex flex-row justify-between items-center border border-dashed border-base400 p-[16px] rounded-[12px] bg-n0'
          onPress={() => {
            navigation.navigate(screenTitle.LINK_ANOTHER_WALLET);
          }}>
          <CyDText>{t('LINK_ANOTHER_WALLET')}</CyDText>
          <CyDMaterialDesignIcons
            name='plus-circle-outline'
            size={24}
            className='text-base400'
          />
        </CyDTouchView>
        {cardProfile.children?.length ? (
          <CyDScrollView className='flex flex-col w-full mt-[32px]'>
            {/* <CyDView className={'w-[100%] flex flex-col items-center'}> */}
            {cardProfile.children.map(
              (childWallet: { address: string; label: string }) => {
                return (
                  <CyDView key={childWallet.address}>
                    <CyDText className='text-[14px] font-semibold tracking-[0.5px] text-n200'>
                      {childWallet.label}
                    </CyDText>
                    <CyDView className='flex flex-row justify-between items-center p-[16px] rounded-[12px] bg-n0 mt-[6px]'>
                      <CyDTouchView
                        className=''
                        onPress={() => {
                          copyToClipboard(childWallet.address);
                          showToast(`${t('ADDRESS_COPY_ALL_SMALL')}`);
                          sendFirebaseEvent(hdWalletContext, 'copy_address');
                        }}>
                        <CyDText>
                          {childWallet.address.substring(0, 8) +
                            '......' +
                            childWallet.address.substring(
                              childWallet.address.length - 8,
                            )}
                        </CyDText>
                      </CyDTouchView>
                      <CyDView className=''>
                        <CyDTouchView
                          className='flex flex-row gap-x-[4px] items-center'
                          onPress={() => {
                            navigation.navigate(screenTitle.LINK_WALLET_AUTH, {
                              linkedWalletToDelete: childWallet.address,
                              onSuccess: onUnlinkWallet,
                            });
                          }}>
                          <CyDText className='text-red80 text-[16px] font-medium tracking-[-0.8px]'>
                            {t('UNLINK')}
                          </CyDText>
                          <CyDIcons
                            name='disconnect'
                            size={36}
                            className='text-red80 text-[24px]'
                          />
                        </CyDTouchView>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                );
              },
            )}
            {/* </CyDView> */}
          </CyDScrollView>
        ) : (
          <CyDView className='h-[75%] flex flex-col w-[100%] justify-center items-center'>
            <EmptyContent content={'EMPTY_LINKED_WALLET'} />
          </CyDView>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
