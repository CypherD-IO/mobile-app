import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, TextInput } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import {
  ChainNames,
  COSMOS_CHAINS,
  ChainNameMapping,
  NativeTokenMapping,
  CHAIN_ETH,
  Chain,
  GASLESS_CHAINS,
  ChainBackendNames,
} from '../../../constants/server';
import {
  ActivityContext,
  getWeb3Endpoint,
  HdWalletContext,
  PortfolioContext,
  getNativeToken,
  formatAmount,
  logAnalytics,
  validateAmount,
} from '../../../core/util';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import { getGasPriceFor } from '../../Browser/gasHelper';
import { GasPriceDetail } from '../../../core/types';
import * as Sentry from '@sentry/react-native';
import { GlobalContext } from '../../../core/globalContext';
import Web3 from 'web3';
import { ethers } from 'ethers';
import {
  cosmosSendTokens,
  estimateGasForCosmosTransaction,
  estimateGasForNativeTransaction,
  getCosmosSignerClient,
  sendNativeCoinOrTokenToAnyAddress,
} from '../../../core/NativeTransactionHandler';
import {
  ActivityStatus,
  DebitCardTransaction,
  ActivityReducerAction,
  ActivityType,
} from '../../../reducers/activity_reducer';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import BottomTokenCardConfirm from '../../../components/BottomTokenCardConfirm';
import { genId } from '../../utilities/activityUtilities';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import { CHOOSE_TOKEN_MODAL_TIMEOUT } from '../../../constants/timeOuts';
import { hostWorker } from '../../../global';
import { screenTitle } from '../../../constants';
import { useIsFocused } from '@react-navigation/native';
import {
  MINIMUM_TRANSFER_AMOUNT_ETH,
  gasFeeReservation,
} from '../../../constants/data';
import ChooseTokenModal from '../../../components/v2/chooseTokenModal';
import CyDTokenAmount from '../../../components/v2/tokenAmount';
import useAxios from '../../../core/HttpRequest';
import { get } from 'lodash';
import { AnalyticsType, CardProviders } from '../../../constants/enum';
import { TokenMeta } from '../../../models/tokenMetaData.model';
import clsx from 'clsx';
import { isIOS } from '../../../misc/checkers';

