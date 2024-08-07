import React, { useCallback, useContext, useEffect, useState } from 'react';
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
} from '../../../constants/server';
import {
  getWeb3Endpoint,
  HdWalletContext,
  PortfolioContext,
  getNativeToken,
  formatAmount,
  validateAmount,
  limitDecimalPlaces,
  hasSufficientBalanceAndGasFee,
} from '../../../core/util';
import {
  CyDFastImage,
  CyDImage,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindStyles';
import * as Sentry from '@sentry/react-native';
import { GlobalContext } from '../../../core/globalContext';
import Web3 from 'web3';
import { useGlobalModalContext } from '../../../components/v2/GlobalModal';
import { CHOOSE_TOKEN_MODAL_TIMEOUT } from '../../../constants/timeOuts';
import { screenTitle } from '../../../constants';
import { useIsFocused } from '@react-navigation/native';
import {
  CardFeePercentage,
  GAS_BUFFER_FACTOR_FOR_LOAD_MAX,
  MINIMUM_TRANSFER_AMOUNT_ETH,
  SlippageFactor,
  gasFeeReservation,
} from '../../../constants/data';
import ChooseTokenModal from '../../../components/v2/chooseTokenModal';
import CyDTokenAmount from '../../../components/v2/tokenAmount';
import useAxios from '../../../core/HttpRequest';
import { divide, floor, get, random } from 'lodash';
import { ButtonType, CardProviders } from '../../../constants/enum';
import clsx from 'clsx';
import { CardQuoteResponse } from '../../../models/card.model';
import useGasService from '../../../hooks/useGasService';
import { Holding } from '../../../core/Portfolio';
import CyDNumberPad from '../../../components/v2/numberpad';
import CyDTokenValue from '../../../components/v2/tokenValue';
import Loading from '../../../components/v2/loading';

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
  const cardProfile = globalContext.globalState.cardProfile;
  const cards = get(cardProfile, currentCardProvider)?.cards;
  const cardId: string = get(cards, currentCardIndex)?.cardId;
  const { postWithAuth } = useAxios();

  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const stargaze = hdWallet.state.wallet.stargaze;
  const noble = hdWallet.state.wallet.noble;
  const coreum = hdWallet.state.wallet.coreum;
  const kujira = hdWallet.state.wallet.kujira;

  const cosmosAddresses = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address,
    coreum: coreum.address,
    kujira: kujira.address,
  };

  const rpc = {
    cosmos: globalStateContext.globalState.rpcEndpoints.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints.JUNO.primary,
    stargaze: globalContext.globalState.rpcEndpoints.STARGAZE.primary,
    noble: globalContext.globalState.rpcEndpoints.NOBLE.primary,
    coreum: globalContext.globalState.rpcEndpoints.COREUM.primary,
    kujira: globalContext.globalState.rpcEndpoints.KUJIRA.primary,
  };

  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(false);
  const [amount, setAmount] = useState('');
  const [isCrpytoInput, setIsCryptoInput] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaxLoading, setIsMaxLoading] = useState<boolean>(false);
  const minTokenValueLimit = 10;
  const minTokenValueEth = 50;
  const [selectedToken, setSelectedToken] = useState<Holding>();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<number>(0);
  const { t } = useTranslation();
  const { showModal, hideModal } = useGlobalModalContext();
  const isFocused = useIsFocused();
  const { estimateGasForEvm, estimateGasForEvmosIBC } = useGasService();
  const [suggestedAmounts, setSuggestedAmounts] = useState<
    Record<string, string>
  >({ low: '', med: '', high: '' });

  useEffect(() => {
    if (isFocused) {
      if (route.params?.tokenData) {
        setSelectedToken(route.params.tokenData);
      } else {
        if (!selectedToken) {
          setTimeout(() => {
            setIsChooseTokenVisible(true);
          }, CHOOSE_TOKEN_MODAL_TIMEOUT);
        }
      }
    }
  }, [isFocused]);

  useEffect(() => {
    onEnterAmount(amount);
  }, [selectedToken]);

  const showQuoteModal = async (
    quote: CardQuoteResponse,
    isMaxQuote: boolean,
  ) => {
    const {
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
      contractAddress,
      contractDecimals,
      denom,
    } = selectedToken as Holding;
    const nativeToken = getNativeToken(
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol,
      portfolioState.statePortfolio.tokenPortfolio[
        get(ChainNameMapping, chainDetails.backendName)
      ].holdings,
    );
    const actualTokensRequired = parseFloat(
      limitDecimalPlaces(quote.tokensRequired, contractDecimals),
    );
    let gasDetails;
    const targetWalletAddress = quote.targetAddress ? quote.targetAddress : '';
    try {
      if (chainDetails.chainName === ChainNames.ETH) {
        const web3 = new Web3(getWeb3Endpoint(chainDetails, globalContext));
        if (actualTokensRequired <= actualBalance) {
          gasDetails = await estimateGasForEvm({
            web3,
            chain: chainDetails.backendName,
            fromAddress: ethereum.address,
            toAddress: targetWalletAddress,
            amountToSend: String(actualTokensRequired),
            contractAddress,
            contractDecimals,
          });
        } else {
          setLoading(false);
          setIsMaxLoading(false);
          navigation.navigate(screenTitle.CARD_QUOTE_SCREEN, {
            hasSufficientBalanceAndGasFee: false,
            cardProvider: currentCardProvider,
            cardId,
            tokenSendParams: {
              chain: chainDetails.backendName,
              amountInCrypto: String(actualTokensRequired),
              amountInFiat: String(quote.amount),
              symbol: selectedTokenSymbol,
              toAddress: targetWalletAddress,
              gasFeeInCrypto: '0',
              gasFeeInFiat: '0',
              nativeTokenSymbol: String(selectedToken?.chainDetails?.symbol),
              selectedToken,
              tokenQuote: quote,
            },
          });
        }
      } else if (
        PURE_COSMOS_CHAINS.includes(chainDetails.chainName) &&
        chainDetails.chainName !== ChainNames.OSMOSIS
      ) {
        gasDetails = {
          gasFeeInCrypto: parseFloat(String(random(0.01, 0.1, true))).toFixed(
            4,
          ),
        };
      } else if (chainDetails.chainName === ChainNames.OSMOSIS) {
        gasDetails = {
          gasFeeInCrypto: parseFloat(String(random(0.01, 0.1, true))).toFixed(
            4,
          ),
        };
      } else if (chainDetails.chainName === ChainNames.EVMOS) {
        gasDetails = await estimateGasForEvmosIBC({
          toAddress: quote.targetAddress,
          toChain: CHAIN_OSMOSIS,
          amount,
          denom,
          contractDecimals,
        });
      }
      setLoading(false);
      setIsMaxLoading(false);
      if (gasDetails) {
        const hasSufficient = hasSufficientBalanceAndGasFee(
          selectedTokenSymbol === chainDetails.symbol,
          parseFloat(String(gasDetails.gasFeeInCrypto)),
          nativeTokenBalance,
          actualTokensRequired,
          actualBalance,
        );
        navigation.navigate(screenTitle.CARD_QUOTE_SCREEN, {
          hasSufficientBalanceAndGasFee: hasSufficient,
          cardProvider: currentCardProvider,
          cardId,
          tokenSendParams: {
            chain: chainDetails.backendName,
            amountInCrypto: String(actualTokensRequired),
            amountInFiat: String(quote.amount),
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
            selectedToken,
            tokenQuote: quote,
          },
        });
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
        actualBalance,
        actualTokensRequired,
        rpc,
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

  const fundCard = async () => {
    const { contractAddress, coinGeckoId, contractDecimals, chainDetails } =
      selectedToken as Holding;
    setLoading(true);
    Keyboard.dismiss();
    if (chainDetails.chainName === ChainNames.ETH) {
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

  const onSelectingToken = (item: Holding) => {
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
      contractDecimals,
      chainDetails,
      actualBalance,
      symbol: selectedTokenSymbol,
      denom,
    } = selectedToken as Holding;

    const nativeTokenSymbol =
      get(NativeTokenMapping, chainDetails.symbol) || chainDetails.symbol;

    if (chainDetails.chainName === ChainNames.ETH) {
      const web3 = new Web3(getWeb3Endpoint(chainDetails, globalContext));
      setIsMaxLoading(true);
      let amountInCrypto = actualBalance;
      try {
        // Reserving gas for the txn if the selected token is a native token.
        if (
          selectedTokenSymbol === nativeTokenSymbol &&
          !GASLESS_CHAINS.includes(chainDetails.backendName)
        ) {
          // Estimate the gasFee for the transaction
          const gasDetails = await estimateGasForEvm({
            web3,
            chain: chainDetails.backendName,
            fromAddress: ethereum.address,
            toAddress: ethereum.address,
            amountToSend: String(actualBalance),
            contractAddress,
            contractDecimals,
          });
          if (gasDetails) {
            // Adjust the amountInCrypto with the estimated gas fee
            amountInCrypto =
              actualBalance -
              parseFloat(String(gasDetails.gasFeeInCrypto)) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
            amountInCrypto = Number(limitDecimalPlaces(amountInCrypto));
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
      let amountInCrypto = actualBalance;
      // Reserving gas for the txn if the selected token is a native token.
      setIsMaxLoading(true);
      if (
        selectedTokenSymbol === nativeTokenSymbol &&
        !GASLESS_CHAINS.includes(chainDetails.backendName)
      ) {
        try {
          let gasDetails;
          if (chainDetails.chainName === ChainNames.EVMOS) {
            gasDetails = await estimateGasForEvmosIBC({
              toAddress: get(cosmosAddresses, ChainNames.OSMOSIS),
              toChain: CHAIN_OSMOSIS,
              amount,
              denom,
              contractDecimals,
            });
          } else {
            gasDetails = {
              gasFeeInCrypto: get(
                gasFeeReservation,
                [chainDetails.chainName, 'backendName'],
                0.1,
              ),
            };
          }

          if (gasDetails) {
            const gasFeeEstimationForTxn = String(gasDetails.gasFeeInCrypto);
            amountInCrypto =
              actualBalance -
              parseFloat(gasFeeEstimationForTxn) *
                GAS_BUFFER_FACTOR_FOR_LOAD_MAX;
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
          amount: amountInCrypto,
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
            ethAddress: ethereum.address,
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

  const RenderSelectedToken = useCallback(() => {
    return (
      <CyDTouchView
        className={
          'bg-cardBg py-[6px] px-[16px] my-[16px] border-[1px] border-[#EBEBEB] rounded-[34px] self-center'
        }
        onPress={() => setIsChooseTokenVisible(true)}>
        <CyDView
          className={'flex flex-row flex-wrap justify-center items-center'}>
          {selectedToken && (
            <CyDView className={'flex flex-row items-center'}>
              <CyDImage
                source={{ uri: selectedToken.logoUrl }}
                className={'w-[26px] h-[26px] rounded-[20px]'}
              />
              <CyDView className='flex flex-col justify-start items-start ml-[8px]'>
                <CyDText
                  className={clsx(
                    'text-black font-nunito font-extrabold text-[16px]',
                    {
                      'text-[14px]': selectedToken.isZeroFeeCardFunding,
                    },
                  )}>
                  {selectedToken.name}
                </CyDText>
                {/* {selectedToken.isZeroFeeCardFunding ? (
                  <CyDView className='h-[20px] bg-white rounded-[8px] mx-[4px] px-[8px] flex justify-center items-center'>
                    <CyDText className={'font-black text-[10px]'}>
                      {'ZERO FEE ✨'}
                    </CyDText>
                  </CyDView>
                ) : null} */}
                {selectedToken && (
                  <CyDView className='flex flex-row items-center'>
                    {isCrpytoInput ? (
                      <CyDTokenAmount className={'font-bold mr-[3px]'}>
                        {selectedToken.actualBalance}
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

          <CyDView className='flex flex-row items-center ml-[8px]'>
            <CyDFastImage
              source={AppImages.DOWN_ARROW}
              className='h-[15px] w-[15px]'
              resizeMode='contain'
            />
          </CyDView>
        </CyDView>
      </CyDTouchView>
    );
  }, [selectedToken, isCrpytoInput]);

  const RenderWarningMessage = useCallback(() => {
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
        } else if (!usdAmount || Number(usdAmount) < minTokenValueLimit) {
          if (backendName === CHAIN_ETH.backendName) {
            errorMessage = t('MINIMUM_AMOUNT_ETH');
          } else {
            errorMessage = t<string>('CARD_LOAD_MIN_AMOUNT');
          }
        }

        return (
          <CyDView className='my-[8px]'>
            <CyDText className='text-center text-redColor font-medium'>
              {errorMessage}
            </CyDText>
          </CyDView>
        );
      }
    }
    return null;
  }, [selectedToken, cryptoAmount]);

  const onPressToggle = () => {
    const tempIsCryproInput = !isCrpytoInput;
    setIsCryptoInput(!isCrpytoInput);
    const multiplier =
      1 +
      divide(
        get(
          CardFeePercentage,
          selectedToken?.chainDetails.backendName as string,
          0.5,
        ),
        100,
      ) +
      get(
        SlippageFactor,
        selectedToken?.chainDetails.backendName as string,
        0.003,
      );

    if (tempIsCryproInput) {
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
            : usdAmt * multiplier
        ).toString(),
      );
    } else {
      const cryptoAmt =
        parseFloat(
          String(
            Number(amount) *
              (selectedToken?.isZeroFeeCardFunding ? 1 : multiplier),
          ),
        ) /
        (selectedToken?.isZeroFeeCardFunding
          ? 1
          : Number(selectedToken?.price));
      setCryptoAmount((isNaN(cryptoAmt) ? '0.00' : cryptoAmt).toString());
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
        parseFloat(amt) /
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
      setUsdAmount(amt);
    }
  };

  return (
    <CyDSafeAreaView className='h-full bg-white'>
      {isMaxLoading && <Loading blurBg={true} />}
      <ChooseTokenModal
        isChooseTokenModalVisible={isChooseTokenVisible}
        tokenList={portfolioState.statePortfolio.tokenPortfolio.totalHoldings}
        minTokenValueLimit={minTokenValueLimit}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          onSelectingToken(token as Holding);
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
          if (!selectedToken) {
            navigation.goBack();
          }
        }}
        noTokensAvailableMessage={t<string>('CARD_INSUFFICIENT_FUNDS')}
        renderPage={'fundCardPage'}
      />
      {/* <CyDKeyboardAwareScrollView> */}
      <CyDView
        className={clsx('flex flex-1 flex-col justify-between h-full', {
          '': loading,
        })}>
        <CyDView>
          <RenderSelectedToken />
          <CyDView className='flex flex-row rounded-[8px] px-[20px] justify-between items-center'>
            <CyDView className={'w-full items-center'}>
              <CyDView className={'flex flex-row justify-center items-center'}>
                {!isCrpytoInput && (
                  <CyDText
                    className={clsx('text-mandarin font-bold', {
                      'text-[32px]': amount.length <= 15,
                      'text-[60px]': amount.length <= 7,
                      'text-[75px]': amount.length <= 5,
                    })}>
                    {'$'}
                  </CyDText>
                )}
                <CyDText
                  className={clsx(
                    'font-extrabold text-center text-mandarin font-nunito ml-[4px]',
                    {
                      'text-[32px]': amount.length <= 15,
                      'text-[60px]': amount.length <= 7,
                      'text-[75px]': amount.length <= 5,
                    },
                  )}>
                  {amount === '' ? '0.00' : amount}
                </CyDText>
                {isCrpytoInput && (
                  <CyDView>
                    <CyDText className='font-extrabold mt-[26px] text-[16px] ml-[4px]'>
                      {selectedToken?.symbol}
                    </CyDText>
                  </CyDView>
                )}
              </CyDView>
              <CyDText
                className={clsx(
                  'text-center text-primaryTextColor text-[16px]',
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
              <RenderWarningMessage />
              {/* {(!usdAmount || Number(usdAmount) < minTokenValueLimit) && (
                <CyDView className='mb-[2px]'>
                  <CyDText className='text-center font-semibold'>
                    {t<string>('CARD_LOAD_MIN_AMOUNT')}
                  </CyDText>
                </CyDView>
              )}
              <RenderWarningMessage /> */}
            </CyDView>
            <CyDView className={'p-[4px] ml-[-45px]'}>
              <CyDTouchView
                onPress={() => {
                  onPressToggle();
                }}
                className={clsx(
                  'border border-inputBorderColor bg-cardBg rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]',
                )}>
                <CyDFastImage
                  className='h-[16px] w-[16px]'
                  source={AppImages.TOGGLE_ICON}
                  resizeMode='contain'
                />
              </CyDTouchView>
            </CyDView>
          </CyDView>
          {/* <RenderWarningMessage /> */}
        </CyDView>
        <CyDView>
          <CyDView className='flex flex-row justify-evenly items-center'>
            <CyDTouchView
              onPress={() => {
                onEnterAmount(suggestedAmounts.low);
              }}
              disabled={loading}
              className={clsx(
                'bg-secondaryBackgroundColor border border-inputBorderColor rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
              )}>
              <CyDText className='font-extrabold'>
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
                  'bg-secondaryBackgroundColor border border-inputBorderColor rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
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
                  'bg-secondaryBackgroundColor border border-inputBorderColor rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
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
                'bg-white border border-appColor rounded-[4px] h-[40px] w-[50px] flex justify-center items-center',
              )}>
              <CyDText className='font-extrabold'>{t('MAX')}</CyDText>
            </CyDTouchView>
          </CyDView>
          <CyDNumberPad
            value={amount}
            setValue={(amt: string) => onEnterAmount(amt)}
          />
          <CyDView className='flex flex-row justify-around items-center mx-[16px]'>
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
      {/* </CyDKeyboardAwareScrollView> */}
    </CyDSafeAreaView>
  );
}
