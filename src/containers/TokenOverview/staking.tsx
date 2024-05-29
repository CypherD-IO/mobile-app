/* eslint-disable no-empty-pattern */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { useIsFocused, useRoute } from '@react-navigation/native';
import { t } from 'i18next';
import React, { useContext, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import Button from '../../components/v2/button';
import AppImages from '../../../assets/images/appImages';
import CyDModalLayout from '../../components/v2/modal';
import { ChainBackendNames, CosmosStakingTokens } from '../../constants/server';
import {
  convertFromUnitAmount,
  isBigIntZero,
  convertToEvmosFromAevmos,
  StakingContext,
  getTimeForDate,
  isBasicCosmosChain,
  HdWalletContext,
  PortfolioContext,
  isABasicCosmosStakingToken,
  isCosmosStakingToken,
  logAnalytics,
  parseErrorMessage,
  _NO_CYPHERD_CREDENTIAL_AVAILABLE_,
} from '../../core/util';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  CosmosActionType,
  CosmosStakingContext,
  COSMOS_STAKING_EMPTY,
} from '../../reducers/cosmosStakingReducer';
import {
  CyDImage,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import LottieView from 'lottie-react-native';
import { GlobalContext } from '../../core/globalContext';
import Toast from 'react-native-toast-message';
import { screenTitle } from '../../constants';
import axios, { MODAL_HIDE_TIMEOUT_250, TIMEOUT } from '../../core/Http';
import { loadPrivateKeyFromKeyChain } from '../../core/Keychain';
import { IIBCData, cosmosConfig } from '../../constants/cosmosConfig';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { PORTFOLIO_REFRESH } from '../../reducers/portfolio_reducer';
import {
  createTxMsgMultipleWithdrawDelegatorReward,
  createTxRawEIP712,
  signatureToWeb3Extension,
} from '@tharsis/transactions';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import { AnalyticsType, TokenOverviewTabIndices } from '../../constants/enum';
import {
  STAKING_EMPTY,
  STAKING_NOT_EMPTY,
} from '../../reducers/stakingReducer';
import { isIOS } from '../../misc/checkers';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import getValidatorsForUSer from '../../core/Staking';
import { getCosmosStakingData } from '../../core/cosmosStaking';
import Loading from '../../components/v2/loading';
import useIsSignable from '../../hooks/useIsSignable';
import { ActivityType } from '../../reducers/activity_reducer';
import { random } from 'lodash';
import useTransactionManager from '../../hooks/useTransactionManager';
import { ethers } from 'ethers';

const EmptyView = () => {
  return (
    <CyDView className={'flex flex-row justify-center'}>
      <CyDView className={'mt-[15%]'}>
        <CyDImage
          source={AppImages.STAKING_EMPTY_ILLUSTRATION}
          className='h-[250px] w-[350px]'
          resizeMode='contain'
        />
        <CyDText className={'text-center text-[24px] font-semibold mt-[20px]'}>
          No holdings yet
        </CyDText>
      </CyDView>
    </CyDView>
  );
};

export default function TokenStaking({
  tokenData,
  navigation,
}: {
  tokenData: TokenMeta;
  navigation: { navigate: (screen: string, {}: unknown) => void };
}) {
  const globalStateContext = useContext<any>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState<boolean>(false);
  const [claimModal, setClaimModal] = useState<boolean>(false);
  const [signModalVisible, setSignModalVisible] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [gasFee, setGasFee] = useState<number>(0);
  const [reward, setReward] = useState<bigint>(BigInt(0));
  const [validator, setValidator] = useState({ name: '', address: '' });
  const [reStakeModalVisible, setReStakeModalVisible] = useState(false);
  const [actionType, setActionType] = useState<CosmosActionType>(
    CosmosActionType.CLAIM,
  );
  const cosmosStaking = useContext<any>(CosmosStakingContext);
  const evmos = hdWalletContext.state.wallet.evmos;
  const stakingValidators = useContext<any>(StakingContext);
  const [time, setTime] = useState({ hours: '0', min: '0', sec: '0' });
  const [finalData, setFinalData] = useState({});
  const [method, setMethod] = useState<string>('');
  const initialStakeVariables = {
    totalClaimableRewards: '0',
    availableToStake: '0',
    currentlyStaked: '0',
    totalUnboundings: '0',
  };
  const [stakingVariables, setStakingVariables] = useState({
    ...initialStakeVariables,
  });
  const [unboundingPeriodInDays, setUnboundingPeriodInDays] =
    useState<number>(14);
  const chain = hdWalletContext.state.wallet[tokenData.chainDetails.chainName];
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  let claimTryCount = 0;

  const { showModal, hideModal } = useGlobalModalContext();
  const { claimCosmosReward, delegateCosmosToken } = useTransactionManager();
  const route = useRoute();
  const isCOSMOSEcoSystem = [
    ChainBackendNames.COSMOS,
    ChainBackendNames.OSMOSIS,
    ChainBackendNames.JUNO,
    ChainBackendNames.EVMOS,
    ChainBackendNames.STARGAZE,
    ChainBackendNames.NOBLE,
  ].includes(tokenData.chainDetails.backendName);
  const currentChain: IIBCData = cosmosConfig[tokenData.chainDetails.chainName];
  const chainAPIURLs = isCOSMOSEcoSystem
    ? globalStateContext.globalState.rpcEndpoints[
        tokenData.chainDetails.chainName.toUpperCase()
      ].otherUrls
    : null;
  let evmosRewardTimer: ReturnType<typeof setInterval>;
  const [isSignableTransaction] = useIsSignable();

  const isStakingDataEmpty = () => {
    return (
      isStakingContextDispatched() &&
      stakingVariables.totalClaimableRewards === '0' &&
      stakingVariables.availableToStake === '0' &&
      stakingVariables.currentlyStaked === '0' &&
      stakingVariables.totalUnboundings === '0'
    );
  };

  const isStakingContextDispatched = (): boolean => {
    return (
      (tokenData.chainDetails.backendName !== ChainBackendNames.EVMOS &&
        cosmosStaking.cosmosStakingState.allValidatorsListState !==
          COSMOS_STAKING_EMPTY) ||
      (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS &&
        stakingValidators.stateStaking.allValidatorsListState !== STAKING_EMPTY)
    );
  };

  useEffect(() => {
    if (isStakingContextDispatched()) {
      const defaultUnboundingPeriod =
        tokenData.chainDetails.backendName === ChainBackendNames.EVMOS ||
        tokenData.chainDetails.backendName === ChainBackendNames.STARGAZE ||
        tokenData.chainDetails.backendName === ChainBackendNames.NOBLE
          ? 14
          : 21;
      const variables = {
        totalClaimableRewards: '0',
        availableToStake: '0',
        currentlyStaked: '0',
        totalUnboundings: '0',
      };
      if (tokenData.chainDetails.backendName !== ChainBackendNames.EVMOS) {
        setUnboundingPeriodInDays(
          cosmosStaking.unboundingPeriodInDays ?? defaultUnboundingPeriod,
        );
        if (
          cosmosStaking.cosmosStakingState.reward.toString() !== '0' ||
          cosmosStaking.cosmosStakingState.userValidators.size > 0
        ) {
          variables.totalClaimableRewards = `${convertFromUnitAmount(
            cosmosStaking.cosmosStakingState.reward.toString(),
            tokenData.contractDecimals,
            6,
          )}`;
        }
        if (cosmosStaking.cosmosStakingState.balance.toString() !== '0') {
          variables.availableToStake = `${convertFromUnitAmount(
            cosmosStaking.cosmosStakingState.balance.toString(),
            tokenData.contractDecimals,
            6,
          )}`;
        }
        if (cosmosStaking.cosmosStakingState.stakedBalance.toString() !== '0') {
          variables.currentlyStaked = `${convertFromUnitAmount(
            cosmosStaking.cosmosStakingState.stakedBalance.toString(),
            tokenData.contractDecimals,
            6,
          )}`;
        }
        if (
          cosmosStaking.cosmosStakingState.unBoundingBalance.toString() !== '0'
        ) {
          variables.totalUnboundings = `${convertFromUnitAmount(
            cosmosStaking.cosmosStakingState.unBoundingBalance.toString(),
            tokenData.contractDecimals,
            6,
          )}`;
        }
      } else {
        setUnboundingPeriodInDays(
          stakingValidators.unboundingPeriodIndDays ?? defaultUnboundingPeriod,
        );
        if (!isBigIntZero(stakingValidators.stateStaking.totalReward)) {
          variables.totalClaimableRewards = `${convertToEvmosFromAevmos(
            stakingValidators.stateStaking.totalReward,
          ).toFixed(6)}`;
        }
        if (!isBigIntZero(stakingValidators.stateStaking.unStakedBalance)) {
          variables.availableToStake = `${convertToEvmosFromAevmos(
            stakingValidators.stateStaking.unStakedBalance,
          ).toFixed(6)}`;
        }
        if (!isBigIntZero(stakingValidators.stateStaking.totalStakedBalance)) {
          variables.currentlyStaked = `${convertToEvmosFromAevmos(
            stakingValidators.stateStaking.totalStakedBalance,
          ).toFixed(6)}`;
        }
        if (!isBigIntZero(stakingValidators.stateStaking.unBoundingTotal)) {
          variables.totalUnboundings = `${convertToEvmosFromAevmos(
            stakingValidators.stateStaking.unBoundingTotal,
          ).toFixed(6)}`;
        }
      }
      setStakingVariables({ ...variables });
      setPageLoading(false);
      setRefreshing(false);
    } else {
      setPageLoading(true);
      setTimeout(() => {
        void getStakingMetaData();
        setPageLoading(false);
      }, TIMEOUT);
    }
  }, [cosmosStaking, stakingValidators]);

  useEffect(() => {
    void analytics().logEvent('visited_staking_page');
    if (isCOSMOSEcoSystem) {
      void getStakingMetaData();
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (!isStakingDataEmpty()) {
        evmosRewardTimer = setInterval(function time() {
          const d = new Date();
          const timeForDate = getTimeForDate(d);
          const hours = timeForDate.hours;
          const min = timeForDate.minutes;
          const sec = timeForDate.seconds;
          setTime({ ...time, hours, min, sec });
        }, 1000);
      }
    }
    return () => {
      clearInterval(evmosRewardTimer);
    };
  }, [isFocused, isStakingDataEmpty()]);

  useEffect(() => {
    if (validator.name !== '') {
      void onReStake(CosmosActionType.SIMULATION);
    }
  }, [validator]);

  const getStakingMetaData = async () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      await getStakingData();
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      await getValidatorsForUSer(
        evmos?.wallets[evmos.currentIndex]?.address,
        stakingValidators,
        globalStateContext,
      );
    }
  };

  const getStakingData = async () => {
    await getCosmosStakingData(
      cosmosStaking.cosmosStakingDispatch,
      globalStateContext.globalState,
      tokenData.chainDetails.backendName,
      chain.wallets[chain.currentIndex].address,
      tokenData.denom,
    );
  };

  const reloadPage = () => {
    setLoading(true);
    if (tokenData.chainDetails.backendName !== ChainBackendNames.EVMOS) {
      setTimeout(() => {
        cosmosStaking.cosmosStakingDispatch({
          allValidatorsListState: COSMOS_STAKING_EMPTY,
        });
      }, MODAL_HIDE_TIMEOUT_250);
    } else {
      setTimeout(() => {
        stakingValidators.dispatchStaking({
          value: {
            allValidatorsListState: STAKING_EMPTY,
          },
        });
      }, MODAL_HIDE_TIMEOUT_250);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void getStakingMetaData();
  };

  const generateTransactionBodyForEVMOSSimulation = async (
    response,
    gasFee = '14000000000000000',
    gasLimit = '700000',
  ) => {
    const chain = {
      chainId: 9001,
      cosmosChainId: 'evmos_9001-2',
    };

    const sender = {
      accountAddress: evmos.wallets[evmos.currentIndex].address,
      sequence: response.sequence,
      accountNumber: response.account_number,
      pubkey: response.pub_key.key,
    };

    const fee = {
      amount: gasFee,
      denom: 'aevmos',
      gas: gasLimit,
    };

    const memo = '';

    const address: string[] = [];
    stakingValidators.stateStaking.myValidators.forEach(val => {
      address.push(val.address);
    });

    const params = { validatorAddresses: address };

    const msg = createTxMsgMultipleWithdrawDelegatorReward(
      chain,
      sender,
      fee,
      memo,
      params,
    );

    const privateKey = await loadPrivateKeyFromKeyChain(
      false,
      hdWalletContext.state.pinValue,
    );
    if (privateKey && privateKey !== _NO_CYPHERD_CREDENTIAL_AVAILABLE_) {
      const privateKeyBuffer = Buffer.from(privateKey.substring(2), 'hex');

      const signature = signTypedData({
        privateKey: privateKeyBuffer,
        data: msg.eipToSign,
        version: SignTypedDataVersion.V4,
      });

      const extension = signatureToWeb3Extension(chain, sender, signature);

      const rawTx = createTxRawEIP712(
        msg.legacyAmino.body,
        msg.legacyAmino.authInfo,
        extension,
      );

      const body = generatePostBodyBroadcast(rawTx);

      return body;
    }
  };

  const txnSimulation = async (method: string) => {
    setLoading(true);
    setMethod(method);
    setReward(stakingValidators.stateStaking.totalReward);

    try {
      const walletURL = chainAPIURLs.accountDetails.replace(
        'address',
        evmos?.wallets[evmos.currentIndex]?.address,
      );
      const accountDetailsResponse = await axios.get(walletURL, {
        timeout: TIMEOUT,
      });
      let sequence =
        Number(accountDetailsResponse.data.account.base_account.sequence) +
        claimTryCount;
      let bodyForSimulate;
      let simulationResponse;
      await analytics().logEvent('evmos_claim_simulation');

      try {
        bodyForSimulate = await generateTransactionBodyForEVMOSSimulation(
          accountDetailsResponse.data.account.base_account,
        );
        simulationResponse = await axios.post(
          chainAPIURLs.simulate,
          bodyForSimulate,
        );
        if (!simulationResponse.data.gas_info.gas_used) {
          throw new Error('sequence doesnt match');
        }
      } catch (e) {
        sequence += 1;
        bodyForSimulate = await generateTransactionBodyForEVMOSSimulation({
          ...accountDetailsResponse.data.account.base_account,
          sequence,
        });
        simulationResponse = await axios.post(
          chainAPIURLs.simulate,
          bodyForSimulate,
        );
      }

      const gasWanted = simulationResponse.data.gas_info.gas_used;

      const bodyForTxn = await generateTransactionBodyForEVMOSSimulation(
        { ...accountDetailsResponse.data.account.base_account, sequence },
        String(cosmosConfig.evmos.gasPrice * gasWanted),
        Math.floor(gasWanted * 1.3).toString(),
      );

      setLoading(false);
      setGasFee(
        parseInt(gasWanted) *
          currentChain.gasPrice *
          10 ** -currentChain.contractDecimal,
      );
      setFinalData(bodyForTxn);
      if (claimTryCount) {
        void finalTxn(bodyForTxn);
      } else {
        setClaimModal(false);
        setLoading(false);
        setTimeout(() => setSignModalVisible(true), MODAL_HIDE_TIMEOUT_250);
      }
    } catch (error: any) {
      setLoading(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: tokenData?.chainDetails?.chainName ?? 'Chain-Missing',
        message: parseErrorMessage(error),
        screen: route.name,
      });
      Toast.show({
        type: t('TOAST_TYPE_ERROR'),
        text1: t('TRANSACTION_FAILED'),
        text2: error.toString(),
        position: 'bottom',
      });
      Sentry.captureException(error);
      void analytics().logEvent('evmos_staking_error', {
        from: `error while ${stakingValidators.stateStaking.typeOfDelegation} in evmos staking/index.tsx`,
      });
    }
  };

  const showNoGasFeeModal = () => {
    setTimeout(() => {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: `You don't have sufficient ${tokenData.chainDetails.symbol} to pay gas fee.`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }, MODAL_HIDE_TIMEOUT_250);
  };

  const finalTxn = async (txnData = finalData) => {
    setSignModalVisible(false);
    if (
      parseFloat(gasFee.toFixed(6)) >
      parseFloat(stakingVariables.availableToStake)
    ) {
      showNoGasFeeModal();
    } else {
      try {
        setPageLoading(true);
        const txnResponse = await axios.post(chainAPIURLs.transact, txnData);

        if (txnResponse.data.tx_response.raw_log === '[]') {
          void analytics().logEvent('evmos_reward_claim_success');
          // monitoring api
          void logAnalytics({
            type: AnalyticsType.SUCCESS,
            txnHash: txnResponse.data.tx_response.txhash,
            chain: tokenData?.chainDetails?.chainName ?? '',
          });
          Toast.show({
            type: t('TOAST_TYPE_SUCCESS'),
            text1: t('TRANSACTION_SUCCESS'),
            text2: txnResponse.data.tx_response.txhash,
            position: 'bottom',
          });
          if (method === CosmosActionType.CLAIM) {
            navigation.navigate(screenTitle.TOKEN_OVERVIEW, {
              tokenData,
              navigateTo: TokenOverviewTabIndices.STAKING,
            });
            setTimeout(() => {
              portfolioState.dispatchPortfolio({
                type: PORTFOLIO_REFRESH,
                value: {
                  hdWallet: hdWalletContext,
                  portfolioState,
                },
              });
            }, TIMEOUT);
            reloadPage();
          } else if (method === CosmosActionType.RESTAKE) {
            navigation.navigate(screenTitle.RESTAKE, {
              tokenData,
              reward,
            });
          }
        } else {
          if (claimTryCount === 0) {
            claimTryCount += 1;
            void txnSimulation(method);
          } else {
            Toast.show({
              type: t('TOAST_TYPE_ERROR'),
              text1: t('TRANSACTION_FAILED'),
              position: 'bottom',
            });
            setPageLoading(false);
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: tokenData?.chainDetails?.chainName ?? '',
              message: `EVMOS staking Error: error while broadcasting the transaction in evmos staking/index.tsx ${txnResponse.data.tx_response.raw_log}`,
              screen: route.name,
            });
            Sentry.captureException(txnResponse);
            void analytics().logEvent('evmos_staking_error', {
              from: `error while broadcasting the transaction in evmos staking/index.tsx ${txnResponse.data.tx_response.raw_log}`,
            });
          }
        }
        setPageLoading(false);
      } catch (error: any) {
        setPageLoading(false);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData?.chainDetails?.chainName ?? '',
          message: parseErrorMessage(error),
          screen: route.name,
        });
        Toast.show({
          type: t('TOAST_TYPE_ERROR'),
          text1: t('TRANSACTION_FAILED'),
          text2: error.toString(),
          position: 'bottom',
        });
        Sentry.captureException(error);
        void analytics().logEvent('evmos_staking_error', {
          from: 'error while broadcasting the transaction in evmos staking/index.tsx',
        });
      }
    }
  };

  const onPressClaim = async (type: CosmosActionType): Promise<void> => {
    if (
      type === CosmosActionType.TRANSACTION &&
      parseFloat(gasFee.toFixed(6)) >
        parseFloat(stakingVariables.availableToStake)
    ) {
      setLoading(true);
      setSignModalVisible(false);
      showNoGasFeeModal();
    } else {
      setLoading(true);

      try {
        let rewardAmount = BigInt(0);

        cosmosStaking.cosmosStakingState.rewardList.forEach((item: any) => {
          const [amountToBeAddedToRewards] = item.amount.split('.');
          rewardAmount += BigInt(amountToBeAddedToRewards);
        });

        setReward(rewardAmount);

        setGasFee(random(0.001, 0.01, true));

        if (CosmosActionType.SIMULATION === type) {
          void analytics().logEvent(`${tokenData.name}_claim_simulation`);
          setClaimModal(false);
          setLoading(false);
          setTimeout(() => setSignModalVisible(true), MODAL_HIDE_TIMEOUT_250);
        }

        if (
          CosmosActionType.TRANSACTION === type ||
          CosmosActionType.RESTAKE === type
        ) {
          const resp = await claimCosmosReward({
            chain: tokenData.chainDetails,
            rewardList: cosmosStaking.cosmosStakingState.rewardList,
          });
          setLoading(false);

          setSignModalVisible(false);
          if (!resp?.isError) {
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: resp?.hash,
              chain: tokenData?.chainDetails?.chainName ?? '',
            });
            Toast.show({
              type: t('TOAST_TYPE_SUCCESS'),
              text1: t('TRANSACTION_SUCCESS'),
              text2: resp?.hash,
              position: 'bottom',
            });
            void analytics().logEvent(
              `${tokenData.name}_claim_transaction_success`,
            );
            if (actionType === CosmosActionType.RESTAKE) {
              setSignModalVisible(false);
              navigation.navigate(screenTitle.COSMOS_REVALIDATOR, {
                validatorData: { name: '', address: '' },
                tokenData,
                setReValidator: setValidator,
                from: screenTitle.TOKEN_OVERVIEW,
              });
            }
          } else {
            Toast.show({
              type: t('TOAST_TYPE_ERROR'),
              text1: t('TRANSACTION_FAILED'),
              text2: resp?.error.message,
              position: 'bottom',
            });
            void analytics().logEvent(
              `${tokenData.name.toLowerCase()}_claim_transaction_failure`,
            );
          }
          setLoading(false);
          reloadPage();
        }
      } catch (error) {
        setLoading(false);
        setClaimModal(false);
        setReStakeModalVisible(false);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData?.chainDetails?.chainName ?? '',
          message: parseErrorMessage(error),
          screen: route.name,
        });
        Sentry.captureException(error);
        Toast.show({
          type: t('TOAST_TYPE_ERROR'),
          text1: t('TRANSACTION_FAILED'),
          text2: error.message,
          position: 'bottom',
        });
        void analytics().logEvent(
          `${tokenData.name}_claim_transaction_failure`,
        );
      }
    }
  };

  const onReStake = async (type: CosmosActionType): Promise<void> => {
    setLoading(true);
    if (
      type === CosmosActionType.TRANSACTION &&
      parseFloat(gasFee.toFixed(6)) >
        parseFloat(stakingVariables.availableToStake)
    ) {
      showNoGasFeeModal();
    } else {
      try {
        setGasFee(random(0.001, 0.01, true));

        if (CosmosActionType.SIMULATION === type) {
          void analytics().logEvent(`${tokenData.name}_restake_simulation`);
          setLoading(false);
          setReStakeModalVisible(true);
        }

        if (CosmosActionType.TRANSACTION === type) {
          const resp = await delegateCosmosToken({
            chain: tokenData.chainDetails,
            validatorAddress: validator.address,
            amount: ethers.formatUnits(reward, tokenData.contractDecimals ?? 6),
          });
          setReStakeModalVisible(false);
          if (!resp?.isError) {
            // monitoring api
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: resp?.hash,
              chain: tokenData?.chainDetails?.chainName ?? '',
            });
            Toast.show({
              type: t('TOAST_TYPE_SUCCESS'),
              text1: t('TRANSACTION_SUCCESS'),
              text2: resp?.hash,
              position: 'bottom',
            });

            void analytics().logEvent(
              `${tokenData.name}_restake_Transaction_success`,
            );
          } else {
            Toast.show({
              type: t('TOAST_TYPE_ERROR'),
              text1: t('TRANSACTION_FAILED'),
              text2: resp?.error.message,
              position: 'bottom',
            });
            void analytics().logEvent(
              `${tokenData.name.toLowerCase()}_claim_transaction_failure`,
            );
          }
          setLoading(false);
          reloadPage();
        }
      } catch (error: any) {
        setLoading(false);
        // monitoring api
        void logAnalytics({
          type: AnalyticsType.ERROR,
          chain: tokenData?.chainDetails?.chainName ?? '',
          message: parseErrorMessage(error),
          screen: route.name,
        });
        Sentry.captureException(error);
        void analytics().logEvent(
          `${tokenData.name}_restake_Transaction_failure`,
        );
        Toast.show({
          type: t('TOAST_TYPE_ERROR'),
          text1: t('TRANSACTION_FAILED'),
          text2: error.message,
          position: 'bottom',
        });
      }
    }
  };

  const onClaim = () => {
    setClaimModal(true);
  };

  const onStake = () => {
    if (isBasicCosmosChain(tokenData.chainDetails.backendName)) {
      navigation.navigate(screenTitle.COSMOS_VALIDATORS, {
        tokenData,
        from: CosmosActionType.STAKE,
      });
    } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
      navigation.navigate(screenTitle.STAKING_VALIDATORS, {
        tokenData,
        typeOfAction: CosmosActionType.STAKE,
      });
    }
  };

  const onUnstake = () => {
    if (isBasicCosmosChain(tokenData.chainDetails.backendName)) {
      navigation.navigate(screenTitle.COSMOS_VALIDATORS, {
        tokenData,
        from: CosmosActionType.UNSTAKE,
      });
    } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
      navigation.navigate(screenTitle.STAKING_VALIDATORS, {
        tokenData,
        typeOfAction: CosmosActionType.UNSTAKE,
      });
    }
  };

  return (
    <CyDSafeAreaView>
      <CyDModalLayout
        setModalVisible={setClaimModal}
        isModalVisible={claimModal}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => setClaimModal(false)}
            className={'z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '}
            />
          </CyDTouchView>
          <CyDView>
            <LottieView
              source={AppImages.NEW}
              autoPlay
              loop
              style={styles.lottieViewWidth}
            />

            <CyDText className={'mt-[10px] font-bold text-[22px]'}>
              {t<string>('HAVE_OPTION_TO_STAKE_REWARDS')}
            </CyDText>
            <CyDView className={'flex flex-row mt-[40px]'}>
              <CyDImage source={AppImages.MONEY_BAG} />
              <CyDView className={' flex flex-row mt-[3px]'}>
                <CyDText className={'text-[16px] font-medium'}>
                  {t<string>('TOTAL_CLAIMABLE_REWARDS')}
                </CyDText>
                <CyDText className={'ml-[10px] text-[18px] font-bold'}>
                  {stakingVariables.totalClaimableRewards}
                </CyDText>
              </CyDView>
            </CyDView>

            {isBasicCosmosChain(tokenData.chainDetails.backendName) && (
              <CyDView className={'flex flex-col mt-[40px] w-[100%]'}>
                <Button
                  onPress={async () => {
                    setActionType(CosmosActionType.RESTAKE);
                    await onPressClaim(CosmosActionType.SIMULATION);
                  }}
                  loading={actionType === CosmosActionType.RESTAKE && loading}
                  loaderStyle={styles.loaderStyle}
                  title={t<string>('RESTAKE')}
                  style={'py-[5%]'}
                />
                <Button
                  onPress={async () => {
                    setActionType(CosmosActionType.CLAIM);
                    await onPressClaim(CosmosActionType.SIMULATION);
                  }}
                  title={t<string>('CLAIM')}
                  type={'secondary'}
                  style={'py-[5%] mt-[15px]'}
                  loading={actionType === CosmosActionType.CLAIM && loading}
                  loaderStyle={styles.loaderStyle}
                />
              </CyDView>
            )}
            {tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && (
              <CyDView className={'flex flex-col mt-[24px] w-[100%]'}>
                <Button
                  onPress={async () => {
                    setActionType(CosmosActionType.RESTAKE);
                    await txnSimulation(CosmosActionType.RESTAKE);
                  }}
                  title={t<string>('RESTAKE')}
                  style={'py-[5%]'}
                  loading={actionType === CosmosActionType.RESTAKE && loading}
                  loaderStyle={styles.loaderStyle}
                />
                <Button
                  onPress={async () => {
                    // setClaimModal(false);
                    setActionType(CosmosActionType.CLAIM);
                    await txnSimulation(CosmosActionType.CLAIM);
                  }}
                  title={t<string>('CLAIM')}
                  type={'secondary'}
                  style={'py-[5%] mt-[15px]'}
                  loading={actionType === CosmosActionType.CLAIM && loading}
                  loaderStyle={styles.loaderStyle}
                />
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <CyDModalLayout
        setModalVisible={setSignModalVisible}
        isModalVisible={signModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => {
              setSignModalVisible(false);
            }}
            className={'z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={' w-[22px] h-[22px] z-[50] absolute right-[0px] '}
            />
          </CyDTouchView>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {t<string>('REWARD')}
          </CyDText>
          <CyDView className={'flex flex-row mt-[40px]'}>
            <CyDImage source={AppImages.MONEY_BAG} />
            <CyDView className={' flex flex-row mt-[3px]'}>
              <CyDText
                className={
                  ' font-medium text-[16px] ml-[5px] text-primaryTextColor'
                }>
                {t<string>('CLAIMABLE_REWARD')}
              </CyDText>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>
                {stakingVariables.totalClaimableRewards}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row mt-[20px]'}>
            <CyDImage
              source={AppImages.GAS_FEES}
              className='h-[16px] w-[16px]'
              resizeMode='contain'
            />
            <CyDView className={' flex flex-row mt-[3px]'}>
              <CyDText
                className={
                  ' font-medium text-[16px] ml-[10px] text-primaryTextColor'
                }>
                {t<string>('GAS_FEE')}
              </CyDText>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>{`${gasFee.toFixed(6)} ${tokenData.name}`}</CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
            <Button
              onPress={async () => {
                isBasicCosmosChain(tokenData.chainDetails.backendName)
                  ? await onPressClaim(CosmosActionType.TRANSACTION)
                  : await finalTxn();
              }}
              title={t<string>('APPROVE')}
              style={'py-[5%]'}
              loading={loading}
              loaderStyle={styles.loaderHeight30}
            />
            <Button
              onPress={() => {
                setSignModalVisible(false);
              }}
              title={t<string>('REJECT')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      <CyDModalLayout
        setModalVisible={setReStakeModalVisible}
        isModalVisible={reStakeModalVisible}
        style={styles.modalLayout}
        animationIn={'slideInUp'}
        animationOut={'slideOutDown'}>
        <CyDView
          className={'bg-white p-[25px] pb-[30px] rounded-t-[20px] relative'}>
          <CyDTouchView
            onPress={() => {
              setReStakeModalVisible(false);
            }}
            className={'z-[50]'}>
            <CyDImage
              source={AppImages.CLOSE}
              className={
                ' w-[22px] h-[22px] z-[50] absolute right-[0px] top-[-10px] '
              }
            />
          </CyDTouchView>
          <CyDText className={' mt-[10px] font-bold text-[22px] text-center '}>
            {t<string>('RESTAKE_INIT_CAPS')} to {`${validator.name}`}
          </CyDText>
          <CyDView className={'flex flex-row mt-[40px]'}>
            <CyDImage
              source={AppImages[tokenData.chainDetails.backendName + '_LOGO']}
              className={'h-[20px] w-[20px]'}
            />
            <CyDView className={' flex flex-row'}>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>{`${stakingVariables.totalClaimableRewards}`}</CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row mt-[20px]'}>
            <CyDImage
              source={AppImages.GAS_FEES}
              className={'w-[16px] h-[16px] mt-[3px]'}
              resizeMode='contain'
            />
            <CyDView className={' flex flex-row mt-[3px]'}>
              <CyDText
                className={
                  ' font-medium text-[16px] ml-[10px] text-primaryTextColor'
                }>
                {t<string>('GAS_FEE')}
              </CyDText>
              <CyDText
                className={
                  ' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'
                }>{`${gasFee.toFixed(6)} ${tokenData.name}`}</CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
            <Button
              onPress={() => {
                setSignModalVisible(false);
                void onReStake(CosmosActionType.TRANSACTION);
              }}
              title={t<string>('APPROVE')}
              style={'py-[5%] min-h-[60px]'}
              loading={loading}
              loaderStyle={styles.loaderHeight30}
            />
            <Button
              onPress={() => {
                setReStakeModalVisible(false);
              }}
              title={t<string>('CANCEL')}
              type={'secondary'}
              style={'py-[5%] mt-[15px]'}
            />
          </CyDView>
        </CyDView>
      </CyDModalLayout>

      {pageLoading ? (
        <Loading />
      ) : (
        <CyDScrollView
          refreshControl={
            <RefreshControl
              enabled={true}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }>
          {tokenData.chainDetails.backendName === ChainBackendNames.EVMOS &&
            tokenData.name === CosmosStakingTokens.EVMOS &&
            stakingValidators.stateStaking.myValidatorsListState ===
              STAKING_NOT_EMPTY && (
              <CyDView
                className={
                  'flex flex-row justify-center items-center w-screen bg-babyPink mt-[10px] py-[10px]'
                }>
                <LottieView
                  source={AppImages.GIFT_BOX}
                  autoPlay
                  loop
                  resizeMode='cover'
                  style={isIOS() ? styles.IOSStyle : styles.androidStyle}
                />
                <CyDText>
                  {t<string>('NEXT_REWARD_DISTRIBUTION_AT')}
                  <CyDText className={'text-maroon font-black'}>
                    {'  ' + time.hours + ':' + time.min + ':' + time.sec}
                  </CyDText>
                </CyDText>
              </CyDView>
            )}
          {stakingVariables.totalClaimableRewards !== '0' && (
            <CyDView>
              <CyDView
                className={
                  'my-[25px] mx-[30px] flex flex-row items-center justify-between'
                }>
                <CyDView>
                  <CyDText
                    className={'text-subTextColor font-medium text-[15.5px]'}>
                    {t<string>('TOTAL_CLAIMABLE_REWARDS')}
                  </CyDText>
                  <CyDView className='flex flex-row flex-wrap items-center'>
                    <CyDTokenAmount
                      className={'text-primaryTextColor font-bold text-[18px]'}
                      decimalPlaces={5}>
                      {stakingVariables.totalClaimableRewards}
                    </CyDTokenAmount>
                    <CyDText
                      className={
                        'text-primaryTextColor font-bold text-[18px] ml-[5px]'
                      }>
                      {tokenData.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <Button
                  onPress={() => {
                    isSignableTransaction(ActivityType.CLAIM, onClaim);
                  }}
                  disabled={
                    tokenData.chainDetails.backendName ===
                    ChainBackendNames.EVMOS
                      ? convertToEvmosFromAevmos(
                          stakingValidators.stateStaking.totalReward,
                        ) < 0.0001
                      : cosmosStaking.cosmosStakingState.reward.toString() ===
                        '0'
                  }
                  title={'CLAIM'}
                  isPrivateKeyDependent={true}
                  style={'w-4/12 p-[4%]'}
                />
              </CyDView>
              <CyDView className={'w-10/12 h-[1px] bg-[#F4F4F4] mx-[30px]'} />
            </CyDView>
          )}

          {stakingVariables.availableToStake !== '0' &&
            (stakingVariables.currentlyStaked !== '0' ||
              stakingVariables.totalClaimableRewards !== '0' ||
              stakingVariables.totalUnboundings !== '0') && (
              <CyDView>
                <CyDView
                  className={
                    'my-[25px] mx-[30px] flex flex-row items-center justify-between'
                  }>
                  <CyDView>
                    <CyDText
                      className={
                        'text-subTextColor  font-medium text-[15.5px]'
                      }>
                      {t<string>('AVAILABLE_TO_STAKE')}
                    </CyDText>
                    <CyDView className='flex flex-row flex-wrap items-center'>
                      <CyDTokenAmount
                        className={
                          'text-primaryTextColor font-bold text-[18px]'
                        }
                        decimalPlaces={5}>
                        {stakingVariables.availableToStake}
                      </CyDTokenAmount>
                      <CyDText
                        className={
                          'text-primaryTextColor font-bold text-[18px] ml-[5px]'
                        }>
                        {tokenData.name}
                      </CyDText>
                    </CyDView>
                  </CyDView>
                  <Button
                    onPress={() => {
                      isSignableTransaction(ActivityType.STAKE, onStake);
                    }}
                    title={t<string>('STAKE_TITLE')}
                    isPrivateKeyDependent={true}
                    style={'w-4/12 p-[4%]'}
                  />
                </CyDView>
                <CyDView className={'w-10/12 h-[1px] bg-[#F4F4F4] mx-[30px]'} />
              </CyDView>
            )}

          {stakingVariables.currentlyStaked !== '0' && (
            <CyDView>
              <CyDView
                className={
                  'my-[25px] mx-[30px] flex flex-row items-center justify-between'
                }>
                <CyDView>
                  <CyDText
                    className={'text-subTextColor  font-medium text-[15.5px]'}>
                    {t<string>('CURRENTLY_STAKED')}
                  </CyDText>
                  <CyDView className='flex flex-row flex-wrap items-center'>
                    <CyDTokenAmount
                      className={'text-primaryTextColor font-bold text-[18px]'}
                      decimalPlaces={5}>
                      {stakingVariables.currentlyStaked}
                    </CyDTokenAmount>
                    <CyDText
                      className={
                        'text-primaryTextColor font-bold text-[18px] ml-[5px]'
                      }>
                      {tokenData.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <Button
                  onPress={() => {
                    isSignableTransaction(ActivityType.UNSTAKE, onUnstake);
                  }}
                  title={t<string>('UNSTAKE')}
                  isPrivateKeyDependent={true}
                  style={'w-4/11 p-[4%]'}
                  type={'ternary'}
                />
              </CyDView>
              <CyDView className={'w-10/12 h-[1px] bg-[#F4F4F4] mx-[30px]'} />
            </CyDView>
          )}

          {stakingVariables.totalUnboundings !== '0' && (
            <CyDView>
              <CyDView
                className={
                  'my-[25px] mx-[30px] flex flex-row items-center justify-between'
                }>
                <CyDView>
                  <CyDText
                    className={'text-subTextColor  font-medium text-[15.5px]'}>
                    {t<string>('TOTAL_UNBOUNDINGS')}
                  </CyDText>
                  <CyDView className='flex flex-row flex-wrap items-center'>
                    <CyDTokenAmount
                      className={'text-primaryTextColor font-bold text-[18px]'}
                      decimalPlaces={5}>
                      {stakingVariables.totalUnboundings}
                    </CyDTokenAmount>
                    <CyDText
                      className={
                        'text-primaryTextColor font-bold text-[18px] ml-[5px]'
                      }>
                      {tokenData.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <Button
                  onPress={() => {
                    if (
                      isBasicCosmosChain(tokenData.chainDetails.backendName)
                    ) {
                      navigation.navigate(screenTitle.COSMOS_UNBOUNDINGS, {
                        tokenData,
                      });
                    } else if (
                      tokenData.chainDetails.backendName ===
                      ChainBackendNames.EVMOS
                    ) {
                      navigation.navigate(screenTitle.UNBOUNDING);
                    }
                  }}
                  title={t<string>('VIEW')}
                  style={'w-4/12 p-[4%]'}
                />
              </CyDView>
              <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'} />
            </CyDView>
          )}

          {stakingVariables.availableToStake !== '0' &&
            stakingVariables.currentlyStaked === '0' &&
            stakingVariables.totalClaimableRewards === '0' &&
            stakingVariables.totalUnboundings === '0' && (
              <CyDView className={'flex justify-center items-center mt-[80px]'}>
                <CyDImage
                  source={AppImages.STAKING_EMPTY_ILLUSTRATION}
                  className='h-[250px] w-[350px]'
                  resizeMode='contain'
                />
                <CyDText
                  className={
                    'text-center w-3/4  text-[20px] font-semibold text-secondaryTextColor'
                  }>{`${t<string>(
                  'STAKE_YOUR_TEXT',
                )} ${tokenData.name.toLowerCase()} ${t<string>(
                  'WITH_US_TEXT',
                )}`}</CyDText>
                <Button
                  onPress={() => {
                    isSignableTransaction(ActivityType.STAKE, onStake);
                  }}
                  title={t<string>('STAKE_NOW')}
                  isPrivateKeyDependent={true}
                  style={'w-1/2 mt-[20px] mb-[30px] p-[4%]'}
                />
                <CyDView>
                  <CyDView className='flex flex-row'>
                    <CyDText
                      className={
                        'text-subTextColor  font-medium text-[15.5px]'
                      }>{`${t<string>('AVAILABLE_TO_STAKE')}: `}</CyDText>
                    <CyDTokenAmount
                      className={
                        'text-primaryTextColor font-bold text-[15.5px] ml-[2px]'
                      }
                      decimalPlaces={5}>
                      {stakingVariables.availableToStake}
                    </CyDTokenAmount>
                    <CyDText
                      className={
                        'text-primaryTextColor font-bold text-[15.5px] ml-[5px]'
                      }>
                      {tokenData.name}
                    </CyDText>
                  </CyDView>
                </CyDView>
              </CyDView>
            )}

          {(stakingVariables.totalClaimableRewards !== '0' ||
            stakingVariables.currentlyStaked !== '0' ||
            stakingVariables.totalUnboundings !== '0') && (
            <CyDView
              className={
                'bg-[#F6F7FF] rounded-[8px] px-[46px] py-[16px] mx-[16px] my-[18px] flex flex-col items-center'
              }>
              <CyDView className={'flex flex-row items-center justify-center'}>
                <CyDImage
                  source={AppImages.STARS_LEFT}
                  className={'w-[20px] h-[20px]'}
                />
                <CyDText
                  className={
                    'text-center w-3/4  text-[14px] font-bold text-secondaryTextColor'
                  }>{`${t<string>(
                  'STAKE_YOUR_TEXT',
                )} ${tokenData.name.toLowerCase()} ${t<string>(
                  'WITH_US_TEXT',
                )}`}</CyDText>
                <CyDImage
                  source={AppImages.STARS_RIGHT}
                  className={'w-[20px] h-[20px]'}
                />
              </CyDView>

              {tokenData.chainDetails.backendName ===
                ChainBackendNames.EVMOS && (
                <CyDView className={'flex flex-row mt-[12px] '}>
                  <CyDText
                    className={
                      'mr-[6px] font-[14px] text-subTextColor font-semibold '
                    }>
                    {t<string>('STAKING_REWARDS_DISTRIBUTED_AT')}
                  </CyDText>
                  <CyDText
                    className={'font-[16px] text-primaryTextColor font-bold '}>
                    19:00 UTC
                  </CyDText>
                </CyDView>
              )}

              <CyDView className={'flex flex-row mt-[12px] '}>
                <CyDText
                  className={
                    'mr-[6px] font-[14px] text-subTextColor font-semibold '
                  }>
                  {t<string>('UNBOUNDING_PERIOD_IS')}
                </CyDText>
                <CyDText
                  className={'font-[16px] text-primaryTextColor font-bold '}>
                  {unboundingPeriodInDays} {t('DAYS')}
                </CyDText>
              </CyDView>
            </CyDView>
          )}

          {!pageLoading && isStakingDataEmpty() && <EmptyView />}
        </CyDScrollView>
      )}
    </CyDSafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end',
  },

  lottieViewWidth: {
    width: 34,
  },

  IOSStyle: {
    width: 30,
    height: 45,
    left: -9,
    top: -7,
  },

  androidStyle: {
    width: 30,
    height: 45,
    left: -14,
    top: -10,
  },

  loaderStyle: {
    height: 22,
  },

  loaderHeight30: {
    height: 24,
  },
});