export default function BridgeFundCardScreen({ route }: { route: any }) {
  const {
    navigation,
    currentCardProvider,
    currentCardIndex,
  }: {
    navigation: any;
    currentCardProvider: CardProviders;
    currentCardIndex: number;
  } = route.params;
  const portfolioState = useContext<any>(PortfolioContext);
  const hdWallet = useContext<any>(HdWalletContext);
  const globalContext = useContext<any>(GlobalContext);
  const ethereum = hdWallet.state.wallet.ethereum;
  const wallet = hdWallet.state.wallet;
  const globalStateContext = useContext<any>(GlobalContext);
  const activityContext = useContext<any>(ActivityContext);
  const cardProfile = globalContext.globalState.cardProfile;
  const { cardId, last4 }: { cardId: string; last4: string } = get(
    cardProfile,
    currentCardProvider,
  )?.cards[currentCardIndex];
  const activityRef = useRef<DebitCardTransaction | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const ARCH_HOST: string = hostWorker.getHost('ARCH_HOST');
  const { getWithAuth, postWithAuth } = useAxios();

  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;

  const senderAddress = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address,
  };

  const rpc = {
    cosmos: globalStateContext.globalState.rpcEndpoints.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints.JUNO.primary,
    stargaze: globalContext.globalState.rpcEndpoints.STARGAZE.primary,
    noble: globalContext.globalState.rpcEndpoints.NOBLE.primary,
  };

  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(false);
  const [payTokenBottomConfirm, setPayTokenBottomConfirm] =
    useState<boolean>(false);
  const [payTokenModalParams, setPayTokenModalParams] = useState<any>({});
  const [cosmosPayTokenModalParams, setCosmosPayTokenModalParams] =
    useState<any>({});
  const [tokenQuote, setTokenQuote] = useState<any>({});
  const [amount, setAmount] = useState('');
  const [isCrpytoInput, setIsCryptoInput] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [lowBalance, setLowBalance] = useState<boolean>(false);
  const minTokenValueLimit = 10;
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const [selectedToken, setSelectedToken] = useState<TokenMeta>();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const tokenQuoteExpiry = 60;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      if (route.params?.tokenData) {
        setSelectedToken(route.params.tokenData);
      } else {
        setTimeout(() => {
          setIsChooseTokenVisible(true);
        }, CHOOSE_TOKEN_MODAL_TIMEOUT);
      }
    }
  }, [isFocused]);

  useEffect(() => {
    if (payTokenModalParams.tokenAmount && activityRef.current === null) {
      const activityData: DebitCardTransaction = {
        id: genId(),
        status: ActivityStatus.PENDING,
        type: ActivityType.CARD,
        quoteId: '',
        tokenSymbol: payTokenModalParams.tokenSymbol.toString() ?? '',
        chainName: selectedToken?.chainDetails?.backendName.toString() ?? '',
        tokenName: selectedToken?.name.toString() ?? '',
        amount: payTokenModalParams.tokenAmount.toString() ?? '',
        amountInUsd: payTokenModalParams.totalValueDollar.toString() ?? '',
        datetime: new Date(),
        transactionHash: '',
      };

      activityRef.current = activityData;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityRef.current,
      });
    }
  }, [payTokenModalParams]);

  const payTokenModal = (payTokenModalParamsLocal: any) => {
    payTokenModalParamsLocal.tokenQuoteExpiry = tokenQuoteExpiry;
    payTokenModalParamsLocal.cardNumber = 'xxxx xxxx xxxx ' + last4;
    setLoading(false);
    setPayTokenModalParams(payTokenModalParamsLocal);
    setPayTokenBottomConfirm(true);
  };

  const cosmosPayTokenModal = (cosmosPayTokenModalParamsLocal: any) => {
    setCosmosPayTokenModalParams(cosmosPayTokenModalParamsLocal);
    const payTokenModalParamsLocal = {
      gasFeeDollar: cosmosPayTokenModalParamsLocal.finalGasPrice,
      gasFeeETH: cosmosPayTokenModalParamsLocal.gasFeeNative,
      networkName: cosmosPayTokenModalParamsLocal.chain,
      networkCurrency: cosmosPayTokenModalParamsLocal.sentTokenSymbol,
      totalDollar:
        parseFloat(cosmosPayTokenModalParamsLocal.gasFeeNative) +
        parseFloat(cosmosPayTokenModalParams),
      appImage: cosmosPayTokenModalParamsLocal.appImage,
      tokenImage: cosmosPayTokenModalParamsLocal.tokenImage,
      finalGasPrice: cosmosPayTokenModalParamsLocal.finalGasPrice,
      gasLimit: cosmosPayTokenModalParamsLocal.fee.gas,
      gasPrice: cosmosPayTokenModalParamsLocal.gasPrice,
      tokenSymbol: cosmosPayTokenModalParamsLocal.sentTokenSymbol,
      tokenAmount: cosmosPayTokenModalParamsLocal.sentTokenAmount,
      tokenValueDollar: cosmosPayTokenModalParamsLocal.sentValueUSD,
      tokenQuoteExpiry,
      totalValueTransfer: (
        parseFloat(cosmosPayTokenModalParamsLocal.gasFeeNative) +
        parseFloat(cosmosPayTokenModalParamsLocal.sentTokenAmount)
      ).toFixed(6),
      totalValueDollar: (
        parseFloat(cosmosPayTokenModalParamsLocal.finalGasPrice) +
        parseFloat(cosmosPayTokenModalParamsLocal.sentValueUSD)
      ).toFixed(6),
      cardNumber: 'xxxx xxxx xxxx ' + last4,
    };
    setPayTokenModalParams(payTokenModalParamsLocal);
    setPayTokenBottomConfirm(true);
  };

  const transferSentQuote = async (
    address: string,
    quoteUUID: string,
    txnHash: string,
  ) => {
    const transferSentUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/deposit`;
    const body = {
      address,
      quoteUUID,
      txnHash,
    };

    try {
      const response = await postWithAuth(transferSentUrl, body);
      if (!response.isError && response.status === 201) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.INPROCESS,
              transactionHash: txnHash,
              quoteId: quoteUUID,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'success',
          title: '',
          description:
            'Success, Your card funding is in progress and will be done within 5 mins!',
          onSuccess: () => {
            hideModal();
            setTimeout(() => {
              navigation.navigate(screenTitle.OPTIONS, {
                screen: screenTitle.ACTIVITIES,
                initial: false,
              });
              navigation.popToTop();
            }, MODAL_HIDE_TIMEOUT_250);
          },
          onFailure: hideModal,
        });
      } else {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.FAILED,
              quoteId: quoteUUID,
              transactionHash: txnHash,
              reason: `Please contact customer support with the quote_id: ${quoteUUID}`,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Error processing your txn',
          description: `Please contact customer support with the quote_id: ${quoteUUID}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId: quoteUUID,
            transactionHash: txnHash,
            reason: `Please contact customer support with the quote_id: ${quoteUUID}`,
          },
        });
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Error processing your txn',
        description: `Please contact customer support with the quote_id: ${quoteUUID}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const handleTransactionResult = (
    message: string,
    quoteUUID: string,
    fromAddress: string,
    isError: boolean,
  ) => {
    if (isError) {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: selectedToken?.chainDetails?.chainName ?? '',
        message,
        screen: route.name,
      });
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId: quoteUUID,
            reason: message,
          },
        });
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Transaction Failed',
        description: `${message}. Please contact customer support with the quote_id: ${quoteUUID}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.SUCCESS,
        txnHash: message,
        chain: selectedToken?.chainDetails?.chainName ?? '',
      });
      void transferSentQuote(fromAddress, quoteUUID, message);
    }
  };

  const handleSuccessfulTransaction = async (
    result: any,
    analyticsData: any,
  ) => {
    try {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.SUCCESS,
        txnHash: analyticsData.hash,
        chain: analyticsData.chain,
      });
      await intercomAnalyticsLog('transaction_submit', analyticsData);
    } catch (error) {
      Sentry.captureException(error);
    }
    void transferSentQuote(
      analyticsData.from,
      analyticsData.uuid,
      result.transactionHash,
    );
  };

  const handleFailedTransaction = async (
    _err: any,
    uuid: string,
    chain: string,
  ) => {
    void logAnalytics({
      type: AnalyticsType.ERROR,
      chain,
      message: JSON.stringify(_err),
      screen: route.name,
    });
    // Sentry.captureException(err);
    activityRef.current &&
      activityContext.dispatch({
        type: ActivityReducerAction.PATCH,
        value: {
          id: activityRef.current.id,
          status: ActivityStatus.FAILED,
          quoteId: uuid,
          reason: `Please contact customer support with the quote_id: ${uuid}`,
        },
      });
    setLoading(false);
    showModal('state', {
      type: 'error',
      title: 'Error processing your txn',
      description: `Please contact customer support with the quote_id: ${uuid}`,
      onSuccess: hideModal,
      onFailure: hideModal,
    });
  };

  const sendTransaction = async (payTokenModalParamsLocal: any) => {
    const { contractAddress, chainDetails, contractDecimals } = selectedToken;
    const { chainName } = selectedToken.chainDetails;
    const currentTimeStamp = new Date();
    setLoading(true);
    setPayTokenBottomConfirm(false);
    if (
      Math.floor((Number(currentTimeStamp) - tokenQuote.expiry) / 1000) <
      tokenQuoteExpiry
    ) {
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            gasAmount: payTokenModalParams.gasFeeDollar,
          },
        });
      if (chainName != null) {
        if (chainName === ChainNames.ETH || chainName === ChainNames.EVMOS) {
          void intercomAnalyticsLog('send_token_for_card', {
            from: ethereum.address,
            dollar: selectedToken.chainDetails,
            token_quantity: tokenQuote.tokenRequired,
            from_contract: contractAddress,
            quote_uuid: tokenQuote.quoteUUID,
          });
          await sendNativeCoinOrTokenToAnyAddress(
            hdWallet,
            portfolioState,
            chainDetails,
            tokenQuote.tokenRequired,
            contractAddress,
            contractDecimals,
            tokenQuote.quoteUUID,
            handleTransactionResult,
            tokenQuote.targetWallet,
            payTokenModalParamsLocal.finalGasPrice,
            payTokenModalParamsLocal.gasLimit,
            globalContext,
          );
        } else if (COSMOS_CHAINS.includes(chainName)) {
          const amount = ethers.utils
            .parseUnits(
              parseFloat(
                cosmosPayTokenModalParams.sentTokenAmount.length > 8
                  ? cosmosPayTokenModalParams.sentTokenAmount.substring(0, 8)
                  : cosmosPayTokenModalParams.sentTokenAmount,
              ).toFixed(6),
              6,
            )
            .toString();
          await cosmosSendTokens(
            cosmosPayTokenModalParams.to_address,
            cosmosPayTokenModalParams.signingClient,
            cosmosPayTokenModalParams.fee,
            get(senderAddress, chainName),
            amount,
            t('FUND_CARD_MEMO'),
            handleSuccessfulTransaction,
            handleFailedTransaction,
            chainName,
            tokenQuote.quoteUUID,
            selectedToken?.denom,
          );
          void intercomAnalyticsLog('send_token_for_card', {
            from: get(senderAddress, chainName),
            dollar: selectedToken.chainDetails,
            token_quantity: tokenQuote.tokenRequired,
            from_contract: contractAddress,
            quote_uuid: tokenQuote.quoteUUID,
          });
        }
      } else {
        showModal('state', {
          type: 'error',
          title: 'Please select a blockchain to proceed',
          description: '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('QUOTE_EXPIRED'),
        description: t('QUOTE_EXPIRED_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const fundCard = async () => {
    const { chainName, backendName } = selectedToken.chainDetails;
    const {
      contractAddress,
      coinGeckoId,
      contractDecimals,
      chainDetails,
    }: {
      contractAddress: string;
      coinGeckoId: string | number;
      contractDecimals: string | number;
      chainDetails: any;
    } = selectedToken;
    setLoading(true);
    Keyboard.dismiss();
    if (chainName === ChainNames.ETH || chainName === ChainNames.EVMOS) {
      const getQuoteUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/quote/evm?chain=${backendName}&tokenAddress=${contractAddress}&amount=${usdAmount}&address=${String(
        ethereum.address,
      )}&contractDecimals=${contractDecimals}`;
      const response = await getWithAuth(getQuoteUrl);
      if (response?.data && !response.isError) {
        if (chainName != null) {
          let gasPrice: GasPriceDetail = {
            chainId: backendName,
            gasPrice: 0,
            tokenPrice: 0,
          };
          const quote = response.data;
          quote.tokenRequired = String(Number(quote.tokenRequired).toFixed(5));
          const web3RPCEndpoint = new Web3(
            getWeb3Endpoint(hdWallet.state.selectedChain, globalContext),
          );
          const targetWalletAddress = quote.targetWallet
            ? quote.targetWallet
            : '';
          if (Number(quote.usdValue) <= Number(selectedToken?.totalValue)) {
            getGasPriceFor(chainDetails, web3RPCEndpoint)
              .then((gasFeeResponse) => {
                gasPrice = gasFeeResponse;
                setLoading(false);
                estimateGasForNativeTransaction(
                  hdWallet,
                  chainDetails,
                  selectedToken,
                  quote.tokenRequired,
                  true,
                  gasPrice,
                  payTokenModal,
                  globalContext,
                  targetWalletAddress,
                );
              })
              .catch((gasFeeError) => {
                // TODO (user feedback): Give feedback to user.
                Sentry.captureException(gasFeeError);
                estimateGasForNativeTransaction(
                  hdWallet,
                  chainDetails,
                  selectedToken,
                  quote.tokenRequired,
                  true,
                  gasPrice,
                  payTokenModal,
                  globalContext,
                  targetWalletAddress,
                );
              });
          } else {
            const data = {
              gasFeeDollar: formatAmount(
                quote.estimatedGasFee * Number(getNativeToken(
                  get(NativeTokenMapping, selectedToken?.chainDetails.symbol) ||
                  selectedToken?.chainDetails.symbol,
                  portfolioState.statePortfolio.tokenPortfolio[
                    get(ChainNameMapping, selectedToken?.chainDetails.backendName)
                  ].holdings,
                )?.price ?? 0)
              ),
              gasFeeETH: quote.estimatedGasFee.toFixed(6),
              networkName: chainDetails.name,
              networkCurrency: chainDetails.symbol,
              totalDollar: '',
              appImage: chainDetails.logo_url,
              tokenImage: selectedToken.logoUrl,
              finalGasPrice: gasPrice.gasPrice,
              gasLimit: '',
              gasPrice,
              tokenSymbol: selectedToken?.symbol,
              tokenAmount: quote.tokenRequired,
              tokenValueDollar: Number(usdAmount).toFixed(2),
              totalValueTransfer: quote.tokenRequired,
              totalValueDollar: Number(usdAmount).toFixed(2),
              hasSufficientBalance: false,
            };
            payTokenModal(data);
          }
          // setDisplayQuote(true);
          quote.token_required = String(Number(quote.tokenRequired).toFixed(5));
          // setQuoteString(quote.token_required + " " + fromTokenItem.symbol);
          setTokenQuote(response.data);
        }
      } else {
        Sentry.captureException(response.error);
        showModal('state', {
          type: 'error',
          title: response?.error?.message?.includes('minimum amount')
            ? t('INSUFFICIENT_FUNDS')
            : '',
          description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        setLoading(false);
      }
    } else if (COSMOS_CHAINS.includes(chainName)) {
      try {
        const quoteUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/quote/cosmos?chain=${backendName}&address=${String(
          wallet[chainName].address,
        )}&primaryAddress=${String(
          ethereum.address,
        )}&amount=${usdAmount}&coinId=${coinGeckoId}&contractDecimals=${contractDecimals}`;
        const response = await getWithAuth(quoteUrl);
        if (
          response?.data &&
          response.status === 200 &&
          response.data.status !== 'ERROR'
        ) {
          if (chainName != null) {
            const quote = response.data;
            quote.tokenRequired = String(
              Number(quote.tokenRequired).toFixed(5),
            );
            const valueForUsd = quote.tokenRequired;
            const amount = ethers.utils
              .parseUnits(
                parseFloat(
                  valueForUsd.length > 8
                    ? valueForUsd.substring(0, 8)
                    : valueForUsd,
                ).toFixed(6),
                6,
              )
              .toString();
            const targetWalletAddress = quote.targetWallet;

            let retryCount = 0;
            const signer = await getCosmosSignerClient(
              chainDetails,
              hdWalletContext,
            );
            while (retryCount < 3) {
              try {
                await estimateGasForCosmosTransaction(
                  chainDetails,
                  signer,
                  amount,
                  get(senderAddress, chainName),
                  targetWalletAddress,
                  selectedToken,
                  get(rpc, chainName),
                  cosmosPayTokenModal,
                  valueForUsd.toString(),
                );
              } catch (err) {
                if (retryCount < 3) {
                  retryCount += 1;
                  if (retryCount === 3) {
                    showModal('state', {
                      type: 'error',
                      title: '',
                      description: err?.message,
                      onSuccess: hideModal,
                      onFailure: hideModal,
                    });
                  }
                  continue;
                }
                Sentry.captureException(err);
              }
              break;
            }
            setLoading(false);
            setTokenQuote(response.data);
          }
        } else {
          showModal('state', {
            type: 'error',
            title: '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          setLoading(false);
        }
      } catch (error) {
        Sentry.captureException(error);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    }
  };

  const isLoadCardDisabled = () => {
    const { symbol, backendName } = selectedToken?.chainDetails ?? {};
    const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
    const isGaslessChain = GASLESS_CHAINS.includes(
      backendName as ChainBackendNames,
    );
    const hasInSufficientGas =
      (!isGaslessChain &&
        nativeTokenBalance <= get(gasFeeReservation, backendName)) ||
      (selectedToken?.symbol === nativeTokenSymbol &&
        Number(usdAmount) / selectedToken?.price >
        Number(
          (nativeTokenBalance - get(gasFeeReservation, backendName)).toFixed(
            6,
          ),
        ));
    return (
      Number(usdAmount) < minTokenValueLimit ||
      !selectedToken ||
      Number(usdAmount) > Number(selectedToken?.totalValue) ||
      hasInSufficientGas ||
      (backendName === CHAIN_ETH.backendName &&
        Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH)
    );
  };

  const onSelectingToken = (item: { symbol: string; chainDetails: Chain }) => {
    setSelectedToken(item);
    setIsChooseTokenVisible(false);
    setNativeTokenBalance(
      getNativeToken(
        get(NativeTokenMapping, item.chainDetails.symbol) ||
        item.chainDetails.symbol,
        portfolioState.statePortfolio.tokenPortfolio[
          get(ChainNameMapping, item.chainDetails.backendName)
        ].holdings,
      )?.actualBalance ?? 0,
    );
  };

  const onMax = () => {
    const { symbol, backendName } = selectedToken?.chainDetails ?? {};
    const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
    let maxAmount = 0;
    if (selectedToken?.symbol === nativeTokenSymbol) {
      const tempAmount =
        selectedToken?.totalValue -
        get(gasFeeReservation, backendName) * selectedToken?.price;
      maxAmount = isCrpytoInput ? tempAmount / selectedToken?.price : tempAmount;
    } else {
      maxAmount = isCrpytoInput ? selectedToken?.totalValue / selectedToken?.price : selectedToken?.totalValue;
    }
    setAmount(maxAmount.toString());
    if (isCrpytoInput) {
      setCryptoAmount(maxAmount.toString());
      setUsdAmount((parseFloat(maxAmount.toString()) * Number(selectedToken?.price)).toString());
    } else {
      setCryptoAmount((parseFloat(maxAmount.toString()) / Number(selectedToken?.price)).toString());
      setUsdAmount(maxAmount.toString());
    }
  };

  const RenderSelectedToken = () => {
    return (
      <CyDTouchView
        className={
          'bg-[#F7F8FE] mx-[40px] my-[16px] border-[1px] border-[#EBEBEB] rounded-[8px]'
        }
        onPress={() => setIsChooseTokenVisible(true)}
      >
        <CyDView
          className={
            'p-[18px] flex flex-row flex-wrap justify-between items-center'
          }
        >
          {selectedToken && (
            <CyDView className={'flex flex-row w-[50%] items-center'}>
              <CyDImage
                source={{ uri: selectedToken.logoUrl }}
                className={'w-[25px] h-[25px] rounded-[20px]'}
              />
              <CyDText
                className={
                  'text-center text-black font-nunito font-bold text-[16px] ml-[8px]'
                }
              >
                {selectedToken.name}
              </CyDText>
            </CyDView>
          )}
          {!selectedToken && (
            <CyDView>
              <CyDText>{t<string>('CHOOSE_TOKEN')}</CyDText>
            </CyDView>
          )}

          <CyDView className='flex flex-row items-center'>
            {selectedToken && (
              <>
                <CyDTokenAmount className={'font-extrabold mr-[3px]'}>
                  {selectedToken.actualBalance}
                </CyDTokenAmount>
                <CyDText className={'font-extrabold mr-[5px]'}>
                  {selectedToken.symbol}
                </CyDText>
              </>
            )}
            <CyDFastImage
              source={AppImages.DOWN_ARROW}
              className='h-[15px] w-[15px]'
              resizeMode='contain'
            />
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  };

  const RenderWarningMessage = () => {
    const { symbol, backendName }: { symbol?: string; backendName?: string } =
      selectedToken?.chainDetails ?? {};
    if (selectedToken && symbol && backendName) {
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      let errorMessage = '';
      if (Number(usdAmount) > Number(selectedToken?.totalValue)) {
        errorMessage = t('INSUFFICIENT_FUNDS');
      } else if (
        !GASLESS_CHAINS.includes(backendName as ChainBackendNames) &&
        nativeTokenBalance <= get(gasFeeReservation, backendName)
      ) {
        errorMessage = String(
          `Insufficient ${String(nativeTokenSymbol)} to pay gas fee`,
        );
      } else if (
        selectedToken?.symbol === nativeTokenSymbol &&
        Number(usdAmount) / selectedToken?.price >
        Number(
          (nativeTokenBalance - get(gasFeeReservation, backendName)).toFixed(
            6,
          ),
        )
      ) {
        errorMessage = t('INSUFFICIENT_GAS_FEE');
      } else if (
        usdAmount &&
        backendName === CHAIN_ETH.backendName &&
        Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH
      ) {
        errorMessage = t('MINIMUM_AMOUNT_ETH');
      } 1;

      return (
        <CyDView className='mb-[10px]'>
          <CyDText className='text-center text-redColor font-medium'>
            {errorMessage}
          </CyDText>
        </CyDView>
      );
    }
    return null;
  };

  return (
    <CyDSafeAreaView className='h-full bg-white'>
      <ChooseTokenModal
        isChooseTokenModalVisible={isChooseTokenVisible}
        tokenList={portfolioState.statePortfolio.tokenPortfolio.totalHoldings}
        minTokenValueLimit={minTokenValueLimit}
        onSelectingToken={(token) => {
          setIsChooseTokenVisible(false);
          setTimeout(
            () => {
              onSelectingToken(token);
              inputRef.current?.focus();
            },
            isIOS() ? MODAL_HIDE_TIMEOUT_250 : 600,
          );
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
          navigation.goBack();
        }}
        noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
        renderPage={'fundCardPage'}
      />
      <BottomTokenCardConfirm
        modalParams={payTokenModalParams}
        isModalVisible={payTokenBottomConfirm}
        onPayPress={async () => {
          setLowBalance(false);
          await sendTransaction(payTokenModalParams);
        }}
        onCancelPress={() => {
          setPayTokenBottomConfirm(false);
          setLowBalance(false);
          void intercomAnalyticsLog('cancel_transfer_token', {
            from: ethereum.address,
          });
          activityRef.current &&
            activityContext.dispatch({
              type: ActivityReducerAction.DELETE,
              value: { id: activityRef.current.id },
            });
        }}
        lowBalance={lowBalance}
      />
      <RenderSelectedToken />
      <CyDView
        className={
          'pb-[0px] px-[10px] bg-[#F7F8FE] mx-[40px] h-[300px] rounded-[8px]'
        }
      >
        <CyDView className='flex flex-row h-[100%] items-center'>
          <CyDTouchView
            onPress={() => {
              onMax();
            }}
            className={clsx(
              'bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
            )}
          >
            <CyDText className={'font-nunito text-black '}>
              {t<string>('MAX')}
            </CyDText>
          </CyDTouchView>
          <CyDView
            className={'pb-[10px] w-[60%] items-center bg-[#F7F8FE] mx-[20px]'}
          >
            <CyDText
              className={
                'font-extrabold text-[22px] text-center font-nunito text-black'
              }
            >
              {t<string>('ENTER_AMOUNT')}
            </CyDText>
            <CyDView className={'flex justify-center items-center'}>
              <CyDText className='text-[20px] font-semibold mt-[5px]'>
                {isCrpytoInput ? selectedToken?.name : 'USD'}
              </CyDText>
              <CyDTextInput
                ref={inputRef}
                className={clsx(
                  'font-bold text-center text-primaryTextColor h-[85px] font-nunito',
                  {
                    'text-[70px]': amount.length <= 5,
                    'text-[40px]': amount.length > 5,
                  },
                )}
                value={amount}
                keyboardType='numeric'
                autoCapitalize='none'
                autoCorrect={false}
                onChangeText={(text) => {
                  setAmount(text);
                  if (isCrpytoInput) {
                    const usdText = parseFloat(text) * Number(selectedToken?.price);
                    setCryptoAmount(text);
                    setUsdAmount(
                      (
                        isNaN(usdText) ? '0.00' : usdText
                      ).toString(),
                    );
                  } else {
                    const cryptoText = parseFloat(text) / Number(selectedToken?.price);
                    setCryptoAmount(
                      (
                        isNaN(cryptoText) ? '0.00' : cryptoText
                      ).toString(),
                    );
                    setUsdAmount(text);
                  }
                }}
              />
              <CyDText
                className={clsx(
                  'text-center text-primaryTextColor h-[50px] text-[16px]',
                )}
              >
                {
                  isCrpytoInput
                    ? (!isNaN(parseFloat(usdAmount))
                      ? formatAmount(usdAmount).toString()
                      : '0.00') + ' USD'
                    : (!isNaN(parseFloat(cryptoAmount))
                      ? formatAmount(cryptoAmount).toString()
                      : '0.00') +
                    ' ' +
                    String(selectedToken?.symbol)
                }
              </CyDText>
            </CyDView>
            {(!usdAmount || Number(usdAmount) < minTokenValueLimit) && (
              <CyDView className='mb-[10px]'>
                <CyDText className='text-center font-semibold'>
                  {t<string>('CARD_LOAD_MIN_AMOUNT')}
                </CyDText>
              </CyDView>
            )}
            <RenderWarningMessage />
          </CyDView>
          <CyDTouchView
            onPress={() => {
              setIsCryptoInput(!isCrpytoInput);
              if (!isCrpytoInput) {
                const usdAmt = parseFloat(amount) * Number(selectedToken?.price);
                setCryptoAmount(amount);
                setUsdAmount(
                  (
                    isNaN(usdAmt) ? '0.00' : usdAmt
                  ).toString(),
                );
              } else {
                const cryptoAmt = parseFloat(amount) / Number(selectedToken?.price);
                setCryptoAmount(
                  (
                    isNaN(cryptoAmt) ? '0.00' : cryptoAmt
                  ).toString(),
                );
                setUsdAmount(amount);
              }
              inputRef.current?.focus();
            }}
            className={clsx(
              'bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
            )}
          >
            <CyDFastImage className='h-[16px] w-[16px]' source={AppImages.TOGGLE_ICON} resizeMode='contain' />
          </CyDTouchView>
        </CyDView>
        <Button
          onPress={() => {
            if (validateAmount(amount)) {
              void fundCard();
            }
          }}
          disabled={isLoadCardDisabled()}
          title={t('LOAD_CARD')}
          style={
            loading
              ? 'py-[7px] mx-[15px] -top-[25px]'
              : 'py-[15px] mx-[15px] -top-[25px]'
          }
          loading={loading}
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
