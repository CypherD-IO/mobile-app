import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTouchView,
  CyDView,
  CyDScrollView,
} from '../../../styles/tailwindComponents';
import AppImages from '../../../../assets/images/appImages';
import {
  ActivityContext,
  formatAmount,
  HdWalletContext,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
  toBase64,
} from '../../../core/util';
import Button from '../../../components/v2/button';
import {
  AnalyticsType,
  ButtonType,
  CypherPlanId,
  HyperLiquidAccount,
} from '../../../constants/enum';
import { capitalize, get } from 'lodash';
import {
  ChainBackendNames,
  ChainConfigMapping,
  ChainNameMapping,
  ChainNames,
  COSMOS_CHAINS,
  PURE_COSMOS_CHAINS,
} from '../../../constants/server';
import { useTranslation } from 'react-i18next';
import { PayTokenModalParams } from '../../../models/card.model';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  DebitCardTransaction,
} from '../../../reducers/activity_reducer';
import { genId } from '../../utilities/activityUtilities';
import useTransactionManager from '../../../hooks/useTransactionManager';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { screenTitle } from '../../../constants';
import { MODAL_HIDE_TIMEOUT_250 } from '../../../core/Http';
import useAxios from '../../../core/HttpRequest';
import { intercomAnalyticsLog } from '../../utilities/analyticsUtility';
import * as Sentry from '@sentry/react-native';
import { StyleSheet } from 'react-native';
import { getConnectionType } from '../../../core/asyncStorage';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import { clsx } from 'clsx';
import LinearGradient from 'react-native-linear-gradient';
import PriceFluctuationLearnMoreModal from '../../../components/priceFluctuationLearnMoreModal';
import { usePortfolioRefresh } from '../../../hooks/usePortfolioRefresh';
import GradientText from '../../../components/gradientText';
import SelectPlanModal from '../../../components/selectPlanModal';
import useHyperLiquid from '../../../hooks/useHyperLiquid';
import { TxRaw } from '@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx';
import useSkipApiBridge from '../../../core/skipApi';
import { formatUnits } from 'viem';
import { AnalyticEvent, logAnalyticsToFirebase } from '../../../core/analytics';

