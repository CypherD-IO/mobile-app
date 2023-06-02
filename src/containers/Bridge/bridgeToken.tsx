/**
 * @format
 * @flow
 */
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import * as C from '../../constants/index';
import { DynamicScrollView } from '../../styles/viewStyle';
import { Dropdown } from 'react-native-element-dropdown';
import AppImages from '../../../assets/images/appImages';
import { ALL_CHAINS, Chain } from '../../constants/server';
import { AppButton } from '../Auth/Share';
import axios, { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { getWeb3Endpoint, HdWalletContext, PortfolioContext } from '../../core/util';
import EmptyView from '../../components/EmptyView';
import { estimateGasForNativeTransaction, sendNativeCoinOrToken } from '../../core/NativeTransactionHandler';
import { getGasPriceFor } from '../Browser/gasHelper';
import analytics from '@react-native-firebase/analytics';
import BottomBridgeTokenConfirm from '../../components/BottomBridgeTokenConfirm';
import { getPortfolioModel, getCurrentChainHoldings, WalletHoldings } from '../../core/Portfolio';
import * as Sentry from '@sentry/react-native';
import { GasPriceDetail } from '../../core/types';
import { GlobalContext } from '../../core/globalContext';
import { getPortfolioData } from '../../core/asyncStorage';
import Web3 from 'web3';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { hostWorker } from '../../global';

const {
  SafeAreaView,
  DynamicView,
  CText,
  DynamicTouchView,
  DynamicImage,
  Input
} = require('../../styles');

export default function BridgeTokebScreen (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const PORTFOLIO_HOST: string = hostWorker.getHost('PORTFOLIO_HOST');
  const { route } = props;
  const { params } = route;
  const [value, setValue] = useState('Ethereum');
  const [chainSelected, setChainSelected] = useState<Chain>(ALL_CHAINS[0]);
  const [fromToken, setFromToken] = useState([]);
  const [fromTokenItem, setFromTokenItem] = useState({});
  const [fromTokenValue, setFromTokenValue] = useState('');
  const [fromAddedValue, setFromAddedValue] = useState('');
  const [toCoins, setToCoins] = useState({});
  const [toToken, setToToken] = useState([]);
  const [toValue, setToValue] = useState('');
  const [toValueItem, setToValueItem] = useState(null);
  const [toTokenValue, setToTokenValue] = useState('');
  const [toTokenItem, setToTokenItem] = useState({});
  const [receivedValue, setReceivedValue] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [valueChange, setValueChange] = useState<Boolean>(false);
  const [portfolioRedirection, setPortfolioRedirection] = useState<boolean>(false);
  const [payTokenBottomConfirm, setPayTokenBottomConfirm] = useState<boolean>(false);
  const [payTokenModalParams, setPayTokenModalParams] = useState<boolean>(false);
  const [lowBalance, setLowBalance] = useState<boolean>(false);
  const [quoteUUID, setQuoteUUID] = useState('');
  const [appButtonState, setAppButtonState] = useState({ inProgress: false });

  const [error, setError] = useState({ displayError: false, errorMsg: '' });
  const [tokenAvailable, setTokenAvailable] = useState(false);
  const [feeAmount, setFeeAmount] = useState(0);

  const [estimatedGasFeeNative, setEstimatedGasFeeNative] = useState('');
  const [estimatedGasFeeUSD, setEstimatedGasFeeUSD] = useState('');
  const [loading, setLoading] = useState<Boolean>(false);

  const [threshold, setThreshold] = useState('0.01');
  const hdWallet = useContext<any>(HdWalletContext);
  const portfolioState = useContext<any>(PortfolioContext);
  const globalContext = useContext<any>(GlobalContext);

  const ref = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);

  const ethereum = hdWallet.state.wallet.ethereum;

  const { showModal, hideModal } = useGlobalModalContext();

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎🍎
  useEffect(() => {
    fetchToData();
    let _target_from_chain_name = ALL_CHAINS[0];
    if (params?.from != undefined) {
      _target_from_chain_name = params?.from;
      setValue(params?.from.name);
      setChainSelected(params?.from);
    }
    fetchFromData(_target_from_chain_name);
  }, []);

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
    getThreshold(undefined, undefined);
  }, [value, toValue, fromTokenValue, toTokenValue, fromTokenItem]);

  // NOTE: API CALL 🍎🍎🍎🍎🍎🍎
  async function fetchToData () {
    setLoading(true);
    const get_portfolio_url = `${PORTFOLIO_HOST}/v1/bridge/coinlist`;
    await axios
      .get(get_portfolio_url, {
        timeout: 1500
      })
      .then(res => {
        setToCoins(res.data);
        let _target_to_chain_name = 'POLYGON';
        if (params?.to != undefined) {
          _target_to_chain_name = params?.to.backendName;
          setToValue(params?.to.name);
          setToValueItem(params?.to);
        }
        Object.entries(res.data).filter(([k, v]) => {
          if (k === _target_to_chain_name) {
            setToToken(v.tokens);
            setToTokenValue(v.tokens[0]?.name);
            setValueChange(!valueChange);
          }
        });
        if (!appButtonState.inProgress) {
          setLoading(false);
        }'';
      })
      .catch(error => {
        // TODO (user feedback): Give feedback to user.
        setToTokenValue('❌  No Network');
        Sentry.captureException(error);
      });
  }
  '';

  async function getThreshold (hashToValueItem, hashToToken) {
    setLoading(true);
    //     let toValueItemFinal = hashToValueItem || toValueItem
    //     let toTokenFinal = hashToToken || toToken

    //     const get_portfolio_url = `${PORTFOLIO_HOST}/v1/bridge/transactionThreshold`;
    //     let walletaddress = ethereum.address;
    if (fromTokenValue !== '') {
      setTokenAvailable(true);
    }

    //     const [tokenDetails] = toTokenFinal;

    //     if(!fromTokenItem.contractAddress || !tokenDetails || !fromTokenItem.name || !fromTokenItem.symbol){
    //         if (!appButtonState.inProgress) {
    //             setLoading(false);
    //         }
    //         return;
    //     }

    //     let param = {
    //         from_address: walletaddress,
    //         to_address: walletaddress,
    //         from_chain: chainSelected.backendName,
    //         to_chain: toValueItemFinal.backendName,
    //         from_amount: 0.02, //in backend ,from amount is required in our schema .We don't make use of this however in our logic
    //         from_token_address: fromTokenItem.contractAddress,
    //         to_token_address: tokenDetails.contract_address,
    //         from_token_decimal: fromTokenItem.contractDecimals,
    //         to_token_decimal: tokenDetails.contract_decimals,
    //         from_token_label: fromTokenItem.name,
    //         to_token_label: tokenDetails.name,
    //         from_token_symbol: fromTokenItem.symbol,
    //         to_token_symbol: tokenDetails.symbol,
    //     }

    //     axios
    //         .post(get_portfolio_url, param)
    //         .then(res => {
    //             if (res.data.status == 'ERROR') {
    //                 setLoading(false)
    //                 setAlertMessage(`${res.data.message} Please try transfering another pair.`);
    //                 setAlertModal(true);
    //                 return
    //             }
    if (!appButtonState.inProgress) {
      setLoading(false);
    }
    //             setThreshold(res.data.threshold);
    setThreshold(String(10 / fromTokenItem.price));

    //         })
  }

  async function bridgeQuote (_toValueItem: any = undefined, _toToken: any = undefined) {
    // Overriding this with supplied values, to avoid using stale values while calling
    // bridgeQuote when we change the toChain due to async updates of useState hook

    if (parseFloat(fromAddedValue) <= parseFloat(threshold) || fromAddedValue === '') {
      setError({ displayError: true, errorMsg: 'Minimum amount is ' + parseFloat(threshold).toFixed(3) });
      return;
    }
    setAppButtonState({ inProgress: true });
    setLoading(true);
    setError({ displayError: false, errorMsg: '' });
    let toValueItem_final = toValueItem;
    let toToken_final = toToken;
    if (_toValueItem !== undefined) { toValueItem_final = _toValueItem; }
    if (_toToken !== undefined) { toToken_final = _toToken; }

    analytics().logEvent('bridge_quote_requested', {
      from: ethereum.address,
      chain: portfolioState.statePortfolio.selectedChain.name
    });

    const get_portfolio_url = `${PORTFOLIO_HOST}/v1/bridge/quote`;
    const walletaddress = ethereum.address;
    const param = {
      from_address: walletaddress,
      to_address: walletaddress,
      from_chain: chainSelected.backendName,
      to_chain: toValueItem_final.backendName,
      from_token_address: chainSelected.backendName === 'EVMOS' && fromTokenItem.name == 'Evmos' ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : fromTokenItem.contractAddress,
      to_token_address: toToken_final[0].contract_address,
      from_token_decimal: fromTokenItem.contractDecimals,
      to_token_decimal: toToken_final[0].contract_decimals,
      from_amount: fromAddedValue,
      from_token_label: fromTokenItem.name,
      to_token_label: toToken_final[0].name,
      from_token_symbol: fromTokenItem.symbol,
      to_token_symbol: toToken_final[0].symbol,
      trk_data: { device: Platform.OS }
    };

    await axios
      .post(get_portfolio_url, param)
      .then(res => {
        setAppButtonState({ inProgress: false });
        setLoading(false);
        if (res.data.status == 'ERROR') {
          showModal('state', { type: 'error', title: '', description: `${res.data.message} Please try transfering another pair.`, onSuccess: onModalHide, onFailure: hideModal });
          return;
        }
        setReceivedValue(res.data.transfer_amount);
        setUsdValue(res.data.usd_value);
        setQuoteUUID(res.data.quote_uuid);
        setEstimatedGasFeeNative(res.data.estimated_gas_fee_native_token);
        setEstimatedGasFeeUSD(res.data.estimated_gas_fee_usd);
        const _data = {
          totalReceivedToken: parseFloat(res.data.transfer_amount).toFixed(6),
          totalReceivedValueUSD: parseFloat(res.data.usd_value).toFixed(2),
          receivedTokenSymbol: toToken_final[0].symbol,
          to_chain: toValueItem_final.name,
          fee_amount: parseFloat(res.data.fee_amount).toFixed(3),
          fee_amount_in_usd: 2,
          to_appImage: toValueItem_final.logo_url,
          from_appImage: chainSelected.logo_url,
          from_chain: chainSelected.name,
          totalTokenSent: fromAddedValue,
          totalValueSentUSD: (parseFloat(fromAddedValue) * parseFloat(fromTokenItem.price)).toFixed(6),
          sentTokenSymbol: fromTokenItem.symbol,
          fromNativeTokenSymbol: chainSelected.symbol,
          gasFeeNative: parseFloat(res.data.estimated_gas_fee_native_token).toFixed(6),
          gasFeeDollar: parseFloat(res.data.estimated_gas_fee_usd).toFixed(6)
        };
        setFeeAmount(parseFloat(_data.fee_amount));
        payTokenModal(_data);
      })
      .catch(error => {
        setAppButtonState({ inProgress: false });
        setLoading(false);
        showModal('state', { type: 'error', title: '', description: 'Unable to get quote for your request. Please contact Cypher customer support.', onSuccess: onModalHide, onFailure: hideModal });
        Sentry.captureException(error);
      });
  }

  async function fetchFromData (chain) {
    setAppButtonState({ inProgress: true });
    setLoading(true);
    const portf = await getPortfolioData(ethereum, portfolioState);
    const portfolio: WalletHoldings = portf !== null ? portf.portfolio as unknown as WalletHoldings : null;
    const get_portfolio_url = `${PORTFOLIO_HOST}/v1/userholdings/tokens?address=${ethereum.address}&chains=${chain.backendName}&source=BRIDGE`;
    if (portfolio == null) {
      await axios
        .get(get_portfolio_url, {
          timeout: 100000
        })
        .then(res => {
          if (res.status === 200) {
            const portfolio = getPortfolioModel(res, ethereum, portfolioState);
            let chainHoldings = getCurrentChainHoldings(portfolio, chain);
            if (!chainHoldings) {
              // if user didnt have token on polygon chain , chainHoldings will be undefined.But if user didnt have tokens in other chain, chainHoldings will be like below mentioned object.So assigning this object to polygon case.
              chainHoldings = { chainTotalBalance: 0, chainUnVerifiedBalance: 0, holdings: [] };
            }
            setAppButtonState({ inProgress: false });
            setLoading(false);

            if (chainHoldings.holdings.length === 0) {
              setTokenAvailable(false);
            }

            setFromToken(chainHoldings.holdings);
            setFromTokenValue(chainHoldings.holdings[0].name);
            setFromTokenItem(chainHoldings.holdings[0]);
          }
        })
        .catch(error => {
          setAppButtonState({ inProgress: false });
          setLoading(false);
          Sentry.captureException(error);
        });
    } else {
      let chainHoldings = getCurrentChainHoldings(portfolio, chain);
      if (!chainHoldings) {
        // if user didnt have token on polygon chain , chainHoldings will be undefined.But if user didnt have tokens in other chain, chainHoldings will be like below-mentioned object.So assigning this object to polygon case.
        chainHoldings = { chainTotalBalance: 0, chainUnVerifiedBalance: 0, holdings: [] };
      }
      setAppButtonState({ inProgress: false });
      setLoading(false);

      if (chainHoldings.holdings.length === 0) {
        setTokenAvailable(false);
      }

      setFromToken(chainHoldings.holdings);
      setFromTokenValue(chainHoldings.holdings[0].name);
      setFromTokenItem(chainHoldings.holdings[0]);
    }
  }

  // NOTE: HELPER METHOD 🍎🍎🍎🍎🍎
  const CoinItem = ({ item, onChange }) => {
    return (
             <DynamicTouchView sentry-label='bridge-choose-coin' dynamic dynamicWidth width={100} fD='row' mT={2} mB={2} pH={8} pV={8}
                 bGC={value === item.name ? Colors.warningYellow : Colors.whiteColor} jC={'flex-start'} onPress={() => {
                   onChange(item);
                 }}>
                 <DynamicImage dynamic source={item.logo_url} width={25} height={25} />
                 <DynamicView dynamic dynamicWidth width={70} aLIT={'flex-start'}>
                     <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={16} color={Colors.secondaryTextColor}>{item.name}</CText>
                     <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={12} color={Colors.subTextColor}>{item.symbol}</CText>
                 </DynamicView>
             </DynamicTouchView>);
  };
  const renderItem = (item) => {
    return (
      value !== item.name && <CoinItem item={item} onChange={(item) => {
        setToValue(item.name);
        setToValueItem(item);
        // storing a local copy to pass to bridgeQuote as useState is async update and causing old values to be used
        const _toValueItem = item;
        Object.entries(toCoins).filter(([k, v]) => {
          if (k == item.backendName) {
            // storing a local copy to pass to bridgeQuote as useState is async update and causing old values to be used
            const _toToken = v.tokens;
            setToToken(v.tokens);
            setToTokenValue(v.tokens[0]?.name);
            setValueChange(!valueChange);
            // setTimeout(() => {
            //     bridgeQuote(_toValueItem, _toToken);
            // }, 500)
          }
        });
        ref.current.close();
      }} />
    );
  };
  const renderFromItem = (item) => {
    return (
             <CoinItem item={item} onChange={(item) => {
               setValue(item.name);
               setChainSelected(item);
               fetchFromData(item);
               ref2.current.close();
             }} />
    );
  };
  const renderFromToken = (item) => {
    return item.isVerified
      ? (
             <DynamicTouchView sentry-label='bridge-from-token' dynamic dynamicWidth width={100} fD='row' mT={2} mB={2} pH={8} pV={8}
                               bGC={fromTokenValue === item.name ? Colors.warningYellow : Colors.whiteColor} jC={'flex-start'}
                 onPress={() => {
                   setFromTokenValue(item.name);
                   setFromTokenItem(item);
                   ref1.current.close();
                 }}
             >
                 <DynamicImage dynamic source={{ uri: item.logoUrl }} width={25} height={25} />
                 <DynamicView dynamic dynamicWidth width={90} aLIT={'flex-start'}>
                     <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={16} color={Colors.secondaryTextColor}>{item.name} - {item.actualBalance}</CText>
                     <CText dynamic fF={C.fontsName.FONT_BOLD} mL={8} fS={12} color={Colors.subTextColor}>{item.symbol}</CText>
                 </DynamicView>
             </DynamicTouchView>
        )
      : <></>;
  };

  function transferSentQuote (address: string, quote_uuid: string, txn_hash: string) {
    axios.post(`${PORTFOLIO_HOST}/v1/bridge/transfer_sent`, {
      address,
      quote_uuid,
      trk_data: { device: Platform.OS },
      txn_hash
    }, { withCredentials: true, timeout: 100000 }).then(function (response) {
      if (response.status === 200) {
        showModal('state', { type: 'success', title: 'Success, Bridging in progress!', description: 'Your asset will be deposited at the destination shortly.', onSuccess: onModalHide, onFailure: hideModal });
        setPortfolioRedirection(true);
        setAppButtonState({ inProgress: false });
        setLoading(false);
      } else {
        showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${quote_uuid}`, onSuccess: onModalHide, onFailure: hideModal });
        setAppButtonState({ inProgress: false });
        setLoading(false);
        setPortfolioRedirection(false);
      }
    }).catch(function (error) {
      showModal('state', { type: 'error', title: 'Error processing your txn', description: `Please contact customer support with the quote_id: ${quote_uuid}`, onSuccess: onModalHide, onFailure: hideModal });
      Sentry.captureException(error);
    });
  }

  const handleBridgeTransactionResult = (message: string, quote_uuid: string, from_address: string, is_error: boolean) => {
    if (is_error) {
      showModal('state', { type: 'error', title: 'Transaction Failed', description: `${message}. Please contact customer support with the quote_id: ${quote_uuid}`, onSuccess: onModalHide, onFailure: hideModal });
    } else {
      transferSentQuote(from_address, quote_uuid, message);
    }
  };

  const sendTransaction = (payTokenModalParamsLocal: any) => {
    sendNativeCoinOrToken(
      hdWallet,
      portfolioState,
      chainSelected,
      parseFloat(fromAddedValue).toString(),
      fromTokenItem.contractAddress,
      fromTokenItem.contractDecimals,
      quoteUUID,
      handleBridgeTransactionResult,
      true,
      payTokenModalParamsLocal.finalGasPrice,
      payTokenModalParamsLocal.gasLimit,
      globalContext
    );
  };

  const payTokenModal = (payTokenModalParamsLocal: any) => {
    setPayTokenBottomConfirm(true);

    setAppButtonState({ inProgress: true });
    setLoading(true);

    setPayTokenModalParams(payTokenModalParamsLocal);
  };

  const submitBridgeTransaction = () => {
    if (chainSelected) {
      let gasPrice: GasPriceDetail = { chainId: chainSelected.backendName, gasPrice: 0, tokenPrice: 0 };
      const web3RPCEndpoint = new Web3(getWeb3Endpoint(hdWallet.state.selectedChain, globalContext));
      getGasPriceFor(chainSelected, web3RPCEndpoint)
        .then((gasFeeResponse) => {
          gasPrice = gasFeeResponse;
          estimateGasForNativeTransaction(hdWallet, chainSelected, fromTokenItem, parseFloat(fromAddedValue).toString(), true, gasPrice, sendTransaction, globalContext);
        })
        .catch((gasFeeError) => {
          Sentry.captureException(gasFeeError);
          estimateGasForNativeTransaction(hdWallet, chainSelected, fromTokenItem, parseFloat(fromAddedValue).toString(), true, gasPrice, sendTransaction, globalContext);
        });
    }
  };

  function onModalHide () {
    hideModal();
    setTimeout(() => {
      portfolioRedirection && props.navigation.navigate(C.screenTitle.PORTFOLIO_SCREEN);
    }, MODAL_HIDE_TIMEOUT);
  }

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (

         <SafeAreaView dynamic>
                 {(loading || appButtonState.inProgress) &&

                     <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start'
                                  bGC={Colors.whiteColor}>
                         <EmptyView
                             text={'Loading...'}
                             image={AppImages.LOADING_IMAGE}
                             buyVisible={false}
                             marginTop={-50}
                             isLottie={true}
                         />
                     </DynamicView>
                 }
             <BottomBridgeTokenConfirm
                 isModalVisible={payTokenBottomConfirm}
                 modalParams={payTokenModalParams}
                 onPayPress={() => {
                   setAppButtonState({ inProgress: true });
                   setLoading(true);
                   setPayTokenBottomConfirm(false);
                   submitBridgeTransaction();
                 }}
                 onCancelPress={() => {
                   setPayTokenBottomConfirm(false);
                   setAppButtonState({ inProgress: false });
                   setLoading(false);
                 }}
                 lowBalance={lowBalance}
             />
             <DynamicScrollView dynamic dynamicWidth dynamicHeight height={100} width={100} jC='flex-start' >
                 <DynamicView dynamic pV={10}>
                     <DynamicView dynamic dynamicWidth width={90} jC='center' mT={10} bR={10} bO={0.5} bC={Colors.sepratorColor} aLIT={'center'} pH={20} pT={5} pB={10}>
                         <CText dynamic fF={C.fontsName.FONT_BLACK} fS={18} color={Colors.primaryTextColor}>{t('FROM')}</CText>
                         <DynamicView dynamic dynamicHeight dynamicWidth width={110} height={0.5} bGC={Colors.sepratorColor} mT={5} />
                         <Dropdown
                             ref={ref2}
                             style={styles.dropdown}
                             selectedTextStyle={styles.selectedTextStyle}
                             placeholderStyle={styles.placeholderStyle}
                             iconStyle={styles.iconStyle}
                             maxHeight={200}
                             value={value}
                             data={ALL_CHAINS}
                             valueField="name"
                             labelField="name"
                             placeholder=""
                             onChange={item => {
                               setValue(item.value);
                               setFromToken([]);
                               setFromTokenItem({});
                               setFromTokenValue('');
                               setFromAddedValue('');
                             }}
                             renderItem={renderFromItem}
                             renderLeftIcon={() => (
                                 <DynamicImage dynamic source={chainSelected.logo_url} width={25} height={25} />
                             )}
                         />
                         <DynamicView dynamic dynamicHeight dynamicWidth width={110} height={0.5} bGC={Colors.sepratorColor} mT={5} />
                         <DynamicView dynamic dynamicWidth width={100} jC='center' aLIT={'center'}>
                             <CText dynamic tA={'left'} fF={C.fontsName.FONT_BOLD} fS={15} color={Colors.primaryTextColor} mT={10}>{t('TOKENS')}</CText>
                         </DynamicView>
                         <Dropdown
                             ref={ref1}
                             style={styles.dropdown}
                             selectedTextStyle={styles.selectedTextStyle}
                             placeholderStyle={styles.placeholderStyle}
                             iconStyle={styles.iconStyle}
                             maxHeight={70}
                             value={fromTokenValue}
                             data={fromToken}
                             valueField="name"
                             labelField="name"
                             placeholder=""
                             disable={appButtonState.inProgress}
                             onChange={item => {
                               setValue(item.value);
                               setFromAddedValue('');
                             }
                         }
                             renderItem={renderFromToken}
                             renderLeftIcon={() => (
                               tokenAvailable && <DynamicImage dynamic source={{ uri: fromTokenItem.logoUrl }} width={25} height={25} />
                             )}
                         />

                         <Input dynamicBorderColor borderColor={Colors.inputBorderColor} mT={5}
                             style={{ width: '98%', height: 50, textAlignVertical: 'center', paddingLeft: 15, color: 'black', borderRadius: 27 }}
                             placeholder={tokenAvailable ? 'Enter Amount >' + parseFloat(threshold).toFixed(3) + ' ' + fromTokenItem.symbol : 'NO TOKEN AVAILABLE'}
                             placeholderTextColor="gray"
                             selectTextOnFocus={true}
                             keyboardType="decimal-pad"
                             value={fromAddedValue}
                             onChangeText={(text) => {
                               setFromAddedValue(text);
                             }}
                         />
                     </DynamicView>

                     <DynamicView dynamic dynamicWidth width={90} jC='center' mT={20} bR={10} bO={0.5} bC={Colors.sepratorColor} aLIT={'center'} pH={20} pV={10}>
                         <CText dynamic fF={C.fontsName.FONT_BLACK} fS={18} color={Colors.primaryTextColor}>{t('TO')}</CText>
                         <DynamicView dynamic dynamicHeight dynamicWidth width={110} height={0.5} bGC={Colors.sepratorColor} mT={5} />
                         <Dropdown
                             ref={ref}
                             style={styles.dropdown}
                             selectedTextStyle={styles.selectedTextStyle}
                             placeholderStyle={styles.placeholderStyle}
                             iconStyle={styles.iconStyle}
                             maxHeight={200}
                             value={tokenAvailable ? toValue : ''}
                             data={ALL_CHAINS}
                             valueField="name"
                             labelField="name"
                             placeholder="CHAIN"
                             disable = {!tokenAvailable}
                             onChange={item => {
                               setValue(item.value);
                               setToToken([]);
                               setToTokenItem({});
                               setToTokenValue('');
                             }}
                             renderItem={renderItem}
                             renderLeftIcon={() => (
                               tokenAvailable && toValueItem && <DynamicImage dynamic source={toValueItem.logo_url} width={25} height={25} />
                             )}
                         />
                         <DynamicView dynamic dynamicHeight dynamicWidth width={110} height={0.5} bGC={Colors.sepratorColor} mT={5} />

                         <DynamicView dynamic dynamicWidth width={100} fD='row' jC='flex-start' aLIT={'flex-start'} iconStyle={styles.iconStyle}>
                         <DynamicImage dynamic dynamicWidth mT={10} mL={10} height={25} width={25} style={styles.iconStyle2} source={getChainLogo(toValue)} />
                             <CText dynamic tA={'left'} fF={C.fontsName.FONT_REGULAR} fS={16} mL={10} color={Colors.primaryTextColor} mT={10} mB={15}>{t(toTokenValue)}</CText>
                         </DynamicView>

                     </DynamicView>
                     {error.displayError
                       ? <DynamicView dynamic dynamicWidth width={95} jC='center' mT={10} aLIT={'flex-start'} pH={10} pV={10}>
                             <CText dynamic tA={'left'} fF={C.fontsName.FONT_BOLD} fS={15} color={Colors.secondaryTextColor}> {error.errorMsg} </CText>
                         </DynamicView>
                       : <></>}
                     <DynamicView dynamic dynamicWidth width={90} jC='center' aLIT={'center'} style={{ marginBottom: 10 }}>
                         <AppButton mT={20} bGC={!tokenAvailable && '#dddddd'} text={t('GET_QUOTE')} indicator={appButtonState.inProgress} disable={appButtonState.inProgress || !tokenAvailable} onPress={bridgeQuote} mB={undefined} />
                     </DynamicView>
                 </DynamicView>
             </DynamicScrollView>
         </SafeAreaView>
  );
}

function getChainLogo (chain) {
  switch (chain) {
    case 'Ethereum':
      return AppImages.ETHEREUM_NEW;
    case 'Polygon':
      return AppImages.POLYGON_NEW;
    case 'Binance Smart Chain':
      return AppImages.BIANCE;
    case 'Fantom':
      return AppImages.FANTOM;
    case 'Optimism':
      return AppImages.OPTIMISM;
    case 'Arbitrum':
      return AppImages.ARBITRUM;
    case 'Evmos':
      return AppImages.USDC_EVMOS;
    case 'Cosmos':
      return AppImages.COSMOS;
    default:
      return AppImages.AVALANCHE_NEW;
  }
}

const styles = StyleSheet.create({
  dropdown: {
    margin: 16,
    height: 50,
    width: '98%',
    borderRadius: 27,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: Colors.borderColor
  },
  imageStyle: {
    width: 24,
    height: 24,
    borderRadius: 12
  },
  placeholderStyle: {
    fontSize: 16,
    color: Colors.primaryTextColor
  },
  selectedTextStyle: {
    fontSize: 16,
    marginLeft: 8,
    color: Colors.primaryTextColor
  },
  iconStyle: {
    width: 20,
    height: 20
  },
  iconStyle2: {
    width: 25,
    height: 25,
    marginTop: 10
  }
});
