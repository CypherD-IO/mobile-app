import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Colors } from '../../constants/theme';
import { BackHandler, FlatList, StyleSheet } from 'react-native';
import EmptyView from '../../components/EmptyView';
import AppImages from '../../../assets/images/appImages';
import {
  HdWalletContext,
  PortfolioContext,
  StakingContext,
  convertToEvmosFromAevmos,
  convertAmountOfContractDecimal
} from '../../core/util';
import { stakeValidators } from '../../core/Staking';
import * as C from '../../constants';
import axios, { MODAL_HIDE_TIMEOUT, MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import {
  createTxMsgDelegate,
  createTxRawEIP712,
  signatureToWeb3Extension
} from '@tharsis/transactions';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import * as Sentry from '@sentry/react-native';
import analytics from '@react-native-firebase/analytics';
import { PORTFOLIO_REFRESH } from '../../reducers/portfolio_reducer';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import CyDModalLayout from '../../components/v2/modal';
import Button from '../../components/v2/button';
import { ethers } from 'ethers';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { SuccessTransaction } from '../../components/v2/StateModal';
import { TokenOverviewTabIndices } from '../../constants/enum';
import { GlobalContext } from '../../core/globalContext';
import { RESET, STAKING_EMPTY } from '../../reducers/stakingReducer';
import Loading from '../../components/v2/loading';

const {
  CText,
  DynamicView,
  DynamicImage,
  DynamicTouchView
} = require('../../styles');

export default function ReStake ({ route, navigation }) {
  const { t } = useTranslation();
  const { tokenData, reward } = route.params;
  const [allValidatorsData, setAllValidatorsList] = useState<stakeValidators[]>([]);
  const stakingValidators = useContext<any>(StakingContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const globalStateContext = useContext<any>(GlobalContext);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [itemData, setItemData] = useState<any>({ description: { name: '' } });
  const [delegateModalVisible, setDelegateModalVisible] = useState<boolean>(false);
  const [finalDelegateGasFee, setFinalDelegateGasFee] = useState<number>(0);
  const [finalDelegateTxnData, setFinalDelegateTxnData] = useState({});
  const { showModal, hideModal } = useGlobalModalContext();

  const evmos = hdWallet.state.wallet.evmos;
  const ethereum = hdWallet.state.wallet.ethereum;
  const gasPrice = 0.000000075;

  const evmosUrls = globalStateContext.globalState.rpcEndpoints.EVMOS.otherUrls;
  const ACCOUNT_DETAILS = evmosUrls.accountDetails.replace('address', evmos.wallets[evmos.currentIndex].address);
  const SIMULATION_ENDPOINT = evmosUrls.simulate;
  const TXN_ENDPOINT = evmosUrls.transact;
  function onTransModalHide () {
    hideModal();
    setTimeout(() => {
      // This is to refresh the staking page again on navigating back to Token overview staking page below to dissatisfy isStakingDispatched() condition there
      stakingValidators.dispatchStaking({
        value: {
          allValidatorsListState: STAKING_EMPTY
        }
      });
    }, MODAL_HIDE_TIMEOUT);
    setTimeout(() => {
      navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
        tokenData,
        navigateTo: TokenOverviewTabIndices.STAKING
      });
    }, MODAL_HIDE_TIMEOUT);
  }

  const delegateTxnBody = (response, gasFee = '14000000000000000', gasLimit = '700000', typeOfTxn = 'simulate') => {
    const chain = {
      chainId: 9001,
      cosmosChainId: 'evmos_9001-2'
    };

    const sender = {
      accountAddress: evmos.wallets[evmos.currentIndex].address,
      sequence: response.data.account.base_account.sequence,
      accountNumber: response.data.account.base_account.account_number,
      pubkey: response.data.account.base_account.pub_key.key
    };

    const fee = {
      amount: gasFee,
      denom: 'aevmos',
      gas: gasLimit
    };
    const memo = '';

    const params = {
      validatorAddress: itemData.address,
      amount: typeOfTxn === 'simulate' ? '14000000000000000' : (convertToEvmosFromAevmos(stakingValidators.stateStaking.unStakedBalance) < 0.01 ? (parseInt(reward.toString()) - (finalDelegateGasFee * (10 ** 18))) : reward).toString(),
      denom: 'aevmos'
    };
    const msg = createTxMsgDelegate(chain, sender, fee, memo, params);

    const privateKeyBuffer = Buffer.from(
      ethereum.privateKey.substring(2),
      'hex'
    );
    const signature = signTypedData({
      privateKey: privateKeyBuffer,
      data: msg.eipToSign,
      version: SignTypedDataVersion.V4
    });

    const extension = signatureToWeb3Extension(chain, sender, signature);

    const rawTx = createTxRawEIP712(msg.legacyAmino.body, msg.legacyAmino.authInfo, extension);

    const body = generatePostBodyBroadcast(rawTx);

    return body;
  };

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const renderSuccessTransaction = (hash: string) => {
    return <SuccessTransaction
      hash={hash}
      symbol={tokenData.chainDetails.symbol}
      name={tokenData.chainDetails.name}
      navigation={navigation}
      hideModal={hideModal}
    />;
  };

  const delegateFinalTxn = async () => {
    try {
      void analytics().logEvent('evmos_redelegation_started');
      const txnResponse = await axios.post(TXN_ENDPOINT, finalDelegateTxnData);

      if (txnResponse.data.tx_response.raw_log === '[]') {
        setIsLoading(false);
        setDelegateModalVisible(false);
        void analytics().logEvent('evmos_redelgation_completed');
        setTimeout(() => {
          portfolioState.dispatchPortfolio({
            type: PORTFOLIO_REFRESH,
            value: {
              hdWallet,
              portfolioState
            }
          });
          stakingValidators.dispatchStaking({
            type: RESET
          });
        }, 6000);
        setTimeout(() => {
          showModal('state', {
            type: t('TOAST_TYPE_SUCCESS'),
            title: t('TRANSACTION_SUCCESS'),
            description: renderSuccessTransaction(txnResponse.data.tx_response.txhash),
            onSuccess: onTransModalHide,
            onFailure: hideModal
          });
        }, MODAL_HIDE_TIMEOUT_250);
      } else {
        setIsLoading(false);
        setDelegateModalVisible(false);
        Sentry.captureException(txnResponse);
        void analytics().logEvent('evmos_staking_error', {
          from: `error while broadcasting the transaction in evmos staking/delegation.tsx : ${txnResponse.data.tx_response.raw_log}`
        });
        setTimeout(() => { showModal('state', { type: 'error', title: 'Transaction Failed', description: txnResponse.data.tx_response.raw_log, onSuccess: hideModal, onFailure: hideModal }); }, MODAL_HIDE_TIMEOUT_250);
      }
    } catch (error: any) {
      setIsLoading(false);
      setDelegateModalVisible(false);
      Sentry.captureException(error);
      void analytics().logEvent('evmos_staking_error', { from: `error while ${stakingValidators.stateStaking.typeOfDelegation} in evmos staking/restake.tsx` });
      setTimeout(() => { showModal('state', { type: 'error', title: 'Transaction failed', description: error.message, onSuccess: hideModal, onFailure: hideModal }); }, MODAL_HIDE_TIMEOUT_250);
    }

    setIsLoading(true);
  };

  const onDelegate = async () => {
    setLoading(true);

    try {
      const accountDetailsResponse = await axios.get(ACCOUNT_DETAILS, {
        timeout: 2000
      });
      const delegateBodyForSimulate = delegateTxnBody(accountDetailsResponse);
      void analytics().logEvent('evmos_redelegation_simulation');

      const simulationResponse = await axios.post(SIMULATION_ENDPOINT, delegateBodyForSimulate);
      const gasWanted = simulationResponse.data.gas_info.gas_used;
      const bodyForTransaction = delegateTxnBody(accountDetailsResponse,
        ethers.utils
          .parseUnits(convertAmountOfContractDecimal((cosmosConfig.evmos.gasPrice * gasWanted).toString(), 18), 18).toString(),
        Math.floor(gasWanted * 1.3).toString(), 'tnx');
      setFinalDelegateGasFee(parseInt(gasWanted) * gasPrice);
      setFinalDelegateTxnData(bodyForTransaction);
      setLoading(false);
      setDelegateModalVisible(true);
    } catch (error: any) {
      setLoading(false);
      setItemData({ description: { name: '' } });
      Sentry.captureException(error);
      void analytics().logEvent('evmos_staking_error', { from: 'error while delegating in evmos staking/resTake.tsx' });
      showModal('state', { type: 'error', title: 'Transaction failed', description: error.message, onSuccess: hideModal, onFailure: hideModal });
    }
  };

  useEffect(() => {
    if (itemData.description.name !== '') {
      void onDelegate();
    }
  }, [itemData]);

  useEffect(() => {
    const allData: stakeValidators[] = [];
    for (const item of stakingValidators.stateStaking.allValidators.values()) { allData.push(item); }
    allData?.sort((a, b) => (parseInt(String(a.tokens)) > parseInt(String(b.tokens)) ? -1 : 1));
    setAllValidatorsList(allData);
  }, []);

  const convert = n => {
    if (n < 1e3) return n;
    if (n >= 1e3 && n < 1e6) return +(n / 1e3).toFixed(1) + 'K';
    if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(1) + 'M';
    if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(1) + 'B';
    if (n >= 1e12) return +(n / 1e12).toFixed(1) + 'T';
  };

  const Item = ({ item }) => (
        <DynamicTouchView dynamic fD={'row'} dynamicWidth width={100} pV={16} pH={16}
                          bGC={item.description.name === stakingValidators.stateStaking.reValidator.description.name ? 'rgba(88, 173, 171, 0.09)' : Colors.whiteColor}
                          onPress={async () => {
                            setItemData(item);
                          }}>
            <DynamicView dynamic jC={'flex-start'} aLIT={'flex-start'}>
                <CText dynamic fF={C.fontsName.FONT_SEMI_BOLD} fS={14} pV={5} tA={'left'}
                       color={Colors.primaryTextColor}>{item.description.name}</CText>
                <DynamicView dynamic fD={'row'}>
                  {item.apr !== '0.00' && <CyDImage source={AppImages.APR_ICON} className={'w-[20px] h-[16px]'} />}
                  {item.apr !== '0.00' && <CText dynamic mL={4} fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'}
                                                 color={Colors.subTextColor}>{`APR ${item.apr}`}</CText>}
                    <DynamicImage dynamic mL={10} source={AppImages.COINS} width={14} height={12}/>
                    <CText dynamic mL={4} fF={C.fontsName.FONT_SEMI_BOLD} fS={12} tA={'left'} color={Colors.subTextColor}>{convert(convertToEvmosFromAevmos(item.tokens)) + ' EVMOS'}</CText>
                </DynamicView>
            </DynamicView>

        </DynamicTouchView>
  );

  const renderItem = ({ item }) => (
        <Item item={item} />
  );

  const memoizedValue = useMemo(() => renderItem, [allValidatorsData]);

  const emptyView = (view: any) => {
    return (
            <DynamicView dynamic dynamicWidth dynamicHeight height={80} width={100} mT={0} bGC={Colors.whiteColor} aLIT={'center'}>
                {view === 'empty'
                  ? <EmptyView
                        text={t('NO_CURRENT_HOLDINGS')}
                        image={AppImages.EMPTY}
                        buyVisible={false}
                        marginTop={80}
                    />
                  : <></>}
            </DynamicView>
    );
  };

  return (
        <>
        <CyDModalLayout setModalVisible={setDelegateModalVisible} isModalVisible={delegateModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
          <CyDView className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
            <CyDTouchView onPress={() => { setDelegateModalVisible(false); setItemData({ description: { name: '' } }); }} className={'z-[50]'}>
              <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] top-[-10px] '} />
            </CyDTouchView>
            <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>{t('DELEGATE')}</CyDText>
            <CyDView className={'flex flex-row mt-[40px]'}>
              <CyDImage source={AppImages[tokenData.chainDetails.backendName + '_LOGO']} className={'h-[20px] w-[20px]'}/>
              <CyDView className={' flex flex-row'}>
                <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{(parseFloat(reward) * (10 ** -18)).toFixed(6).toString() + ' EVMOS '}</CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row mt-[20px]'}>
              <CyDImage source={AppImages.GAS_FEES} className={'w-[16px] h-[16px] mt-[3px]'} resizeMode='contain'/>
              <CyDView className={' flex flex-row mt-[3px]'}>
                <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{t('GAS_FEE')}</CyDText>
                <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{finalDelegateGasFee.toFixed(6) + ' EVMOS'}</CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
              <Button onPress={ () => {
                void delegateFinalTxn();
              }} title={t('APPROVE')} style={'py-[5%] min-h-[60px]'} loading={isLoading} loaderStyle={{ height: 30 }}/>
              <Button onPress={() => { setDelegateModalVisible(false); setItemData({ description: { name: '' } }); }} title={t('REJECT')} type={'secondary'} style={'py-[5%] mt-[15px]'}/>
            </CyDView>
          </CyDView>
        </CyDModalLayout>

        {loading && <Loading />}

            {!loading && <DynamicView dynamic>
                <FlatList
                    removeClippedSubviews
                    nestedScrollEnabled
                    data={allValidatorsData }
                    renderItem={memoizedValue}
                    style={{ width: '100%', backgroundColor: Colors.whiteColor }}
                    keyExtractor={item => item.description.name}
                    ListEmptyComponent={emptyView('empty')}
                    showsVerticalScrollIndicator={true}
                />
            </DynamicView>}
        </>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  }
});
