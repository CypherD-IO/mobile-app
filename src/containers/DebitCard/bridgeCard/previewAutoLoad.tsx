import React, { useContext, useState } from 'react';
import useAxios from '../../../core/HttpRequest';
import {
  CyDFastImage,
  CyDSafeAreaView,
  CyDText,
  CyDView,
} from '../../../styles/tailwindComponents';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/v2/button';
import { CardProviders } from '../../../constants/enum';
import { AutoLoad } from '../../../models/autoLoad.interface';
import moment from 'moment';
import useTransactionManager from '../../../hooks/useTransactionManager';
import {
  HdWalletContext,
  limitDecimalPlaces,
  parseErrorMessage,
} from '../../../core/util';
import { get } from 'lodash';
import { COSMOS_CHAINS } from '../../../constants/server';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { screenTitle } from '../../../constants';
import { MODAL_HIDE_TIMEOUT } from '../../../core/Http';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { CardProfile } from '../../../models/cardProfile.model';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { parseUnits } from 'viem';
import PageHeader from '../../../components/PageHeader';
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';

export default function PreviewAutoLoad() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: AutoLoad }, 'params'>>();

  const {
    threshold,
    amountToLoad,
    autoLoadExpiry,
    expiryDate,
    repeatFor,
    selectedToken,
  } = route.params;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const { getWithAuth, postWithAuth } = useAxios();
  const { grantAutoLoad } = useTransactionManager();
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const [loading, setLoading] = useState<boolean>(false);
  const { showModal, hideModal } = useGlobalModalContext();
  const { t } = useTranslation();
  const cardProfile: CardProfile = globalContext.globalState
    .cardProfile as CardProfile;
  const provider = cardProfile.provider ?? CardProviders.REAP_CARD;

  function onModalHide() {
    hideModal();
    setTimeout(() => {
      navigation.navigate(screenTitle.DEBIT_CARD_SCREEN);
    }, MODAL_HIDE_TIMEOUT);
  }

  const onConfirm = async () => {
    setLoading(true);
    const chain = selectedToken.chainDetails;
    const response = await getWithAuth(
      `/v1/cards/${provider}/autoLoad/${chain.backendName}/grantee`,
    );
    if (!response.isError) {
      const granter = get(hdWallet.state.wallet, chain.chainName).address;
      const amountWithContractDecimals = parseUnits(
        limitDecimalPlaces(
          (Number(amountToLoad) * Number(repeatFor)) /
            Number(selectedToken.price),
          selectedToken.contractDecimals,
        ),
        selectedToken.contractDecimals,
      );
      const grantResponse = await grantAutoLoad({
        chain,
        granter,
        grantee: response.data.granteeAddress,
        allowList: response.data.allowList,
        amount: String(amountWithContractDecimals),
        denom: String(selectedToken.denom),
        expiry: expiryDate,
        selectedToken,
      });
      if (!grantResponse.isError) {
        const payload = {
          chain: chain.backendName,
          assetId: COSMOS_CHAINS.includes(chain.chainName)
            ? selectedToken.denom
            : selectedToken.contractAddress,
          granterAddress: granter,
          cardProvider: provider,
          threshold: Number(threshold),
          amountToBeLoaded: Number(amountToLoad),
          ...(autoLoadExpiry && { repeatFor: Number(repeatFor) }),
          ...(autoLoadExpiry && { expiry: expiryDate }),
        };
        const autoLoadConfigResponse = await postWithAuth(
          '/v1/cards/autoLoad',
          payload,
        );
        if (!autoLoadConfigResponse.isError) {
          setLoading(false);
          showModal('state', {
            type: 'success',
            title: t('SUCCESS'),
            description: t('AUTOLOAD_SETUP_SUCCESS'),
            onSuccess: () => {
              onModalHide();
            },
            onFailure: hideModal,
          });
        } else {
          setLoading(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: autoLoadConfigResponse.error?.message,
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: grantResponse.error,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: parseErrorMessage(response.error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };
  return (
    <CyDSafeAreaView className='h-full bg-n0' edges={['top']}>
      <PageHeader title={t('AUTO_LOAD_PREVIEW')} navigation={navigation} />
      <CyDView className='flex-1 justify-between bg-n20 pt-[24px]'>
        <CyDView className={'mx-[16px]'}>
          <CyDView className='bg-n0 rounded-2xl flex flex-col justify-center items-center pb-[45px] pt-[32px]'>
            <CyDText className='text-[52px] font-bold text-mandarin'>
              {'$' + amountToLoad}
            </CyDText>
            <CyDText className='text-[16px] mt-[4px]'>
              {t('AMOUNT_TO_BE_LOADED_IN_CARD')}
            </CyDText>
            <CyDText className='mt-[16px] text-[32px] font-bold'>
              {'$' + threshold}
            </CyDText>
            <CyDText className='text-[16px] mt-[4px]'>
              {t('WHEN_BALANCE_GOES_BELOW')}
            </CyDText>
          </CyDView>
          <CyDView
            className={
              'flex flex-row justify-between items-center mt-[40px] pb-[16px]'
            }>
            <CyDText className={'font-bold text-[16px]'}>
              {t('AUTO_LOAD_USING')}
            </CyDText>
            <CyDView
              className={'flex flex-row justify-center items-center pl-[25px]'}>
              <CyDFastImage
                source={{ uri: selectedToken?.logoUrl ?? '' }}
                className={'w-[18px] h-[18px]'}
              />
              <CyDText className={'text-[16px] ml-[4px]'}>
                {selectedToken.name}
              </CyDText>
            </CyDView>
          </CyDView>
          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDText className={'font-bold text-[16px]'}>
              {t('EXPIRES_ON')}
            </CyDText>
            <CyDView
              className={'flex flex-col flex-wrap justify-between items-end'}>
              <CyDText className={' font-medium text-[16px] '}>
                {moment.utc(expiryDate).local().format('MMMM DD, YYYY')}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDView>
              <CyDText className={'font-bold text-[16px]'}>
                {t('REPEAT_FOR')}
              </CyDText>
              <CyDText className={'text-[12px] mt-[2px]'}>
                {t('REPEAT_FOR_DESC')}
              </CyDText>
            </CyDView>
            <CyDView
              className={'flex flex-col flex-wrap justify-between items-end'}>
              <CyDText className={'font-medium text-[16px] '}>
                {repeatFor}
              </CyDText>
            </CyDView>
          </CyDView>
        </CyDView>
        <CyDView className='w-full px-[24px] items-center py-[20px] bg-n20 mb-[20px]'>
          <Button
            title={t<string>('SETUP_AUTO_LOAD_CAPS')}
            loading={loading}
            onPress={() => {
              void onConfirm();
            }}
            isPrivateKeyDependent={true}
            style={'h-[60px] w-full'}
          />
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
