import { OfflineDirectSigner } from '@cosmjs-rn/proto-signing';
import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { BackHandler, Dimensions, RefreshControl, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import TokenSummary from '../../components/v2/tokenSummary';
import HTML from 'react-native-render-html';
import {
  ChainBackendNames,
  ChainNames,
  CHAIN_OPTIMISM,
  CosmosStakingTokens,
  FundWalletAddressType
} from '../../constants/server';
import { getCosmosStakingData } from '../../core/cosmosStaking';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import {
  convertAmountOfContractDecimal,
  convertFromUnitAmount,
  convertToEvmosFromAevmos,
  getExplorerUrl,
  getTimeForDate,
  HdWalletContext,
  isBigIntZero,
  PortfolioContext,
  StakingContext
} from '../../core/util';
import {
  COSMOS_STAKING_ERROR,
  COSMOS_STAKING_LOADING,
  CosmosActionType,
  CosmosStakingContext,
  cosmosStakingContextDef
} from '../../reducers/cosmosStakingReducer';
import { CyDFastImage, CyDImage, CyDScrollView, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import Loading from '../../components/v2/loading';
import getValidatorsForUSer from '../../core/Staking';
import { STAKING_EMPTY, STAKING_NOT_EMPTY } from '../../reducers/stakingReducer';
import axios from 'axios';
import { showToast } from '../utilities/toastUtility';
import * as Sentry from '@sentry/react-native';
import AppImages from '../../../assets/images/appImages';
import * as C from '../../constants';
import { screenTitle } from '../../constants';
import LottieView from 'lottie-react-native';
import SwitchView from '../../components/v2/switchView';
import CyDModalLayout from '../../components/v2/modal';
import Button from '../../components/v2/button';
import Toast from 'react-native-toast-message';
import { getSignerClient } from '../../core/Keychain';
import { SigningStargateClient } from '@cosmjs-rn/stargate';
import { cosmosConfig, IIBCData } from '../../constants/cosmosConfig';
import analytics from '@react-native-firebase/analytics';
import WebView from 'react-native-webview';
import EmptyView from '../../components/EmptyView';
import {
  createTxMsgMultipleWithdrawDelegatorReward,
  createTxRawEIP712,
  signatureToWeb3Extension
} from '@tharsis/transactions';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { generatePostBodyBroadcast } from '@tharsis/provider';
import clsx from 'clsx';
import { PORTFOLIO_REFRESH } from '../../reducers/portfolio_reducer';
import { TokenFunctionality } from '../../constants/enum';
import { MODAL_HIDE_TIMEOUT_250, TIMEOUT, PORTFOLIO_TIMEOUT } from '../../core/Http';
import { isIOS } from '../../misc/checkers';
import { hostWorker } from '../../global';
import { ethers } from 'ethers';
import { Colors } from '../../constants/theme';
import CyDTokenAmount from '../../components/v2/tokenAmount';

function TokenOverview ({ route, navigation }) {
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { tokenData } = route.params;
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');

  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });

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
  const chain = hdWalletContext.state.wallet[tokenData.chainDetails.chainName];

  const cosmosStaking = useContext<cosmosStakingContextDef>(CosmosStakingContext);

  const evmos = hdWalletContext.state.wallet.evmos;
  const ethereum = hdWalletContext.state.wallet.ethereum;
  const stakingValidators = useContext<any>(StakingContext);
  const [time, setTime] = useState({ hours: '0', min: '0', sec: '0' });
  const [finalData, setFinalData] = useState({});
  const [method, setMethod] = useState<string>('');

  const hdWallet = useContext<any>(HdWalletContext);
  const [transactionList, setTransactionList] = useState<any[]>([]);
  const [lastPage, setLastPage] = useState<boolean>(false);
  const [noTransaction, setNoTransaction] = useState<boolean>(false);
  const [loadMoreAbout, setLoadMoreAbout] = useState<boolean>(true);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const { cosmos, osmosis, juno, stargaze, noble } = hdWallet.state.wallet;

  const [index, setIndex] = useState(0);
  const [valueChange, setValueChange] = useState(false);

  const [tokenFunctionalities, setTokenFunctionalities] = useState<string[]>([]);
  const [selectedTokenFunctionality, setSelectedTokenFunctionality] = useState<string>('');

  const [totalClaimableRewards, setTotalClaimableRewards] = useState<string>('');
  const [availableToStake, setAvailableToStake] = useState<string>('');
  const [currentlyStaked, setCurrentlyStaked] = useState<string>('');
  const [totalUnboundings, setTotalUnboundings] = useState<string>('');

  const isCOSMOSEcoSystem = [ChainBackendNames.COSMOS, ChainBackendNames.OSMOSIS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE, ChainBackendNames.NOBLE].includes(tokenData.chainDetails.backendName);
  const currentChain: IIBCData = cosmosConfig[tokenData.chainDetails.chainName];
  const chainAPIURLs = isCOSMOSEcoSystem ? globalStateContext.globalState.rpcEndpoints[tokenData.chainDetails.chainName.toUpperCase()].otherUrls : null;

  // Condition checking functions
  const isBasicCosmosChain = (backendName: string) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE, ChainBackendNames.NOBLE].includes(backendName);

  const isEvmosChain = (backendName: string) => ChainBackendNames.EVMOS === backendName;

  const isCosmosChain = (backendName: string) => isBasicCosmosChain(backendName) || isEvmosChain(backendName);

  const isCosmosStakingToken = (chain: string, tokenData: any) => tokenData.chainDetails.backendName === ChainBackendNames[chain as ChainBackendNames] && tokenData.name === CosmosStakingTokens[chain as CosmosStakingTokens];

  const isACosmosStakingToken = (tokenData: any) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.EVMOS, ChainBackendNames.STARGAZE].some(chain => isCosmosStakingToken(chain as string, tokenData));

  const isABasicCosmosStakingToken = (tokenData: any) => [ChainBackendNames.OSMOSIS, ChainBackendNames.COSMOS, ChainBackendNames.JUNO, ChainBackendNames.STARGAZE, ChainBackendNames.NOBLE].some(chain => isCosmosStakingToken(chain as string, tokenData));

  const canShowIBC = globalStateContext.globalState.ibc && (isBasicCosmosChain(tokenData.chainDetails.backendName) || (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && (tokenData.name === CosmosStakingTokens.EVMOS || tokenData.name.includes('IBC'))));

  const canShowBridge = tokenData.isVerified && (ChainNames.ETH === tokenData.chainDetails.chainName || isACosmosStakingToken(tokenData));

  const handleBackButton = () => {
    navigation.goBack();
    return true;
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
          navigation.navigate(C.screenTitle.TOKEN_OVERVIEW, {
            tokenData
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
          navigation.navigate(C.screenTitle.RESTAKE, {
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

  const getStakingData = async () => {
    await getCosmosStakingData(
      cosmosStaking.cosmosStakingDispatch,
      globalStateContext.globalState,
      tokenData.chainDetails.backendName,
      chain.wallets[chain.currentIndex].address
    );
  };

  async function fetchData (isPullToRefresh?) {
    let inputPageNumber = pageNumber;
    if (isPullToRefresh) {
      inputPageNumber = 0;
    }

    const getTransactionUrl = `${ARCH_HOST}/v1/portfolio/transactions`;

    await axios
      .post(getTransactionUrl,
        {
          address: hdWallet.state.wallet.ethereum.address,
          chain: tokenData.chainDetails.backendName,
          tokenAddress: tokenData.contractAddress,
          pageNumber: inputPageNumber,
          pageSize: 20
        },
        {
          timeout: PORTFOLIO_TIMEOUT
        })
      .then(res => {
        const len = Object.keys(res.data.transactions).length;
        if (res.data.has_more === false) {
          if (inputPageNumber === 0 && len === 0) {
            setNoTransaction(true);
          } else {
            setLastPage(true);
          }
        }
        if (len > 0) {
          const out = [];
          let i = transactionList.length + 1;
          for (const txn of res.data.transactions) {
            txn.id = i;
            out.push(txn);
            i++;
          }
          setPageNumber(inputPageNumber + 1);
          isPullToRefresh ? setTransactionList(out) : setTransactionList(transactionList.concat(out));
        }

        setLoading(false);
      })
      .catch(error => {
        showToast(t('ERROR_RETRIEVING_TRANSACTIONS'));
        Sentry.captureException(error);
      });
  }

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

      let senderAddress: any = await wallet.getAccounts();
      senderAddress = senderAddress[0].address;

      const client = await SigningStargateClient.connectWithSigner(
        rpc,
        wallet,
        {
          prefix: currentChain.prefix
        }
      );

      const msgList: Array<{typeUrl: string, value: {delegatorAddress: string, validatorAddress: string}}> = [];
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

  const resetStakeVariables = () => {
    setTotalClaimableRewards('');
    setAvailableToStake('');
    setCurrentlyStaked('');
    setTotalUnboundings('');
  };

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
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    navigation.setOptions({
      title: tokenData.chainDetails.backendName
    });
    const getInitialData = async () => {
      setLoading(true);

      if (isABasicCosmosStakingToken(tokenData)) {
        setTokenFunctionalities([TokenFunctionality.STAKING, TokenFunctionality.TRANSACTIONS, TokenFunctionality.ABOUT]);
        if (selectedTokenFunctionality === '') setSelectedTokenFunctionality(TokenFunctionality.STAKING);
        await getStakingData();
        setLoading(false);
      } else if (isCosmosStakingToken('EVMOS', tokenData)) {
        setTokenFunctionalities([TokenFunctionality.STAKING, TokenFunctionality.TRANSACTIONS, TokenFunctionality.ABOUT]);
        if (selectedTokenFunctionality === '') setSelectedTokenFunctionality(TokenFunctionality.STAKING);
        await getValidatorsForUSer(evmos.wallets[evmos.currentIndex].address, stakingValidators, globalStateContext);
        setLoading(false);
      } else {
        setTokenFunctionalities([TokenFunctionality.TRANSACTIONS, TokenFunctionality.ABOUT]);
        if (selectedTokenFunctionality === '') setSelectedTokenFunctionality(TokenFunctionality.TRANSACTIONS);
        setLoading(false);
      }
      if ((tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && !tokenData.name.includes('IBC')) || (tokenData.chainDetails.chainName === ChainNames.ETH && tokenData.chainDetails.backendName !== CHAIN_OPTIMISM.backendName)) {
        await fetchData();
      }
    };

    if (isFocused) getInitialData().catch(e => {});

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

  const onRefresh = async () => {
    setRefreshing(true);
    if (isABasicCosmosStakingToken(tokenData)) {
      await getStakingData();
    } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && tokenData.name === CosmosStakingTokens.EVMOS) {
      await getValidatorsForUSer(evmos.wallets[evmos.currentIndex].address, stakingValidators, globalStateContext);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, TIMEOUT);
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

  const getTotalTokens = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      return `${convertFromUnitAmount((cosmosStaking.cosmosStakingState.balance + cosmosStaking.cosmosStakingState.stakedBalance).toString(), tokenData.contractDecimals)}`;
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      return `${convertToEvmosFromAevmos(stakingValidators.stateStaking.totalStakedBalance + stakingValidators.stateStaking.unStakedBalance + stakingValidators.stateStaking.unBoundingTotal).toFixed(6).toString()}`;
    } else {
      return tokenData.actualBalance;
    }
  };

  const getTokenName = () => {
    if (isCosmosStakingToken('EVMOS', tokenData)) {
      return 'EVMOS';
    }
    return tokenData.name;
  };

  const getTotalValue = () => {
    if (isABasicCosmosStakingToken(tokenData)) {
      return tokenData.price * +(convertFromUnitAmount((cosmosStaking.cosmosStakingState.balance + cosmosStaking.cosmosStakingState.stakedBalance).toString(), tokenData.contractDecimals));
    } else if (isCosmosStakingToken('EVMOS', tokenData)) {
      return tokenData.price * convertToEvmosFromAevmos(stakingValidators.stateStaking.totalStakedBalance + stakingValidators.stateStaking.unStakedBalance + stakingValidators.stateStaking.unBoundingTotal);
    } else {
      return tokenData.totalValue;
    }
  };

  const getTokenPrice = () => {
    return currencyFormatter.format(tokenData.price, tokenData.contract_decimals).toString();
  };

  if (isABasicCosmosStakingToken(tokenData)) {
    if (cosmosStaking.cosmosStakingState.status === COSMOS_STAKING_LOADING) {
      return <Loading />;
    }

    if (cosmosStaking.cosmosStakingState.status === COSMOS_STAKING_ERROR) {
      return (
      <CyDView
        className={'flex justify-center items-center bg-white h-full w-full'}
      >
        <LottieView
          source={AppImages.ERROR}
          autoPlay
          loop
          style={{ height: 150, width: 150 }}
        />
      </CyDView>
      );
    }
  } else if (isCosmosStakingToken('EVMOS', tokenData)) {
    if (stakingValidators.stateStaking.allValidatorsListState === STAKING_EMPTY) {
      return <Loading />;
    }
  }

  const renderersProps = {
    a: {
      onPress: (event: any, href: string) => {
        navigation.navigate(C.screenTitle.GEN_WEBVIEW, {
          url: href
        });
      }
    }
  };

  const calculateTime = function time (ttime: string) {
    const ms = Date.parse(String(new Date())) - Date.parse(ttime);
    const seconds: number = Number.parseInt((ms / 1000).toFixed(0));
    const minutes: number = Number.parseInt((ms / (1000 * 60)).toFixed(0));
    const hours: number = Number.parseInt((ms / (1000 * 60 * 60)).toFixed(0));
    const days: number = Number.parseInt((ms / (1000 * 60 * 60 * 24)).toFixed(0));
    if (seconds < 60) return seconds.toString() + ' Sec ago';
    else if (minutes < 60) return minutes.toString() + ' Min ago';
    else if (hours === 1) return hours.toString() + ' Hr ago';
    else if (hours < 24) return hours.toString() + ' Hrs ago';
    else if (days === 1) return days.toString() + ' Day ago';
    else if (days < 6) return days.toString() + ' Days ago';
    else return ttime?.split('T')[0];
  };

  const renderTransactionStatusImage = (transaction) => {
    if (transaction.status) {
      return transaction.direction === 'TO' ? AppImages.DEPOSIT : AppImages.SEND;
    } else {
      return AppImages.CROSS_PINK;
    }
  };

  const Item = ({ item }) => {
    return <>
      <CyDTouchView sentry-label='txn-detail-explorer' className={'flex flex-row py-[8px] justify-between'} onPress={() => {
        navigation.navigate(C.screenTitle.TRANS_DETAIL, {
          url: getExplorerUrl(tokenData.chainDetails.symbol, tokenData.chainDetails.name, item?.txnHash)
        });
      }}>
        <CyDView className={'flex flex-row h-[54px] rounded-[20px]'}>
          <CyDView className={clsx('flex flex-row h-[25px] w-[25px] items-center justify-center bg-paleGrey rounded-[20px]', {
            'bg-paleGrey': item?.status === true,
            'bg-babyPink': item?.status === false
          })}>
            <CyDFastImage className={'h-[12px] w-[12px]'}
              source={renderTransactionStatusImage(item)} />
          </CyDView>
          <CyDView className={'w-[140px] h-[54px] items-start flex flex-column justify-center px-[8px] mt-[-8px]'}>
            <CyDText className={'w-[100px] font-bold text-[15px] text-primaryTextColor'}>{
              item?.txnHash?.substring(0, 3) + '...' + item?.txnHash?.substring(item?.txnHash?.length - 4, item?.txnHash?.length)}</CyDText>
            <CyDText className={'font-bold text-[13px] text-subTextColor'}>{calculateTime(item?.date)}</CyDText>
          </CyDView>
        </CyDView>
        <CyDView className={'h-[54px] flex flex-row justify-center'}>
          <CyDView className={'flex flex-column w-[150px] h-[54px] items-end justify-center'}>
            <CyDText className={clsx('font-black text-[15px]', { 'text-primaryTextColor': item?.status && item?.direction === 'TO', 'text-toastColor': item?.status && item?.direction === 'TO', 'text-pinkCyD': !item?.status })}>{item?.direction === 'TO' ? '+' : '-'}{item?.tokenQuantity} {item?.tokenSymbol}</CyDText>
            <CyDText className={'text-[12px] text-[subTextColor]'}>{(item?.tokenQuantity * tokenData.price).toFixed(2).toString() + ' USD'}</CyDText>
            {!item?.status && <CyDText className={'text-[10px] font-bold text-pinkCyD mb-[12px]'}>{t<string>('TRANSACTION_FAILED')}</CyDText>}
          </CyDView>
        </CyDView>
      </CyDTouchView>
      <CyDView className={'h-[1px] w-100 bg-portfolioBorderColor mt-[-10px] mb-[10px]'} />
    </>;
  };

  const renderItem = (item) => {
    return <Item item={item} />;
  };

  const browserView = (chain: string) => {
    if (chain === ChainBackendNames.COSMOS) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
            <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
              <WebView
                nestedScrollEnabled
                originWhitelist={['*']}
                source={{ uri: `https://www.mintscan.io/cosmos/account/${cosmos.wallets[cosmos.currentIndex].address}` }}
                startInLoadingState={true}
                scalesPageToFit={true} />
            </CyDView></>
      );
    } else if (chain === ChainBackendNames.OSMOSIS) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
          <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
            <WebView
              nestedScrollEnabled
              originWhitelist={['*']}
              source={{ uri: `https://www.mintscan.io/osmosis/account/${osmosis.wallets[osmosis.currentIndex].address}` }}
              startInLoadingState={true}
              scalesPageToFit={true} />
          </CyDView></>
      );
    } else if (chain === ChainBackendNames.JUNO) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
        <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
          <WebView
            nestedScrollEnabled
            originWhitelist={['*']}
            source={{ uri: `https://www.mintscan.io/juno/account/${juno.wallets[juno.currentIndex].address}` }}
            startInLoadingState={true}
            scalesPageToFit={true} />
        </CyDView></>
      );
    } else if (chain === ChainBackendNames.EVMOS) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
        <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
          <WebView
            nestedScrollEnabled
            originWhitelist={['*']}
            source={{ uri: `https://www.mintscan.io/evmos/account/${evmos.address}` }}
            startInLoadingState={true}
            scalesPageToFit={true} />
        </CyDView></>
      );
    } else if (chain === ChainBackendNames.STARGAZE) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
        <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
          <WebView
            nestedScrollEnabled
            originWhitelist={['*']}
            source={{ uri: `https://www.mintscan.io/stargaze/account/${stargaze.address}` }}
            startInLoadingState={true}
            scalesPageToFit={true} />
        </CyDView></>
      );
    } else if (chain === ChainBackendNames.NOBLE) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
        <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
          <WebView
            nestedScrollEnabled
            originWhitelist={['*']}
            source={{ uri: `https://www.mintscan.io/noble/account/${noble.address}` }}
            startInLoadingState={true}
            scalesPageToFit={true} />
        </CyDView></>
      );
    } else if (chain === ChainBackendNames.OPTIMISM) {
      return (
        <><CyDView className={'my-[6px] bg-portfolioBorderColor'} />
        <CyDView className={'h-[510px] w-[360px] overflow-scroll'}>
          <WebView
            nestedScrollEnabled
            originWhitelist={['*']}
            source={{ uri: (tokenData.name === 'Optimism Mainnet Ether') ? `https://optimistic.etherscan.io/address/${ethereum.address}` : `https://optimistic.etherscan.io/address/${ethereum.address}#tokentxns` }}
            startInLoadingState={true}
            scalesPageToFit={true} />
        </CyDView></>
      );
    }
  };

  const emptyView = () => {
    return (
      <CyDView className={'h-[70px] bg-whiteColor flex flex-row items-center justify-center mt-[100px]'}>
        <EmptyView
          text={t<string>('EMPTY_TRANSCATION_DETAIL_MSG')}
          image={AppImages.EMPTY}
          buyVisible={false}
          marginTop={0}
        />
      </CyDView>
    );
  };

  return (
    <><CyDScrollView className={'w-full h-full bg-white'} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

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
                style={{ width: 34 }}
              />

              <CyDText className={'mt-[10] font-bold text-[22px]'}>
                {t<string>('HAVE_OPTION_TO_STAKE_REWARDS')}
              </CyDText>
              <CyDView className={'flex flex-row mt-[40px]'}>
                <CyDImage source={AppImages.MONEY_BAG}/>
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
                }} title={t<string>('CLAIM')} type={'secondary'} style={'py-[5%] mt-[15px]'} loading={actionType === CosmosActionType.CLAIM && loading} loaderStyle={{ height: 22 }}/>
              </CyDView>}
              {tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && <CyDView className={'flex flex-col mt-[24px] w-[100%]'}>
                <Button onPress={async () => {
                  setActionType(CosmosActionType.RESTAKE);
                  await txnSimulation(CosmosActionType.RESTAKE);
                }} title={t<string>('RESTAKE')} style={'py-[5%]'} loading={actionType === CosmosActionType.RESTAKE && loading} loaderStyle={{ height: 22 }}/>
                <Button onPress={async () => {
                  // setClaimModal(false);
                  setActionType(CosmosActionType.CLAIM);
                  await txnSimulation(CosmosActionType.CLAIM);
                }} title={t<string>('CLAIM')} type={'secondary'} style={'py-[5%] mt-[15px]'} loading={actionType === CosmosActionType.CLAIM && loading} loaderStyle={{ height: 22 }}/>
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
              <CyDImage source={AppImages.MONEY_BAG}/>
              <CyDView className={' flex flex-row mt-[3px]'}>
                <CyDText className={' font-medium text-[16px] ml-[5px] text-primaryTextColor'}>{t<string>('CLAIMABLE_REWARD')}</CyDText>
                <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{totalClaimableRewards}</CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row mt-[20px]'}>
              <CyDImage source={AppImages.GAS_FEES} className='h-[16px] w-[16px]' resizeMode='contain'/>
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
              }} title={t<string>('APPROVE')} style={'py-[5%]'} loading={loading} loaderStyle={{ height: 30 }}/>
              <Button onPress={() => { setSignModalVisible(false); }} title={t<string>('REJECT')} type={'secondary'} style={'py-[5%] mt-[15px]'}/>
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
              <CyDImage source={AppImages[tokenData.chainDetails.backendName + '_LOGO']} className={'h-[20px] w-[20px]'}/>
              <CyDView className={' flex flex-row'}>
                <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{`${totalClaimableRewards}`}</CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-row mt-[20px]'}>
              <CyDImage source={AppImages.GAS_FEES} className={'w-[16px] h-[16px] mt-[3px]'} resizeMode='contain'/>
              <CyDView className={' flex flex-row mt-[3px]'}>
                <CyDText className={' font-medium text-[16px] ml-[10px] text-primaryTextColor'}>{t<string>('GAS_FEE')}</CyDText>
                <CyDText className={' font-bold ml-[5px] text-[18px] text-center text-secondaryTextColor'}>{`${gasFee.toFixed(6)} ${tokenData.name}`}</CyDText>
              </CyDView>
            </CyDView>

            <CyDView className={'flex flex-col mt-[30px] w-[100%]'}>
              <Button onPress={ () => {
                setSignModalVisible(false);
                onReStake(CosmosActionType.TRANSACTION);
              }} title={t<string>('APPROVE')} style={'py-[5%] min-h-[60px]'} loading={loading} loaderStyle={{ height: 30 }}/>
              <Button onPress={() => { setReStakeModalVisible(false); }} title={t<string>('CANCEL')} type={'secondary'} style={'py-[5%] mt-[15px]'}/>
            </CyDView>
          </CyDView>
        </CyDModalLayout>

        <TokenSummary tokenImage={tokenData.logoUrl} totalTokens={getTotalTokens()} tokenName={getTokenName()} totalBalance={getTotalValue()} isStakingAvailable={isCosmosChain(tokenData.chainDetails.backendName)} tokenPrice={getTokenPrice()} />
          <CyDView className={'w-full h-[1px] bg-sepratorColor mt-[20px]'}></CyDView>
            <CyDView className={'flex flex-row justify-evenly items-center mt-[20px]'}>
        <CyDView>
          <CyDTouchView className={'flex items-center justify-center'} onPress={() => {
            navigation.navigate(C.screenTitle.ENTER_AMOUNT, {
              tokenData
            });
          } }>
            <CyDImage source={AppImages.SEND_SHORTCUT} className={'w-[50px] h-[50px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[14px] text-[14px] font-bold'}>{t<string>('SEND')}</CyDText>
        </CyDView>

        {canShowIBC && <CyDView>
          <CyDTouchView className={'bg-appColor rounded-full w-[50px] h-[50px] flex items-center justify-center'}
            onPress={() => {
              navigation.navigate(C.screenTitle.IBC_SCREEN, {
                tokenData
              });
            } }>
            <CyDImage source={AppImages.IBC} className={'w-[20px] h-[16px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[14px] text-[14px] font-bold'}>{t<string>('IBC')}</CyDText>
        </CyDView>}

        {canShowBridge && <CyDView>
          <CyDTouchView className={'bg-appColor rounded-full w-[50px] h-[50px] flex items-center justify-center'}
                        onPress={() => {
                          navigation.navigate(C.screenTitle.BRIDGE_SCREEN, {
                            fromChainData: tokenData
                          });
                        }}>
            <CyDImage source={AppImages.BRIDGE_SHORTCUT} className={'w-[50px] h-[50px]'}/>
          </CyDTouchView>
          <CyDText className={'text-center mt-[14px] text-[14px] font-bold'}>{t<string>('BRIDGE')}</CyDText>
        </CyDView>}

        <CyDView>
          <CyDTouchView className={' flex items-center justify-center'} onPress={() => {
            let addressTypeQRCode;
            if (tokenData.chainDetails.backendName === ChainBackendNames.COSMOS) {
              addressTypeQRCode = FundWalletAddressType.COSMOS;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.OSMOSIS) {
              addressTypeQRCode = FundWalletAddressType.OSMOSIS;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.EVMOS) {
              addressTypeQRCode = FundWalletAddressType.EVMOS;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.ETH) {
              addressTypeQRCode = FundWalletAddressType.EVM;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.JUNO) {
              addressTypeQRCode = FundWalletAddressType.JUNO;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.STARGAZE) {
              addressTypeQRCode = FundWalletAddressType.STARGAZE;
            } else if (tokenData.chainDetails.backendName === ChainBackendNames.NOBLE) {
              addressTypeQRCode = FundWalletAddressType.NOBLE;
            }
            navigation.navigate(C.screenTitle.QRCODE, { addressType: addressTypeQRCode });
          } }>
            <CyDImage source={AppImages.RECEIVE_SHORTCUT} className={'w-[50px] h-[50px]'} />
          </CyDTouchView>
          <CyDText className={'text-center mt-[14px]  text-[14px] font-bold'}>{t<string>('RECEIVE')}</CyDText>
        </CyDView>
      </CyDView><CyDView>
        {tokenData.chainDetails.backendName === ChainBackendNames.EVMOS && tokenData.name === CosmosStakingTokens.EVMOS && stakingValidators.stateStaking.myValidatorsListState === STAKING_NOT_EMPTY
          ? <CyDView className={'flex flex-row justify-center items-center w-screen bg-babyPink mt-[10px] py-[10px]'}>
              <LottieView source={AppImages.GIFT_BOX} autoPlay loop resizeMode="cover" style={isIOS() ? styles.IOSStyle : styles.androidStyle} />
              <CyDText>{t<string>('NEXT_REWARD_DISTRIBUTION_AT')}<CyDText className={'text-maroon font-black'}>{'  ' + time.hours + ':' + time.min + ':' + time.sec}</CyDText></CyDText>
            </CyDView>
          : <CyDView className={'w-full h-[1px] bg-sepratorColor mt-[20px]'}></CyDView>}
          <CyDView className={'flex flex-row justify-center mt-[6px] mr-[10px]'}>
            <SwitchView titles={tokenFunctionalities} index={index} setIndexChange={(index) => {
              setIndex(index);
              setValueChange(!valueChange);
              setSelectedTokenFunctionality(tokenFunctionalities[index]);
            } }></SwitchView>
          </CyDView>
        {
          selectedTokenFunctionality === TokenFunctionality.STAKING && <CyDView>
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
                      navigation.navigate(C.screenTitle.STAKING_VALIDATORS, {
                        tokenData,
                        typeOfAction: CosmosActionType.STAKE
                      });
                    }
                  } } title={t<string>('STAKE')} style={'w-4/12 p-[4%]'} />
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
                      navigation.navigate(C.screenTitle.STAKING_VALIDATORS, {
                        tokenData,
                        typeOfAction: CosmosActionType.UNSTAKE
                      });
                    }
                  } } title={t<string>('UNSTAKE')} style={'w-4/12 p-[4%]'} type={'ternary'} />
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
                      navigation.navigate(C.screenTitle.UNBOUNDING);
                    }
                  } } title={t<string>('VIEW')} style={'w-4/12 p-[4%]'} />
                </CyDView>
                <CyDView className={'w-full h-[1px] bg-[#F4F4F4] mx-[30px]'}></CyDView>
              </CyDView>}

              <CyDView className={'bg-[#F6F7FF] rounded-[8px] px-[46px] py-[16px] mx-[16px] my-[18px] flex flex-col items-center'}>
                <CyDView className={'flex flex-row items-center justify-center'}>
                  <CyDImage source={AppImages.STARS_LEFT} className={'w-[20px] h-[20px]'}/>
                  <CyDText className={'text-center w-3/4  text-[14px] font-bold text-secondaryTextColor'}>{`${t<string>('STAKE_YOUR_TEXT')} ${tokenData.name.toLowerCase()} ${t<string>('WITH_US_TEXT')}`}</CyDText>
                  <CyDImage source={AppImages.STARS_RIGHT} className={'w-[20px] h-[20px]'}/>
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
              </CyDView>
          </CyDView>}
          {
            selectedTokenFunctionality === TokenFunctionality.TRANSACTIONS && <CyDView className={'mx-[15px] mt-[6px]'}>
              {
                (isCosmosChain(tokenData.chainDetails.backendName) || (tokenData.chainDetails.backendName === ChainBackendNames.OPTIMISM && tokenData.name.includes('IBC')))
                  ? browserView(tokenData.chainDetails.backendName)
                  : (loading
                      ? <Loading></Loading>
                      : !noTransaction
                          ? <CyDView>
                          {transactionList.map((transaction, index) => {
                            return <CyDView key={`data-${index}`}>
                              {renderItem(transaction)}
                            </CyDView>;
                          })}
                          {!lastPage && transactionList.length > 0 && <CyDView>
                            <CyDTouchView className={'justify-start mt-[20px]'} onPress={() => { fetchData(); }}>
                              <CyDText className={'font-bold text-[16px] mb-[20px] text-toastColor text-center underline'}> {t<string>('VIEW_MORE')} </CyDText>
                            </CyDTouchView>
                          </CyDView>}
                        </CyDView>
                          : emptyView())
              }
            </CyDView>
          }
          {
            selectedTokenFunctionality === TokenFunctionality.ABOUT && <CyDView className={'flex mt-[10px] mx-[18px] pb-[20px] justify-start items-start'}>
              <CyDText className={'font-bold text-[18px] text-primaryTextColor mb-[0px]'}>{tokenData.symbol}
                <CyDText className='text-[18px] text-primaryTextColor'> ({tokenData.name})</CyDText>
              </CyDText>

              <HTML baseStyle={{
                fontSize: '16px',
                color: Colors.primaryTextColor
              }}
              contentWidth={Dimensions.get('window').width}
              renderersProps={renderersProps} source={{ html: tokenData.about.split(' ').length > 50 && loadMoreAbout ? tokenData.about.split(' ').slice(0, 50).join(' ') : tokenData.about }}/>
              {tokenData.about.length > 0 && loadMoreAbout && <CyDTouchView className={'justify-start mt-[20px]'} onPress={() => { setLoadMoreAbout(false); }}>
                <CyDText className={'font-bold text-[16px] mb-[20px] text-toastColor text-center underline'}>{t<string>('VIEW_MORE')}</CyDText>
              </CyDTouchView>
              }
            </CyDView>
          }
        </CyDView>
    </CyDScrollView></>
  );
}

export default TokenOverview;

const styles = StyleSheet.create({
  modalLayout: {
    margin: 0,
    justifyContent: 'flex-end'
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