export default function CardQuote({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: PayTokenModalParams; name: string };
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const {
    hasSufficientBalanceAndGasFee,
    tokenSendParams,
    cardProvider,
    cardId,
    planCost,
  } = route.params;
  const {
    chain,
    amountInFiat,
    symbol,
    gasFeeInCrypto,
    gasFeeInFiat,
    nativeTokenSymbol,
    selectedToken,
    tokenQuote,
  } = tokenSendParams;
  const { globalState } = useContext(GlobalContext) as GlobalContextDef;
  const quoteExpiry = 60;
  const [tokenExpiryTime, setTokenExpiryTime] = useState(quoteExpiry);
  const [expiryTimer, setExpiryTimer] = useState<NodeJS.Timer>();
  const [isPayDisabled, setIsPayDisabled] = useState<boolean>(
    hasSufficientBalanceAndGasFee,
  );
  const [hasPriceFluctuationConsent, setHasPriceFluctuationConsent] =
    useState<boolean>(false);
  const [planChangeModalVisible, setPlanChangeModalVisible] =
    useState<boolean>(false);
  const hdWallet = useContext<any>(HdWalletContext);
  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );
  const solanaAddress = get(hdWallet, 'state.wallet.solana.address', '');
  const activityContext = useContext<any>(ActivityContext);
  const activityRef = useRef<DebitCardTransaction | null>(null);
  const { sendEvmToken, sendSolanaTokens } = useTransactionManager();
  const { skipApiSignAndBroadcast } = useSkipApiBridge();
  const { transferOnHyperLiquid } = useHyperLiquid();
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth, postToOtherSource } = useAxios();
  const { refreshPortfolio } = usePortfolioRefresh();
  const planInfo = globalState?.cardProfile?.planInfo;
  const [
    isPriceFluctuationLearnMoreModalVisible,
    setIsPriceFluctuationLearnMoreModalVisible,
  ] = useState<boolean>(false);
  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const noble = hdWallet.state.wallet.noble;
  const coreum = hdWallet.state.wallet.coreum;
  const injective = hdWallet.state.wallet.injective;

  const cosmosAddresses = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    noble: noble.address,
    coreum: coreum.address,
    injective: injective.address,
    'cosmoshub-4': cosmos.address,
    'osmosis-1': osmosis.address,
    'coreum-mainnet-1': coreum.address,
    'noble-1': noble.address,
    'injective-1': injective.address,
  };

  const chainLogo = get(
    ChainConfigMapping,
    get(ChainNameMapping, chain),
  )?.logo_url;

  useEffect(() => {
    let tempIsPayDisabled = false;
    tempIsPayDisabled = !hasSufficientBalanceAndGasFee;
    setIsPayDisabled(tempIsPayDisabled);
    if (quoteExpiry && !tempIsPayDisabled) {
      let tempTokenExpiryTime = quoteExpiry;
      setIsPayDisabled(false);
      setTokenExpiryTime(tempTokenExpiryTime);
      setExpiryTimer(
        setInterval(() => {
          tempTokenExpiryTime--;
          setTokenExpiryTime(tempTokenExpiryTime);
        }, 1000),
      );
    }
  }, []);

  useEffect(() => {
    if (tokenExpiryTime === 0 && quoteExpiry) {
      clearInterval(expiryTimer);
      setIsPayDisabled(true);
    }
  }, [tokenExpiryTime]);

  const onCancel = () => {
    void intercomAnalyticsLog('cancel_transfer_token', {
      from: ethereumAddress,
    });
    if (quoteExpiry && tokenExpiryTime !== 0) {
      clearInterval(expiryTimer);
    }
    activityRef.current &&
      activityContext.dispatch({
        type: ActivityReducerAction.DELETE,
        value: { id: activityRef.current.id },
      });
    navigation.goBack();
  };

  const getAddressList = async (requiredAddresses: string[]) => {
    const addresses: string[] = [];
    try {
      for (let i = 0; i < requiredAddresses?.length; i++) {
        const address = get(cosmosAddresses, requiredAddresses[i], '');
        addresses.push(address);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
    return addresses;
  };

  const transferSentQuote = async (
    address: string,
    quoteId: string,
    txnHash: string,
  ) => {
    if (txnHash === null || txnHash === undefined) {
      Sentry.captureException(
        `Trying to call Deposit call with txnHash value null or undefined. Details: ${JSON.stringify(
          {
            txnHash,
            address,
            quoteId,
          },
        )}`,
      );
      return;
    }
    const transferSentUrl = `/v1/cards/${cardProvider}/card/${cardId}/deposit`;
    const body = {
      address,
      quoteUUID: quoteId,
      txnHash,
    };

    try {
      if (!body.txnHash) {
        showModal('state', {
          type: 'error',
          title: 'Unable to fetch transaction hash',
          description: `Incase your transaction went through, please contact customer support with the quote_id: ${quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }
      const response = await postWithAuth(transferSentUrl, body);
      if (!response.isError) {
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
          title: t('FUNDING_IN_PROGRESS'),
          description:
            'Your card funding is in progress and will be done within 5 mins!',
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
        const connectedType = await getConnectionType();
        void logAnalyticsToFirebase(AnalyticEvent.CARD_LOAD, {
          connectionType: connectedType,
          chain: selectedToken.chainDetails.backendName,
          token: selectedToken.symbol,
          amountInUSD: tokenQuote.amount,
        });
      } else {
        const errorMessage = parseErrorMessage(response.error);
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.FAILED,
              quoteId,
              transactionHash: txnHash,
              reason: `${errorMessage}, Please contact customer support with the quote_id: ${quoteId}`,
            },
          });
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Error processing your txn',
          description: `${errorMessage}, Please contact customer support with the quote_id: ${quoteId}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId,
            transactionHash: txnHash,
            reason: `${errorMessage}, Please contact customer support with the quote_id: ${quoteId}`,
          },
        });
      Sentry.captureException(error);
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Error processing your txn',
        description: `${errorMessage}, Please contact customer support with the quote_id: ${quoteId}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const sendTransaction = useCallback(async () => {
    const {
      contractAddress,
      chainDetails,
      contractDecimals,
      denom,
      symbol,
      name,
    } = selectedToken;
    setLoading(true);
    const actualTokensRequired = limitDecimalPlaces(
      tokenQuote.tokensRequired,
      contractDecimals,
    );
    try {
      const { chainName } = chainDetails;
      const activityData: DebitCardTransaction = {
        id: genId(),
        status: ActivityStatus.PENDING,
        type: ActivityType.CARD,
        quoteId: '',
        tokenSymbol: symbol ?? '',
        chainName: chainDetails?.backendName ?? '',
        tokenName: name.toString() ?? '',
        amount: tokenQuote.tokensRequired.toString() ?? '',
        amountInUsd: tokenQuote.amount ?? '',
        datetime: new Date(),
        transactionHash: '',
      };
      activityRef.current = activityData;
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: activityRef.current,
      });
      if (tokenQuote && selectedToken) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              gasAmount: tokenSendParams.gasFeeInCrypto,
            },
          });
        if (chainName != null) {
          let response;
          if (chainDetails.backendName === ChainBackendNames.HYPERLIQUID) {
            response = await transferOnHyperLiquid({
              chain: ChainBackendNames.ARBITRUM,
              amountToSend: actualTokensRequired,
              toAddress: tokenQuote.targetAddress,
              contractAddress,
              contractDecimals,
              accountType: selectedToken.accountType as HyperLiquidAccount,
              symbol: selectedToken.symbol,
            });
          } else if (chainName === ChainNames.ETH) {
            response = await sendEvmToken({
              chain: selectedToken.chainDetails.backendName,
              amountToSend: actualTokensRequired,
              toAddress: tokenQuote.targetAddress as `0x${string}`,
              contractAddress: contractAddress as `0x${string}`,
              contractDecimals,
              symbol: selectedToken.symbol,
            });
          } else if (COSMOS_CHAINS.includes(chainName)) {
            const addressList = await getAddressList(
              tokenQuote.cosmosSwap?.requiredAddresses ?? [],
            );
            if (!addressList.length) {
              addressList.push(tokenQuote.targetAddress);
            } else {
              addressList[addressList.length - 1] = tokenQuote.targetAddress;
            }
            const body = {
              source_asset_denom: tokenQuote.cosmosSwap?.sourceAssetDenom,
              source_asset_chain_id: tokenQuote.cosmosSwap?.sourceAssetChainId,
              dest_asset_denom: tokenQuote.cosmosSwap?.destAssetDenom,
              dest_asset_chain_id: tokenQuote.cosmosSwap?.destAssetChainId,
              amount_in: tokenQuote.cosmosSwap?.amountIn,
              amount_out: tokenQuote.cosmosSwap?.amountOut,
              address_list: addressList,
              slippage_tolerance_percent: '1',
              operations: tokenQuote.cosmosSwap?.operations,
            };
            const {
              isError,
              error: fetchError,
              data,
            } = await postToOtherSource(
              'https://api.skip.build/v2/fungible/msgs',
              body,
            );
            if (!isError) {
              const txs = data?.txs;
              for (const tx of txs) {
                const cosmosTx = get(tx, 'cosmos_tx');
                if (cosmosTx) {
                  try {
                    // Log the incoming cosmos transaction data for debugging
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'Cosmos transaction data received',
                      level: 'info',
                      data: {
                        hasCosmosTx: !!cosmosTx,
                        chain: selectedToken.chainDetails.chain_id,
                      },
                    });

                    const transaction = await skipApiSignAndBroadcast({
                      cosmosTx,
                      chain: selectedToken.chainDetails.chain_id,
                      showModalAndGetResponse: async (setter: any) => {
                        return true;
                      },
                      setCosmosModalVisible: () => {},
                      shouldBroadcast: false,
                    });

                    // Log the transaction response from skipApiSignAndBroadcast
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message:
                        'Transaction response from skipApiSignAndBroadcast',
                      level: 'info',
                      data: {
                        isError: transaction.isError,
                        hasTxn: !!transaction.txn,
                        bodyBytesLength: transaction.txn?.bodyBytes?.length,
                        authInfoBytesLength:
                          transaction.txn?.authInfoBytes?.length,
                        signaturesLength: transaction.txn?.signatures?.length,
                        chainId: transaction.chainId,
                      },
                    });

                    // Validate transaction data before creating TxRaw
                    if (!transaction.txn) {
                      throw new Error(
                        'Transaction object is null or undefined',
                      );
                    }

                    if (
                      !transaction.txn.bodyBytes ||
                      transaction.txn.bodyBytes.length === 0
                    ) {
                      throw new Error(
                        'Transaction bodyBytes is empty or undefined',
                      );
                    }

                    if (
                      !transaction.txn.authInfoBytes ||
                      transaction.txn.authInfoBytes.length === 0
                    ) {
                      throw new Error(
                        'Transaction authInfoBytes is empty or undefined',
                      );
                    }

                    if (
                      !transaction.txn.signatures ||
                      transaction.txn.signatures.length === 0
                    ) {
                      throw new Error(
                        'Transaction signatures is empty or undefined',
                      );
                    }

                    // Log the raw transaction data before creating TxRaw
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'Raw transaction data before TxRaw creation',
                      level: 'info',
                      data: {
                        bodyBytesLength: transaction.txn.bodyBytes?.length,
                        bodyBytesIsUint8Array:
                          transaction.txn.bodyBytes instanceof Uint8Array,
                        authInfoBytesLength:
                          transaction.txn.authInfoBytes?.length,
                        authInfoBytesIsUint8Array:
                          transaction.txn.authInfoBytes instanceof Uint8Array,
                        signaturesLength: transaction.txn.signatures?.length,
                        signaturesIsArray: Array.isArray(
                          transaction.txn.signatures,
                        ),
                        hasEmptySignatures: transaction.txn.signatures?.some(
                          sig => !sig || sig.length === 0,
                        ),
                      },
                    });

                    const txRaw = TxRaw.fromPartial({
                      bodyBytes: transaction.txn.bodyBytes,
                      authInfoBytes: transaction.txn.authInfoBytes,
                      signatures: transaction.txn.signatures,
                    } as any);

                    // Log the TxRaw object
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'TxRaw object created',
                      level: 'info',
                      data: {
                        hasBodyBytes: !!txRaw.bodyBytes,
                        bodyBytesLength: txRaw.bodyBytes?.length,
                        hasAuthInfoBytes: !!txRaw.authInfoBytes,
                        authInfoBytesLength: txRaw.authInfoBytes?.length,
                        hasSignatures: !!txRaw.signatures,
                        signaturesLength: txRaw.signatures?.length,
                        hasEmptySignatures: txRaw.signatures?.some(
                          sig => !sig || sig.length === 0,
                        ),
                      },
                    });

                    // Encode the transaction into Uint8Array
                    const signedTxBytes = TxRaw.encode(txRaw).finish();

                    // Log the encoded transaction bytes
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'Encoded transaction bytes',
                      level: 'info',
                      data: {
                        signedTxBytesLength: signedTxBytes.length,
                        isUint8Array: signedTxBytes instanceof Uint8Array,
                        isEmpty: signedTxBytes.length === 0,
                      },
                    });

                    // Validate encoded bytes
                    if (!signedTxBytes || signedTxBytes.length === 0) {
                      throw new Error('Encoded transaction bytes are empty');
                    }

                    // Convert to Base64 for Skip API
                    const base64Tx = toBase64(signedTxBytes);

                    // Log the base64 transaction
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'Base64 transaction created',
                      level: 'info',
                      data: {
                        base64TxLength: base64Tx.length,
                        isEmpty: base64Tx.length === 0,
                      },
                    });

                    // Log the API request payload
                    const apiPayload = {
                      tx: base64Tx,
                      chain_id: tokenQuote.cosmosSwap?.sourceAssetChainId,
                    };
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'API request payload prepared',
                      level: 'info',
                      data: {
                        txLength: apiPayload.tx.length,
                        chainId: apiPayload.chain_id,
                        hasChainId: !!apiPayload.chain_id,
                        isEmpty: apiPayload.tx.length === 0,
                      },
                    });

                    const {
                      isError: isSubmitError,
                      error: submitError,
                      data: submitData,
                    } = await postToOtherSource(
                      'https://api.skip.build/v2/tx/submit',
                      apiPayload,
                    );

                    // Log the API response
                    Sentry.addBreadcrumb({
                      category: 'transaction',
                      message: 'API response received',
                      level: 'info',
                      data: {
                        isError: isSubmitError,
                        hasData: !!submitData,
                        hasTxHash: !!submitData?.tx_hash,
                        errorType: submitError ? typeof submitError : null,
                      },
                    });

                    if (!isSubmitError && submitData?.tx_hash) {
                      response = { isError: false, hash: submitData.tx_hash };
                    } else {
                      // Capture specific "invalid empty transaction" error
                      if (
                        submitError &&
                        typeof submitError === 'string' &&
                        submitError.includes('invalid empty transaction')
                      ) {
                        Sentry.captureException(
                          new Error('Invalid empty transaction detected'),
                          {
                            tags: {
                              error_type: 'invalid_empty_transaction',
                              chain_id:
                                tokenQuote.cosmosSwap?.sourceAssetChainId,
                              tx_length: base64Tx.length,
                              has_signatures:
                                txRaw.signatures && txRaw.signatures.length > 0,
                              signatures_length: txRaw.signatures?.length,
                              body_bytes_length: txRaw.bodyBytes?.length,
                              auth_info_bytes_length:
                                txRaw.authInfoBytes?.length,
                            },
                            extra: {
                              submitError,
                              transactionData: {
                                hasTxn: !!transaction.txn,
                                bodyBytesLength:
                                  transaction.txn?.bodyBytes?.length,
                                authInfoBytesLength:
                                  transaction.txn?.authInfoBytes?.length,
                                signaturesLength:
                                  transaction.txn?.signatures?.length,
                                hasEmptySignatures:
                                  transaction.txn?.signatures?.some(
                                    sig => !sig || sig.length === 0,
                                  ),
                              },
                            },
                          },
                        );
                      }
                      throw new Error(submitError);
                    }
                  } catch (e) {
                    // Log detailed error information
                    Sentry.addBreadcrumb({
                      category: 'error',
                      message: 'Transaction error occurred',
                      level: 'error',
                      data: {
                        errorType: typeof e,
                        errorMessage: (e as any)?.message,
                        errorName: (e as any)?.name,
                        isError: e instanceof Error,
                      },
                    });

                    const errorMessage = parseErrorMessage(e);
                    Sentry.addBreadcrumb({
                      category: 'error',
                      message: 'Parsed error message',
                      level: 'info',
                      data: {
                        parsedMessage: errorMessage,
                      },
                    });

                    if (
                      !errorMessage.includes(
                        'User denied transaction signature.',
                      )
                    ) {
                      Sentry.captureException(e);
                    }
                    throw new Error(errorMessage);
                  }
                }
              }
            } else {
              response = { isError: true, error: fetchError };
            }
          } else if (chainName === ChainNames.SOLANA) {
            response = await sendSolanaTokens({
              amountToSend: actualTokensRequired,
              toAddress: tokenQuote.targetAddress,
              contractDecimals,
              contractAddress,
            });
          }
          if (response && !response?.isError) {
            void logAnalytics({
              type: AnalyticsType.SUCCESS,
              txnHash: response?.hash,
              chain: selectedToken?.chainDetails?.backendName ?? '',
              address: PURE_COSMOS_CHAINS.includes(
                selectedToken?.chainDetails?.chainName,
              )
                ? get(
                    cosmosAddresses,
                    selectedToken?.chainDetails?.chainName,
                    '',
                  )
                : chainName === ChainNames.SOLANA
                  ? solanaAddress
                  : ethereumAddress,
            });
            void refreshPortfolio();
            void transferSentQuote(
              tokenQuote.fromAddress,
              tokenQuote.quoteId,
              response.hash,
            );
          } else {
            const errorMessage = parseErrorMessage(response?.error);
            const connectionType = await getConnectionType();
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: selectedToken?.chainDetails?.backendName ?? '',
              message: errorMessage,
              screen: route.name,
              address: PURE_COSMOS_CHAINS.includes(
                selectedToken?.chainDetails?.chainName,
              )
                ? get(
                    cosmosAddresses,
                    selectedToken?.chainDetails?.chainName,
                    '',
                  )
                : selectedToken?.chainDetails?.chainName === ChainNames.SOLANA
                  ? solanaAddress
                  : ethereumAddress,
              ...(tokenQuote.quoteId ? { quoteId: tokenQuote.quoteId } : {}),
              ...(connectionType ? { connectionType } : {}),
              other: {
                amountToSend: actualTokensRequired,
                contractAddress,
                symbol: selectedToken.symbol,
              },
            });
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                  quoteId: tokenQuote.quoteId,
                  reason: errorMessage,
                },
              });
            setLoading(false);
            showModal('state', {
              type: 'error',
              title: 'Transaction Failed',
              description: `${errorMessage}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
        }
      } else {
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('MISSING_QUOTE'),
          description: t('MISSING_QUOTE_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (error) {
      const errorMessage = parseErrorMessage(error);
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: selectedToken?.chainDetails?.backendName ?? '',
        message: parseErrorMessage(error),
        screen: route.name,
        address: PURE_COSMOS_CHAINS.includes(
          selectedToken?.chainDetails?.chainName,
        )
          ? get(cosmosAddresses, selectedToken?.chainDetails?.chainName, '')
          : selectedToken?.chainDetails?.chainName === ChainNames.SOLANA
            ? solanaAddress
            : ethereumAddress,
        ...(tokenQuote.quoteId ? { quoteId: tokenQuote.quoteId } : {}),
        other: {
          amountToSend: actualTokensRequired,
          contractAddress,
          symbol: selectedToken.symbol,
        },
      });
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId: tokenQuote.quoteId,
            reason: errorMessage,
          },
        });
      setLoading(false);
      showModal('state', {
        type: 'error',
        title: 'Transaction Failed',
        description: `${errorMessage}, Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  }, []);

  const onLoadPress = async () => {
    if (expiryTimer) {
      clearInterval(expiryTimer);
    }
    await sendTransaction();
  };

  return (
    <CyDView className={'flex-1 w-full bg-n20 flex flex-col justify-between'}>
      <PriceFluctuationLearnMoreModal
        isModalVisible={isPriceFluctuationLearnMoreModalVisible}
        setModalVisible={setIsPriceFluctuationLearnMoreModalVisible}
        style={styles.priceFluctuationLearnMoreModal}
      />
      <SelectPlanModal
        isModalVisible={planChangeModalVisible}
        setIsModalVisible={setPlanChangeModalVisible}
        cardProvider={cardProvider}
        cardId={cardId}
      />

      {/* Scrollable content area */}
      <CyDScrollView className='flex-1'>
        <CyDView className={'mx-[22px]'}>
          <CyDView className='flex flex-col justify-center items-center pb-[45px] border-b-[2px] border-n40'>
            <CyDText className='text-[52px] text-mandarin font-bold'>
              {'$' + limitDecimalPlaces(amountInFiat, 4)}
            </CyDText>
            <CyDText className='mt-[6px]'>
              {t('AMOUNT_TO_BE_LOADED_IN_CARD')}
            </CyDText>
          </CyDView>
          <CyDView
            className={
              'flex flex-row justify-between items-center mt-[40px] pb-[16px]'
            }>
            <CyDText className={'font-medium text-[14px]'}>
              {t('NETWORK')}
            </CyDText>
            <CyDView
              className={'flex flex-row justify-center items-center pl-[25px]'}>
              <CyDFastImage
                source={chainLogo}
                className={'w-[18px] h-[18px]'}
              />
              <CyDText className={'font-semibold text-[14px] ml-[4px]'}>
                {capitalize(chain)}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDText className={'font-medium text-[14px]'}>
              {t('CRYPTO_VALUE')}
            </CyDText>
            <CyDView
              className={'flex flex-col flex-wrap justify-between items-end'}>
              <CyDText className={'font-bold text-[14px] '}>
                {limitDecimalPlaces(
                  tokenQuote.cosmosSwap
                    ? formatUnits(
                        BigInt(tokenQuote.cosmosSwap.amountIn),
                        selectedToken.contractDecimals,
                      )
                    : tokenQuote.tokensRequired,
                  4,
                ) +
                  ' ' +
                  symbol}
              </CyDText>
              <CyDText className={'font-bold text-[14px] text-base100'}>
                {`$${tokenQuote.amount + tokenQuote.fees.fee}`}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDView className={'flex flex-col gap-[4px]'}>
              {planInfo?.planId === CypherPlanId.PRO_PLAN && (
                <CyDFastImage
                  className='h-[12px] w-[66px]'
                  source={AppImages.PREMIUM_TEXT_GRADIENT}
                />
              )}
              <CyDText className={'font-medium text-[14px]'}>
                {t('LOAD_FEE')}
              </CyDText>
            </CyDView>
            <CyDView
              className={'flex flex-col flex-wrap justify-between items-end'}>
              {planInfo?.planId === CypherPlanId.PRO_PLAN ? (
                <CyDView className={'flex flex-row items-center gap-[6px]'}>
                  <CyDText
                    className={
                      'font-medium text-[16px] line-through text-[color:var(--color-base100)]'
                    }>
                    {'$' + String(tokenQuote.fees.actualFee)}
                  </CyDText>
                  <LinearGradient
                    colors={['#FA9703', '#F7510A', '#F48F0F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.linearGradient}>
                    <CyDText className={'font-bold text-white'}>
                      {Number(tokenQuote.fees.fee) === 0
                        ? 'Free'
                        : '$' + String(tokenQuote.fees.fee)}
                    </CyDText>
                  </LinearGradient>
                </CyDView>
              ) : (
                <CyDText className={'font-bold text-[14px] '}>
                  {'$' + String(tokenQuote.fees.fee)}
                </CyDText>
              )}
            </CyDView>
          </CyDView>

          <CyDView
            className={'flex flex-row justify-between items-center py-[16px]'}>
            <CyDText className={'font-medium text-[14px]'}>
              {t('ESTIMATED_GAS')}
            </CyDText>
            <CyDView
              className={'flex flex-col flex-wrap justify-between items-end'}>
              <CyDText className={'font-bold text-[14px] '}>
                {String(gasFeeInCrypto) + ' ' + nativeTokenSymbol}
              </CyDText>
              <CyDText className={'font-bold text-[14px] text-base100'}>
                {'$' + formatAmount(gasFeeInFiat)}
              </CyDText>
            </CyDView>
          </CyDView>

          <CyDView className={'flex flex-row justify-between py-[16px]'}>
            <CyDView className='flex flex-row justify-start items-center w-[50%]'>
              <CyDText className={'font-medium text-[14px]'}>
                {t('ESTIMATED_TIME')}
              </CyDText>
            </CyDView>

            <CyDView
              className={
                'flex flex-row justify-between items-center px-[6px] py-[2px] bg-n40 rounded-full'
              }>
              <CyDMaterialDesignIcons
                name='clock-time-three'
                size={16}
                className='text-n70'
              />
              <CyDText className={'text-[14px] font-bold text-base100'}>
                ~ 4 mins
              </CyDText>
            </CyDView>
          </CyDView>

          {planCost > 0 && (
            <CyDView
              className={
                'flex flex-row justify-between items-center py-[16px]'
              }>
              <CyDText className={'font-bold text-[14px]'}>
                {t('PLAN_COST')}
              </CyDText>
              <CyDView className={''}>
                <CyDText className={'font-medium text-[14px] '}>
                  {'$' + String(planCost)}
                </CyDText>
              </CyDView>
            </CyDView>
          )}
        </CyDView>

        {tokenQuote.isInstSwapEnabled && (
          <CyDView className='flex flex-col p-[12px] bg-n0 mx-4 rounded-[12px] mb-[24px]'>
            <CyDView className='flex flex-row items-start gap-[6px]'>
              <CyDMaterialDesignIcons
                name='alert'
                size={18}
                className='text-p150'
              />
              <CyDText className='text-[14px] font-medium flex-1'>
                {t('MARKET_FLUCTUATION_WARNING')}{' '}
                <CyDText
                  className='text-[14px] underline text-blue-500 font-medium'
                  onPress={() => {
                    setIsPriceFluctuationLearnMoreModalVisible(true);
                  }}>
                  {t('LEARN_MORE')}
                </CyDText>
              </CyDText>
            </CyDView>
            <CyDView className='flex flex-row mt-[10px] items-start gap-[6px]'>
              <CyDTouchView
                className={clsx(
                  'h-[18px] w-[18px] border-base400 border-[1px] rounded-[4px]',
                  {
                    'bg-n0': hasPriceFluctuationConsent,
                  },
                )}
                onPress={() => {
                  setHasPriceFluctuationConsent(!hasPriceFluctuationConsent);
                }}>
                {hasPriceFluctuationConsent && (
                  <CyDMaterialDesignIcons
                    name='check'
                    size={16}
                    className='text-base400'
                  />
                )}
              </CyDTouchView>

              <CyDText className='text-[14px] font-medium'>
                {t('I_ACKNOWLEDGE_MARKET_FLUCTUATION')}
              </CyDText>
            </CyDView>
          </CyDView>
        )}

        <CyDView className='pb-[120px]' />
      </CyDScrollView>

      {/* Sticky footer with "Explore Premium" and buttons */}
      <CyDView className='absolute bottom-0 left-0 right-0 bg-n20 pb-[30px]'>
        {planInfo?.planId !== CypherPlanId.PRO_PLAN && (
          <CyDView className='bg-p10 mb-[24px] px-[12px] py-[16px] mx-[16px] rounded-[12px] flex flex-row justify-between items-center'>
            <CyDText className='text-base200 font-medium text-[12px]'>
              {`Want to save ${tokenQuote?.fees?.fee && tokenQuote?.fees?.fee > 1 ? '$' + String(tokenQuote?.fees?.fee) : 'more'} on this load?`}
            </CyDText>
            <CyDTouchView
              className='flex flex-row items-center gap-[4px]'
              onPress={() => {
                setPlanChangeModalVisible(true);
                void logAnalyticsToFirebase(
                  AnalyticEvent.EXPLORE_PREMIUM_LOAD_CARD_CTA,
                );
              }}>
              <CyDText className='font-extrabold text-[14px] underline'>
                {'Explore'}
              </CyDText>
              <GradientText
                textElement={
                  <CyDText className='font-extrabold text-[14px] underline'>
                    {'Premium'}
                  </CyDText>
                }
                gradientColors={['#FA9703', '#F89408', '#F6510A']}
              />
            </CyDTouchView>
          </CyDView>
        )}
        <CyDView
          className={'flex flex-row justify-between items-center px-[10px]'}>
          <Button
            title={t<string>('CANCEL')}
            titleStyle='text-[14px]'
            disabled={loading}
            type={ButtonType.SECONDARY}
            onPress={() => {
              onCancel();
            }}
            style={'h-[60px] w-[46%] mr-[6px]'}
          />
          <Button
            title={
              t<string>('LOAD_ALL_CAPS') +
              (!isPayDisabled
                ? tokenExpiryTime
                  ? ' (' + String(tokenExpiryTime) + ')'
                  : ''
                : '')
            }
            titleStyle='text-[14px]'
            loading={loading}
            disabled={
              isPayDisabled ||
              (tokenQuote.isInstSwapEnabled && !hasPriceFluctuationConsent)
            }
            onPress={() => {
              if (!isPayDisabled) {
                void onLoadPress();
              }
            }}
            isPrivateKeyDependent={true}
            style={'h-[60px] w-[46%] ml-[6px]'}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}

const styles = StyleSheet.create({
  linearGradient: {
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceFluctuationLearnMoreModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
