import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import AppImages from '../../../../assets/images/appImages';
import Button from '../../../components/v2/button';
import {
  ChainNames,
  COSMOS_CHAINS,
  ChainNameMapping,
  NativeTokenMapping,
  CHAIN_ETH,
  GASLESS_CHAINS,
  PURE_COSMOS_CHAINS,
  CHAIN_OSMOSIS,
  CHAIN_EVMOS,
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
  parseErrorMessage,
  limitDecimalPlaces,
  hasSufficientBalanceAndGasFee,
} from '../../../core/util';
import {
  CyDFastImage,
  CyDImage,
  CyDKeyboardAwareScrollView,
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
import {
  AnalyticsType,
  ButtonType,
  CardProviders,
} from '../../../constants/enum';
import { TokenMeta } from '../../../models/tokenMetaData.model';
import clsx from 'clsx';
import {
  CardQuoteResponse,
  GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
  PayTokenModalParams,
} from '../../../models/card.model';
import useTransactionManager from '../../../hooks/useTransactionManager';
import useGasService from '../../../hooks/useGasService';
import { getSignerClient } from '../../../core/Keychain';
import { OfflineDirectSigner } from '@cosmjs/proto-signing';
import { cosmosConfig } from '../../../constants/cosmosConfig';

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
  const [payTokenModalParams, setPayTokenModalParams] =
    useState<PayTokenModalParams>({
      isModalVisible: false,
      quoteExpiry: 60,
      hasSufficientBalanceAndGasFee: true,
      tokenSendParams: {
        onConfirm: () => {},
        onCancel: () => {},
        chain: CHAIN_ETH.backendName,
        amountInCrypto: '',
        amountInFiat: '10',
        symbol: 'eth',
        toAddress: '',
        gasFeeInCrypto: '',
        gasFeeInFiat: '',
        nativeTokenSymbol: '',
      },
    });
  const [tokenQuote, setTokenQuote] = useState<CardQuoteResponse>({
    quoteId: '',
    chain: '',
    tokensRequired: 0,
    tokenAddress: '',
    tokenCoinId: '',
    tokensRequiredFiat: 0,
    amount: 0,
    fromAddress: '',
    targetAddress: '',
    masterAddress: '',
    cardProvider: '',
    tokenSymbol: '',
    expiry: 0,
    estimatedTime: 0,
    version: 2,
  });
  const [amount, setAmount] = useState('');
  const [isCrpytoInput, setIsCryptoInput] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [placeholderText, setPlaceholderText] = useState('0.00');
  const [loading, setLoading] = useState<boolean>(false);
  const minTokenValueLimit = 10;
  const [selectedToken, setSelectedToken] = useState<TokenMeta>();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const hdWalletContext = useContext<any>(HdWalletContext);
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const tokenQuoteExpiry = 60;
  const isFocused = useIsFocused();
  const { estimateGasForEvm, estimateGasForCosmosIBC, estimateGasForEvmosIBC } =
    useGasService();
  const { sendEvmToken, interCosmosIBC, evmosIBC } = useTransactionManager();

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

  const transferSentQuote = async (txnHash: string) => {
    const { quoteId } = tokenQuote;
    const transferSentUrl = `/v1/cards/${currentCardProvider}/card/${cardId}/deposit`;
    const body = {
      address: tokenQuote.fromAddress,
      quoteUUID: quoteId,
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
              quoteId,
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
              quoteId,
              transactionHash: txnHash,
              reason: `Please contact customer support with the quote_id: ${quoteId}`,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Error processing your txn',
          description: `Please contact customer support with the quote_id: ${quoteId}`,
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
            quoteId,
            transactionHash: txnHash,
            reason: `Please contact customer support with the quote_id: ${quoteId}`,
          },
        });
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Error processing your txn',
        description: `Please contact customer support with the quote_id: ${quoteId}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const sendTransaction = async (payTokenModalParamsLocal: any) => {
    const {
      contractAddress,
      chainDetails,
      contractDecimals,
      denom,
      symbol,
      name,
    } = selectedToken as TokenMeta;
    const actualTokensRequired = limitDecimalPlaces(
      tokenQuote.tokensRequired,
      contractDecimals,
    );
    const { chainName } = chainDetails;
    const currentTimeStamp = new Date();
    const activityData: DebitCardTransaction = {
      id: genId(),
      status: ActivityStatus.PENDING,
      type: ActivityType.CARD,
      quoteId: '',
      tokenSymbol: symbol ?? '',
      chainName: chainDetails?.backendName ?? '',
      tokenName: name.toString() ?? '',
      amount: tokenQuote.tokensRequired.toString() ?? '',
      amountInUsd: tokenQuote.tokensRequiredFiat ?? '',
      datetime: new Date(),
      transactionHash: '',
    };
    activityRef.current = activityData;
    activityContext.dispatch({
      type: ActivityReducerAction.POST,
      value: activityRef.current,
    });
    setLoading(true);
    setPayTokenBottomConfirm(false);
    if (tokenQuote && selectedToken) {
      if (
        Math.floor((Number(currentTimeStamp) - tokenQuote.expiry) / 1000) <
        tokenQuoteExpiry
      ) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              gasAmount: payTokenModalParams.tokenSendParams.gasFeeInCrypto,
            },
          });
        if (chainName != null) {
          let response;
          if (chainName === ChainNames.ETH) {
            response = await sendEvmToken({
              chain: selectedToken.chainDetails.backendName,
              amountToSend: actualTokensRequired,
              toAddress: tokenQuote.targetAddress,
              contractAddress,
              contractDecimals,
              symbol: selectedToken.symbol,
            });
          } else if (PURE_COSMOS_CHAINS.includes(chainName)) {
            const wallets: Map<string, OfflineDirectSigner> =
              await getSignerClient(hdWallet);
            const wallet = wallets.get(
              cosmosConfig[chainDetails.chainName].prefix,
            );
            const accounts: any = await wallet?.getAccounts();
            const fromAddress = accounts[0].address;
            response = await interCosmosIBC({
              fromChain: chainDetails,
              toChain: CHAIN_OSMOSIS,
              denom,
              contractDecimals,
              amount,
              fromAddress,
              toAddress: tokenQuote.targetAddress,
            });
          } else if (chainName === CHAIN_EVMOS.chainName) {
            response = await evmosIBC({
              toAddress: tokenQuote.targetAddress,
              toChain: CHAIN_OSMOSIS,
              amount,
              denom,
              contractDecimals,
            });
          }
          const { hash, isError, error } = response;
          if (!isError) {
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: hash,
              chain: selectedToken?.chainDetails?.chainName ?? '',
            });
            void transferSentQuote(hash);
          } else {
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: selectedToken?.chainDetails?.chainName ?? '',
              message: parseErrorMessage(error),
              screen: route.name,
            });
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                  quoteId: tokenQuote.quoteId,
                  reason: error,
                },
              });
            setLoading(false);
            showModal('state', {
              type: 'error',
              title: 'Transaction Failed',
              description: `${String(error)}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
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
    } else {
      showModal('state', {
        type: 'error',
        title: t('MISSING_QUOTE'),
        description: t('MISSING_QUOTE_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const onCancelConfirmationModal = () => {
    setPayTokenModalParams({
      ...payTokenModalParams,
      isModalVisible: false,
    });
    void intercomAnalyticsLog('cancel_transfer_token', {
      from: ethereum.address,
    });
    activityRef.current &&
      activityContext.dispatch({
        type: ActivityReducerAction.DELETE,
        value: { id: activityRef.current.id },
      });
  };

  const onConfirmConfirmationModal = () => {
    void sendTransaction(payTokenModalParams);
  };

  const showQuoteModal = async (
    quote: CardQuoteResponse,
    isMaxQuote: boolean,
  ) => {
    const {
      chainDetails,
      actualBalance,
      logoUrl: selectedTokenLogoUrl,
      symbol: selectedTokenSymbol,
      contractAddress,
      contractDecimals,
      denom,
    } = selectedToken as TokenMeta;
    const gasPriceForEstimation: GasPriceDetail = {
      chainId: chainDetails.backendName,
      gasPrice: 0,
      tokenPrice: 0,
    };
    const nativeToken = getNativeToken(
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol,
      portfolioState.statePortfolio.tokenPortfolio[
        get(ChainNameMapping, chainDetails.backendName)
      ].holdings,
    );
    const actualTokensRequired = parseFloat(
      limitDecimalPlaces(quote.tokensRequired, contractDecimals),
    );
    if (chainDetails.chainName === ChainNames.ETH) {
      const web3 = new Web3(getWeb3Endpoint(chainDetails, globalContext));
      const targetWalletAddress = quote.targetAddress
        ? quote.targetAddress
        : '';
      setTokenQuote(quote);
      if (actualTokensRequired <= actualBalance) {
        try {
          const gasDetails = await estimateGasForEvm({
            web3,
            chain: chainDetails.backendName,
            fromAddress: ethereum.address,
            toAddress: targetWalletAddress,
            amountToSend: String(actualTokensRequired),
            contractAddress,
            contractDecimals,
          });
          if (gasDetails) {
            const hasSufficient = hasSufficientBalanceAndGasFee(
              selectedTokenSymbol === chainDetails.symbol,
              parseFloat(String(gasDetails.gasFeeInCrypto)),
              nativeTokenBalance,
              actualTokensRequired,
              actualBalance,
            );
            setPayTokenModalParams({
              isModalVisible: true,
              quoteExpiry: 60,
              hasSufficientBalanceAndGasFee: hasSufficient,
              tokenSendParams: {
                onConfirm: () => {
                  void onConfirmConfirmationModal();
                },
                onCancel: () => {
                  onCancelConfirmationModal();
                },
                chain: chainDetails.backendName,
                amountInCrypto: String(actualTokensRequired),
                amountInFiat: String(
                  formatAmount(
                    Number(actualTokensRequired) *
                      Number(selectedToken?.price ?? 0),
                  ),
                ),
                symbol: selectedTokenSymbol,
                toAddress: targetWalletAddress,
                gasFeeInCrypto: String(
                  formatAmount(Number(gasDetails?.gasFeeInCrypto)),
                ),
                gasFeeInFiat: String(
                  formatAmount(
                    Number(gasDetails?.gasFeeInCrypto) *
                      Number(nativeToken?.price ?? 0),
                  ),
                ),
                nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
              },
            });
          } else {
            setLoading(false);
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
        } catch (e) {
          const errorObject = {
            e,
            message: 'Error when estimating gasFee for the transaction for EVM',
            isMaxQuote,
            actualBalance,
            actualTokensRequired,
            rpc,
          };
          Sentry.captureException(errorObject);
          setLoading(false);
          showModal('state', {
            type: 'error',
            title: t('GAS_ESTIMATION_FAILED'),
            description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        setPayTokenModalParams({
          isModalVisible: true,
          quoteExpiry: 60,
          hasSufficientBalanceAndGasFee: false,
          tokenSendParams: {
            onConfirm: () => {
              void onConfirmConfirmationModal();
            },
            onCancel: () => {
              onCancelConfirmationModal();
            },
            chain: chainDetails.backendName,
            amountInCrypto: String(actualTokensRequired),
            amountInFiat: String(
              formatAmount(
                Number(actualTokensRequired) *
                  Number(selectedToken?.price ?? 0),
              ),
            ),
            symbol: selectedTokenSymbol,
            toAddress: targetWalletAddress,
            gasFeeInCrypto: '0',
            gasFeeInFiat: '0',
            nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
          },
        });
      }
      setLoading(false);
    } else if (PURE_COSMOS_CHAINS.includes(chainDetails.chainName)) {
      const wallets: Map<string, OfflineDirectSigner> =
        await getSignerClient(hdWallet);
      const wallet = wallets.get(cosmosConfig[chainDetails.chainName].prefix);
      const accounts: any = await wallet?.getAccounts();
      const targetWalletAddress = quote.targetAddress;
      try {
        console.log({
          fromChain: chainDetails,
          toChain: CHAIN_OSMOSIS,
          denom,
          amount: String(actualTokensRequired),
          fromAddress: accounts[0].address,
          toAddress: targetWalletAddress,
        });
        const gasDetails = await estimateGasForCosmosIBC({
          fromChain: chainDetails,
          toChain: CHAIN_OSMOSIS,
          denom,
          amount: String(quote.tokensRequired),
          fromAddress: accounts[0].address,
          toAddress: targetWalletAddress,
        });
        console.log(gasDetails);
        const hasSufficient = hasSufficientBalanceAndGasFee(
          selectedTokenSymbol === chainDetails.symbol,
          parseFloat(String(gasDetails.gasFeeInCrypto)),
          nativeTokenBalance,
          actualTokensRequired,
          actualBalance,
        );
        setPayTokenModalParams({
          isModalVisible: true,
          quoteExpiry: 60,
          hasSufficientBalanceAndGasFee: hasSufficient,
          tokenSendParams: {
            onConfirm: () => {
              void onConfirmConfirmationModal();
            },
            onCancel: () => {
              onCancelConfirmationModal();
            },
            chain: chainDetails.backendName,
            amountInCrypto: String(actualTokensRequired),
            amountInFiat: String(
              formatAmount(
                Number(actualTokensRequired) *
                  Number(selectedToken?.price ?? 0),
              ),
            ),
            symbol: selectedTokenSymbol,
            toAddress: targetWalletAddress,
            gasFeeInCrypto: String(
              formatAmount(Number(gasDetails?.gasFeeInCrypto)),
            ),
            gasFeeInFiat: String(
              formatAmount(
                Number(gasDetails?.gasFeeInCrypto) *
                  Number(nativeToken?.price ?? 0),
              ),
            ),
            nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
          },
        });
      } catch (e: any) {
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('GAS_ESTIMATION_FAILED'),
          description: e.message ?? '',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        const errorObject = {
          e,
          message:
            'Error when estimating gasFee for the transaction even after 3 tries.',
          isMaxQuote,
          actualBalance,
          actualTokensRequired,
          rpc,
        };
        Sentry.captureException(errorObject);
      }
      setLoading(false);
      setTokenQuote(quote);
    } else if (chainDetails.chainName === ChainNames.EVMOS) {
      const gasDetails = await estimateGasForEvmosIBC({
        toAddress: quote.targetAddress,
        toChain: CHAIN_OSMOSIS,
        amount,
        denom,
        contractDecimals,
      });
      const hasSufficient = hasSufficientBalanceAndGasFee(
        selectedTokenSymbol === chainDetails.symbol,
        parseFloat(String(gasDetails.gasFeeInCrypto)),
        nativeTokenBalance,
        actualTokensRequired,
        actualBalance,
      );
      setPayTokenModalParams({
        isModalVisible: true,
        quoteExpiry: 60,
        hasSufficientBalanceAndGasFee: hasSufficient,
        tokenSendParams: {
          onConfirm: () => {
            void onConfirmConfirmationModal();
          },
          onCancel: () => {
            onCancelConfirmationModal();
          },
          chain: chainDetails.backendName,
          amountInCrypto: String(actualTokensRequired),
          amountInFiat: String(
            formatAmount(
              Number(actualTokensRequired) * Number(selectedToken?.price ?? 0),
            ),
          ),
          symbol: selectedTokenSymbol,
          toAddress: quote.targetAddress,
          gasFeeInCrypto: String(
            formatAmount(Number(gasDetails?.gasFeeInCrypto)),
          ),
          gasFeeInFiat: String(
            formatAmount(
              Number(gasDetails?.gasFeeInCrypto) *
                Number(nativeToken?.price ?? 0),
            ),
          ),
          nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
        },
      });
    }
  };

  const fundCard = async () => {
    const { contractAddress, coinGeckoId, contractDecimals, chainDetails } =
      selectedToken as TokenMeta;
    setLoading(true);
    Keyboard.dismiss();
    if (
      chainDetails.chainName === ChainNames.ETH ||
      chainDetails.chainName === ChainNames.EVMOS
    ) {
      try {
        const amountToQuote = isCrpytoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'evm',
          address: ethereum.address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCrpytoInput,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (response?.data && !response.isError) {
          if (chainDetails.chainName != null) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, false);
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
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in evm chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
      try {
        const amountToQuote = isCrpytoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'cosmos',
          address: wallet[chainDetails.chainName].address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          coinId: coinGeckoId,
          amountInCrypto: isCrpytoInput,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        console.log(response);
        if (!response.isError && response?.data) {
          if (chainDetails.chainName != null) {
            const quote = response.data;
            void showQuoteModal(quote, false);
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
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in cosmos chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            chainAddress: wallet[chainDetails.chainName].address,
            coinGeckoId,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
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
    if (selectedToken) {
      const { symbol, backendName } = selectedToken.chainDetails;
      const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
      const hasInSufficientGas =
        (!GASLESS_CHAINS.includes(backendName) &&
          nativeTokenBalance <= get(gasFeeReservation, backendName)) ||
        (selectedToken?.symbol === nativeTokenSymbol &&
          Number(cryptoAmount) >
            Number(
              (
                nativeTokenBalance - get(gasFeeReservation, backendName)
              ).toFixed(6),
            ));
      return (
        Number(usdAmount) < minTokenValueLimit ||
        !selectedToken ||
        Number(cryptoAmount) > Number(selectedToken.actualBalance) ||
        hasInSufficientGas ||
        (backendName === CHAIN_ETH.backendName &&
          Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH)
      );
    }
    return true;
  };

  const onSelectingToken = (item: TokenMeta) => {
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
    setAmount('');
    setIsCryptoInput(false);
    setUsdAmount('');
    setCryptoAmount('');
  };

  const onMax = async () => {
    const {
      contractAddress,
      coinGeckoId,
      contractDecimals,
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
    } = selectedToken as TokenMeta;

    const nativeTokenSymbol =
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol;

    if (
      chainDetails.chainName === ChainNames.ETH ||
      chainDetails.chainName === ChainNames.EVMOS
    ) {
      const web3RPCEndpoint = new Web3(
        getWeb3Endpoint(hdWallet.state.selectedChain, globalContext),
      );
      setLoading(true);
      let amountInCrypto = actualBalance;
      try {
        // Reserving gas for the txn if the selected token is a native token.
        if (
          selectedTokenSymbol === nativeTokenSymbol &&
          !GASLESS_CHAINS.includes(chainDetails.backendName)
        ) {
          // Get the gasPrice from backend
          const gasPrice = await getGasPriceFor(chainDetails, web3RPCEndpoint);

          // Estimate the gasFee for the transaction
          const estimatedGasData = await estimateGasForNativeTransaction(
            hdWallet,
            chainDetails,
            selectedToken,
            actualBalance.toString(),
            true,
            gasPrice,
            () => null,
            globalContext,
            ethereum.address,
          );
          if (estimatedGasData) {
            const gasFeeEstimationForTxn = estimatedGasData.gasFeeETH;
            // Adjust the amountInCrypto with the estimated gas fee
            amountInCrypto =
              actualBalance -
              parseFloat(gasFeeEstimationForTxn) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
            amountInCrypto = Number(limitDecimalPlaces(amountInCrypto));
          } else {
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            return;
          }
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when estimating gas for the evm transaction.',
          selectedToken,
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('GAS_ESTIMATION_FAILED'),
          description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      // Quote with isAmountInCrypto = true and amount as the adjusted crypto amount
      try {
        const payload = {
          ecosystem: 'evm',
          address: ethereum.address,
          chain: chainDetails.backendName,
          amount: amountInCrypto,
          tokenAddress: contractAddress,
          amountInCrypto: true,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError) {
          const quote: CardQuoteResponse = response.data;
          void showQuoteModal(quote, true);
        } else {
          setLoading(false);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in evm chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
      let amountInCrypto = actualBalance;
      const gasReservedTokenAmount =
        actualBalance - get(gasFeeReservation, chainDetails.backendName);
      // Reserving gas for the txn if the selected token is a native token.
      setLoading(true);
      if (
        selectedTokenSymbol === nativeTokenSymbol &&
        !GASLESS_CHAINS.includes(chainDetails.backendName)
      ) {
        const cosmosSigner = await getCosmosSignerClient(
          chainDetails,
          hdWalletContext,
        );
        try {
          const usdAmountForCosmosGasEstimation = ethers.utils
            .parseUnits(
              parseFloat(
                gasReservedTokenAmount.toString().length > 8
                  ? gasReservedTokenAmount.toString().substring(0, 8)
                  : gasReservedTokenAmount.toString(),
              ).toFixed(6),
              6,
            )
            .toString();
          const estimatedGasData = await estimateGasForCosmosTransaction(
            chainDetails,
            cosmosSigner,
            usdAmountForCosmosGasEstimation,
            get(senderAddress, chainDetails.chainName),
            get(senderAddress, chainDetails.chainName),
            selectedToken,
            get(rpc, chainDetails.chainName),
            () => null,
            // IT WAS VALUE USD. SEE IF IT IS OKAY TO USE TOTALVALUE FROM SELECTED TOKEN LIKE THIS.
            gasReservedTokenAmount.toString(),
            portfolioState,
            globalStateContext.globalState.rpcEndpoints,
          );
          if (estimatedGasData) {
            const gasFeeEstimationForTxn = estimatedGasData.gasFeeNative;
            amountInCrypto =
              actualBalance -
              parseFloat(gasFeeEstimationForTxn) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
          } else {
            setLoading(false);
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            return;
          }
        } catch (err) {
          const errorObject = {
            err,
            message: 'Error when estimating gas for the cosmos transaction.',
            selectedToken,
          };
          Sentry.captureException(errorObject);
          setLoading(false);
          showModal('state', {
            type: 'error',
            title: t('GAS_ESTIMATION_FAILED'),
            description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          return;
        }
      }

      try {
        const payload = {
          ecosystem: 'cosmos',
          address: wallet[chainDetails.chainName].address,
          chain: chainDetails.backendName,
          amount: amountInCrypto,
          coinId: coinGeckoId,
          amountInCrypto: isCrpytoInput,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError) {
          const quote: CardQuoteResponse = response.data;
          void showQuoteModal(quote, true);
        } else {
          setLoading(false);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response.error.message ?? t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } catch (e) {
        const errorObject = {
          e,
          message: 'Error when quoting non-max amount in cosmos chains',
          selectedToken,
          quoteData: {
            currentCardProvider,
            cardId,
            chain: chainDetails.backendName,
            contractAddress,
            usdAmount,
            ethAddress: ethereum.address,
            chainAddress: wallet[chainDetails.chainName].address,
            coinGeckoId,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: '',
          description: t('UNABLE_TO_TRANSFER'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } else {
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: '',
        description: t('UNABLE_TO_TRANSFER'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const RenderSelectedToken = () => {
    return (
      <CyDTouchView
        className={
          'bg-[#F7F8FE] mx-[20px] my-[16px] border-[1px] border-[#EBEBEB] rounded-[8px]'
        }
        onPress={() => setIsChooseTokenVisible(true)}>
        <CyDView
          className={
            'p-[18px] flex flex-row flex-wrap justify-between items-center'
          }>
          {selectedToken && (
            <CyDView className={'flex flex-row w-[50%] items-center'}>
              <CyDImage
                source={{ uri: selectedToken.logoUrl }}
                className={'w-[25px] h-[25px] rounded-[20px]'}
              />
              <CyDView className='flex flex-col justify-center items-start'>
                <CyDText
                  className={clsx(
                    'text-center text-black font-nunito font-bold text-[16px] ml-[8px]',
                    {
                      'text-[14px]': selectedToken.isZeroFeeCardFunding,
                    },
                  )}>
                  {selectedToken.name}
                </CyDText>
                {selectedToken.isZeroFeeCardFunding ? (
                  <CyDView className='h-[20px] bg-white rounded-[8px] mx-[4px] px-[8px] flex justify-center items-center'>
                    <CyDText className={'font-black text-[10px]'}>
                      {'ZERO FEE ✨'}
                    </CyDText>
                  </CyDView>
                ) : null}
              </CyDView>
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
                <CyDText className={'font-extrabold'}>{'~'}</CyDText>
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
    if (selectedToken) {
      const { symbol, backendName } = selectedToken.chainDetails;
      if (symbol && backendName) {
        const nativeTokenSymbol = get(NativeTokenMapping, symbol) || symbol;
        let errorMessage = '';
        if (Number(cryptoAmount) > Number(selectedToken?.actualBalance)) {
          errorMessage = t('INSUFFICIENT_FUNDS');
        } else if (
          !GASLESS_CHAINS.includes(backendName) &&
          nativeTokenBalance <= get(gasFeeReservation, backendName)
        ) {
          errorMessage = String(
            `Insufficient ${String(nativeTokenSymbol)} to pay gas fee`,
          );
        } else if (
          selectedToken?.symbol === nativeTokenSymbol &&
          Number(cryptoAmount) >
            Number(
              (
                nativeTokenBalance - get(gasFeeReservation, backendName)
              ).toFixed(6),
            )
        ) {
          errorMessage = t('INSUFFICIENT_GAS_FEE');
        } else if (
          usdAmount &&
          backendName === CHAIN_ETH.backendName &&
          Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH
        ) {
          errorMessage = t('MINIMUM_AMOUNT_ETH');
        }
        return (
          <CyDView className='mb-[10px]'>
            <CyDText className='text-center text-redColor font-medium'>
              {errorMessage}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  };

  const onPressToggle = () => {
    setIsCryptoInput(!isCrpytoInput);
    if (!isCrpytoInput) {
      const usdAmt =
        parseFloat(amount) *
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(amount);
      setUsdAmount(
        (isNaN(usdAmt)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? usdAmt
            : usdAmt / 1.02
        ).toString(),
      );
    } else {
      const cryptoAmt =
        parseFloat(amount) /
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(
        (isNaN(cryptoAmt)
          ? '0.00'
          : selectedToken?.isZeroFeeCardFunding
            ? cryptoAmt
            : cryptoAmt * 1.02
        ).toString(),
      );
      setUsdAmount(amount);
    }
  };

  return (
    <CyDSafeAreaView className='h-full bg-white'>
      <ChooseTokenModal
        isChooseTokenModalVisible={isChooseTokenVisible}
        tokenList={portfolioState.statePortfolio.tokenPortfolio.totalHoldings}
        minTokenValueLimit={minTokenValueLimit}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          onSelectingToken(token);
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
          navigation.goBack();
        }}
        noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
        renderPage={'fundCardPage'}
      />
      <BottomTokenCardConfirm
        isModalVisible={payTokenModalParams.isModalVisible}
        quoteExpiry={payTokenModalParams.quoteExpiry}
        hasSufficientBalanceAndGasFee={
          payTokenModalParams.hasSufficientBalanceAndGasFee
        }
        tokenSendParams={payTokenModalParams.tokenSendParams}
      />
      <CyDKeyboardAwareScrollView>
        <RenderSelectedToken />
        <CyDView className={'mx-[20px]'}>
          <CyDView className='flex flex-row bg-[#F7F8FE] rounded-[8px] h-[300px] px-[20px] justify-between items-center'>
            <CyDView className={'p-[4px]'}>
              <CyDTouchView
                onPress={() => {
                  void onMax();
                }}
                disabled={loading}
                className={clsx(
                  'bg-white border border-inputBorderColor rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                )}>
                <CyDText>{t('MAX')}</CyDText>
              </CyDTouchView>
            </CyDView>
            <CyDView
              className={'pb-[10px] max-w-[60%] items-center bg-[#F7F8FE]'}>
              <CyDText
                className={
                  'font-extrabold text-[22px] text-center font-nunito text-black'
                }>
                {t<string>('ENTER_AMOUNT')}
              </CyDText>
              <CyDView className={'flex justify-center items-center'}>
                <CyDText className='text-[20px] font-semibold mt-[5px]'>
                  {isCrpytoInput ? selectedToken?.name : 'USD'}
                </CyDText>
                <CyDTextInput
                  className={clsx(
                    'font-extrabold text-center text-primaryTextColor h-[85px] font-nunito',
                    {
                      'text-[20px]': amount.length <= 15,
                      'text-[40px]': amount.length <= 10,
                      'text-[60px]': amount.length <= 5,
                    },
                  )}
                  value={amount}
                  keyboardType='numeric'
                  autoCapitalize='none'
                  autoCorrect={false}
                  onChangeText={text => {
                    setAmount(text);
                    if (isCrpytoInput) {
                      const usdText =
                        parseFloat(text) *
                        (selectedToken?.isZeroFeeCardFunding
                          ? 1
                          : Number(selectedToken?.price));
                      setCryptoAmount(text);
                      setUsdAmount(
                        (isNaN(usdText)
                          ? '0.00'
                          : selectedToken?.isZeroFeeCardFunding
                            ? usdText
                            : usdText / 1.02
                        ).toString(),
                      );
                    } else {
                      const cryptoText =
                        parseFloat(text) /
                        (selectedToken?.isZeroFeeCardFunding
                          ? 1
                          : Number(selectedToken?.price));
                      setCryptoAmount(
                        (isNaN(cryptoText)
                          ? '0.00'
                          : selectedToken?.isZeroFeeCardFunding
                            ? cryptoText
                            : cryptoText * 1.02
                        ).toString(),
                      );
                      setUsdAmount(text);
                    }
                  }}
                  onFocus={() => {
                    setPlaceholderText('');
                  }}
                  placeholder={placeholderText}
                  placeholderTextColor={'#999'}
                />
                <CyDText
                  className={clsx(
                    'text-center text-primaryTextColor h-[50px] text-[16px]',
                  )}>
                  {'~' +
                    (isCrpytoInput
                      ? (!isNaN(parseFloat(usdAmount))
                          ? formatAmount(usdAmount).toString()
                          : '0.00') + ' USD'
                      : (!isNaN(parseFloat(cryptoAmount))
                          ? formatAmount(cryptoAmount).toString()
                          : '0.00') +
                        ' ' +
                        (selectedToken?.symbol ?? ' '))}
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
            <CyDView className={'p-[4px]'}>
              <CyDTouchView
                onPress={() => {
                  onPressToggle();
                }}
                className={clsx(
                  'bg-white border border-inputBorderColor rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                )}>
                <CyDFastImage
                  className='h-[16px] w-[16px]'
                  source={AppImages.TOGGLE_ICON}
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
          <Button
            onPress={() => {
              if (validateAmount(amount)) {
                void fundCard();
              }
            }}
            type={ButtonType.PRIMARY}
            disabled={isLoadCardDisabled()}
            title={t('QUOTE')}
            style={clsx('h-[60px] mx-[32px] py-[10px] -top-[25px]', {
              'py-[8px]': loading,
            })}
            loading={loading}
          />
        </CyDView>
      </CyDKeyboardAwareScrollView>
    </CyDSafeAreaView>
  );
}
