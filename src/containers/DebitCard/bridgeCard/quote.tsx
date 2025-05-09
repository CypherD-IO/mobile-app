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
import analytics from '@react-native-firebase/analytics';
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
  const ethereum = hdWallet.state.wallet.ethereum;
  const solana = hdWallet.state.wallet.solana;
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
      from: ethereum.address,
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
          title: 'Unable to process your transaction',
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
        void analytics().logEvent('card_load', {
          connectionType: connectedType,
          chain: selectedToken.chainDetails.backendName,
          token: selectedToken.symbol,
          amountInUSD: tokenQuote.amount,
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

  const sendTransaction = useCallback(async () => {
    try {
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
                    const transaction = await skipApiSignAndBroadcast({
                      cosmosTx,
                      chain: selectedToken.chainDetails.chain_id,
                      showModalAndGetResponse: async (setter: any) => {
                        return true;
                      },
                      setCosmosModalVisible: () => {},
                      shouldBroadcast: false,
                    });
                    const txRaw = TxRaw.fromPartial({
                      bodyBytes: transaction.txn?.bodyBytes,
                      authInfoBytes: transaction.txn?.authInfoBytes,
                      signatures: transaction.txn?.signatures,
                    });
                    // Encode the transaction into Uint8Array
                    const signedTxBytes = TxRaw.encode(txRaw).finish();

                    // Convert to Base64 for Skip API
                    const base64Tx = toBase64(signedTxBytes);
                    const {
                      isError,
                      error: fetchError,
                      data,
                    } = await postToOtherSource(
                      'https://api.skip.build/v2/tx/submit',
                      {
                        tx: base64Tx,
                        chain_id: tokenQuote.cosmosSwap?.sourceAssetChainId,
                      },
                    );

                    if (!isError && data?.tx_hash) {
                      response = { isError: false, hash: data.tx_hash };
                    } else {
                      throw new Error(fetchError);
                    }
                  } catch (e) {
                    const errorMessage = parseErrorMessage(`${e}`);
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
                : get(ethereum, 'address', ''),
            });
            void refreshPortfolio();
            void transferSentQuote(
              tokenQuote.fromAddress,
              tokenQuote.quoteId,
              response.hash,
            );
          } else {
            const connectionType = await getConnectionType();
            void logAnalytics({
              type: AnalyticsType.ERROR,
              chain: selectedToken?.chainDetails?.backendName ?? '',
              message: parseErrorMessage(response?.error),
              screen: route.name,
              address: PURE_COSMOS_CHAINS.includes(
                selectedToken?.chainDetails?.chainName,
              )
                ? get(
                    cosmosAddresses,
                    selectedToken?.chainDetails?.chainName,
                    '',
                  )
                : ChainBackendNames.SOLANA ===
                    selectedToken?.chainDetails?.chainName
                  ? get(solana, 'address', '')
                  : get(ethereum, 'address', ''),
              ...(tokenQuote.quoteId ? { quoteId: tokenQuote.quoteId } : {}),
              ...(connectionType ? { connectionType } : {}),
            });
            activityRef.current &&
              activityContext.dispatch({
                type: ActivityReducerAction.PATCH,
                value: {
                  id: activityRef.current.id,
                  status: ActivityStatus.FAILED,
                  quoteId: tokenQuote.quoteId,
                  reason: response?.error,
                },
              });
            setLoading(false);
            showModal('state', {
              type: 'error',
              title: 'Transaction Failed',
              description: `${parseErrorMessage(response?.error)}. Please contact customer support with the quote_id: ${tokenQuote.quoteId}`,
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
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: selectedToken?.chainDetails?.backendName ?? '',
        message: parseErrorMessage(error),
        screen: route.name,
        address: PURE_COSMOS_CHAINS.includes(
          selectedToken?.chainDetails?.chainName,
        )
          ? get(cosmosAddresses, selectedToken?.chainDetails?.chainName, '')
          : get(ethereum, 'address', ''),
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
                void analytics().logEvent('explore_premium_load_card_cta');
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
