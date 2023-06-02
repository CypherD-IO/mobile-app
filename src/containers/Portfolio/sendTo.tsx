/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable react-native/no-raw-text */
/* eslint-disable react/prop-types */
/**
 * @format
 * @flow
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import analytics from '@react-native-firebase/analytics';
import * as Sentry from '@sentry/react-native';
import { evmosToEth } from '@tharsis/address-converter';
import { ethers } from 'ethers';
import { get } from 'lodash';
import LottieView from 'lottie-react-native';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import { BarCodeReadEvent } from 'react-native-camera';
import { FlatList } from 'react-native-gesture-handler';
import { v4 as uuidv4 } from 'uuid';
import Web3 from 'web3';
import AppImages from '../../../assets/images/appImages';
import BottomSendToConfirm from '../../components/BottomSendToConfirm';
import EmptyView from '../../components/EmptyView';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import { nativeTokenMapping } from '../../constants/data';
import * as C from '../../constants/index';
import { ChainBackendNames, ChainNames, CHAIN_ETH, EnsCoinTypes, QRScannerScreens } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { MODAL_HIDE_TIMEOUT } from '../../core/Http';
import { cosmosSendTokens, estimateGasForCosmosTransaction, getCosmosSignerClient, sendNativeCoinOrTokenToAnyAddress, _estimateGasForNativeTransaction } from '../../core/NativeTransactionHandler';
import { Holding } from '../../core/Portfolio';
import { GasPriceDetail } from '../../core/types';
import {
  ActivityContext,
  convertAmountOfContractDecimal, getMaskedAddress, getSendAddressFieldPlaceholder, getWeb3Endpoint,
  HdWalletContext, isValidEns, PortfolioContext, SendToAddressValidator
} from '../../core/util';
import useEns from '../../hooks/useEns';
import { ActivityReducerAction, ActivityStatus, ActivityType, SendTransactionActivity } from '../../reducers/activity_reducer';
import { DynamicImage } from '../../styles/imageStyle';
import { CyDImage, CyDText, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { WebsiteInput } from '../../styles/textInputStyle';
import { CText } from '../../styles/textStyle';
import { DynamicTouchView } from '../../styles/viewStyle';
import { getGasPriceFor } from '../Browser/gasHelper';
import { genId } from '../utilities/activityUtilities';
import { isCosmosAddress } from '../utilities/cosmosSendUtility';
import { isEvmosAddress } from '../utilities/evmosSendUtility';
import { isJunoAddress } from '../utilities/junoSendUtility';
import { isOsmosisAddress } from '../utilities/osmosisSendUtility';
import { isStargazeAddress } from '../utilities/stargazeSendUtility';

const {
  SafeAreaView,
  DynamicView
} = require('../../styles');

export default function SendTo (props: { navigation?: any, route?: any }) {
  const { t } = useTranslation();
  const { route } = props;
  const { valueForUsd, tokenData }: { valueForUsd: string, tokenData: Holding} = route.params;
  const [onFocus, setFocus] = useState<boolean>(false);
  const [Data, setData] = useState<string[]>([]);
  const [addressText, setAddressText] = useState<string>('');
  const addressRef = useRef('');
  const ensRef = useRef<string | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [memo, setMemo] = useState<string>(t('SEND_TOKENS_MEMO'));
  const hdWalletContext = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const globalContext = useContext<any>(GlobalContext);
  const globalStateContext = useContext(GlobalContext) as GlobalContextDef;
  const portfolioState = useContext<any>(PortfolioContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [payTokenBottomConfirm, setPayTokenBottomConfirm] = useState<boolean>(false);
  const [payTokenModalParams, setPayTokenModalParams] = useState<any>(false);
  const [lowBalance] = useState<boolean>(false);
  const [resolveAddress] = useEns();

  const { showModal, hideModal } = useGlobalModalContext();

  const activityRef = useRef<SendTransactionActivity | null>(null);
  const { cosmos, osmosis, juno, stargaze } = hdWalletContext.state.wallet;
  const senderAddress: Record<string, string> = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address
  };

  const rpc: Record<string, string | undefined> = {
    cosmos: globalStateContext.globalState.rpcEndpoints?.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints?.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints?.JUNO.primary,
    stargaze: globalStateContext.globalState.rpcEndpoints?.STARGAZE.primary
  };

  const handleBackButton = () => {
    props.navigation.goBack();
    return true;
  };

  const fetchCopiedText = async () => {
    const copiedContent = await Clipboard.getString();
    addressRef.current = copiedContent;
    setAddressText(copiedContent);
  };

  useEffect(() => {
    addressText !== '' && setIsAddressValid(
      SendToAddressValidator(
        tokenData?.chainDetails?.chainName,
        tokenData?.chainDetails?.backendName,
        addressText
      )
    );
  }, [addressText]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  const emptyView = () => {
    return (
      <EmptyView
        text={t('NO_SEND_HISTORY')}
        image={AppImages.SENDTO_EMPTY}
        buyVisible={false}
        marginTop={50}
        width={200}
      />
    );
  };

  useEffect(() => {
    tokenData?.chainDetails?.chainName && AsyncStorage.getItem(`address_book_${tokenData?.chainDetails?.chainName}`)
      .then(myArray => {
        myArray !== null && setData(JSON.parse(myArray));
      })
      .catch(Sentry.captureException);
  }, []);

  const renderItem = ({ item }: { item: string }) => {
    const address = item.split(':');
    const isEnsPresent = address.length === 2;
    const formatted = isEnsPresent ? `${address[0]} (${getMaskedAddress(address[1], 3)})` : getMaskedAddress(address[0], 8);
    return (
      <DynamicTouchView dynamic fD={'row'} pV={5} aLIT={'flex-start'} jC={'flex-start'} onPress={() => {
        addressRef.current = item;
        setAddressText(address[0]);
      }}>
          <CText dynamic dynamicWidth width={90} tA={'left'} numberOfLines={1} mL={20} fF={C.fontsName.FONT_SEMI_BOLD} fS={14} color={Colors.primaryTextColor}>{formatted}</CText>
      </DynamicTouchView>
    );
  };

  function onModalHide () {
    hideModal();
    setTimeout(() => {
      props.navigation.navigate(C.screenTitle.OPTIONS, { screen: C.screenTitle.ACTIVITIES, initial: false });
      props.navigation.popToTop();
    }, MODAL_HIDE_TIMEOUT);
  }

  const renderSuccessTransaction = (hash: string) => {
    return <SuccessTransaction
      hash={hash}
      symbol={tokenData?.chainDetails?.symbol ?? ''}
      name={tokenData?.chainDetails?.name ?? ''}
      navigation={props.navigation}
      hideModal={hideModal}
    />;
  };

  const handleSendToTransactionResult = (message: string, quoteUuid: string, fromAddress: string, isError: boolean) => {
    setLoading(false);
    if (isError) {
      const backendName = get(tokenData, 'chainDetails.backendName');
      const symbol: string = get(tokenData, 'chainDetails.symbol');
      if (message === t('INSUFFICIENT_GAS_ERROR')) {
        message = `You need ${nativeTokenMapping[backendName as ChainBackendNames]} ( ${symbol} ) ${t('INSUFFICIENT_GAS')}`;
      }

      const description = quoteUuid !== '' ? `${message}. ${t('CUSTOMER_SUPPORT_QUOTE_UUID')} ${quoteUuid}` : message;
      activityRef.current &&
        activityContext.dispatch({
          type: ActivityReducerAction.POST,
          value: { ...activityRef.current, status: ActivityStatus.FAILED, reason: description }
        });

      showModal(
        'state',
        {
          type: 'error',
          title: t('TRANSACTION_FAILED'),
          description,
          onSuccess: hideModal,
          onFailure: hideModal
        }
      );
    } else {
      activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.POST, value: { ...activityRef.current, status: ActivityStatus.SUCCESS, transactionHash: message } });
      showModal('state', {
        type: 'success',
        title: t('TRANSACTION_SUCCESS'),
        description: renderSuccessTransaction(message),
        onSuccess: onModalHide,
        onFailure: hideModal
      });
    }
  };

  const sendTransaction = (payTokenModalParamsLocal: any) => {
    setLoading(true);

    sendNativeCoinOrTokenToAnyAddress(
      hdWalletContext,
      portfolioState,
      tokenData.chainDetails,
      valueForUsd.toString(),
      tokenData.contractAddress,
      tokenData.contractDecimals,
      '',
      handleSendToTransactionResult,
      addressRef.current.trim(),
      payTokenModalParamsLocal.finalGasPrice,
      payTokenModalParamsLocal.gasLimit,
      globalContext
    );
  };

  const _prepareSendPayload = (payTokenModalParamsLocal: any) => {
    tokenData?.chainDetails && payTokenModal({
      chain: tokenData.chainDetails.name,
      appImage: tokenData.chainDetails.logo_url,
      sentTokenAmount: valueForUsd,
      sentTokenSymbol: tokenData.symbol,
      sentValueUSD: (parseFloat(valueForUsd) * parseFloat(tokenData.price)).toFixed(6),
      to_address: ensRef.current ? `${ensRef.current} ${getMaskedAddress(addressRef.current.trim(), 3)}` : getMaskedAddress(addressRef.current.trim(), 6),
      fromNativeTokenSymbol: tokenData.chainDetails.symbol,
      gasFeeNative: payTokenModalParamsLocal.gasFeeETH,
      gasFeeDollar: payTokenModalParamsLocal.gasFeeDollar,
      finalGasPrice: payTokenModalParamsLocal.finalGasPrice,
      gasLimit: payTokenModalParamsLocal.gasLimit
    });
    activityRef.current = activityRef.current ? { ...activityRef.current, gasAmount: payTokenModalParamsLocal.gasFeeDollar } : null;
  };

  const payTokenModal = (payTokenModalParamsLocal: any) => {
    setPayTokenBottomConfirm(true);
    setPayTokenModalParams(payTokenModalParamsLocal);
  };

  const getGasPrice = (address: string) => {
    const web3 = new Web3(getWeb3Endpoint(tokenData?.chainDetails ?? CHAIN_ETH, globalContext));
    if (!web3.utils.isAddress(address)) {
      showModal('state', { type: 'error', title: t('NOT_VALID_ADDRESS'), description: t('CHECK_RECEIVER_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
      return;
    }
    setLoading(true);
    let gasPrice: GasPriceDetail = { chainId: tokenData?.chainDetails?.backendName ?? ChainBackendNames.ETH, gasPrice: 0, tokenPrice: 0 };
    const web3RPCEndpoint = new Web3(getWeb3Endpoint(hdWalletContext.state.selectedChain, globalContext));
    getGasPriceFor(tokenData?.chainDetails ?? CHAIN_ETH, web3RPCEndpoint)
      .then((gasFeeResponse) => {
        setLoading(false);
        gasPrice = gasFeeResponse;
        _estimateGasForNativeTransaction(hdWalletContext, tokenData.chainDetails, tokenData, valueForUsd.toString(), address, gasPrice, _prepareSendPayload, globalContext);
      })
      .catch((gasFeeError) => {
        setLoading(false);
        Sentry.captureException(gasFeeError);
        _estimateGasForNativeTransaction(hdWalletContext, tokenData.chainDetails, tokenData, valueForUsd.toString(), address, gasPrice, _prepareSendPayload, globalContext);
      });
  };

  const cosmosTransaction = async (address: string, chainName: string) => {
    setLoading(true);
    const amount = (ethers.utils.parseUnits(parseFloat(valueForUsd.length > 8 ? valueForUsd.substring(0, 8) : valueForUsd).toFixed(6), 6)).toString();
    const signer = await getCosmosSignerClient(tokenData.chainDetails, hdWalletContext);
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        await estimateGasForCosmosTransaction(tokenData.chainDetails, signer, amount, senderAddress[chainName], address, tokenData, rpc[chainName] ?? '', payTokenModal, valueForUsd);
      } catch (err) {
        if (retryCount < 3) {
          retryCount += 1;
          continue;
        }
        Sentry.captureException(err);
        showModal('state', { type: 'error', title: t('TRANSACTION_ERROR'), description: err?.toString(), onSuccess: hideModal, onFailure: hideModal });
      }
      break;
    }
    setLoading(false);
  };

  const sendCosmosTransaction = async (address: string, valueForUsd: string, signingClient: any, fee: any, chainName: string) => {
    setLoading(true);
    const amount = ethers.utils.parseUnits(convertAmountOfContractDecimal(valueForUsd, 6), 6).toString();
    await cosmosSendTokens(address, signingClient, fee, senderAddress[chainName], amount, memo, handleSuccessfulTransaction, handleFailedTransaction, chainName, uuidv4());
    setLoading(false);
  };

  const handleSuccessfulTransaction = async (result: any, analyticsData: any) => {
    activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.POST, value: { ...activityRef.current, status: ActivityStatus.SUCCESS, transactionHash: result.transactionHash } });
    showModal('state', {
      type: 'success',
      title: t('TRANSACTION_SUCCESS'),
      description: renderSuccessTransaction(result.transactionHash),
      onSuccess: onModalHide,
      onFailure: hideModal
    });
    await analytics().logEvent('transaction_submit', analyticsData);
  };

  const handleFailedTransaction = async (err: any, uuid: string) => {
    activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.POST, value: { ...activityRef.current, status: ActivityStatus.FAILED, reason: err.toString() } });
    Sentry.captureException(err);
    showModal('state', { type: 'error', title: t('TRANSACTION_ERROR'), description: err.toString(), onSuccess: hideModal, onFailure: hideModal });
  };

  const submitSendTransaction = async () => {
    const id = genId();
    const activityData: SendTransactionActivity = {
      id,
      status: ActivityStatus.PENDING,
      type: ActivityType.SEND,
      transactionHash: '',
      fromAddress: '',
      toAddress: '',
      amount: valueForUsd,
      chainName: tokenData?.chainDetails?.name ?? ChainNames.ETH,
      symbol: tokenData.symbol,
      logoUrl: tokenData?.chainDetails?.logo_url ?? '',
      datetime: new Date(),
      gasAmount: '0',
      tokenName: tokenData.name,
      tokenLogo: tokenData.logoUrl
    };

    const { ethereum, cosmos, osmosis, juno, stargaze } = hdWalletContext.state.wallet;

    let error = false;
    addressRef.current = addressText;

    // checking for ens
    if (tokenData?.chainDetails?.chainName === ChainNames.ETH && Object.keys(EnsCoinTypes).includes(tokenData.chainDetails.backendName) && isValidEns(addressRef.current)) {
      const ens = addressText;
      const addr = await resolveAddress(ens, tokenData.chainDetails.backendName);
      if (addr && Web3.utils.isAddress(addr)) {
        addressRef.current = addr;
        ensRef.current = ens;
      } else {
        error = true;
        showModal('state', { type: 'error', title: t('NOT_VALID_ENS'), description: `This ens domain is not mapped for ${tokenData.chainDetails.name.toLowerCase()} in ens.domains`, onSuccess: hideModal, onFailure: hideModal });
        return;
      }
    }

    try {
      activityData.toAddress = addressRef.current;
      if (tokenData?.chainDetails?.chainName === ChainNames.EVMOS) {
        if (isEvmosAddress(addressRef.current)) {
          const ethereumAddress = evmosToEth(addressRef.current);
          getGasPrice(ethereumAddress);
        } else {
          getGasPrice(addressRef.current);
        }
        activityData.fromAddress = ethereum.address;
      } else if (tokenData?.chainDetails?.chainName === ChainNames.COSMOS && isCosmosAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.COSMOS);
        activityData.fromAddress = cosmos.address;
      } else if (tokenData?.chainDetails?.chainName === ChainNames.OSMOSIS && isOsmosisAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.OSMOSIS);
        activityData.fromAddress = osmosis.address;
      } else if (tokenData?.chainDetails?.chainName === ChainNames.JUNO && isJunoAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.JUNO);
        activityData.fromAddress = juno.address;
      } else if (tokenData?.chainDetails?.chainName === ChainNames.STARGAZE && isStargazeAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.STARGAZE);
        activityData.fromAddress = stargaze.address;
      } else if (tokenData?.chainDetails?.chainName === ChainNames.ETH) {
        getGasPrice(addressRef.current);
        activityData.fromAddress = ethereum.address;
      } else {
        error = true;
        showModal('state', { type: 'error', title: t('NOT_VALID_ADDRESS'), description: t('CHECK_RECEIVER_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
      }
    } catch (e) {
      error = true;
      Sentry.captureException(e);
    }

    if (!error) {
      const finalArray = Data;
      const toAddrBook = ensRef.current ? `${ensRef.current}:${addressRef.current}` : addressRef.current;
      if (!finalArray.includes(toAddrBook)) {
        finalArray.push(toAddrBook);
      }
      tokenData?.chainDetails?.chainName && await AsyncStorage.setItem(`address_book_${tokenData.chainDetails.chainName}`, JSON.stringify(finalArray));
      activityRef.current = activityData;
    }
  };

  const onSuccess = async (readEvent: BarCodeReadEvent) => {
    let error = false;
    const content = readEvent.data;
    // To handle metamask address: ethereum:0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D@9001
    const regEx = content.match(/(\b0x[a-fA-F0-9]{40}\b)/g);
    const address = regEx && regEx.length > 0 ? regEx[0] : content;
    const web3 = new Web3(getWeb3Endpoint(tokenData?.chainDetails ?? CHAIN_ETH, globalContext));
    switch (tokenData?.chainDetails?.chainName) {
      case ChainNames.EVMOS:
        if (!isEvmosAddress(address) && !web3.utils.isAddress(address)) {
          error = true;
          showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_EVMOS_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
        }
        break;
      case ChainNames.COSMOS:
        if (!isCosmosAddress(address)) {
          error = true;
          showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_COSMOS_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
        }
        break;
      case ChainNames.OSMOSIS:
        if (!isOsmosisAddress(address)) {
          error = true;
          showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_OSMOSIS_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
        }
        break;
      case ChainNames.JUNO:
        if (!isJunoAddress(address)) {
          error = true;
          showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_JUNO_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
        }
        break;
      case ChainNames.STARGAZE:
        if (!isStargazeAddress(address)) {
          error = true;
          showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_STARGAZE_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
        }
        break;
      case ChainNames.ETH:
        if (!web3.utils.isAddress(address)) {
          error = true;
          showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
        }
        break;
    }
    if (!error) {
      addressRef.current = address;
      setAddressText(address);
    }
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <SafeAreaView dynamic>
            <BottomSendToConfirm
                isModalVisible={payTokenBottomConfirm}
                modalParams={payTokenModalParams}
                onPayPress={async () => {
                  setPayTokenBottomConfirm(false);
                  if (tokenData?.chainDetails?.chainName === ChainNames.COSMOS && isCosmosAddress(addressRef.current)) {
                    await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.COSMOS);
                  } else if (tokenData?.chainDetails?.chainName === ChainNames.OSMOSIS && isOsmosisAddress(addressRef.current)) {
                    await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.OSMOSIS);
                  } else if (tokenData?.chainDetails?.chainName === ChainNames.JUNO && isJunoAddress(addressRef.current)) {
                    await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.JUNO);
                  } else if (tokenData?.chainDetails?.chainName === ChainNames.STARGAZE && isStargazeAddress(addressRef.current)) {
                    await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.STARGAZE);
                  } else {
                    sendTransaction(payTokenModalParams);
                  }
                }}
                onCancelPress={() => {
                  setPayTokenBottomConfirm(false);
                }}
                lowBalance={lowBalance}
            />

            <DynamicView dynamic dynamicWidth dynamicHeight height={100} width={100} aLIT='center' jC={'flex-start'}>
                <CText dynamic dynamicWidth width={100} tA={'left'} mL={50} fF={C.fontsName.FONT_REGULAR} mT={10} fS={15} color={Colors.primaryTextColor}>{`${t<string>('ADDRESS')}:`}</CText>
                <DynamicView dynamic mT={10} dynamicWidth dynamicHeightFix height={45}
                    bO={1} width={85} bR={10} bC={'#C5C5C5'} bGC={'#F5F7FF'} style={{ borderColor: isAddressValid ? 'black' : '#e32636' }}
                    aLIT={'center'} jC={'flex-start'} fD={'row'}>
                    <WebsiteInput
                        placeholder={getSendAddressFieldPlaceholder(tokenData?.chainDetails?.chainName ?? '', tokenData?.chainDetails?.backendName ?? '')}
                        placeholderTextColor={'#949494'}
                        returnKeyType="done"
                        autoCapitalize="none"
                        onChangeText={(addressText: string) => {
                          setAddressText(addressText);
                        }}
                        onFocus={() => setFocus(true)}
                        value={addressText}
                        autoCorrect={false}
                        style={{ width: '79%', marginLeft: 15, textAlign: 'left', color: 'black' }}
                        multiline={true}
                        blurOnSubmit={true}
                    ></WebsiteInput>
                    <DynamicView dynamic dynamicWidth dynamicHeightFix fD={'row'} height={40} width={13} jC={onFocus ? 'space-between' : 'flex-end'}>
                        {onFocus && <DynamicTouchView sentry-label='send-to-cancel' onPress={() => {
                          addressRef.current = '';
                          setAddressText('');
                        }}>
                          <DynamicImage style={{ tintColor: 'gray' }} dynamic dynamicWidthFix height={12} width={12} resizemode='contain' source={AppImages.CANCEL} />
                        </DynamicTouchView>}
                        <DynamicTouchView onPress={() => { props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, { fromPage: QRScannerScreens.SEND, onSuccess }); }}>
                          <DynamicImage dynamic height={20} width={20} resizemode="contain" source={AppImages.QR_CODE} />
                        </DynamicTouchView>
                      </DynamicView>
                </DynamicView>
                <CyDView className={'flex flex-row justify-end w-[85%] mt-[15px]'}>
                  <CyDTouchView className={'flex flex-row justify-end items-start'} onPress={() => { void (async () => await fetchCopiedText())(); }}>
                    <CyDImage source={AppImages.COPY} className={'w-[14px] h-[16px] mr-[7px]'} />
                    <CyDText className={'text-[#434343] text-[12px] font-bold'}>{t<string>('PASTE_CLIPBOARD')}</CyDText>
                  </CyDTouchView>
                </CyDView>
                <>
                    {
                        (() => {
                          if (tokenData?.chainDetails?.chainName === ChainNames.COSMOS || tokenData?.chainDetails?.chainName === ChainNames.OSMOSIS || tokenData?.chainDetails?.chainName === ChainNames.JUNO) {
                            return (
                                <>
                                  <CText dynamic dynamicWidth width={100} tA={'left'} mL={50} fF={C.fontsName.FONT_REGULAR} mT={10} fS={15} color={Colors.primaryTextColor}>{t('MEMO')}:</CText>
                                  <DynamicView dynamic mT={10} dynamicWidth dynamicHeightFix height={40}
                                      bO={0.6} width={85} bR={10} bC={'#C5C5C5'} bGC={'#F5F7FF'}
                                      aLIT={'center'} jC={'flex-start'} fD={'row'}>
                                      <WebsiteInput
                                          returnKeyType="done"
                                          autoCapitalize="none"
                                          onChangeText={(memo: string) => {
                                            setMemo(memo);
                                          }}
                                          onFocus={() => setFocus(true)}
                                          value={memo}
                                          autoCorrect={false}
                                          style={{ width: '85%', marginLeft: 15, textAlign: 'left', color: 'black' }}
                                      ></WebsiteInput>
                                      <DynamicView dynamic dynamicWidth dynamicHeightFix fD={'row'} height={40} width={13} jC={onFocus ? 'space-between' : 'flex-end'}>
                                        {onFocus && <DynamicTouchView sentry-label='send-to-cancel' onPress={() => { setMemo(''); }}>
                                            <DynamicImage style={{ tintColor: 'gray' }} dynamic dynamicWidthFix height={12} width={12} resizemode='contain' source={AppImages.CANCEL} />
                                        </DynamicTouchView>}
                                      </DynamicView>
                                  </DynamicView>
                                </>);
                          }
                        })()
                    }
                </>
                <CText dynamic dynamicWidth width={100} tA={'left'} mL={50} fF={C.fontsName.FONT_REGULAR} mT={10} fS={15} color={Colors.primaryTextColor}>{t('SEND_HISTORY')}:</CText>
                <FlatList
                    data={Data}
                    renderItem={renderItem}
                    style={{ height: '51%', marginTop: 20, flexGrow: 0 }}
                    ListEmptyComponent={emptyView}
                    showsVerticalScrollIndicator={false}
                />
                <CyDTouchView sentry-label='import-wallet-button'
                  className={
                    'bg-[#FFDE59] flex flex-row items-center justify-center mt-[80px] h-[50px] w-[75%] rounded-[12px] mb-[50] mx-auto'
                  }
                  onPress={() => {
                    void (async () => await submitSendTransaction())();
                  }}
                >
                  {(loading) && <CyDView className={'flex items-center justify-between'}>
                    <LottieView
                      source={AppImages.LOADING_SPINNER}
                      autoPlay
                      loop
                      style={{ height: 40 }}
                    />
                  </CyDView>}
                  {(!loading) &&
                    <>
                      <CyDImage source={AppImages.SEND_SHORTCUT} className={'w-[40px] h-[40px] absolute left-[90px] top-[5px]'} />
                      <CyDText className={'text-[#434343] text-[16px] font-extrabold'}>{t<string>('SEND')}</CyDText>
                    </>
                  }
                </CyDTouchView>
            </DynamicView>
        </SafeAreaView>
  );
}
