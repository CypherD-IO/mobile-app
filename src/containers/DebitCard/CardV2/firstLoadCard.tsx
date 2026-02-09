import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import { t } from 'i18next';
import { get, round } from 'lodash';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../../components/v2/button';
import ChooseTokenModalV2 from '../../../components/v2/chooseTokenModalV2';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { screenTitle } from '../../../constants';
import {
  CardFeePercentage,
  MINIMUM_TRANSFER_AMOUNT_ETH,
  OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
  SlippageFactor,
} from '../../../constants/data';
import {
  CARD_IDS,
  CardProviders,
  TokenModalType,
} from '../../../constants/enum';
import {
  CAN_ESTIMATE_L1_FEE_CHAINS,
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
import { HdWalletContextDef } from '../../../reducers/hdwallet_reducer';
import {
  CyDFastImage,
  CyDIcons,
  CyDKeyboardAwareScrollView,
  CyDMaterialDesignIcons,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { DecimalHelper } from '../../../utils/decimalHelper';
import { formatUnits } from 'viem';
import { resolveAndValidateCardTargetAddress } from '../../../utils/fetchCardTargetAddress';
import { hostWorker, PRODUCTION_ARCH_HOST } from '../../../global';

interface RouteParams {
  currentCardProvider: CardProviders;
}

const cardId = CARD_IDS.HIDDEN_CARD;

const CustomKeyboard = ({
  onKeyPress,
}: {
  onKeyPress: (key: string) => void;
}) => {
  const renderKey = (key: string) => (
    <TouchableOpacity
      key={key}
      onPress={() => onKeyPress(key)}
      className='flex-1 h-[60px] bg-n20 rounded-[8px] flex-row justify-center items-center mx-[4px] my-[4px]'>
      <CyDText className='text-[24px] font-bold'>{key}</CyDText>
    </TouchableOpacity>
  );

  return (
    <CyDView className='bg-n30 p-[8px] rounded-t-[16px]'>
      <CyDView className='flex-row'>{['1', '2', '3'].map(renderKey)}</CyDView>
      <CyDView className='flex-row'>{['4', '5', '6'].map(renderKey)}</CyDView>
      <CyDView className='flex-row'>{['7', '8', '9'].map(renderKey)}</CyDView>
      <CyDView className='flex-row'>{['.', '0', '⌫'].map(renderKey)}</CyDView>
    </CyDView>
  );
};

export default function FirstLoadCard() {
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

  const { getNativeToken } = usePortfolio();
  const { postWithAuth } = useAxios();
  const { showModal, hideModal } = useGlobalModalContext();
  const {
    estimateGasForEvm,
    estimateGasForSolana,
    estimateGasForCosmosRest,
    estimateGasForCosmosIBCRest,
    estimateReserveFee,
  } = useGasService();

  const ethereumAddress = get(
    hdWallet,
    'state.wallet.ethereum.address',
    undefined,
  );
  const solanaAddress = get(hdWallet, 'state.wallet.solana.address', undefined);
  const wallet = get(hdWallet, 'state.wallet', '');
  const { currentCardProvider } = route.params;
  const minTokenValueLimit = 10;
  const minTokenValueEth = 50;

  const insect = useSafeAreaInsets();

  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(true);
  const [selectedToken, setSelectedToken] = useState<
    Holding & IHyperLiquidHolding
  >();
  const [nativeToken, setNativeToken] = useState<Holding>();
  const [amount, setAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');

  const [isCryptoInput, setIsCryptoInput] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaxLoading, setIsMaxLoading] = useState<boolean>(false);

  useEffect(() => {
    if (amount) {
      onEnterAmount(amount);
    }
  }, [selectedToken]);

  const onEnterAmount = (amt: string) => {
    setAmount(amt);
    if (isCryptoInput) {
      const usdText = DecimalHelper.multiply(
        amt,
        selectedToken?.isZeroFeeCardFunding ? 1 : selectedToken?.price,
      );
      setCryptoAmount(amt);
      setUsdAmount(usdText.toString());
    } else {
      const cryptoText = DecimalHelper.divide(
        amt,
        selectedToken?.isZeroFeeCardFunding ? 1 : selectedToken?.price,
      );
      setCryptoAmount(cryptoText.toString());
      setUsdAmount(amt);
    }
  };

  const getFontClass = (value: string) => {
    const length = value.replace('.', '').length;
    if (length > 7) return 'text-[24px]';
    if (length > 5) return 'text-[32px]';
    return 'text-[44px]';
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
          DecimalHelper.isLessThan(usdAmount, MINIMUM_TRANSFER_AMOUNT_ETH))
      );
    }
    return true;
  };

  const onSelectingToken = async (item: Holding) => {
    setSelectedToken(item);
    setIsChooseTokenVisible(false);
    const _nativeToken = await getNativeToken(item.chainDetails.backendName);
    setNativeToken(_nativeToken);
    setIsCryptoInput(false);
  };

  const getRoundedValue = (value: number) => {
    if (value <= 10) return 10;
    if (value >= 1000) {
      return Math.floor(value / 1000) * 1000;
    } else if (value >= 100) {
      return Math.floor(value / 100) * 100;
    } else {
      return Math.floor(value / 10) * 10;
    }
  };

  const getPercentageAmounts = () => {
    if (!selectedToken?.totalValue) return { p25: '0', p50: '0', p75: '0' };

    const total = selectedToken.totalValue;

    return {
      p25: getRoundedValue(total * 0.25).toString(),
      p50: getRoundedValue(total * 0.5).toString(),
      p75: getRoundedValue(total * 0.75).toString(),
    };
  };

  const onPressToggle = () => {
    const tempIsCryproInput = !isCryptoInput;
    setIsCryptoInput(!isCryptoInput);
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
        selectedToken?.isZeroFeeCardFunding ? 1 : selectedToken?.price,
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
        selectedToken?.isZeroFeeCardFunding ? 1 : selectedToken?.price,
      );
      setCryptoAmount(cryptoAmt.toString());
      setUsdAmount(amount);
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

    const nativeTokenSymbol =
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol;

    if (chainDetails.chainName === ChainNames.ETH) {
      const publicClient = getViemPublicClient(
        getWeb3Endpoint(chainDetails, globalContext),
      );
      setIsMaxLoading(true);
      let amountInCrypto = balanceDecimal;
      try {
        // Reserving gas for the txn if the selected token is a native token.
        if (
          selectedTokenSymbol === nativeToken?.symbol &&
          !GASLESS_CHAINS.includes(chainDetails.backendName)
        ) {
          // remove this gasFeeReservation once we have gas estimation for eip1599 chains
          // Estimate the gasFee for the transaction
          if (
            CAN_ESTIMATE_L1_FEE_CHAINS.includes(chainDetails.backendName) &&
            isNativeToken(selectedToken)
          ) {
            const gasReservedForNativeToken = await estimateReserveFee({
              tokenData: selectedToken,
              fromAddress: hdWallet.state.wallet.ethereum
                .address as `0x${string}`,
              toAddress: hdWallet.state.wallet.ethereum
                .address as `0x${string}`,
              publicClient,
              rpc: getWeb3Endpoint(chainDetails, globalContext),
            });

            amountInCrypto = DecimalHelper.subtract(
              balanceDecimal,
              gasReservedForNativeToken,
            ).toString();
          } else {
            const gasDetails = await estimateGasForEvm({
              publicClient,
              chain: chainDetails.backendName,
              fromAddress: (ethereumAddress ?? '') as `0x${string}`,
              toAddress: (ethereumAddress ?? '') as `0x${string}`,
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
        setIsMaxLoading(false);
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
          address: ethereumAddress,
          chain: chainDetails.backendName,
          amount: DecimalHelper.toNumber(amountInCrypto),
          tokenAddress: contractAddress,
          amountInCrypto: true,
          ...(selectedToken?.isHyperliquid && {
            hyperliquidTradeType: selectedToken?.accountType,
          }),
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError) {
          const quote: CardQuoteResponse = response.data;
          void showQuoteModal(quote, true);
        } else {
          setIsMaxLoading(false);
          const errorMessage = parseErrorMessage(response.error);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response?.error?.message?.includes(
              'amount is lower than 10 USD',
            )
              ? errorMessage +
                `. Please ensure you have enough balance for gas fees as few ${nativeTokenSymbol} is reserved for gas fees.`
              : errorMessage ?? t('UNABLE_TO_TRANSFER'),
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
      let amountInCrypto = balanceDecimal;
      // Reserving gas for the txn if the selected token is a native token.
      setIsMaxLoading(true);
      if (
        selectedTokenSymbol === nativeTokenSymbol &&
        !GASLESS_CHAINS.includes(chainDetails.backendName)
      ) {
        try {
          const gasDetails = await estimateGasForSolana({
            fromAddress: solanaAddress ?? '',
            toAddress: solanaAddress ?? '',
            amountToSend: String(amountInCrypto),
            contractAddress,
            tokenContractDecimals: contractDecimals,
            isMaxGasEstimation: true,
          });
          if (gasDetails && !gasDetails.isError) {
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
            description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          return;
        }
      }
      try {
        const payload = {
          ecosystem: 'solana',
          address: solanaAddress,
          chain: chainDetails.backendName,
          amount: DecimalHelper.toNumber(amountInCrypto),
          coinId: coinGeckoId,
          amountInCrypto: true,
          tokenAddress: contractAddress,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
        if (!response.isError) {
          const quote: CardQuoteResponse = response.data;
          void showQuoteModal(quote, true);
        } else {
          setIsMaxLoading(false);
          showModal('state', {
            type: 'error',
            title: response?.error?.message?.includes('minimum amount')
              ? t('INSUFFICIENT_FUNDS')
              : '',
            description: response?.error?.message?.includes(
              'amount is lower than 10 USD',
            )
              ? parseErrorMessage(response.error) +
                `. Please ensure you have enough balance for gas fees as few ${nativeTokenSymbol} is reserved for gas fees.`
              : parseErrorMessage(response.error) ?? t('UNABLE_TO_TRANSFER'),
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
      let amountInCrypto = balanceDecimal;
      setIsMaxLoading(true);

      if (
        selectedTokenSymbol === nativeTokenSymbol &&
        !GASLESS_CHAINS.includes(chainDetails.backendName)
      ) {
        try {
          let gasDetails;
          if (chainDetails.chainName !== ChainNames.OSMOSIS) {
            // target address is osmosis address so doing IBC instead of send for estimation
            gasDetails = await estimateGasForCosmosIBCRest({
              fromChain: chainDetails,
              toChain: CHAIN_OSMOSIS,
              denom,
              amount: amountInCrypto,
              fromAddress: wallet?.[chainDetails.chainName]?.address ?? '',
              toAddress: OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
            });
          } else {
            gasDetails = await estimateGasForCosmosRest({
              chain: chainDetails,
              denom,
              amount: amountInCrypto,
              fromAddress: wallet?.[chainDetails.chainName]?.address ?? '',
              toAddress: OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
            });
          }

          if (gasDetails) {
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
          amount: DecimalHelper.toNumber(amountInCrypto),
          coinId: coinGeckoId,
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
          setIsMaxLoading(false);
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
  };

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
          errorMessage = '*You do not have enough balance to load the card';
        } else if (
          usdAmount &&
          backendName === CHAIN_ETH.backendName &&
          Number(usdAmount) < MINIMUM_TRANSFER_AMOUNT_ETH
        ) {
          errorMessage = `${t<string>(
            'MINIMUM_AMOUNT_ETH',
          )} $${MINIMUM_TRANSFER_AMOUNT_ETH}`;
        } else if (!usdAmount || Number(usdAmount) < minTokenValueLimit) {
          if (backendName === CHAIN_ETH.backendName) {
            errorMessage = 'Minimum card load amount for Ethereum is $50';
          } else {
            errorMessage = `Minimum card load amount is $${String(
              minTokenValueLimit,
            )}`;
          }
        }

        return (
          <CyDView className='mb-[10px]'>
            <CyDText className=' text-red300 font-normal text-[12px] text-wrap'>
              {`${errorMessage}`}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  }, [selectedToken, cryptoAmount, nativeToken?.balanceInteger]);

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
        const amountToQuote = isCryptoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'evm',
          address: ethereumAddress,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCryptoInput,
          ...(selectedToken?.isHyperliquid && {
            hyperliquidTradeType: selectedToken?.accountType,
          }),
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
    } else if (COSMOS_CHAINS.includes(chainDetails.chainName)) {
      try {
        const amountToQuote = isCryptoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'cosmos',
          address: wallet[chainDetails.chainName].address,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          coinId: coinGeckoId,
          tokenAddress: denom,
          amountInCrypto: isCryptoInput,
          isCosmosV2: true,
        };
        const response = await postWithAuth(
          `/v1/cards/${currentCardProvider}/card/${cardId}/quote`,
          payload,
        );
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
        const amountToQuote = isCryptoInput ? cryptoAmount : usdAmount;
        const payload = {
          ecosystem: 'solana',
          address: solanaAddress,
          chain: chainDetails.backendName,
          amount: Number(amountToQuote),
          tokenAddress: contractAddress,
          amountInCrypto: isCryptoInput,
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

  const showQuoteModal = async (
    quote: CardQuoteResponse,
    isMaxQuote: boolean,
  ) => {
    const {
      chainDetails,
      symbol: selectedTokenSymbol,
      contractAddress,
      contractDecimals,
      balanceDecimal,
      denom,
    } = selectedToken as Holding;

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

    // -------------------------------------------------------------------------
    // Target Address Resolution
    // -------------------------------------------------------------------------
    // On production: Fetch from smart contract and validate against quote
    // On dev/staging: Use quote's target address directly (no contract validation)

    const currentArchHost = hostWorker.getHost('ARCH_HOST');
    const isProductionBackend = currentArchHost === PRODUCTION_ARCH_HOST;
    let targetWalletAddress = '';

    if (isProductionBackend) {
      const result = await resolveAndValidateCardTargetAddress({
        programId: quote.programId,
        provider: currentCardProvider,
        chainName: quote.chain as ChainBackendNames,
        quoteTargetAddress: quote.targetAddress,
        quoteId: quote.quoteId,
        globalContext,
      });

      if (!result.success) {
        setLoading(false);
        setIsMaxLoading(false);
        showModal('state', {
          type: 'error',
          title: 'Transaction Security Check Failed',
          description: result.userFriendlyMessage,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }

      targetWalletAddress = result.targetAddress;
    } else {
      // Non-production: use quote address directly
      targetWalletAddress = quote.targetAddress;
    }

    try {
      if (chainDetails.chainName === ChainNames.ETH) {
        const publicClient = getViemPublicClient(
          getWeb3Endpoint(chainDetails, globalContext),
        );
        if (
          DecimalHelper.isLessThanOrEqualTo(
            actualTokensRequired,
            balanceDecimal,
          )
        ) {
          gasDetails = await estimateGasForEvm({
            publicClient,
            chain: chainDetails.backendName,
            fromAddress: (ethereumAddress ?? '') as `0x${string}`,
            toAddress: (targetWalletAddress ?? '') as `0x${string}`,
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
          if (chainDetails.chainName !== ChainNames.OSMOSIS) {
            gasDetails = await estimateGasForCosmosIBCRest({
              fromChain: chainDetails,
              toChain: CHAIN_OSMOSIS,
              denom,
              amount: actualTokensRequired,
              fromAddress: wallet?.[chainDetails.chainName]?.address ?? '',
              toAddress: OSMOSIS_TO_ADDRESS_FOR_IBC_GAS_ESTIMATION,
            });
          } else {
            gasDetails = await estimateGasForCosmosRest({
              chain: chainDetails,
              denom,
              amount: actualTokensRequired,
              fromAddress: wallet?.[chainDetails.chainName]?.address ?? '',
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
            fromAddress: solanaAddress ?? '',
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
            String(gasDetails?.gasFeeInCrypto ?? '0'),
            nativeToken?.balanceDecimal ?? '0',
            actualTokensRequired,
            balanceDecimal,
          );
        if (!hasSufficientBalance) {
          showModal('state', {
            type: 'error',
            title: t('INSUFFICIENT_FUNDS'),
            description: t('INSUFFICIENT_FUNDS_DESCRIPTION'),
          });
        } else if (!hasSufficientGasFee) {
          showModal('state', {
            type: 'error',
            title: t('INSUFFICIENT_GAS_FEE'),
            description: t('INSUFFICIENT_GAS_FEE_DESCRIPTION'),
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
              gasFeeInCrypto: formatAmount(gasDetails?.gasFeeInCrypto),
              gasFeeInFiat: formatAmount(
                DecimalHelper.multiply(
                  gasDetails?.gasFeeInCrypto,
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
        balanceDecimal,
        actualTokensRequired,
      };
      Sentry.captureException(errorObject);
      setLoading(false);
      setIsMaxLoading(false);
      showModal('state', {
        type: 'error',
        title: t('GAS_ESTIMATION_FAILED'),
        description: t('GAS_ESTIMATION_FAILED_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const getTextAdjustment = (value: string) => {
    const length = value.replace('.', '').length;
    if (length > 7) return '';
    if (length > 5) return 'pb-[2px]';
    return 'h-[60px]';
  };

  const handleKeyPress = (key: string) => {
    if (key === '⌫') {
      setAmount(prev => prev.slice(0, -1));
    } else if (key === '.' && amount.includes('.')) {
      // Prevent multiple decimal points
    } else {
      setAmount(prev => prev + key);
    }
  };

  return (
    <CyDView className='bg-n20 flex-1' style={{ paddingTop: insect.top }}>
      <ChooseTokenModalV2
        isChooseTokenModalVisible={isChooseTokenVisible}
        setIsChooseTokenModalVisible={setIsChooseTokenVisible}
        minTokenValueLimit={minTokenValueLimit}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          void onSelectingToken(token as Holding);
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
        }}
        type={TokenModalType.CARD_LOAD}
        minTokenValueEth={minTokenValueEth}
      />

      <CyDView className='flex flex-col justify-between flex-1'>
        <CyDView className='px-[16px] flex-1'>
          <CyDTouchView
            className='flex-row items-center gap-[16px] '
            onPress={() => {
              navigation.goBack();
            }}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
            <CyDText className='font-bold text-[28px]'>
              {'Lets Fund your Card'}
            </CyDText>
          </CyDTouchView>

          <CyDKeyboardAwareScrollView className=''>
            <CyDView className='mt-[16px]'>
              <CyDText className='font-medium text-[12px]'>
                Select the Token & Chain
              </CyDText>

              <CyDTouchView
                className='mt-[8px] bg-n0 rounded-[26px] py-[8px] px-[12px] flex-row items-center justify-between'
                onPress={() => {
                  setIsChooseTokenVisible(true);
                }}>
                <CyDView className='flex-row items-center gap-[8px]'>
                  <CyDFastImage
                    source={selectedToken?.chainDetails?.logo_url}
                    className='w-[32px] h-[32px]'
                  />
                  <CyDText className='font-bold text-[16px]'>
                    {selectedToken?.name}
                  </CyDText>
                </CyDView>
                <CyDView className='flex-row items-center'>
                  {!isCryptoInput && (
                    <CyDText className='font-medium text-n100 text-[12px]'>
                      {`$${round(selectedToken?.totalValue ?? 0, 2)}`}
                    </CyDText>
                  )}
                  {isCryptoInput && (
                    <CyDText className='font-medium text-n100 text-[12px]'>
                      {`${DecimalHelper.round(
                        selectedToken?.balanceDecimal ?? '',
                        8,
                      ).toString()} ${String(selectedToken?.symbol ?? '')}`}
                    </CyDText>
                  )}
                  <CyDMaterialDesignIcons
                    name='chevron-down'
                    size={24}
                    className='text-base400'
                  />
                </CyDView>
              </CyDTouchView>
            </CyDView>

            <CyDView
              className={clsx('mt-[16px]', {
                'opacity-40 pointer-events-none': !selectedToken,
              })}>
              <CyDText className='font-bold text-[12px]'>
                {t('AMOUNT_TO_BE_LOADED_IN_CARD')}
              </CyDText>
              <CyDView className='mt-[8px] rounded-[16px] p-[24px] bg-n0'>
                <CyDView className='flex-row justify-between items-center'>
                  <CyDView className='w-[65%] '>
                    <CyDView className='py-[6px] px-[12px] bg-n20 rounded-[8px] flex-row justify-start items-center h-[65px]'>
                      {!isCryptoInput && (
                        <CyDText
                          className={clsx(
                            'font-bold',
                            getFontClass(amount),
                            getTextAdjustment(amount),
                          )}>
                          $
                        </CyDText>
                      )}
                      {isCryptoInput && (
                        <CyDView className='h-[38px] w-[38px] rounded-full border border-n50 flex-row justify-center items-center mr-[8px]'>
                          <CyDFastImage
                            source={{ uri: selectedToken?.logoUrl ?? '' }}
                            className='w-[24px] h-[24px]'
                          />
                        </CyDView>
                      )}
                      <CyDTextInput
                        keyboardType='none'
                        returnKeyType='done'
                        onChangeText={text => {
                          onEnterAmount(text);
                        }}
                        value={amount}
                        placeholder='0.00'
                        placeholderTextColor={'#999999'}
                        className={clsx(
                          'font-bold w-[90%] p-[0px] bg-n20',
                          getFontClass(amount),
                        )}
                        editable={!!selectedToken}
                      />
                    </CyDView>
                    {!isCryptoInput && (
                      <CyDText className='mt-[8px] text-[12px] font-bold'>
                        {`${limitDecimalPlaces(
                          cryptoAmount ?? '0',
                          3,
                        )} ${String(selectedToken?.symbol ?? '')}`}
                      </CyDText>
                    )}
                    {isCryptoInput && (
                      <CyDText className='mt-[8px] text-[12px] font-bold'>
                        {`$${limitDecimalPlaces(usdAmount ?? '0', 2)}`}
                      </CyDText>
                    )}
                  </CyDView>
                  <CyDTouchView
                    className='w-[44px] h-[44px] bg-n40 rounded-full flex-row justify-center items-center'
                    onPress={() => {
                      onPressToggle();
                    }}
                    disabled={!selectedToken}>
                    <CyDMaterialDesignIcons
                      name='swap-vertical'
                      size={20}
                      className='text-base400 self-center items-center'
                    />
                  </CyDTouchView>
                </CyDView>

                <CyDView className='mt-[16px] flex-row gap-x-[8px] items-center'>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() => onEnterAmount('10')}
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>$10</CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() =>
                      onEnterAmount(
                        getPercentageAmounts().p25 === '10'
                          ? '100'
                          : getPercentageAmounts().p25,
                      )
                    }
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>
                      $
                      {getPercentageAmounts().p25 === '10'
                        ? '100'
                        : getPercentageAmounts().p25}
                    </CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() =>
                      onEnterAmount(
                        getPercentageAmounts().p50 === '10'
                          ? '200'
                          : getPercentageAmounts().p50,
                      )
                    }
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>
                      $
                      {getPercentageAmounts().p50 === '10'
                        ? '200'
                        : getPercentageAmounts().p50}
                    </CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    onPress={() =>
                      onEnterAmount(
                        getPercentageAmounts().p75 === '10'
                          ? '500'
                          : getPercentageAmounts().p75,
                      )
                    }
                    disabled={!selectedToken}>
                    <CyDText className='font-bold text-[14px]'>
                      $
                      {getPercentageAmounts().p75 === '10'
                        ? '500'
                        : getPercentageAmounts().p75}
                    </CyDText>
                  </CyDTouchView>
                  <CyDTouchView
                    className='bg-n30 rounded-[4px] px-[10px] py-[6px]'
                    disabled={isMaxLoading}
                    onPress={() => {
                      void onMax();
                    }}>
                    {isMaxLoading ? (
                      <CyDView className='w-[30px] items-center'>
                        <ActivityIndicator
                          size='small'
                          color='var(--color-base400)'
                        />
                      </CyDView>
                    ) : (
                      <CyDText className='font-bold text-[14px]'>
                        {'MAX'}
                      </CyDText>
                    )}
                  </CyDTouchView>
                </CyDView>
              </CyDView>
            </CyDView>

            {selectedToken && <CustomKeyboard onKeyPress={handleKeyPress} />}
          </CyDKeyboardAwareScrollView>
        </CyDView>

        <CyDView className='bg-n0 px-[16px] pt-[16px] rounded-t-[12px] pb-[32px]'>
          <RenderWarningMessage />
          <Button
            disabled={isLoadCardDisabled()}
            title={'Get Quote'}
            loading={loading}
            onPress={() => {
              if (validateAmount(amount)) {
                void fundCard();
              }
            }}
          />
        </CyDView>
      </CyDView>
    </CyDView>
  );
}
