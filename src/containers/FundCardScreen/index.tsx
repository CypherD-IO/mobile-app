/**
 * @format
 * @flow
 */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import * as C from '../../constants/index';
import { Colors } from '../../constants/theme';
import {
  apiTimeout,
  getWeb3Endpoint,
  HdWalletContext,
  ActivityContext,
  PortfolioContext,
  TARGET_CARD_COSMOS_WALLET_ADDRESS,
  TARGET_CARD_EVMOS_WALLET_CORRESPONDING_EVM_ADDRESS,
  TARGET_CARD_EVM_WALLET_ADDRESS,
  TARGET_CARD_OSMOSIS_WALLET_ADDRESS,
  TARGET_CARD_JUNO_WALLET_ADDRESS,
  logAnalytics,
  parseErrorMessage,
} from '../../core/util';
import {
  Chain,
  CHAIN_ETH,
  CARD_CHAINS,
  ChainNames,
  COSMOS_CHAINS,
} from '../../constants/server';
import { ButtonWithOutImage } from '../Auth/Share';
import { DynamicTouchView } from '../../styles/viewStyle';
import axios from '../../core/Http';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  cosmosSendTokens,
  estimateGasForCosmosTransaction,
  estimateGasForNativeTransaction,
  getCosmosSignerClient,
  sendNativeCoinOrTokenToAnyAddress,
} from '../../core/NativeTransactionHandler';
import { getGasPriceFor } from '../Browser/gasHelper';
import BottomTokenCardConfirm from '../../components/BottomTokenCardConfirm';
import analytics from '@react-native-firebase/analytics';
import { getCurrentChainHoldings } from '../../core/Portfolio';
import * as Sentry from '@sentry/react-native';
import { GasPriceDetail } from '../../core/types';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import Web3 from 'web3';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  DebitCardTransaction,
} from '../../reducers/activity_reducer';
import { genId } from '../utilities/activityUtilities';

import { ethers } from 'ethers';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { hostWorker } from '../../global';
import { TokenMeta } from '../../models/tokenMetaData.model';
import { AnalyticsType } from '../../constants/enum';
import { useRoute } from '@react-navigation/native';

const {
  SafeAreaView,
  DynamicView,
  DynamicImage,
  CText,
  WebsiteInput,
} = require('../../styles');

