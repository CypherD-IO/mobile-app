import * as React from 'react';
import { useContext } from 'react';
import { GlobalContext } from '../../../core/globalContext';
import {
  CyDImage,
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
import AppImages from '../../../../assets/images/appImages';
import { GlobalContextType } from '../../../constants/enum';
import useAxios from '../../../core/HttpRequest';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import useCardUtilities from '../../../hooks/useCardUtilities';

export function LinkedWallets({
  navigation,
}: {
  navigation: { push: (screen: string, params?: {}) => void };
}) {
  const globalContext = useContext<any>(GlobalContext);
  const cardProfile: CardProfile = globalContext.globalState.cardProfile;
  const hdWalletContext = useContext<any>(HdWalletContext);
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

  return (
    <>
      <CyDSafeAreaView className={'h-full bg-n20 pt-[10px]'}>
        <CyDView className={'flex flex-col items-end w-full h-full'}>
          <CyDText
            className='text-blue200 font-bold mt-[10px] mb-[5px] mr-[25px]'
            onPress={() => {
              navigation.push(screenTitle.LINK_ANOTHER_WALLET);
            }}>
            {t('PLUS_LINK_ANOTHER_WALLET')}
          </CyDText>
          {cardProfile.children?.length ? (
            <CyDScrollView className='flex flex-col w-full'>
              <CyDView className={'w-[100%] flex flex-col items-center'}>
                {cardProfile.children.map(
                  (childWallet: { address: string; label: string }) => {
                    return (
                      <CyDView
                        key={childWallet.address}
                        className='bg-n0 flex flex-row justify-between h-[65px] my-[5px] mx-[20px] px-[10px] border-[1px] rounded-[15px] border-n40'>
                        <CyDView className='flex flex-row w-[80%] items-center'>
                          <CyDText className='w-[90px]'>
                            {childWallet.label.length > 12
                              ? childWallet.label.substring(0, 12) + '...'
                              : childWallet.label}
                          </CyDText>
                          <CyDView className='h-[30px] w-[1px] bg-gray-300 mx-[10px]' />
                          <CyDText>
                            {childWallet.address.substring(0, 6) +
                              '...' +
                              childWallet.address.substring(
                                childWallet.address.length - 8,
                              )}
                          </CyDText>
                        </CyDView>
                        <CyDView className='flex flex-row justify-between items-center w-[16%]'>
                          <CyDTouchView
                            onPress={() => {
                              copyToClipboard(childWallet.address);
                              showToast(`${t('ADDRESS_COPY_ALL_SMALL')}`);
                              sendFirebaseEvent(
                                hdWalletContext,
                                'copy_address',
                              );
                            }}>
                            <CyDMaterialDesignIcons
                              name={'content-copy'}
                              size={18}
                              className='text-base400'
                            />
                          </CyDTouchView>
                          <CyDTouchView
                            onPress={() => {
                              navigation.navigate(
                                screenTitle.LINK_WALLET_AUTH,
                                {
                                  linkedWalletToDelete: childWallet.address,
                                  onSuccess: () => {
                                    void refreshProfile();
                                    showModal('state', {
                                      type: 'success',
                                      title: t('SUCCESS'),
                                      description: t(
                                        'WALLET_DELETED_SUCCESSFULLY',
                                      ),
                                      onSuccess: hideModal,
                                      onFailure: hideModal,
                                    });
                                  },
                                },
                              );
                            }}>
                            <CyDMaterialDesignIcons
                              name='trash-can-outline'
                              size={20}
                              className='text-base400'
                            />
                          </CyDTouchView>
                        </CyDView>
                      </CyDView>
                    );
                  },
                )}
              </CyDView>
            </CyDScrollView>
          ) : (
            <CyDView className='h-[75%] flex flex-col w-[100%] justify-center items-center'>
              <CyDImage
                source={AppImages.EMPTY}
                height={300}
                width={300}
                className='mb-[20px]'
              />
              <CyDText>{t('EMPTY_LINKED_WALLET')}</CyDText>
            </CyDView>
          )}
        </CyDView>
      </CyDSafeAreaView>
    </>
  );
}
