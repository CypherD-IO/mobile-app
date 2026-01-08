import {
  useIsFocused,
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { floor, get, isEmpty, set } from 'lodash';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { formatUnits } from 'viem';
import Button from '../../../components/v2/button';
import ChooseTokenModalV2 from '../../../components/v2/chooseTokenModalV2';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import Loading from '../../../components/v2/loading';
import CyDNumberPad from '../../../components/v2/numberpad';
import CyDTokenAmount from '../../../components/v2/tokenAmount';
import CyDTokenValue from '../../../components/v2/tokenValue';
import { screenTitle } from '../../../constants';
import {
  CardFeePercentage,
  MINIMUM_TRANSFER_AMOUNT_ETH,
  MINIMUM_TRANSFER_AMOUNT_HL_SPOT,
  OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
  SlippageFactor,
} from '../../../constants/data';
import {
  ButtonType,
  CardProviders,
  EVM_ONLY_CHAINS,
  TokenModalType,
} from '../../../constants/enum';
import {
  CAN_ESTIMATE_L1_FEE_CHAINS,
  CHAIN_ARBITRUM,
  CHAIN_ETH,
  CHAIN_OSMOSIS,
  ChainBackendNames,
  ChainNames,
  COSMOS_CHAINS,
  GASLESS_CHAINS,
  NativeTokenMapping,
} from '../../../constants/server';
import { GlobalContext, GlobalContextDef } from '../../../core/globalContext';
import useAxios from '../../../core/HttpRequest';
import { Holding, IHyperLiquidHolding } from '../../../core/portfolio';
import {
  formatAmount,
  getViemPublicClient,
  getWeb3Endpoint,
  hasSufficientBalanceAndGasFee,
  HdWalletContext,
  isNativeToken,
  limitDecimalPlaces,
  parseErrorMessage,
  validateAmount,
} from '../../../core/util';
import useGasService from '../../../hooks/useGasService';
import usePortfolio from '../../../hooks/usePortfolio';
import { CardQuoteResponse } from '../../../models/card.model';
import { TokenMeta } from '../../../models/tokenMetaData.model';
import {
  CyDImage,
  CyDMaterialDesignIcons,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { DecimalHelper } from '../../../utils/decimalHelper';
import InsufficientBalanceBottomSheetContent from './InsufficientBalanceBottomSheet';
import { fetchCardTargetAddress } from '../../../utils/fetchCardTargetAddress';
import { getTargetChainBackendName } from '../../../utils/chainUtils';

/**
 * Interface for route parameters passed to BridgeFundCardScreen
 */
interface BridgeFundCardScreenParams {
  currentCardProvider: CardProviders;
  currentCardIndex: number;
  selectedToken?: Holding;
}

/**
 * BridgeFundCardScreen - Screen for loading funds onto a card
 * Allows users to select a token and amount to fund their card
 * @param route - Route object containing navigation parameters
 */
export default function BridgeFundCardScreen({
  route,
}: {
  route: { params: BridgeFundCardScreenParams };
}): JSX.Element {
  // Use navigation hook instead of receiving it as a param to avoid non-serializable warning
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const {
    currentCardProvider,
    currentCardIndex,
    selectedToken: tokenFromRoute,
  } = route.params;

  const hdWallet = useContext<any>(HdWalletContext);
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );
  const wallet = hdWallet.state.wallet;
  const cardProfile = globalContext.globalState.cardProfile;
  const cards = get(cardProfile, currentCardProvider)?.cards;
  const cardId: string = get(cards, currentCardIndex, { cardId: '' })?.cardId;

  const solana = hdWallet.state.wallet.solana;

  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(false);
  const [amount, setAmount] = useState('');
  const [isCrpytoInput, setIsCryptoInput] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaxLoading, setIsMaxLoading] = useState<boolean>(false);
  const minTokenValueLimit = 10;
  const minTokenValueEth = MINIMUM_TRANSFER_AMOUNT_ETH;
  const minTokenValueHlSpot = MINIMUM_TRANSFER_AMOUNT_HL_SPOT;
  const [selectedToken, setSelectedToken] = useState<Holding>();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<string>('0');
  const { getNativeToken, getLocalPortfolio } = usePortfolio();
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const { postWithAuth } = useAxios();
  const isFocused = useIsFocused();
  const { showBottomSheet } = useGlobalBottomSheet();
  const {
    estimateGasForEvm,
    estimateGasForSolana,
    estimateGasForCosmosRest,
    estimateReserveFee,
    estimateGasForCosmosIBCRest,
  } = useGasService();
  const [suggestedAmounts, setSuggestedAmounts] = useState<
    Record<string, string>
  >({ low: '', med: '', high: '' });

  const { height } = useWindowDimensions();
  const isSmallScreenMobile = height <= 750;

  /**
   * Show insufficient balance bottom sheet
   */
  const showInsufficientBalanceSheet = () => {
    showBottomSheet({
      id: 'insufficient-balance-sheet',
      snapPoints: ['80%', Platform.OS === 'android' ? '100%' : '95%'],
      showCloseButton: true,
      scrollable: true,
      content: (
        <InsufficientBalanceBottomSheetContent minAmount={minTokenValueLimit} />
      ),
    });
  };

  useEffect(() => {
    if (isFocused) {
      if (tokenFromRoute) {
        // Set the token from route and fetch its native token balance
        setSelectedToken(tokenFromRoute);
        void fetchNativeTokenBalance(tokenFromRoute);
      } else {
        if (!selectedToken) {
          // Auto-select the first suitable token from user's portfolio
          void setDefaultSelectedToken();
        }
      }
    }
  }, [isFocused, tokenFromRoute]);

  /**
   * Fetch native token balance for a given token
   * Required for gas fee calculations and balance validation
   */
  const fetchNativeTokenBalance = async (token: Holding): Promise<void> => {
    try {
      const nativeToken = await getNativeToken(token.chainDetails.backendName);
      setNativeTokenBalance(nativeToken.balanceDecimal);
    } catch (error) {
      // Set to '0' on error to avoid undefined state
      setNativeTokenBalance('0');
    }
  };

  useEffect(() => {
    onEnterAmount(amount);
  }, [selectedToken]);

  const setDefaultSelectedToken = async () => {
    try {
      const localPortfolio = await getLocalPortfolio();
      if (
        localPortfolio?.totalHoldings &&
        localPortfolio.totalHoldings.length > 0
      ) {
        // Filter tokens that are fundable and have value > minimum required
        const fundableTokens = localPortfolio.totalHoldings.filter(token => {
          if (!token.isFundable || !token.isVerified) return false;

          // Check minimum value requirements based on chain and account type
          const { backendName } = token.chainDetails;
          let minimumValue = minTokenValueLimit;

          if (backendName === CHAIN_ETH.backendName) {
            minimumValue = minTokenValueEth;
          } else if (token.accountType === 'spot') {
            minimumValue = minTokenValueHlSpot;
          }

          return Number(token.totalValue) >= minimumValue;
        });

        // Sort by total value (descending) and select the first one

        if (fundableTokens.length > 0) {
          const sortedTokens = fundableTokens.sort(
            (a, b) => Number(b.totalValue) - Number(a.totalValue),
          );
          const defaultToken = sortedTokens[0];

          // Set the default token and fetch its native token balance
          setSelectedToken(defaultToken);
          const nativeToken = await getNativeToken(
            defaultToken.chainDetails.backendName,
          );
          setNativeTokenBalance(nativeToken.balanceDecimal);

          // Set suggested amounts
          const tempMinTokenValue =
            defaultToken.chainDetails.backendName === CHAIN_ETH.backendName
              ? minTokenValueEth
              : minTokenValueLimit;
          const splittableAmount = defaultToken.totalValue - tempMinTokenValue;
          if (splittableAmount >= tempMinTokenValue) {
            setSuggestedAmounts({
              low: String(tempMinTokenValue + floor(splittableAmount * 0.25)),
              med: String(tempMinTokenValue + floor(splittableAmount * 0.5)),
              high: String(tempMinTokenValue + floor(splittableAmount * 0.75)),
            });
          } else {
            setSuggestedAmounts({
              low: tempMinTokenValue.toString(),
              med: tempMinTokenValue.toString(),
              high: tempMinTokenValue.toString(),
            });
          }
        } else {
          // No eligible tokens found - show insufficient balance bottom sheet
          showInsufficientBalanceSheet();
        }
      }
    } catch (error) {
      // Log error and show insufficient balance sheet as fallback
      showInsufficientBalanceSheet();
    }
  };

  const showQuoteModal = async (
    quote: CardQuoteResponse,
    isMaxQuote: boolean,
  ) => {
    const {
      chainDetails,
      symbol: selectedTokenSymbol,
      contractDecimals,
      balanceDecimal,
      denom,
      contractAddress,
    } = selectedToken as Holding & IHyperLiquidHolding;

    const nativeToken = await getNativeToken(chainDetails.backendName);
    const actualTokensRequired = quote?.cosmosSwap
      ? formatUnits(BigInt(quote.cosmosSwap.amountIn), contractDecimals)
      : limitDecimalPlaces(quote.tokensRequired, contractDecimals);

    if (DecimalHelper.isGreaterThan(actualTokensRequired, balanceDecimal)) {
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: t('INSUFFICIENT_FUNDS_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }
    let gasDetails;

    if (!quote.programId || !quote.cardProvider || !quote.chain) {
      Sentry.captureMessage('Target address lookup validation failed', {
          level: 'warning',
          extra: {
            hasCypherCardProgram: !!quote.programId,
            hasProvider: !!quote.cardProvider,
            hasChainName: !!quote.chain,
            quoteId: quote.quoteId,
         },
      });
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('ERROR_FETCHING_QUOTE'),
        description: t('ERROR_FETCHING_QUOTE_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }

    let targetWalletAddress: string;
    try {
      const targetChain = getTargetChainBackendName(quote.chain);
      targetWalletAddress = await fetchCardTargetAddress(
        quote.programId,
        quote.cardProvider,
        targetChain,
      );
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          quoteId: quote.quoteId,
          chain: quote.chain,
          program: quote.programId,
          provider: quote.cardProvider,
        },
      });
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('ERROR_FETCHING_TARGET_ADDRESS'),
        description: t('ERROR_FETCHING_TARGET_ADDRESS_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }
    
    let isAddressMatch = false;
    if (EVM_ONLY_CHAINS.includes(quote.chain)) {
      const normalizedContractAddress =  targetWalletAddress.toLowerCase();
      const normalizedQuoteAddress = (quote.targetAddress || '').toLowerCase();
      isAddressMatch = normalizedContractAddress === normalizedQuoteAddress;
    } else {
      isAddressMatch = targetWalletAddress === (quote.targetAddress || '');
    }

    if (!isAddressMatch) {
      const mismatchError = new Error("Target address mismatch between contract and quote");
      Sentry.captureException(mismatchError, {
        extra: {
          quoteId: quote.quoteId,
          chain: quote.chain,
          program: quote.programId,
          provider: quote.cardProvider,
          quoteAddress: quote.targetAddress,
        },
      });
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('TARGET_ADDRESS_MISMATCH'),
        description: t('TARGET_ADDRESS_MISMATCH_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
      return;
    }

    try {
      if (chainDetails.backendName === ChainBackendNames.HYPERLIQUID) {
        // No gas needed for hyperliquid. Just signtyped data
        gasDetails = {
          isError: false,
          gasFeeInCrypto: 0,
          gasFeeInFiat: 0,
        };
      } else if (chainDetails.chainName === ChainNames.ETH) {
        if (
          DecimalHelper.isLessThanOrEqualTo(
            actualTokensRequired,
            balanceDecimal,
          )
        ) {
          const publicClient = getViemPublicClient(
            getWeb3Endpoint(chainDetails, globalContext),
          );
          gasDetails = await estimateGasForEvm({
            publicClient,
            chain: chainDetails.backendName,
            fromAddress: ethereumAddress,
            toAddress: targetWalletAddress as `0x${string}`,
            amountToSend: actualTokensRequired,
            contractAddress: contractAddress as `0x${string}`,
            contractDecimals,
            isErc20: !selectedToken?.isNativeToken,
          });
        }
      } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
        if (
          DecimalHelper.isLessThanOrEqualTo(
            actualTokensRequired,
            balanceDecimal,
          )
        ) {
          if (chainDetails.chainName === ChainNames.OSMOSIS) {
            gasDetails = await estimateGasForCosmosRest({
              chain: chainDetails,
              denom,
              amount: actualTokensRequired,
              fromAddress: wallet[chainDetails.chainName].address,
              toAddress: OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
            });
          } else {
            gasDetails = await estimateGasForCosmosIBCRest({
              fromChain: chainDetails,
              toChain: CHAIN_OSMOSIS,
              denom,
              amount: actualTokensRequired,
              fromAddress: wallet[chainDetails.chainName].address,
              toAddress: OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
            });
          }
        }
      } else if (chainDetails.chainName === ChainNames.SOLANA) {
        if (
          DecimalHelper.isLessThanOrEqualTo(
            actualTokensRequired,
            balanceDecimal,
          )
        ) {
          gasDetails = await estimateGasForSolana({
            fromAddress: solana.address,
            toAddress: targetWalletAddress,
            amountToSend: actualTokensRequired,
            contractAddress,
            tokenContractDecimals: contractDecimals,
          });
        }
      }
      setLoading(false);
      setIsMaxLoading(false);
      if (!gasDetails?.isError) {
        const { hasSufficientBalance, hasSufficientGasFee } =
          hasSufficientBalanceAndGasFee(
            selectedToken?.isNativeToken ?? false,
            String(gasDetails?.gasFeeInCrypto),
            nativeTokenBalance,
            actualTokensRequired,
            balanceDecimal,
          );
        if (!hasSufficientBalance) {
          showModal('state', {
            type: 'error',
            title: t('INSUFFICIENT_FUNDS'),
            description: t('INSUFFICIENT_FUNDS_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        } else if (!hasSufficientGasFee) {
          showModal('state', {
            type: 'error',
            title: t('INSUFFICIENT_GAS_FEE'),
            description: t('INSUFFICIENT_GAS_FEE_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
        if (hasSufficientBalance && hasSufficientGasFee) {
          navigation.navigate(screenTitle.CARD_QUOTE_SCREEN, {
            hasSufficientBalanceAndGasFee:
              hasSufficientBalance && hasSufficientGasFee,
            cardProvider: currentCardProvider,
            cardId,
            tokenSendParams: {
              chain: chainDetails.backendName,
              amountInCrypto: actualTokensRequired,
              amountInFiat: String(quote.amount),
              symbol: selectedTokenSymbol,
              toAddress: targetWalletAddress,
              gasFeeInCrypto: gasDetails?.gasFeeInCrypto,
              gasFeeInFiat: formatAmount(
                DecimalHelper.multiply(
                  gasDetails?.gasFeeInCrypto ?? 0,
                  nativeToken?.price ?? 0,
                ),
              ),
              nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
              selectedToken,
              tokenQuote: quote,
            },
          });
        }
      } else {
        showModal('state', {
          type: 'error',
          title: t('GAS_ESTIMATION_FAILED'),
          description:
            parseErrorMessage(gasDetails?.error) ??
            t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
    } catch (e) {
      const errorObject = {
        e,
        message: 'Error when estimating gasFee for the transaction',
        isMaxQuote,
        balanceDecimal,
        actualTokensRequired,
      };
      Sentry.captureException(errorObject);
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('GAS_ESTIMATION_FAILED'),
        description: parseErrorMessage(e),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const fundCard = async () => {
    const {
      contractAddress,
      coinGeckoId,
      contractDecimals,
      chainDetails,
      denom,
    } = selectedToken as Holding;
    setLoading(true);
    Keyboard.dismiss();
    if (chainDetails.chainName === ChainNames.ETH) {
      try {
        const amountToQuote = isCrpytoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'evm',
          address: ethereumAddress,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCrpytoInput,
          provider: currentCardProvider,
          cardId,
        };
        if (chainDetails.backendName === ChainBackendNames.HYPERLIQUID) {
          set(payload, 'hyperliquidTradeType', selectedToken?.accountType);
          payload.chain = CHAIN_ARBITRUM.backendName;
        }
        const response = await postWithAuth(`/v1/funding/quote`, payload);

        if (response?.data && !response.isError) {
          if (chainDetails.chainName != null) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, false);
          }
        } else {
          Sentry.captureException(response.error);
          showModal('state', {
            type: 'error',
            title: parseErrorMessage(response.error)?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : t('ERROR_FETCHING_QUOTE'),
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
            ethAddress: ethereumAddress,
            contractDecimals,
          },
        };
        Sentry.captureException(errorObject);
        setLoading(false);
        showModal('state', {
          type: 'error',
          title: t('ERROR_FETCHING_QUOTE'),
          description: parseErrorMessage(e),
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
          tokenAddress: denom,
          amountInCrypto: isCrpytoInput,
          isCosmosV2: true,
          provider: currentCardProvider,
          cardId,
        };
        const response = await postWithAuth(`/v1/funding/quote`, payload);
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
            ethAddress: ethereumAddress,
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
    } else if (chainDetails.chainName === ChainNames.SOLANA) {
      try {
        const amountToQuote = isCrpytoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'solana',
          address: solana.address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCrpytoInput,
          provider: currentCardProvider,
          cardId,
        };
        const response = await postWithAuth(`/v1/funding/quote`, payload);

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
            ethAddress: ethereumAddress,
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
      const { backendName } = selectedToken.chainDetails;

      return (
        DecimalHelper.isLessThan(usdAmount, minTokenValueLimit) ||
        !selectedToken ||
        DecimalHelper.isGreaterThan(
          cryptoAmount,
          selectedToken.balanceDecimal,
        ) ||
        (backendName === CHAIN_ETH.backendName &&
          !['usd-coin', 'tether'].includes(selectedToken?.coinGeckoId) &&
          DecimalHelper.isLessThan(usdAmount, MINIMUM_TRANSFER_AMOUNT_ETH))
      );
    }
    return true;
  };

  const onSelectingToken = async (item: Holding) => {
    setSelectedToken(item);
    setIsChooseTokenVisible(false);
    const nativeToken = await getNativeToken(item.chainDetails.backendName);
    setNativeTokenBalance(nativeToken.balanceDecimal ?? '0');
    setIsCryptoInput(false);
    const tempMinTokenValue =
      item.chainDetails.backendName === CHAIN_ETH.backendName
        ? minTokenValueEth
        : minTokenValueLimit;
    const splittableAmount = item.totalValue - tempMinTokenValue;
    if (splittableAmount >= tempMinTokenValue) {
      setSuggestedAmounts({
        low: String(tempMinTokenValue + floor(splittableAmount * 0.25)),
        med: String(tempMinTokenValue + floor(splittableAmount * 0.5)),
        high: String(tempMinTokenValue + floor(splittableAmount * 0.75)),
      });
    } else {
      setSuggestedAmounts({
        low: tempMinTokenValue.toString(),
        med: tempMinTokenValue.toString(),
        high: tempMinTokenValue.toString(),
      });
    }
  };

  const onMax = async () => {
    const {
      contractAddress,
      coinGeckoId,
      denom,
      contractDecimals,
      chainDetails,
      balanceDecimal,
      symbol: selectedTokenSymbol,
    } = selectedToken as Holding;

    const nativeTokenSymbol: string =
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol;

    let amountInCrypto = balanceDecimal;

    const usdAmount_ = DecimalHelper.multiply(
      amountInCrypto,
      selectedToken?.isZeroFeeCardFunding ? 1 : Number(selectedToken?.price),
    );

    if (selectedToken) {
      const { backendName } = selectedToken.chainDetails;
      let errorMessage = '';
      if (
        backendName === CHAIN_ETH.backendName &&
        !['usd-coin', 'tether'].includes(selectedToken?.coinGeckoId) &&
        DecimalHelper.isLessThan(usdAmount_, MINIMUM_TRANSFER_AMOUNT_ETH)
      ) {
        errorMessage = `${t<string>('MINIMUM_AMOUNT_ETH')} $${MINIMUM_TRANSFER_AMOUNT_ETH}`;
      } else if (DecimalHelper.isLessThan(usdAmount_, minTokenValueLimit)) {
        errorMessage = `${t<string>('CARD_LOAD_MIN_AMOUNT')} $${String(minTokenValueLimit)}`;
      }

      if (!isEmpty(errorMessage)) {
        showModal('state', {
          type: 'error',
          title: errorMessage,
          description: 'Change the amount and try again',
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      if (chainDetails.chainName === ChainNames.ETH) {
        const publicClient = getViemPublicClient(
          getWeb3Endpoint(chainDetails, globalContext),
        );
        setIsMaxLoading(true);

        try {
          // Reserving gas for the txn if the selected token is a native token.
          if (
            selectedTokenSymbol === nativeTokenSymbol &&
            !GASLESS_CHAINS.includes(chainDetails.backendName) &&
            chainDetails.backendName !== ChainBackendNames.HYPERLIQUID
          ) {
            // remove this gasFeeReservation once we have gas estimation for eip1599 chains
            // Estimate the gasFee for the transaction
            if (
              CAN_ESTIMATE_L1_FEE_CHAINS.includes(chainDetails.backendName) &&
              isNativeToken(selectedToken)
            ) {
              const gasReservedForNativeToken = await estimateReserveFee({
                tokenData: convertHoldingToTokenMeta(selectedToken),
                fromAddress: ethereumAddress,
                toAddress: ethereumAddress,
                publicClient,
                rpc: getWeb3Endpoint(chainDetails, globalContext),
              });

              amountInCrypto = DecimalHelper.subtract(
                balanceDecimal,
                gasReservedForNativeToken ?? '0',
              ).toString();
            } else {
              const gasDetails = await estimateGasForEvm({
                publicClient,
                chain: chainDetails.backendName,
                fromAddress: ethereumAddress,
                toAddress: ethereumAddress,
                amountToSend: amountInCrypto,
                contractAddress: contractAddress as `0x${string}`,
                contractDecimals,
                isErc20: !selectedToken?.isNativeToken,
              });
              if (!gasDetails.isError) {
                // Adjust the amountInCrypto with the estimated gas fee
                // 10% buffer is added as there will be another gasEstimation in the quote modal
                amountInCrypto = DecimalHelper.subtract(
                  balanceDecimal,
                  DecimalHelper.multiply(gasDetails.gasFeeInCrypto, 1.1),
                ).toString();
              } else {
                setIsMaxLoading(false);
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
          }
        } catch (e) {
          const errorObject = {
            e,
            message: 'Error when estimating gas for the evm transaction.',
            selectedToken,
          };
          Sentry.captureException(errorObject);
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: t('GAS_ESTIMATION_FAILED'),
            description:
              parseErrorMessage(e) ?? t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          return;
        }

        try {
          const payload = {
            ecosystem: 'evm',
            address: ethereumAddress,
            chain: chainDetails.backendName,
            amount: DecimalHelper.toNumber(amountInCrypto),
            tokenAddress: contractAddress,
            amountInCrypto: true,
            provider: currentCardProvider,
            cardId,
          };
          if (chainDetails.backendName === ChainBackendNames.HYPERLIQUID) {
            set(payload, 'hyperliquidTradeType', selectedToken?.accountType);
            payload.chain = CHAIN_ARBITRUM.backendName;
          }
          const response = await postWithAuth(`/v1/funding/quote`, payload);
          if (!response.isError) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, true);
          } else {
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: parseErrorMessage(response.error).includes(
                'minimum amount',
              )
                ? t('INSUFFICIENT_FUNDS')
                : '',
              description: parseErrorMessage(response.error).includes(
                'amount is lower than 10 USD',
              )
                ? parseErrorMessage(response.error) +
                  `. Please ensure you have enough balance for gas fees as few ${nativeTokenSymbol} is reserved for gas fees.`
                : (parseErrorMessage(response.error) ??
                  t('UNABLE_TO_TRANSFER')),
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
              ethAddress: ethereumAddress,
              contractDecimals,
            },
          };
          Sentry.captureException(errorObject);
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else if (chainDetails.chainName === ChainNames.SOLANA) {
        // Reserving gas for the txn if the selected token is a native token.
        setIsMaxLoading(true);
        if (
          selectedTokenSymbol === nativeTokenSymbol &&
          !GASLESS_CHAINS.includes(chainDetails.backendName)
        ) {
          try {
            // Use a reasonable estimation amount instead of full balance
            // Gas fees on Solana are relatively consistent, so we can estimate with a smaller amount
            // This avoids the circular dependency where we need to know gas to calculate sendable amount
            const estimationAmount = DecimalHelper.isLessThan(
              amountInCrypto,
              '0.1',
            )
              ? amountInCrypto
              : '0.1';

            const gasDetails = await estimateGasForSolana({
              fromAddress: solana.address,
              toAddress: solana.address,
              amountToSend: estimationAmount,
              contractAddress,
              tokenContractDecimals: contractDecimals,
            });
            if (!gasDetails?.isError) {
              // not doing it or solana because if we are sending max amount, then there should be 0 SOL balance in the account, or there should SOL balance enough
              // for handling the account rent, else we will get the error InsufficientFundsForRent, since we will not be having enough SOL
              const gasFeeEstimationForTxn = String(gasDetails.gasFeeInCrypto);
              amountInCrypto = DecimalHelper.subtract(
                balanceDecimal,
                gasFeeEstimationForTxn,
              ).toString();
            } else {
              setIsMaxLoading(false);
              showModal('state', {
                type: 'error',
                title: t('GAS_ESTIMATION_FAILED'),
                description:
                  parseErrorMessage(gasDetails?.error) ??
                  t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
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
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description:
                parseErrorMessage(err) ??
                t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
            return;
          }
        }
        try {
          const payload = {
            ecosystem: 'solana',
            address: solana.address,
            chain: chainDetails.backendName,
            amount: DecimalHelper.toNumber(amountInCrypto),
            coinId: coinGeckoId,
            amountInCrypto: true,
            tokenAddress: contractAddress,
            provider: currentCardProvider,
            cardId,
          };
          const response = await postWithAuth(`/v1/funding/quote`, payload);
          if (!response.isError) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, true);
          } else {
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: parseErrorMessage(response.error).includes(
                'minimum amount',
              )
                ? t('INSUFFICIENT_FUNDS')
                : '',
              description: parseErrorMessage(response.error).includes(
                'amount is lower than 10 USD',
              )
                ? parseErrorMessage(response.error) +
                  `. Please ensure you have enough balance for gas fees as few ${nativeTokenSymbol} is reserved for gas fees.`
                : (response.error.message ?? t('UNABLE_TO_TRANSFER')),
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
              ethAddress: ethereumAddress,
              chainAddress: wallet[chainDetails.chainName].address,
              coinGeckoId,
              contractDecimals,
            },
          };
          Sentry.captureException(errorObject);
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
        // Reserving gas for the txn if the selected token is a native token.
        setIsMaxLoading(true);
        if (
          selectedTokenSymbol === nativeTokenSymbol &&
          !GASLESS_CHAINS.includes(chainDetails.backendName)
        ) {
          try {
            // target address is osmosis address so doing IBC instead of send for estimation
            const gasDetails = await estimateGasForCosmosIBCRest({
              fromChain: chainDetails,
              toChain: CHAIN_OSMOSIS,
              denom,
              amount: amountInCrypto,
              fromAddress: wallet[chainDetails.chainName].address,
              toAddress: OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
            });
            if (!gasDetails.isError) {
              const gasFeeEstimationForTxn = String(gasDetails.gasFeeInCrypto);
              amountInCrypto = DecimalHelper.subtract(
                balanceDecimal,
                DecimalHelper.multiply(gasFeeEstimationForTxn, 1.1),
              ).toString();
            } else {
              setIsMaxLoading(false);
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
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: t('GAS_ESTIMATION_FAILED'),
              description:
                parseErrorMessage(err) ??
                t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
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
            amount: DecimalHelper.toNumber(amountInCrypto),
            coinId: coinGeckoId,
            amountInCrypto: true,
            tokenAddress: denom,
            isCosmosV2: true,
            provider: currentCardProvider,
            cardId,
          };
          const response = await postWithAuth(`/v1/funding/quote`, payload);
          if (!response.isError) {
            const quote: CardQuoteResponse = response.data;
            void showQuoteModal(quote, true);
          } else {
            setIsMaxLoading(false);
            showModal('state', {
              type: 'error',
              title: parseErrorMessage(response.error).includes(
                'minimum amount',
              )
                ? t('INSUFFICIENT_FUNDS')
                : '',
              description: parseErrorMessage(response.error).includes(
                'amount is lower than 10 USD',
              )
                ? parseErrorMessage(response.error) +
                  '. Please ensure you have enough balance for gas fees.'
                : (response.error.message ?? t('UNABLE_TO_TRANSFER')),
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
              ethAddress: ethereumAddress,
              chainAddress: wallet[chainDetails.chainName].address,
              coinGeckoId,
              contractDecimals,
            },
          };
          Sentry.captureException(errorObject);
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: '',
            description: t('UNABLE_TO_TRANSFER'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      } else {
        setIsMaxLoading(false);
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

  const RenderSelectedToken = useCallback(() => {
    return (
      <CyDTouchView
        className={
          'bg-n0 py-[6px] px-[16px] my-[16px] border-[1px] border-n40 rounded-[34px] self-center'
        }
        onPress={() => setIsChooseTokenVisible(true)}>
        <CyDView className={'flex flex-row justify-center items-center'}>
          {selectedToken && (
            <CyDView className={'flex flex-row items-center'}>
              <CyDImage
                source={{ uri: selectedToken.logoUrl }}
                className={'w-[26px] h-[26px] rounded-[20px]'}
              />
              <CyDView className='flex flex-col justify-start items-start ml-[8px] max-w-[250px]'>
                <CyDText
                  numberOfLines={1}
                  className={clsx('font-extrabold text-[16px] w-full', {
                    'text-[14px]': selectedToken.isZeroFeeCardFunding,
                  })}>
                  {selectedToken.name}
                </CyDText>
                {/* {selectedToken.isZeroFeeCardFunding ? (
                  <CyDView className='h-[20px] bg-n0 rounded-[8px] mx-[4px] px-[8px] flex justify-center items-center'>
                    <CyDText className={'font-black text-[10px]'}>
                      {'ZERO FEE ✨'}
                    </CyDText>
                  </CyDView>
                ) : null} */}
                {selectedToken && (
                  <CyDView className='flex flex-row items-center'>
                    {isCrpytoInput ? (
                      <CyDTokenAmount className={'font-bold mr-[3px]'}>
                        {selectedToken.balanceDecimal}
                      </CyDTokenAmount>
                    ) : (
                      <CyDTokenValue className={'font-bold mr-[3px]'}>
                        {selectedToken.totalValue}
                      </CyDTokenValue>
                    )}
                    {isCrpytoInput && (
                      <CyDText className={'font-bold mr-[5px]'}>
                        {selectedToken.symbol}
                      </CyDText>
                    )}
                  </CyDView>
                )}
              </CyDView>
            </CyDView>
          )}
          {!selectedToken && (
            <CyDView>
              <CyDText>{t<string>('CHOOSE_TOKEN')}</CyDText>
            </CyDView>
          )}

          <CyDMaterialDesignIcons
            name='chevron-down'
            size={20}
            className='text-base400 ml-[8px]'
          />
        </CyDView>
      </CyDTouchView>
    );
  }, [selectedToken, isCrpytoInput]);

  const RenderWarningMessage = useCallback(() => {
    if (selectedToken) {
      const { symbol, backendName } = selectedToken.chainDetails;
      if (symbol && backendName) {
        let errorMessage = '';
        if (
          DecimalHelper.isGreaterThan(
            cryptoAmount,
            selectedToken?.balanceDecimal,
          )
        ) {
          errorMessage = t('INSUFFICIENT_FUNDS');
        } else if (
          usdAmount &&
          backendName === CHAIN_ETH.backendName &&
          !['usd-coin', 'tether'].includes(selectedToken?.coinGeckoId) &&
          DecimalHelper.isLessThan(usdAmount, MINIMUM_TRANSFER_AMOUNT_ETH)
        ) {
          errorMessage = `${t<string>('MINIMUM_AMOUNT_ETH')} $${MINIMUM_TRANSFER_AMOUNT_ETH}`;
        } else if (
          usdAmount &&
          selectedToken.accountType === 'spot' &&
          DecimalHelper.isLessThan(usdAmount, MINIMUM_TRANSFER_AMOUNT_HL_SPOT)
        ) {
          errorMessage = `${t<string>('MINIMUM_AMOUNT_HL_SPOT')} $${MINIMUM_TRANSFER_AMOUNT_HL_SPOT}`;
        } else if (
          !usdAmount ||
          DecimalHelper.isLessThan(usdAmount, minTokenValueLimit)
        ) {
          if (
            backendName === CHAIN_ETH.backendName &&
            !['usd-coin', 'tether'].includes(selectedToken?.coinGeckoId)
          ) {
            errorMessage = t('MINIMUM_AMOUNT_ETH');
          } else if (selectedToken.accountType === 'spot') {
            errorMessage = `${t<string>('MINIMUM_AMOUNT_HL_SPOT', {
              minAmount: String(MINIMUM_TRANSFER_AMOUNT_HL_SPOT),
            })}`;
          } else {
            errorMessage = `${t<string>('CARD_LOAD_MIN_AMOUNT')} $${String(minTokenValueLimit)}`;
          }
        }

        return (
          <CyDView className='mt-[8px]'>
            <CyDText className='text-center text-red300 font-medium text-wrap'>
              {errorMessage}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  }, [selectedToken, cryptoAmount, nativeTokenBalance]);

  const onPressToggle = () => {
    const tempIsCryproInput = !isCrpytoInput;
    setIsCryptoInput(!isCrpytoInput);

    const multiplier = DecimalHelper.add(1, [
      DecimalHelper.divide(
        get(
          CardFeePercentage,
          selectedToken?.chainDetails.backendName as string,
          0.5,
        ),
        100,
      ),
      get(
        SlippageFactor,
        selectedToken?.chainDetails.backendName as string,
        0.003,
      ),
    ]);

    if (tempIsCryproInput) {
      const usdAmt = DecimalHelper.multiply(
        amount,
        selectedToken?.isZeroFeeCardFunding ? 1 : (selectedToken?.price ?? 0),
      );
      setCryptoAmount(amount);
      setUsdAmount(
        selectedToken?.isZeroFeeCardFunding
          ? usdAmt.toString()
          : DecimalHelper.toString(DecimalHelper.multiply(usdAmt, multiplier)),
      );
    } else {
      const cryptoAmt = DecimalHelper.divide(
        DecimalHelper.multiply(
          amount,
          selectedToken?.isZeroFeeCardFunding ? 1 : multiplier,
        ),
        selectedToken?.isZeroFeeCardFunding ? 1 : (selectedToken?.price ?? 0),
      );
      setCryptoAmount(cryptoAmt.toString());
      setUsdAmount(amount);
    }
  };

  const onEnterAmount = (amt: string) => {
    setAmount(amt);
    if (isCrpytoInput) {
      const usdText =
        parseFloat(amt) *
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(amt);
      setUsdAmount((Number.isNaN(usdText) ? '0.00' : usdText).toString());
    } else {
      const cryptoText =
        parseFloat(amt) /
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount(
        (Number.isNaN(cryptoText) ? '0.00' : cryptoText).toString(),
      );
      setUsdAmount(amt);
    }
  };

  /**
   * Converts a Holding object to TokenMeta interface required by gas estimation functions
   */
  const convertHoldingToTokenMeta = (holding: Holding): TokenMeta => {
    return {
      about: holding.about ?? '',
      balanceDecimal: holding.balanceDecimal,
      balanceInteger: holding.balanceInteger,
      chainDetails: holding.chainDetails,
      coinGeckoId: holding.coinGeckoId,
      contractAddress: holding.contractAddress,
      contractDecimals: holding.contractDecimals,
      denom: holding.denom,
      isVerified: holding.isVerified,
      logoUrl: holding.logoUrl,
      name: holding.name,
      price: holding.price,
      price24h: typeof holding.price24h === 'number' ? holding.price24h : 0,
      symbol: holding.symbol,
      totalValue: holding.totalValue.toString(),
      actualUnbondingBalance: holding.actualUnbondingBalance ?? 0,
      unbondingBalanceTotalValue: holding.unbondingBalanceTotalValue ?? 0,
      isBridgeable: holding.isBridgeable,
      isSwapable: holding.isSwapable,
      isZeroFeeCardFunding: holding.isZeroFeeCardFunding,
      id: holding.id,
    };
  };

  return (
    <CyDView
      className={clsx('bg-n20 flex flex-1 flex-col justify-between h-full', {
        '': loading,
      })}>
      {isMaxLoading && <Loading blurBg={true} />}
      <ChooseTokenModalV2
        isChooseTokenModalVisible={isChooseTokenVisible}
        setIsChooseTokenModalVisible={setIsChooseTokenVisible}
        minTokenValueLimit={minTokenValueLimit}
        minTokenValueEth={minTokenValueEth}
        minTokenValueHlSpot={minTokenValueHlSpot}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          void onSelectingToken(token as Holding);
        }}
        type={TokenModalType.CARD_LOAD}
        onCancel={() => {
          setIsChooseTokenVisible(false);
        }}
      />
      <CyDScrollView
        className='flex flex-1'
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}>
        <RenderSelectedToken />
        <CyDView className='flex flex-row rounded-[8px] px-[20px] justify-between items-center h-[140px]'>
          <CyDView className={'w-full items-center'}>
            <CyDView className={'flex flex-row justify-center items-center'}>
              {!isCrpytoInput && !isSmallScreenMobile && (
                <CyDTokenValue
                  className={clsx('text-mandarin font-bold text-[28px]', {
                    'text-[40px]': amount.length <= 10,
                    'text-[50px]': amount.length <= 7,
                    'text-[75px]': amount.length <= 4,
                  })}>
                  {amount}
                </CyDTokenValue>
              )}
              {!isCrpytoInput && isSmallScreenMobile && (
                <CyDView className='flex flex-row self-center'>
                  <CyDText
                    className={clsx('text-mandarin font-bold', {
                      'text-[32px]': amount.length <= 15,
                      'text-[60px]': amount.length <= 7,
                      'text-[75px]': amount.length <= 5,
                    })}>
                    {'$'}
                  </CyDText>
                  <CyDTextInput
                    className={clsx('text-mandarin font-bold', {
                      'text-[32px]': amount.length <= 15,
                      'text-[60px]': amount.length <= 7,
                      'text-[75px]': amount.length <= 5,
                    })}
                    onChangeText={text => {
                      onEnterAmount(text);
                    }}
                    placeholder='0.00'
                    placeholderTextColor={'#FFB900'}
                    value={amount}
                    keyboardType='decimal-pad'
                    returnKeyType='done'
                  />
                </CyDView>
              )}
              {isCrpytoInput && !isSmallScreenMobile && (
                <CyDText
                  className={clsx(
                    'font-extrabold text-center text-mandarin  ml-[4px]',
                    {
                      'text-[32px]': amount.length <= 15,
                      'text-[60px]': amount.length <= 7,
                      'text-[75px]': amount.length <= 5,
                    },
                  )}>
                  {amount === '' ? '0.00' : amount}
                </CyDText>
              )}
              {isCrpytoInput && isSmallScreenMobile && (
                <CyDTextInput
                  className={clsx(
                    'font-extrabold text-center text-mandarin  ml-[4px]',
                    {
                      'text-[32px]': amount.length <= 15,
                      'text-[60px]': amount.length <= 7,
                      'text-[75px]': amount.length <= 5,
                    },
                  )}
                  onChangeText={text => {
                    onEnterAmount(text);
                  }}
                  placeholderTextColor={'#FFB900'}
                  placeholder='0.00'
                  keyboardType='decimal-pad'
                  returnKeyType='done'
                />
              )}
              {isCrpytoInput && (
                <CyDView>
                  <CyDText className='font-extrabold mt-[26px] text-[16px] ml-[4px]'>
                    {selectedToken?.symbol}
                  </CyDText>
                </CyDView>
              )}
            </CyDView>
            <CyDText className={clsx('text-center  text-[16px]')}>
              {'~' +
                (isCrpytoInput
                  ? (!Number.isNaN(parseFloat(usdAmount))
                      ? formatAmount(usdAmount)
                      : '0.00') + ' USD'
                  : (!Number.isNaN(parseFloat(cryptoAmount))
                      ? formatAmount(cryptoAmount)
                      : '0.00') +
                    ' ' +
                    (selectedToken?.symbol ?? ' '))}
            </CyDText>

            <RenderWarningMessage />
          </CyDView>
          <CyDView className={'p-[4px] ml-[-45px]'}>
            <CyDTouchView
              onPress={() => {
                onPressToggle();
              }}
              className={clsx(
                'border border-n40 rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
              )}>
              <CyDMaterialDesignIcons
                name='swap-vertical'
                size={20}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
        </CyDView>
        <CyDView className='flex flex-row justify-evenly items-center  mt-[12px]'>
          <CyDTouchView
            onPress={() => {
              onEnterAmount(suggestedAmounts.low);
            }}
            disabled={loading}
            className={clsx(
              'bg-base40 border border-n40 rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
            )}>
            <CyDText className='font-extrabold '>
              {'$' + suggestedAmounts.low}
            </CyDText>
          </CyDTouchView>
          {suggestedAmounts.low !== suggestedAmounts.med && (
            <CyDTouchView
              onPress={() => {
                onEnterAmount(suggestedAmounts.med);
              }}
              disabled={loading}
              className={clsx(
                'bg-base40 border border-n40 rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
              )}>
              <CyDText className='font-extrabold'>
                {'$' + suggestedAmounts.med}
              </CyDText>
            </CyDTouchView>
          )}
          {suggestedAmounts.low !== suggestedAmounts.high && (
            <CyDTouchView
              onPress={() => {
                onEnterAmount(suggestedAmounts.high);
              }}
              disabled={loading}
              className={clsx(
                'bg-base40 border border-n40 rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
              )}>
              <CyDText className='font-extrabold'>
                {'$' + suggestedAmounts.high}
              </CyDText>
            </CyDTouchView>
          )}
          <CyDTouchView
            onPress={() => {
              void onMax();
            }}
            disabled={loading}
            className={clsx(
              'bg-n0 border border-p150 rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
            )}>
            <CyDText className='font-extrabold'>{t('MAX')}</CyDText>
          </CyDTouchView>
        </CyDView>
        {!isSmallScreenMobile && (
          <CyDNumberPad
            value={amount}
            setValue={(amt: string) => onEnterAmount(amt)}
          />
        )}
        <CyDView className='h-[140px]' />
      </CyDScrollView>
      <CyDView className='w-full'>
        <CyDView className=' pt-[16px] bg-n0 px-[16px] pb-[24px] rounded-t-[16px]'>
          <CyDView className='flex flex-row justify-between items-center'>
            <Button
              onPress={() => {
                navigation.navigate(screenTitle.AUTO_LOAD_SCREEN);
              }}
              type={ButtonType.TERNARY}
              title={t('SETUP_AUTO_LOAD')}
              style={clsx('h-[60px] w-[45%] mb-[18px] py-[10px]', {
                'py-[8px]': loading,
              })}
            />
            <Button
              onPress={() => {
                if (validateAmount(amount)) {
                  void fundCard();
                }
              }}
              type={ButtonType.PRIMARY}
              disabled={isLoadCardDisabled()}
              title={t('QUOTE')}
              style={'h-[60px] w-[45%] mb-[18px] py-[10px]'}
              loading={loading}
            />
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