export default function FundCardScreen(props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const [dollar, setDollar] = useState<number>(0);
  const [chainSelected, setChainSelected] = useState<Chain>();
  const [icon, setIcon] = useState<string>('12');
  const [loading, setLoading] = useState<boolean>(false);
  const [fromToken, setFromToken] = useState([]);
  const [fromTokenItem, setFromTokenItem] = useState<TokenMeta>({});
  const [fromTokenValue, setFromTokenValue] = useState('');
  const [valueChange, setValueChange] = useState<boolean>(false);
  const [displayQuote, setDisplayQuote] = useState<boolean>(false);
  const hdWallet = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const globalContext = useContext<any>(GlobalContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const [tokenQuote, setTokenQuote] = useState<any>({});
  const [errorString, setErrorString] = useState<string>('');
  const [displayError, setDisplayError] = useState<boolean>(false);
  const ref1 = useRef(null);
  const [payTokenBottomConfirm, setPayTokenBottomConfirm] =
    useState<boolean>(false);
  const [payTokenModalParams, setPayTokenModalParams] = useState<any>({});
  const [cosmosPayTokenModalParams, setCosmosPayTokenModalParams] =
    useState<any>({});
  const [lowBalance, setLowBalance] = useState<boolean>(false);

  const { showModal, hideModal } = useGlobalModalContext();

  const activityRef = useRef<DebitCardTransaction | null>(null);
  const ref2 = useRef(null);
  const ethereum = hdWallet.state.wallet.ethereum;
  const globalStateContext = useContext<GlobalContextDef>(GlobalContext);
  const cosmos = hdWallet.state.wallet.cosmos;
  const osmosis = hdWallet.state.wallet.osmosis;
  const juno = hdWallet.state.wallet.juno;
  const senderAddress = {
    cosmos: cosmos.wallets[cosmos.currentIndex].address,
    osmosis: osmosis.wallets[osmosis.currentIndex].address,
    juno: juno.wallets[juno.currentIndex].address,
  };
  const targetCardWalletAddress = {
    cosmos: TARGET_CARD_COSMOS_WALLET_ADDRESS,
    osmosis: TARGET_CARD_OSMOSIS_WALLET_ADDRESS,
    juno: TARGET_CARD_JUNO_WALLET_ADDRESS,
  };
  const rpc = {
    cosmos: globalStateContext.globalState.rpcEndpoints.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints.JUNO.primary,
  };
  const route = useRoute();
  // token specific info like price got from token data
  const cosmosTokenData = {};
  for (
    let i = 0;
    i < portfolioState.statePortfolio.tokenPortfolio.cosmos.holdings.length;
    i++
  ) {
    const key =
      portfolioState.statePortfolio.tokenPortfolio.cosmos.holdings[i]
        .coinGeckoId;
    cosmosTokenData[key] =
      portfolioState.statePortfolio.tokenPortfolio.cosmos.holdings[i];
  }

  async function fetchFromData(chain) {
    const chainHoldings = getCurrentChainHoldings(
      portfolioState.statePortfolio.tokenPortfolio,
      chain,
    );
    const tokenList = [];
    for (let i = 0; i < chainHoldings.holdings.length; i++) {
      const holding = chainHoldings.holdings[i];
      holding.displayName = holding.name + ' $' + holding.totalValue;
      if (holding.isVerified) {
        tokenList.push(holding);
      }
    }
    setDisplayQuote(false);
    setDisplayError(false);
    setChainSelected(chain);
    setFromToken(tokenList);
    setFromTokenValue(chainHoldings.holdings[0].displayName);
    setFromTokenItem(chainHoldings.holdings[0]);
    setValueChange(!valueChange);
  }
  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    if (payTokenModalParams.tokenAmount && activityRef.current === null) {
      const activityData: DebitCardTransaction = {
        id: genId(),
        status: ActivityStatus.PENDING,
        type: ActivityType.CARD,
        quoteId: '',
        tokenSymbol: payTokenModalParams.tokenSymbol.toString() ?? '',
        chainName: chainSelected?.backendName.toString() ?? '',
        tokenName: hdWallet.state.card.token.toString() ?? '',
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
    setPayTokenBottomConfirm(true);
    setPayTokenModalParams(payTokenModalParamsLocal);
  };

  function transferSentQuote(
    address: string,
    quote_uuid: string,
    txnHash: string,
  ) {
    axios
      .post(
        `${PORTFOLIO_HOST}/v1/card/mobile/transfer_sent`,
        {
          address: ethereum.address,
          quote_uuid,
          token: hdWallet.state.card.token,
          txn_hash: txnHash,
        },
        { withCredentials: true, timeout: 100000 },
      )
      .then(function (response) {
        if (response.status === 200) {
          activityRef.current &&
            activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityRef.current.id,
                status: ActivityStatus.INPROCESS,
                transactionHash: txnHash,
                quoteId: quote_uuid,
              },
            });
          showModal('state', {
            type: 'success',
            title: '',
            description:
              'Success, Your card funding is in progress and will be done within 5 mins!',
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        } else {
          activityRef.current &&
            activityContext.dispatch({
              type: ActivityReducerAction.PATCH,
              value: {
                id: activityRef.current.id,
                status: ActivityStatus.FAILED,
                quoteId: quote_uuid,
                transactionHash: txnHash,
                reason: `Please contact customer support with the quote_id: ${quote_uuid}`,
              },
            });
          showModal('state', {
            type: 'error',
            title: 'Error processing your txn',
            description: `Please contact customer support with the quote_id: ${quote_uuid}`,
            onSuccess: hideModal,
            onFailure: hideModal,
          });
        }
      })
      .catch(function (error) {
        activityRef.current &&
          activityContext.dispatch({
            type: ActivityReducerAction.PATCH,
            value: {
              id: activityRef.current.id,
              status: ActivityStatus.FAILED,
              quoteId: quote_uuid,
              transactionHash: txnHash,
              reason: `Please contact customer support with the quote_id: ${quote_uuid}`,
            },
          });
        Sentry.captureException(error);
        showModal('state', {
          type: 'error',
          title: 'Error processing your txn',
          description: `Please contact customer support with the quote_id: ${quote_uuid}`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      });
  }

  const handleBridgeTransactionResult = (
    message: string,
    quote_uuid: string,
    from_address: string,
    is_error: boolean,
  ) => {
    if (is_error) {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: chainSelected?.chainName ?? '',
        message: parseErrorMessage(message),
        screen: route.name,
      });
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.PATCH,
          value: {
            id: activityRef.current.id,
            status: ActivityStatus.FAILED,
            quoteId: quote_uuid,
            reason: message,
          },
        });
      showModal('state', {
        type: 'error',
        title: 'Transaction Failed',
        description: `${message}. Please contact customer support with the quote_id: ${quote_uuid}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.SUCCESS,
        txnHash: message,
        chain: chainSelected?.chainName ?? '',
      });
      transferSentQuote(from_address, quote_uuid, message);
    }
  };

  const handleSuccessfulTransaction = async (
    result: any,
    analyticsData: any,
  ) => {
    void logAnalytics({
      type: AnalyticsType.SUCCESS,
      txnHash: analyticsData.hash,
      chain: analyticsData.chain,
    });
    await analytics().logEvent('transaction_submit', analyticsData);
    showModal('state', {
      type: 'info',
      title: 'Transaction Hash',
      description: result.transactionHash,
      onSuccess: hideModal,
      onFailure: hideModal,
    });
    transferSentQuote(
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
      message: parseErrorMessage(_err),
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
    showModal('state', {
      type: 'error',
      title: 'Error processing your txn',
      description: `Please contact customer support with the quote_id: ${uuid}`,
      onSuccess: hideModal,
      onFailure: hideModal,
    });
  };

  const sendTransaction = async (payTokenModalParamsLocal: any) => {
    activityRef.current &&
      activityContext.dispatch({
        type: ActivityReducerAction.PATCH,
        value: {
          id: activityRef.current.id,
          gasAmount: payTokenModalParams.gasFeeDollar,
        },
      });
    if (chainSelected != null) {
      if (
        chainSelected.chainName === ChainNames.ETH ||
        chainSelected.chainName === ChainNames.EVMOS
      ) {
        void analytics().logEvent('send_token_for_card', {
          from: ethereum.address,
          dollar: chainSelected,
          token_quantity: tokenQuote.token_required,
          from_contract: fromTokenItem.contractAddress,
          quote_uuid: tokenQuote.quote_uuid,
        });
        await sendNativeCoinOrTokenToAnyAddress(
          hdWallet,
          portfolioState,
          chainSelected,
          tokenQuote.token_required,
          fromTokenItem.contractAddress,
          fromTokenItem.contractDecimals,
          tokenQuote.quote_uuid,
          handleBridgeTransactionResult,
          chainSelected.chainName === ChainNames.ETH
            ? TARGET_CARD_EVM_WALLET_ADDRESS
            : TARGET_CARD_EVMOS_WALLET_CORRESPONDING_EVM_ADDRESS,
          payTokenModalParamsLocal.finalGasPrice,
          payTokenModalParamsLocal.gasLimit,
          globalContext,
        );
      } else if (COSMOS_CHAINS.includes(chainSelected.chainName)) {
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
          senderAddress[chainSelected.chainName],
          amount,
          t('FUND_CARD_MEMO'),
          handleSuccessfulTransaction,
          handleFailedTransaction,
          chainSelected.chainName,
          tokenQuote.quote_uuid,
          fromTokenItem?.denom,
        );
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
  };

  async function getQuote() {
    setDisplayError(false);
    if (dollar < 5) {
      setErrorString('Minimum transfer amount is $5');
      setDisplayError(true);
      return;
    }
    if (dollar > 3000) {
      setErrorString('Max transfer amount is $3000');
      setDisplayError(true);
      return;
    }
    if (dollar >= parseFloat(fromTokenItem.totalValue)) {
      setErrorString('You do not have enough balance');
      setDisplayError(true);
      return;
    }
    setLoading(true);
    if (
      chainSelected?.chainName === ChainNames.ETH ||
      chainSelected?.chainName === ChainNames.EVMOS
    ) {
      const getQuoteUrl = `${PORTFOLIO_HOST}/v1/card/mobile/quote`;
      axios
        .post(getQuoteUrl, {
          address: ethereum.address,
          token: hdWallet.state.card.token,
          token_address: fromTokenItem.contractAddress,
          chain: chainSelected?.backendName,
          amount: dollar,
          contract_decimals: fromTokenItem.contractDecimals,
        })
        .then(function (response) {
          if (
            response?.data &&
            response.status === 200 &&
            response.data.status !== 'ERROR'
          ) {
            if (chainSelected != null) {
              let gasPrice: GasPriceDetail = {
                chainId: chainSelected.backendName,
                gasPrice: 0,
                tokenPrice: 0,
              };
              const quote = response.data;
              quote.token_required = String(
                Number(quote.token_required).toFixed(5),
              );
              const web3RPCEndpoint = new Web3(
                getWeb3Endpoint(hdWallet.state.selectedChain, globalContext),
              );
              getGasPriceFor(chainSelected, web3RPCEndpoint)
                .then(gasFeeResponse => {
                  gasPrice = gasFeeResponse;
                  setLoading(false);
                  estimateGasForNativeTransaction(
                    hdWallet,
                    chainSelected,
                    fromTokenItem,
                    quote.token_required,
                    true,
                    gasPrice,
                    payTokenModal,
                    globalContext,
                  );
                })
                .catch(gasFeeError => {
                  // TODO (user feedback): Give feedback to user.
                  Sentry.captureException(gasFeeError);
                  setLoading(false);
                  estimateGasForNativeTransaction(
                    hdWallet,
                    chainSelected,
                    fromTokenItem,
                    quote.token_required,
                    true,
                    gasPrice,
                    payTokenModal,
                    globalContext,
                  );
                });
              // setDisplayQuote(true);
              quote.token_required = String(
                Number(quote.token_required).toFixed(5),
              );
              // setQuoteString(quote.token_required + " " + fromTokenItem.symbol);
              setTokenQuote(response.data);
            }
          } else {
            setErrorString(
              'Unable to transfer at this point. Please try again later',
            );
            setDisplayError(true);
            setLoading(false);
          }
        })
        .catch(function (error) {
          Sentry.captureException(error);
          setErrorString(
            'Unable to transfer at this point. Please try again later',
          );
          setDisplayError(true);
          setLoading(false);
        });
    } else if (COSMOS_CHAINS.includes(chainSelected.chainName)) {
      const quoteUrl = `${PORTFOLIO_HOST}/v1/card/mobile/quote_cosmos?address=${
        ethereum.address
      }&chain=${chainSelected?.backendName}&amount=${parseFloat(
        dollar,
      )}&coin_id=${fromTokenItem?.coinGeckoId}`;
      axios
        .get(quoteUrl, { withCredentials: true, timeout: apiTimeout })
        .then(async function (response) {
          if (
            response?.data &&
            response.status === 200 &&
            response.data.status !== 'ERROR'
          ) {
            if (chainSelected != null) {
              const quote = response.data;
              quote.token_required = String(
                Number(quote.token_required).toFixed(5),
              );
              const valueForUsd = quote.token_required;
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
              let retryCount = 0;
              const signer = await getCosmosSignerClient(
                chainSelected,
                hdWallet,
              );
              while (retryCount < 3) {
                try {
                  await estimateGasForCosmosTransaction(
                    chainSelected,
                    signer,
                    amount,
                    senderAddress[chainSelected.chainName],
                    targetCardWalletAddress[chainSelected.chainName],
                    cosmosTokenData[fromTokenItem.coinGeckoId],
                    rpc[chainSelected.chainName],
                    cosmosPayTokenModal,
                    valueForUsd.toString(),
                    globalStateContext.globalState.rpcEndpoints,
                  );
                } catch (err) {
                  if (retryCount < 3) {
                    retryCount += 1;
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
            setErrorString(
              'Unable to transfer at this point. Please try again later',
            );
            setDisplayError(true);
            setLoading(false);
          }
        })
        .catch(function (error) {
          Sentry.captureException(error);
          setErrorString(
            'Unable to transfer at this point. Please try again later',
          );
          setDisplayError(true);
          setLoading(false);
        });
    }
  }

  function cosmosPayTokenModal(cosmosPayTokenModalParamsLocal: any) {
    setCosmosPayTokenModalParams(cosmosPayTokenModalParamsLocal);
    setPayTokenBottomConfirm(true);
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
      totalValueTransfer: (
        parseFloat(cosmosPayTokenModalParamsLocal.gasFeeNative) +
        parseFloat(cosmosPayTokenModalParamsLocal.sentTokenAmount)
      ).toFixed(6),
      totalValueDollar: (
        parseFloat(cosmosPayTokenModalParamsLocal.finalGasPrice) +
        parseFloat(cosmosPayTokenModalParamsLocal.sentValueUSD)
      ).toFixed(6),
    };
    setPayTokenModalParams(payTokenModalParamsLocal);
  }

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  const renderItem = (item: any) => {
    return (
      <DynamicTouchView
        sentry-label='fund-card-chain-item'
        dynamic
        dynamicWidth
        width={100}
        fD='row'
        mT={2}
        bR={15}
        pH={8}
        pV={8}
        bGC={Colors.whiteColor}
        jC={'flex-start'}
        onPress={() => {
          setDisplayQuote(false);
          setDisplayError(false);
          setChainSelected(item);
          setIcon(item.logo_url);
          ref2.current.close();
          fetchFromData(item);
        }}>
        <DynamicImage dynamic source={item.logo_url} width={25} height={25} />
        <DynamicView dynamic dynamicWidth width={70} aLIT={'flex-start'}>
          <CText
            dynamic
            fF={C.fontsName.FONT_BOLD}
            mL={8}
            fS={16}
            color={Colors.secondaryTextColor}>
            {item.name}
          </CText>
          <CText
            dynamic
            fF={C.fontsName.FONT_BOLD}
            mL={8}
            fS={12}
            color={Colors.subTextColor}>
            {item.symbol}
          </CText>
        </DynamicView>
      </DynamicTouchView>
    );
  };

  useEffect(() => {
    fetchFromData(CHAIN_ETH);
  }, []);

  const renderCoin = item => {
    return (
      <DynamicTouchView
        sentry-label='fund-card-chain-item'
        dynamic
        dynamicWidth
        width={100}
        fD='row'
        mT={2}
        bR={15}
        pH={8}
        pV={8}
        bGC={Colors.whiteColor}
        jC={'flex-start'}
        onPress={() => {
          setFromTokenValue(item.displayName);
          setFromTokenItem(item);
          setDisplayQuote(false);
          setDisplayError(false);
          ref1.current.close();
        }}>
        <DynamicImage
          dynamic
          source={{ uri: item.logo_url }}
          width={25}
          height={25}
        />
        <DynamicView dynamic dynamicWidth width={90} aLIT={'flex-start'}>
          <CText
            dynamic
            fF={C.fontsName.FONT_BOLD}
            mL={8}
            fS={16}
            color={Colors.secondaryTextColor}>
            {item.name} - {item.actualBalance} (${item.totalValue})
          </CText>
          <CText
            dynamic
            fF={C.fontsName.FONT_BOLD}
            mL={8}
            fS={12}
            color={Colors.subTextColor}>
            {item.symbol}
          </CText>
        </DynamicView>
      </DynamicTouchView>
    );
  };

  return (
    <SafeAreaView dynamic>
      {
        <>
          <BottomTokenCardConfirm
            isModalVisible={payTokenBottomConfirm}
            modalParams={payTokenModalParams}
            onPayPress={async () => {
              setLowBalance(false);
              await sendTransaction(payTokenModalParams);
              setPayTokenBottomConfirm(false);
            }}
            onCancelPress={() => {
              setPayTokenBottomConfirm(false);
              setLowBalance(false);
              analytics().logEvent('cancel_trandfe_token', {
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
          <KeyboardAwareScrollView extraScrollHeight={100}>
            <DynamicView
              dynamic
              dynamicWidth
              dynamicHeight
              height={100}
              width={100}
              jC='flex-start'
              aLIT={'flex-start'}>
              <CText
                dynamic
                fF={C.fontsName.FONT_BOLD}
                fS={28}
                mL={25}
                mT={10}
                color={Colors.primaryTextColor}>
                {t('FUND_YOUR_CARD')}
              </CText>
              <DynamicView
                dynamic
                dynamicWidth
                dynamicHeight
                height={100}
                width={95}
                mT={10}
                pH={10}
                jC='flex-start'
                aLIT={'flex-start'}>
                <Dropdown
                  ref={ref2}
                  style={styles.dropdown}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  iconStyle={styles.iconStyle}
                  maxHeight={200}
                  value={chainSelected}
                  data={CARD_CHAINS}
                  valueField='backendName'
                  labelField='name'
                  placeholder={chainSelected?.name}
                  onChange={item => {
                    setChainSelected(item);
                  }}
                  renderItem={renderItem}
                  renderLeftIcon={() => (
                    <DynamicImage
                      dynamic
                      dynamicWidth
                      height={20}
                      width={30}
                      resizemode='contain'
                      source={icon}
                    />
                  )}
                />
                <Dropdown
                  ref={ref1}
                  style={styles.dropdown}
                  selectedTextStyle={styles.selectedTextStyle}
                  placeholderStyle={styles.placeholderStyle}
                  iconStyle={styles.iconStyle}
                  maxHeight={200}
                  value={fromTokenValue}
                  data={fromToken}
                  valueField='displayName'
                  labelField='displayName'
                  placeholder=''
                  onChange={item => {}}
                  renderItem={renderCoin}
                  renderLeftIcon={() => (
                    <DynamicImage
                      dynamic
                      dynamicWidth
                      height={20}
                      width={30}
                      source={{ uri: fromTokenItem.logoUrl }}
                    />
                  )}
                />
                <CText
                  dynamic
                  fF={C.fontsName.FONT_BOLD}
                  fS={18}
                  mL={10}
                  tA={'left'}
                  mT={40}
                  color={Colors.primaryTextColor}>
                  {t('HOW_MANY_DOLLAR')}
                </CText>
                <WebsiteInput
                  placeholder={'Enter value greater than or equivalent to $5'}
                  placeholderTextColor={'#949494'}
                  returnKeyType='done'
                  autoCapitalize='none'
                  onChangeText={text => {
                    setDollar(text);
                    setDisplayQuote(false);
                    setDisplayError(false);
                  }}
                  value={dollar}
                  autoCorrect={false}
                  keyboardType='decimal-pad'
                  style={{
                    width: '85%',
                    marginLeft: 15,
                    textAlign: 'left',
                    color: 'black',
                  }}
                />
                {/* <WebsiteInput
                                onChangeText={(text) => {
                                  setDollar(text);
                                  setDisplayQuote(false);
                                  setDisplayError(false);
                                }}
                                value={dollar}
                                placeholderTextColor={Colors.subTextColor}
                                placeholder="Enter value greater that or equivalent to $5"
                                keyboardType="decimal-pad"
                                style={{ width: '75%', height: 35, color: 'black' }}
                            /> */}
                <DynamicView
                  dynamic
                  dynamicHeight
                  dynamicWidth
                  height={0.08}
                  mL={10}
                  width={95}
                  bGC={'black'}
                />
                {displayError ? (
                  <DynamicView
                    dynamic
                    dynamicWidth
                    width={95}
                    jC='center'
                    mT={10}
                    aLIT={'flex-start'}
                    pH={10}
                    pV={10}>
                    <CText
                      dynamic
                      tA={'left'}
                      fF={C.fontsName.FONT_BOLD}
                      fS={15}
                      color={Colors.secondaryTextColor}>
                      {' '}
                      {errorString}{' '}
                    </CText>
                    {/* <CText dynamic tA={'left'} fF={C.fontsName.FONT_REGULAR} fS={15} color={Colors.primaryTextColor}>Estimated gas Fee:
                                        <CText dynamic tA={'left'} fF={C.fontsName.FONT_BOLD} fS={15} color={Colors.secondaryTextColor}> $4.35</CText></CText> */}
                  </DynamicView>
                ) : (
                  <></>
                )}
                <DynamicView
                  dynamic
                  mL={10}
                  dynamicWidth
                  dynamicHeight
                  height={15}
                  width={100}
                  jC='center'
                  aLIT={'center'}>
                  <ButtonWithOutImage
                    sentry-label='card-get-quote'
                    wT={100}
                    bR={10}
                    fE={C.fontsName.FONT_BOLD}
                    hE={45}
                    mT={25}
                    bG={Colors.appColor}
                    vC={Colors.appColor}
                    text={t('FUND CARD')}
                    onPress={() => {
                      getQuote();
                    }}
                    indicator={loading}
                  />
                </DynamicView>
              </DynamicView>
            </DynamicView>
          </KeyboardAwareScrollView>
        </>
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    margin: 16,
    height: 50,
    width: '98%',
    borderRadius: 10,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: Colors.borderColor,
  },
  imageStyle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  placeholderStyle: {
    color: Colors.secondaryTextColor,
    fontSize: 16,
  },
  selectedTextStyle: {
    color: Colors.secondaryTextColor,
    fontSize: 16,
    marginLeft: 8,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
});
