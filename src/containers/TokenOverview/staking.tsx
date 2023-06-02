/* eslint-disable @typescript-eslint/no-misused-promises */
import { useIsFocused } from '@react-navigation/native';
import { OfflineDirectSigner } from '@cosmjs-rn/proto-signing';
import { t } from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Button from '../../components/v2/button';
import AppImages from '../../../assets/images/appImages';
import CyDModalLayout from '../../components/v2/modal';
import { ChainBackendNames, CosmosStakingTokens } from '../../constants/server';
import { convertFromUnitAmount, isBigIntZero, convertToEvmosFromAevmos, StakingContext, getTimeForDate, isBasicCosmosChain, HdWalletContext, PortfolioContext, convertAmountOfContractDecimal } from '../../core/util';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { CosmosActionType, CosmosStakingContext } from '../../reducers/cosmosStakingReducer';
import { CyDImage, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import { GlobalContext } from '../../core/globalContext';
import { SigningStargateClient } from '@cosmjs-rn/stargate';
import Toast from 'react-native-toast-message';
import { screenTitle } from '../../constants';
import axios, { MODAL_HIDE_TIMEOUT_250, TIMEOUT } from '../../core/Http';
import { getSignerClient } from '../../core/Keychain';
import { IIBCData, cosmosConfig } from '../../constants/cosmosConfig';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { ethers } from 'ethers';
import { PORTFOLIO_REFRESH } from '../../reducers/portfolio_reducer';
import {
  createTxMsgMultipleWithdrawDelegatorReward,
  createTxRawEIP712,
  signatureToWeb3Extension
} from '@tharsis/transactions';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import { TokenOverviewTabIndices } from '../../constants/enum';
import { STAKING_NOT_EMPTY } from '../../reducers/stakingReducer';
import { isIOS } from '../../misc/checkers';
import appImages from '../../../assets/images/appImages';
import CyDTokenAmount from '../../components/v2/tokenAmount';

export default function TokenStaking ({ tokenData, navigation }: { tokenData: TokenMeta, navigation: { navigate: (screen: string, {}: any) => void } }) {
  const globalStateContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState<boolean>(false);
  const [claimModal, setClaimModal] = useState<boolean>(false);
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [wallets, setWallets] = useState<Map<string, OfflineDirectSigner>>(new Map());
  const [gasFee, setGasFee] = useState<number>(0);
  const [reward, setReward] = useState<bigint>(BigInt(0));
  const [validator, setValidator] = useState({ name: '' });
  const [reStakeModalVisible, setReStakeModalVisible] = useState(false);
  const [actionType, setActionType] = useState<CosmosActionType>(CosmosActionType.CLAIM);
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const evmos = hdWalletContext.state.wallet.evmos;
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const stakingValidators = useContext<any>(StakingContext);
  const [time, setTime] = useState({ hours: '0', min: '0', sec: '0' });
  const [finalData, setFinalData] = useState({});
  const [method, setMethod] = useState<string>('');
  const [totalClaimableRewards, setTotalClaimableRewards] = useState<string>('');
  const [availableToStake, setAvailableToStake] = useState<string>('');
  const [currentlyStaked, setCurrentlyStaked] = useState<string>('');
  const [totalUnboundings, setTotalUnboundings] = useState<string>('');

  const isCOSMOSEcoSystem = [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE].includes(tokenData.chainDetails.backendName);
  const currentChain: IIBCData = cosmosConfig[tokenData.chainDetails.chainName];
  const chainAPIURLs = isCOSMOSEcoSystem ? globalStateContext.globalState.rpcEndpoints[tokenData.chainDetails.chainName.toUpperCase()].otherUrls : null;

  useEffect(() => {
    if (tokenData.chainDetails.backendName !== ChainBackendNames.EVMOS) {
      if ((cosmosStaking.cosmosStakingState.reward).toString() !== '0' || (cosmosStaking.cosmosStakingState.userValidators.size > 0)) {
        setTotalClaimableRewards((`${convertFromUnitAmount((cosmosStaking.cosmosStakingState.reward).toString(), tokenData.contractDecimals, 6)}`));
      }
      if ((cosmosStaking.cosmosStakingState.balance).toString() !== '0') {
        setAvailableToStake(`${convertFromUnitAmount((cosmosStaking.cosmosStakingState.balance).toString(), tokenData.contractDecimals, 6)}`);
      }
      if (cosmosStaking.cosmosStakingState.stakedBalance.toString() !== '0') {
        setCurrentlyStaked(`${convertFromUnitAmount((cosmosStaking.cosmosStakingState.stakedBalance).toString(), tokenData.contractDecimals, 6)}`);
      }
      if (cosmosStaking.cosmosStakingState.unBoundingBalance.toString() !== '0') {
        setTotalUnboundings(`${convertFromUnitAmount((cosmosStaking.cosmosStakingState.unBoundingBalance).toString(), tokenData.contractDecimals, 6)}`);
      }
    } else {
      if (!isBigIntZero(stakingValidators.stateStaking.totalStakedBalance)) {
        setTotalClaimableRewards(`${convertToEvmosFromAevmos(stakingValidators.stateStaking.totalReward).toFixed(6)}`);
      }
      if (!isBigIntZero(stakingValidators.stateStaking.unStakedBalance)) {
        setAvailableToStake(`${convertToEvmosFromAevmos(stakingValidators.stateStaking.unStakedBalance).toFixed(6)}`);
      }
      if (!isBigIntZero(stakingValidators.stateStaking.totalStakedBalance)) {
        setCurrentlyStaked(`${convertToEvmosFromAevmos(stakingValidators.stateStaking.totalStakedBalance).toFixed(6)}`);
      }
      if (!isBigIntZero(stakingValidators.stateStaking.unBoundingTotal)) {
        setTotalUnboundings(`${convertToEvmosFromAevmos(stakingValidators.stateStaking.unBoundingTotal).toFixed(6)}`);
      }
    }
  }, [cosmosStaking, stakingValidators]);

  useEffect(() => {
    const x = setInterval(function time () {
      const d = new Date();
      const timeForDate = getTimeForDate(d);
      const hours = timeForDate.hours;
      const min = timeForDate.minutes;
      const sec = timeForDate.seconds;
      setTime({ ...time, hours, min, sec });
    }, 1000);

    return () => {
      clearInterval(x);
      resetStakeVariables();
    };
  }, [isFocused]);

  const resetStakeVariables = () => {
    setTotalClaimableRewards('');
    setAvailableToStake('');
    setCurrentlyStaked('');
    setTotalUnboundings('');
  };

  useEffect(() => {
    if (validator.name !== '') {
      void onReStake(CosmosActionType.SIMULATION);
    }
  }, [validator]);

  const generateTransactionBodyForEVMOSSimulation = (
    response,
    gasFee = '14000000000000000',
    gasLimit = '700000'
  ) => {
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

    const address: string[] = [];
    stakingValidators.stateStaking.myValidators.forEach((val) => {
      address.push(val.address);
    });

    const params = { validatorAddresses: address };

    const msg = createTxMsgMultipleWithdrawDelegatorReward(
      chain,
      sender,
      fee,
      memo,
      params
    );

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

    const rawTx = createTxRawEIP712(
      msg.legacyAmino.body,
      msg.legacyAmino.authInfo,
      extension
    );

    const body = generatePostBodyBroadcast(rawTx);

    return body;
  };

  const txnSimulation = async (method: string) => {
    setLoading(true);
    setMethod(method);
    setReward(stakingValidators.stateStaking.totalReward);

    try {
      const walletURL = chainAPIURLs.accountDetails.replace('address', evmos.wallets[evmos.currentIndex].address);
      const accountDetailsResponse = await axios.get(walletURL, { timeout: TIMEOUT });
      const bodyForSimulate = generateTransactionBodyForEVMOSSimulation(accountDetailsResponse);

      const simulationResponse = await axios.post(chainAPIURLs.simulate, bodyForSimulate);
      await analytics().logEvent('evmos_claim_simulation');

      const gasWanted = simulationResponse.data.gas_info.gas_used;

      const bodyForTxn = generateTransactionBodyForEVMOSSimulation(
        accountDetailsResponse,
        ethers.utils
          .parseUnits(convertAmountOfContractDecimal((cosmosConfig.evmos.gasPrice * gasWanted).toString(), 18), 18).toString(),
        Math.floor(gasWanted * 1.3).toString()
      );

      setLoading(false);
      setGasFee(parseInt(gasWanted) * currentChain.gasPrice);
      setFinalData(bodyForTxn);
      setClaimModal(false);
      setTimeout(() => setSignModalVisible(true), MODAL_HIDE_TIMEOUT_250);
    } catch (error: any) {
      setLoading(false);
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text1: t('TRANSACTION_FAILED'),
        text2: error.toString(),
        position: 'bottom'
      });
      Sentry.captureException(error);
      void analytics().logEvent('evmos_staking_error', {
        from:
                    `error while ${stakingValidators.stateStaking.typeOfDelegation} in evmos staking/index.tsx`
      });
    }
  };

  const finalTxn = async () => {
    setSignModalVisible(false);
    try {
      const txnResponse = await axios.post(chainAPIURLs.transact, finalData);

      if (txnResponse.data.tx_response.raw_log === '[]') {
        void analytics().logEvent('evmos_reward_claim_success');

        Toast.show({
          type: t('TOAST_TYPE_SUCCESS'),
          text1: t('TRANSACTION_SUCCESS'),
          text2: txnResponse.data.tx_response.txhash,
          position: 'bottom'
        });
        if (method === CosmosActionType.CLAIM) {
          navigation.navigate(screenTitle.TOKEN_OVERVIEW, {
            tokenData,
            navigateTo: TokenOverviewTabIndices.STAKING
          });
          setTimeout(() => {
            portfolioState.dispatchPortfolio({
              type: PORTFOLIO_REFRESH,
              value: {
                hdWallet: hdWalletContext,
                portfolioState
              }
            });
          }, TIMEOUT);
        } else if (method === CosmosActionType.RESTAKE) {
          navigation.navigate(screenTitle.RESTAKE, {
            tokenData,
            reward
          });
        }
      } else {
        Toast.show({
          type: t('TOAST_TYPE_ERROR'),
          text1: t('TRANSACTION_FAILED'),
          text2: txnResponse.data.tx_response.raw_log,
          position: 'bottom'
        });
        Sentry.captureException(txnResponse);
        void analytics().logEvent('evmos_staking_error', {
          from: `error while broadcasting the transaction in evmos staking/index.tsx ${txnResponse.data.tx_response.raw_log}`
        });
      }
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text1: t('TRANSACTION_FAILED'),
        text2: error.toString(),
        position: 'bottom'
      });
      Sentry.captureException(error);
      void analytics().logEvent('evmos_staking_error', {
        from: 'error while broadcasting the transaction in evmos staking/index.tsx'
      });
    }
    setLoading(false);
  };

  const onPressClaim = async (type: CosmosActionType): Promise<void> => {
    setLoading(true);
    try {
      let wallet: OfflineDirectSigner | undefined;
      if (type === CosmosActionType.SIMULATION) {
        const wallets: Map<string, OfflineDirectSigner> = await getSignerClient(hdWalletContext);
        wallet = wallets.get(currentChain.prefix);
        setWallets(wallets);
      } else {
        wallet = wallets.get(currentChain.prefix);
      }
      const rpc = globalStateContext.globalState.rpcEndpoints[tokenData.chainDetails.chainName.toUpperCase()].primary;

      let senderAddress: any = await wallet?.getAccounts();
      senderAddress = senderAddress[0].address;

      const client = await SigningStargateClient.connectWithSigner(
        rpc,
        wallet,
        {
          prefix: currentChain.prefix
        }
      );

      const msgList: Array<{ typeUrl: string, value: { delegatorAddress: string, validatorAddress: string } }> = [];
      let rewardAmount: bigint = BigInt(0);

      cosmosStaking.cosmosStakingState.rewardList.forEach(item => {
        const [amountToBeAddedToRewards] = item.amount.split('.');
        rewardAmount += BigInt(amountToBeAddedToRewards);
        const msg = {
          typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
          value: {
            delegatorAddress: senderAddress,
            validatorAddress: item.validatorAddress
          }
        };
        msgList.push(msg);
      });

      setReward(rewardAmount);
      const simulation = await client.simulate(senderAddress, msgList, '');

      const gasFee = simulation * currentChain.gasPrice;
      setGasFee(gasFee);

      if (CosmosActionType.SIMULATION === type) {
        void analytics().logEvent(`${tokenData.name}_claim_simulation`);
        setClaimModal(false);
        setTimeout(() => setSignModalVisible(true), MODAL_HIDE_TIMEOUT_250);
      }

      if (CosmosActionType.TRANSACTION === type || CosmosActionType.RESTAKE === type) {
        const fee = {
          gas: Math.floor(simulation * 1.3).toString(),
          amount: [
            {
              denom: currentChain.denom,
              amount: parseInt(gasFee.toFixed(6).split('.')[1]).toString()
            }
          ]
        };
        const resp = await client.signAndBroadcast(senderAddress, msgList, fee, '');

        setLoading(false);
        setSignModalVisible(false);

        Toast.show({
          type: t('TOAST_TYPE_SUCCESS'),
          text1: t('TRANSACTION_SUCCESS'),
          text2: resp.transactionHash,
          position: 'bottom'
        });
        void analytics().logEvent(`${tokenData.name}_claim_transaction_success`);

        if (actionType === CosmosActionType.RESTAKE) {
          setSignModalVisible(false);
          navigation.navigate(screenTitle.COSMOS_REVALIDATOR, {
            validatorData: { name: '' },
            tokenData,
            setReValidator: setValidator,
            from: screenTitle.TOKEN_OVERVIEW
          });
        }
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setClaimModal(false);
      setReStakeModalVisible(false);
      Sentry.captureException(error);
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text1: t('TRANSACTION_FAILED'),
        text2: error.message,
        position: 'bottom'
      });
      void analytics().logEvent(`${tokenData.name}_claim_transaction_failure`);
    }
  };

  const onReStake = async (type: CosmosActionType): Promise<void> => {
    setLoading(true);
    try {
      const currentChain: IIBCData = cosmosConfig[tokenData.chainDetails.chainName];
      const wallet: OfflineDirectSigner | undefined = wallets.get(currentChain.prefix);

      const rpc = globalStateContext.globalState.rpcEndpoints[tokenData.chainDetails.chainName.toUpperCase()].primary;

      let senderAddress: any = await wallet.getAccounts();
      senderAddress = senderAddress[0].address;

      const client = await SigningStargateClient.connectWithSigner(
        rpc,
        wallet,
        {
          prefix: currentChain.prefix
        }
      );

      const msg = {
        typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
        value: {
          delegatorAddress: senderAddress,
          validatorAddress: validator.address,
          amount: {
            denom: currentChain.denom,
            amount: reward.toString()
          }
        }
      };

      const simulation = await client.simulate(senderAddress, [msg], '');

      const gasFee = simulation * currentChain.gasPrice;
      setGasFee(gasFee);

      if (CosmosActionType.SIMULATION === type) {
        void analytics().logEvent(`${tokenData.name}_restake_simulation`);

        setReStakeModalVisible(true);
      }

      if (CosmosActionType.TRANSACTION === type) {
        const fee = {
          gas: Math.floor(simulation * 1.3).toString(),
          amount: [
            {
              denom: currentChain.denom,
              amount: parseInt(gasFee.toFixed(6).split('.')[1]).toString()
            }
          ]
        };
        const resp = await client.signAndBroadcast(senderAddress, [msg], fee, '');
        setReStakeModalVisible(false);

        Toast.show({
          type: t('TOAST_TYPE_SUCCESS'),
          text1: t('TRANSACTION_SUCCESS'),
          text2: resp.transactionHash,
          position: 'bottom'
        });

        void analytics().logEvent(`${tokenData.name}_restake_Transaction_success`);
      }
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      Sentry.captureException(error);
      void analytics().logEvent(`${tokenData.name}_restake_Transaction_failure`);
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text1: t('TRANSACTION_FAILED'),
        text2: error.message,
        position: 'bottom'
      });
    }
  };

  const EmptyView = () => {
    return (
      <CyDView className={'flex flex-row justify-center'}>
        <CyDView className={'mt-[15%]'}>
          <CyDImage source={appImages.STAKING_EMPTY_ILLUSTRATION} />
          <CyDText className={'text-center text-[24px] font-semibold mt-[20px]'}>
            No holdings yet
          </CyDText>
        </CyDView>
      </CyDView>
    );
  };

  return (
    <CyDView>
          <CyDModalLayout setModalVisible={setClaimModal} isModalVisible={claimModal} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
              <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
                  <CyDTouchView onPress={() => setClaimModal(false)} className={'z-[50]'}>
                      <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
                  </CyDTouchView>
                  <CyDView>
                      <LottieView
                          source={AppImages.NEW}
                          autoPlay
                          loop
                          style={styles.lottieViewWidth}
                      />

                      <CyDText className={'mt-[10] font-bold text-[22px]'}>
                          {t<string>('HAVE_OPTION_TO_STAKE_REWARDS')}
                      </CyDText>
                      <CyDView className={'flex flex-row mt-[40px]'}>
                          <CyDImage source={AppImages.MONEY_BAG} />
                          <CyDView className={' flex flex-row mt-[3px]'}>
                              <CyDText className={'text-[16px] font-medium'}>{t<string>('TOTAL_CLAIMABLE_REWARDS')}</CyDText>
                              <CyDText className={'ml-[10px] text-[18px] font-bold'}>{totalClaimableRewards}</CyDText>
                          </CyDView>
                      </CyDView>

                      {isBasicCosmosChain(tokenData.chainDetails.backendName) && <CyDView className={'flex flex-col mt-[40px] w-[100%]'}>
                          <Button onPress={async () => {
                            setActionType(CosmosActionType.RESTAKE);
                            await onPressClaim(CosmosActionType.SIMULATION);
                          }} loading={actionType === CosmosActionType.RESTAKE && loading} loaderStyle={{ height: 22 }} title={t<string>('RESTAKE')} style={'py-[5%]'} />
                          <Button onPress={async () => {
                            setActionType(CosmosActionType.CLAIM);
                            await onPressClaim(CosmosActionType.SIMULATION);
                          }} title={t<string>('CLAIM')} type={'secondary'} style={'py-[5%] mt-[15px]'} loading={actionType === CosmosActionType.CLAIM && loading} loaderStyle={{ height: 22 }} />
                      </CyDView>}
                      {tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && <CyDView className={'flex flex-col mt-[24px] w-[100%]'}>
                          <Button onPress={async () => {
                            setActionType(CosmosActionType.RESTAKE);
                            await txnSimulation(CosmosActionType.RESTAKE);
                          }} title={t<string>('RESTAKE')} style={'py-[5%]'} loading={actionType === CosmosActionType.RESTAKE && loading} loaderStyle={{ height: 22 }} />
                          <Button onPress={async () => {
                            // setClaimModal(false);
                            setActionType(CosmosActionType.CLAIM);
                            await txnSimulation(CosmosActionType.CLAIM);
                          }} title={t<string>('CLAIM')} type={'secondary'} style={'py-[5%] mt-[15px]'} loading={actionType === CosmosActionType.CLAIM && loading} loaderStyle={{ height: 22 }} />
                      </CyDView>}
                  </CyDView>
              </CyDView>
          </CyDModalLayout>

          <CyDModalLayout setModalVisible={setSignModalVisible} isModalVisible={signModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
              <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
                  <CyDTouchView onPress={() => { setSignModalVisible(false); }} className={'z-[50]'}>
                      <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '} />
                  </CyDTouchView>
                  <CyDText className={' mt-[10] font-bold text-[22px] text-center '}>{t<string>('REWARD')}</CyDText>
                  <CyDView className={'flex flex-row mt-[40px]'}>
                      <CyDImage source={AppImages.MONEY_BAG} />
                      <CyDView className={' flex flex-row mt-[3px]'}>
                          <CyDText className={' font-medium text-[16px] ml-[5px] text-primaryTextColor'}>{t<string>('CLAIMABLE_REWARD')}</CyDText>
                          <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{totalClaimableRewards}</CyDText>
                      </CyDView>
                  </CyDView>

                  <CyDView className={'flex flex-row mt-[20px]'}>
                      <CyDImage source={AppImages.GAS_FEES} />
                      <CyDView className={' flex flex-row mt-[3px]'}>
                          <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{t<string>('GAS_FEE')}</CyDText>
                          <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{`${gasFee.toFixed(6)} ${tokenData.name}`}</CyDText>
                      </CyDView>
                  </CyDView>

                  <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
                      <Button onPress={async () => {
                        isBasicCosmosChain(tokenData.chainDetails.backendName)
                          ? await onPressClaim(CosmosActionType.TRANSACTION)
                          : await finalTxn();
                      }} title={t<string>('APPROVE')} style={'py-[5%]'} loading={loading} loaderStyle={{ height: 30 }} />
                      <Button onPress={() => { setSignModalVisible(false); }} title={t<string>('REJECT')} type={'secondary'} style={'py-[5%] mt-[15px]'} />
                  </CyDView>
              </CyDView>
          </CyDModalLayout>

          <CyDModalLayout setModalVisible={setReStakeModalVisible} isModalVisible={reStakeModalVisible} style={styles.modalLayout} animationIn={'slideInUp'} animationOut={'slideOutDown'}>
              <CyDView className={'bg-white p-[25px] pb-[30px] rounded-[20px] relative'}>
                  <CyDTouchView onPress={() => { setReStakeModalVisible(false); }} className={'z-[50]'}>
                      <CyDImage source={AppImages.CLOSE} className={' w-[22px] h-[22px] z-[50] absolute right-[0px] top-[-10px] '} />
                  </CyDTouchView>
                  <CyDText className={' mt-[10] font-bold text-[22px] text-center '}>{t<string>('RESTAKE_INIT_CAPS')} to {`${validator.name}`}</CyDText>
                  <CyDView className={'flex flex-row mt-[40px]'}>
                      <CyDImage source={AppImages[tokenData.chainDetails.backendName + '_LOGO']} className={'h-[20px] w-[20px]'} />
                      <CyDView className={' flex flex-row'}>
                          <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{`${totalClaimableRewards}`}</CyDText>
                      </CyDView>
                  </CyDView>

                  <CyDView className={'flex flex-row mt-[20px]'}>
                      <CyDImage source={AppImages.GAS_FEES} className={'w-[16px] h-[16px] mt-[3px]'} />
                      <CyDView className={' flex flex-row mt-[3px]'}>
                          <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{t<string>('GAS_FEE')}</CyDText>
                          <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{`${gasFee.toFixed(6)} ${tokenData.name}`}</CyDText>
                      </CyDView>
                  </CyDView>

                  <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
                      <Button onPress={() => {
                        setSignModalVisible(false);
                        void onReStake(CosmosActionType.TRANSACTION);
                      }} title={t<string>('APPROVE')} style={'py-[5%] min-h-[60px]'} loading={loading} loaderStyle={{ height: 30 }} />
                      <Button onPress={() => { setReStakeModalVisible(false); }} title={t<string>('CANCEL')} type={'secondary'} style={'py-[5%] mt-[15px]'} />
                  </CyDView>
              </CyDView>
          </CyDModalLayout>

          <CyDScrollView>
              {totalClaimableRewards === '' && availableToStake === '' && currentlyStaked === '' && totalUnboundings === '' && <EmptyView /> }
              {tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && tokenData.name === CosmosStakingTokens.EVMOS && stakingValidators.stateStaking.myValidatorsListState === STAKING_NOT_EMPTY &&
                <CyDView className={'flex flex-row justify-center items-center w-screen bg-babyPink mt-[10px] py-[10px]'}>
                    <LottieView source={AppImages.GIFT_BOX} autoPlay loop resizeMode="cover" style={isIOS() ? styles.IOSStyle : styles.androidStyle} />
                    <CyDText>{t<string>('NEXT_REWARD_DISTRIBUTION_AT')}<CyDText className={'text-maroon font-black'}>{'  ' + time.hours + ':' + time.min + ':' + time.sec}</CyDText></CyDText>
                  </CyDView>}
              {totalClaimableRewards !== '' &&
                  <CyDView>
                      <CyDView className={'my-[25px] mx-[30px] flex flex-row items-center justify-between'}>
                          <CyDView>
                              <CyDText className={'text-subTextColor font-medium text-[15.5px]'}>{t<string>('TOTAL_CLAIMABLE_REWARDS')}</CyDText>
                              <CyDView className='flex flex-row flex-wrap items-center'>
                                <CyDTokenAmount
                                  className={'text-primaryTextColor font-bold text-[18px]'}
                                  decimalPlaces={5}
                                >
                                  {totalClaimableRewards}
                                </CyDTokenAmount>
                                <CyDText
                                  className={'text-primaryTextColor font-bold text-[18px] ml-[5px]'}>{tokenData.name}
                                </CyDText>
                              </CyDView>
                          </CyDView>
                          <Button
                              onPress={() => {
                                setClaimModal(true);
                              }}
                              disabled={tokenData.chainDetails.backendName === ChainBackendNames.EVMOS ? convertToEvmosFromAevmos(stakingValidators.stateStaking.totalReward) < 0.0001 : cosmosStaking.cosmosStakingState.reward.toString() === '0'}
                              title={'CLAIM'}
                              style={'w-4/12 p-[4%]'} />
                      </CyDView>
                      <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'}></CyDView>
                  </CyDView>}

              {availableToStake !== '' &&
                  <CyDView>
                      <CyDView className={'my-[25px] mx-[30px] flex flex-row items-center justify-between'}>
                          <CyDView>
                              <CyDText className={'text-subTextColor  font-medium text-[15.5px]'}>{t<string>('AVAILABLE_TO_STAKE')}</CyDText>
                              <CyDView className='flex flex-row flex-wrap items-center'>
                                <CyDTokenAmount
                                  className={'text-primaryTextColor font-bold text-[18px]'}
                                  decimalPlaces={5}
                                >
                                    {availableToStake}
                                </CyDTokenAmount>
                                <CyDText
                                  className={'text-primaryTextColor font-bold text-[18px] ml-[5px]'}>{tokenData.name}
                                </CyDText>
                              </CyDView>
                          </CyDView>
                          <Button onPress={() => {
                            if (isBasicCosmosChain(tokenData.chainDetails.backendName)) {
                              navigation.navigate(screenTitle.COSMOS_VALIDATORS, {
                                tokenData,
                                from: CosmosActionType.STAKE
                              });
                            } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
                              navigation.navigate(screenTitle.STAKING_VALIDATORS, {
                                tokenData,
                                typeOfAction: CosmosActionType.STAKE
                              });
                            }
                          }} title={t<string>('STAKE')} style={'w-4/12 p-[4%]'} />
                      </CyDView>
                      <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'}></CyDView>
                  </CyDView>}

              {currentlyStaked !== '' &&
                  <CyDView>
                      <CyDView className={'my-[25px] mx-[30px] flex flex-row items-center justify-between'}>
                          <CyDView>
                              <CyDText className={'text-subTextColor  font-medium text-[15.5px]'}>{t<string>('CURRENTLY_STAKED')}</CyDText>
                              <CyDView className='flex flex-row flex-wrap items-center'>
                                <CyDTokenAmount
                                  className={'text-primaryTextColor font-bold text-[18px]'}
                                  decimalPlaces={5}
                                >
                                    {currentlyStaked}
                                </CyDTokenAmount>
                                <CyDText
                                  className={'text-primaryTextColor font-bold text-[18px] ml-[5px]'}>{tokenData.name}
                                </CyDText>
                              </CyDView>
                          </CyDView>
                          <Button onPress={() => {
                            if (isBasicCosmosChain(tokenData.chainDetails.backendName)) {
                              navigation.navigate(screenTitle.COSMOS_VALIDATORS, {
                                tokenData,
                                from: CosmosActionType.UNSTAKE
                              });
                            } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
                              navigation.navigate(screenTitle.STAKING_VALIDATORS, {
                                tokenData,
                                typeOfAction: CosmosActionType.UNSTAKE
                              });
                            }
                          }} title={t<string>('UNSTAKE')} style={'w-4/12 p-[4%]'} type={'ternary'} />
                      </CyDView>
                      <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'}></CyDView>
                  </CyDView>}

              {totalUnboundings !== '' &&
                  <CyDView>
                      <CyDView className={'my-[25px] mx-[30px] flex flex-row items-center justify-between'}>
                          <CyDView>
                              <CyDText className={'text-subTextColor  font-medium text-[15.5px]'}>{t<string>('TOTAL_UNBOUNDINGS')}</CyDText>
                              <CyDView className='flex flex-row flex-wrap items-center'>
                                <CyDTokenAmount
                                  className={'text-primaryTextColor font-bold text-[18px]'}
                                  decimalPlaces={5}
                                >
                                    {totalUnboundings}
                                </CyDTokenAmount>
                                <CyDText
                                  className={'text-primaryTextColor font-bold text-[18px] ml-[5px]'}>{tokenData.name}
                                </CyDText>
                              </CyDView>
                          </CyDView>
                          <Button onPress={() => {
                            if (isBasicCosmosChain(tokenData.chainDetails.backendName)) {
                              navigation.navigate(screenTitle.COSMOS_UNBOUNDINGS, {
                                tokenData
                              });
                            } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
                              navigation.navigate(screenTitle.UNBOUNDING);
                            }
                          }} title={t<string>('VIEW')} style={'w-4/12 p-[4%]'} />
                      </CyDView>
                      <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'}></CyDView>
                  </CyDView>}

                {!(totalClaimableRewards === '' && availableToStake === '' && currentlyStaked === '' && totalUnboundings === '') && <CyDView className={'bg-[#F6F7FF] rounded-[8px] px-[46px] py-[16px] mx-[16px] my-[18px] flex flex-col items-center'}>
                          <CyDView className={'flex flex-row items-center justify-center'}>
                              <CyDImage source={AppImages.STARS_LEFT} className={'w-[20px] h-[20px]'} />
                              <CyDText className={'text-center w-3/4  text-[14px] font-bold text-secondaryTextColor'}>{`${t<string>('STAKE_YOUR_TEXT')} ${tokenData.name.toLowerCase()} ${t<string>('WITH_US_TEXT')}`}</CyDText>
                              <CyDImage source={AppImages.STARS_RIGHT} className={'w-[20px] h-[20px]'} />
                          </CyDView>
                          {
                              tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && <CyDView className={'flex flex-row mt-[12px] '}>
                                  <CyDText className={'mr-[6px] font-[14px] text-subTextColor font-semibold '}>{t<string>('STAKING_REWARDS_DISTRIBUTED_AT')}</CyDText>
                                  <CyDText className={'font-[16px] text-primaryTextColor font-bold '}>19:00 UTC</CyDText>
                              </CyDView>
                          }
                          <CyDView className={'flex flex-row mt-[12px] '}>
                              <CyDText className={'mr-[6px] font-[14px] text-subTextColor font-semibold '}>{t<string>('UNBOUNDING_PERIOD_IS')}</CyDText>
                              <CyDText className={'font-[16px] text-primaryTextColor font-bold '}>{(tokenData.chainDetails.backendName === ChainBackendNames.EVMOS ? '14 ' : '21 ') + t('DAYS')}</CyDText>
                          </CyDView>
                      </CyDView>}
          </CyDScrollView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
  },

  lottieViewWidth: {
    width: 34
  },

  IOSStyle: {
    width: 30,
    height: 45,
    left: -9,
    top: -7
  },

  androidStyle: {
    width: 30,
    height: 45,
    left: -14,
    top: -10
  }
});
