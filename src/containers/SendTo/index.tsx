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
import { ethers } from 'ethers';
import { get } from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import { BarCodeReadEvent } from 'react-native-camera';
import { v4 as uuidv4 } from 'uuid';
import Web3 from 'web3';
import AppImages from '../../../assets/images/appImages';
import BottomSendToConfirm from '../../components/BottomSendToConfirm';
import EmptyView from '../../components/EmptyView';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import { nativeTokenMapping } from '../../constants/data';
import * as C from '../../constants/index';
import { ChainBackendNames, ChainNames, CHAIN_ETH, CHAIN_EVMOS, EnsCoinTypes, QRScannerScreens, ChainNameToContactsChainNameMapping, EVM_CHAINS_FOR_ADDRESS_DIR } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import {
  cosmosSendTokens,
  estimateGasForCosmosTransaction,
  getCosmosSignerClient,
  sendNativeCoinOrTokenToAnyAddress,
  _estimateGasForNativeTransaction,
  evmosSendTxn, evmosSendSimulation
} from '../../core/NativeTransactionHandler';
import { Holding } from '../../core/Portfolio';
import { GasPriceDetail } from '../../core/types';
import {
  ActivityContext,
  convertAmountOfContractDecimal, getMaskedAddress, getSendAddressFieldPlaceholder, getWeb3Endpoint,
  HdWalletContext, isValidEns, PortfolioContext, SendToAddressValidator
} from '../../core/util';
import useEns from '../../hooks/useEns';
import { ActivityReducerAction, ActivityStatus, ActivityType, SendTransactionActivity } from '../../reducers/activity_reducer';
import { CyDFlatList, CyDImage, CyDSafeAreaView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../styles/tailwindStyles';
import { getGasPriceFor } from '../Browser/gasHelper';
import { genId } from '../utilities/activityUtilities';
import { isCosmosAddress } from '../utilities/cosmosSendUtility';
import { isEvmosAddress } from '../utilities/evmosSendUtility';
import { isJunoAddress } from '../utilities/junoSendUtility';
import { isOsmosisAddress } from '../utilities/osmosisSendUtility';
import { isStargazeAddress } from '../utilities/stargazeSendUtility';
import { isNobleAddress } from '../utilities/nobleSendUtility';
import { cosmosConfig } from '../../constants/cosmosConfig';
import { useIsFocused } from '@react-navigation/native';
import Fuse from 'fuse.js';
import AddressProfile from '../AddressBook/addressProfile';
import { ButtonType } from '../../constants/enum';
import useIsSignable from '../../hooks/useIsSignable';
import clsx from 'clsx';
import Button from '../../components/v2/button';
import { Contact, getContactBookWithMultipleAddress } from '../utilities/contactBookUtility';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import { useKeyboard } from '../../hooks/useKeyboard';

export default function SendTo (props: { navigation?: any, route?: any }) {
  const { t } = useTranslation();
  const { route } = props;
  const { valueForUsd, tokenData, sendAddress = '' }: { valueForUsd: string, tokenData: Holding, sendAddress: string} = route.params;
  const [Data, setData] = useState<string[]>([]);
  const [addressText, setAddressText] = useState<string>(sendAddress);
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
  const [isDropDown, setIsDropDown] = useState(false);
  const [contactBook, setContactBook] = useState({});
  const [addressDirectory, setAddressDirectory] = useState <Record<string, Record<string, string[]>>>({});
  const isFocused = useIsFocused();
  const [filteredContactBook, setFilteredContactBook] = useState({});
  const { showModal, hideModal } = useGlobalModalContext();
  const { isReadOnlyWallet } = hdWalletContext.state;
  const [isSignableTransaction] = useIsSignable();
  const chainDetails = tokenData?.chainDetails;
  const { keyboardHeight } = useKeyboard();

  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1
  };
  const fuseByNames = new Fuse(Object.keys(contactBook), searchOptions);
  let fuseByAddresses: Fuse<string>;
  if (Object.keys(addressDirectory).length) {
    if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(ChainNameToContactsChainNameMapping[chainDetails?.name])) {
      fuseByAddresses = new Fuse(Object.keys(addressDirectory.evmAddresses));
    } else {
      fuseByAddresses = new Fuse(Object.keys(addressDirectory[ChainNameToContactsChainNameMapping[chainDetails?.name]]));
    }
  } else {
    fuseByAddresses = new Fuse([]);
  }

  const handleSearch = (text: string) => {
    if (text !== '') {
      const filteredContactNames = fuseByNames.search(text).map(contact => contact.item).filter(contact => {
        let chains: string[];
        if (contact) {
          chains = Object.keys(contactBook[contact].addresses);
        } else {
          chains = [];
        }
        if (chainDetails?.chainName === CHAIN_EVMOS.chainName) {
          return (chains.includes(chainDetails?.chainName) || chains.includes(CHAIN_ETH.chainName));
        }
        return chains.includes(chainDetails?.chainName) || EVM_CHAINS_FOR_ADDRESS_DIR.includes(ChainNameToContactsChainNameMapping[tokenData.chainDetails?.name]);
      });
      const filteredContactNamesByAddresses: string[] = [];
      fuseByAddresses.search(text).map(address => address.item).map(address => {
        if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(ChainNameToContactsChainNameMapping[tokenData.chainDetails?.name])) {
          return addressDirectory.evmAddresses[address];
        }
        return addressDirectory[ChainNameToContactsChainNameMapping[tokenData.chainDetails.name]][address];
      }).forEach(nameList => {
        if (nameList) {
          for (const nameInList of nameList) {
            filteredContactNamesByAddresses.push(nameInList);
          }
        }
      });
      const filteredContactsByNamesAndAddresses = [...new Set([...filteredContactNamesByAddresses, ...filteredContactNames])];
      const filteredContacts = Object.fromEntries(Object.entries(contactBook).filter(([key, value]) => filteredContactsByNamesAndAddresses.includes(key)));
      if (filteredContactsByNamesAndAddresses?.length && !isDropDown) {
        setIsDropDown(true);
      }
      setFilteredContactBook(filteredContacts);
    } else {
      setFilteredContactBook(contactBook);
    }
  };

  const activityRef = useRef<SendTransactionActivity | null>(null);
  const { cosmos, osmosis, juno, stargaze, noble } = hdWalletContext.state.wallet;
  const senderAddress: Record<string, string> = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address
  };

  const rpc: Record<string, string | undefined> = {
    cosmos: globalStateContext.globalState.rpcEndpoints?.COSMOS.primary,
    osmosis: globalStateContext.globalState.rpcEndpoints?.OSMOSIS.primary,
    juno: globalStateContext.globalState.rpcEndpoints?.JUNO.primary,
    stargaze: globalStateContext.globalState.rpcEndpoints?.STARGAZE.primary,
    noble: globalStateContext.globalState.rpcEndpoints?.NOBLE.primary
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
        chainDetails?.chainName,
        chainDetails?.backendName,
        addressText
      )
    );
    if (addressText === '') {
      setIsDropDown(false);
    }
  }, [addressText]);

  useEffect(() => {
    if (isFocused) {
      void buildAddressDirectory();
    }
  }, [isFocused]);

  const buildAddressDirectory = async () => {
    const tempContactBook: Record<string, Contact> = await getContactBookWithMultipleAddress();
    const tempAddressDirectory: Record<string, Record<string, string[]>> = {
      evmAddresses: {},
      ethereum: {},
      cosmos: {},
      evmos: {},
      juno: {},
      osmosis: {},
      stargaze: {},
      noble: {},
      binance: {},
      polygon: {},
      avalanche: {},
      fantom: {},
      optimism: {},
      arbitrum: {},
      shardeum: {},
      shardeum_sphinx: {}
    };
    if (tempContactBook) {
      setContactBook(tempContactBook);
      for (const contact in tempContactBook) {
        for (const [chainName, listOfAddresses] of Object.entries(tempContactBook[contact].addresses)) {
          for (const address of listOfAddresses) {
            if (tempAddressDirectory[chainName][address]) {
              tempAddressDirectory[chainName][address] = [...tempAddressDirectory[chainName][address], tempContactBook[contact].name];
            } else {
              tempAddressDirectory[chainName][address] = [tempContactBook[contact].name];
            }
            if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(chainName)) {
              if (tempAddressDirectory.evmAddresses[address]) {
                tempAddressDirectory.evmAddresses[address] = [...tempAddressDirectory.evmAddresses[address], tempContactBook[contact].name];
              } else {
                tempAddressDirectory.evmAddresses[address] = [tempContactBook[contact].name];
              }
            }
          }
        }
      }
    }
    setAddressDirectory(tempAddressDirectory);
  };

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
        marginTop={10}
        width={200}
      />
    );
  };

  useEffect(() => {
    chainDetails?.chainName && AsyncStorage.getItem(`address_book_${chainDetails?.chainName}`)
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
      <CyDView>
        <CyDTouchView className='flex flex-row justify-between items-center py-[10px]' onPress={() => {
          addressRef.current = item;
          setAddressText(address[0]);
        }}>
          <CyDView className='flex flex-row flex-wrap justify-start items-center w-[100%]'>
            <CyDView className={`p-[5px] rounded-[30px] bg-${chainDetails?.chainName}`}>
              <CyDImage source={chainDetails?.logo_url} className='h-[20px] w-[20px]' resizeMode='contain'/>
            </CyDView>
            <CyDText className='ml-[10px] font-bold text-[11px]'>{chainDetails?.backendName}</CyDText>
            <CyDText className='ml-[5px] text-[11px]'>{formatted}</CyDText>
          </CyDView>
          <CyDView className='flex flex-row justify-between items-center'>
          </CyDView>
        </CyDTouchView>
        <CyDView style={{ width: '100%', height: 1, backgroundColor: '#C5C5C5' }} />
      </CyDView>
    );
  };

  function onModalHide () {
    hideModal();
    void intercomAnalyticsLog('save_as_a_contact_yes');
    setTimeout(() => {
      props.navigation.navigate(C.screenTitle.OPTIONS, { screen: C.screenTitle.CREATE_CONTACT, params: { additionalAddress: { chain: ChainNameToContactsChainNameMapping[tokenData.chainDetails?.name], toAddress: addressText } } });
    }, MODAL_HIDE_TIMEOUT_250);
  }

  const renderSuccessTransaction = (hash: string, willPrompt: boolean) => {
    return <><SuccessTransaction
      hash={hash}
      symbol={chainDetails?.symbol ?? ''}
      name={chainDetails?.name ?? ''}
      navigation={props.navigation}
      hideModal={hideModal}
    />
    { willPrompt
      ? <CyDText className='font-bold text-[14px] text-center'>
      {t('SAVE_AS_A_CONTACT_PROMPT')}
    </CyDText>
      : <></>}
    </>;
  };

  function onModalHideWithNo () {
    hideModal();
    void intercomAnalyticsLog('save_as_a_contact_no');
    setTimeout(() => {
      props.navigation.navigate(C.screenTitle.OPTIONS, { screen: C.screenTitle.ACTIVITIES, initial: false });
      props.navigation.popToTop();
    }, MODAL_HIDE_TIMEOUT_250);
  }

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

      let willPrompt: boolean;
      if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(ChainNameToContactsChainNameMapping[chainDetails?.name])) {
        willPrompt = !(addressText in addressDirectory.evmAddresses);
      } else {
        willPrompt = !(addressText in addressDirectory[ChainNameToContactsChainNameMapping[tokenData.chainDetails?.name]]);
      }

      if (willPrompt) {
        showModal('state', {
          type: 'custom',
          title: t('TRANSACTION_SUCCESS'),
          modalImage: AppImages.CYPHER_SUCCESS,
          modalButtonText: { success: t('YES'), failure: t('MAYBE_LATER').toUpperCase() },
          description: renderSuccessTransaction(message, willPrompt),
          onSuccess: onModalHide,
          onFailure: onModalHideWithNo
        });
      } else {
        showModal('state', {
          type: 'success',
          title: t('TRANSACTION_SUCCESS'),
          description: renderSuccessTransaction(message, willPrompt),
          onSuccess: onModalHideWithNo,
          onFailure: onModalHideWithNo
        });
      }
    }
  };

  const sendTransaction = (payTokenModalParamsLocal: any) => {
    setLoading(true);

    sendNativeCoinOrTokenToAnyAddress(
      hdWalletContext,
      portfolioState,
      tokenData.chainDetails,
      Number(valueForUsd).toFixed(tokenData.contractDecimals),
      tokenData.contractAddress,
      tokenData.contractDecimals,
      '',
      handleSendToTransactionResult,
      addressRef.current.trim(),
      payTokenModalParamsLocal.finalGasPrice,
      payTokenModalParamsLocal.gasLimit,
      globalContext,
      tokenData.symbol
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
    let gasPrice: GasPriceDetail = { chainId: chainDetails?.backendName ?? ChainBackendNames.ETH, gasPrice: 0, tokenPrice: 0 };
    const web3RPCEndpoint = new Web3(getWeb3Endpoint(hdWalletContext.state.selectedChain, globalContext));
    getGasPriceFor(tokenData?.chainDetails ?? CHAIN_ETH, web3RPCEndpoint)
      .then((gasFeeResponse) => {
        setLoading(false);
        gasPrice = gasFeeResponse;
        _estimateGasForNativeTransaction(hdWalletContext, tokenData.chainDetails, tokenData, Number(valueForUsd).toFixed(tokenData.contractDecimals), address, gasPrice, _prepareSendPayload, globalContext);
      })
      .catch((gasFeeError) => {
        setLoading(false);
        Sentry.captureException(gasFeeError);
        _estimateGasForNativeTransaction(hdWalletContext, tokenData.chainDetails, tokenData, Number(valueForUsd).toFixed(tokenData.contractDecimals), address, gasPrice, _prepareSendPayload, globalContext);
      });
  };

  const cosmosTransaction = async (address: string, chainName: string) => {
    setLoading(true);
    const amount = (ethers.utils.parseUnits(parseFloat(valueForUsd.length > 8 ? valueForUsd.substring(0, 8) : valueForUsd).toFixed(6), 6)).toString();
    const signer = await getCosmosSignerClient(tokenData.chainDetails, hdWalletContext);
    try {
      await estimateGasForCosmosTransaction(tokenData.chainDetails, signer, amount, senderAddress[chainName], address, tokenData, rpc[chainName] ?? '', payTokenModal, valueForUsd);
    } catch (err) {
      Sentry.captureException(err);
      showModal('state', { type: 'error', title: t('TRANSACTION_ERROR'), description: err?.toString(), onSuccess: hideModal, onFailure: hideModal });
    }
    setLoading(false);
  };

  const sendCosmosTransaction = async (address: string, valueForUsd: string, signingClient: any, fee: any, chainName: string) => {
    setLoading(true);
    const amount = ethers.utils.parseUnits(convertAmountOfContractDecimal(valueForUsd, 6), 6).toString();
    await cosmosSendTokens(address, signingClient, fee, senderAddress[chainName], amount, memo, handleSuccessfulTransaction, handleFailedTransaction, chainName, uuidv4(), tokenData.denom);
    setLoading(false);
  };

  const sendEvmosTransaction = async () => {
    try {
      const {
        ethereum,
        evmos
      } = hdWalletContext.state.wallet;
      await evmosSendTxn(evmos.address, addressRef.current, ethereum, valueForUsd, payTokenModalParams.gasLimit, handleSuccessfulTransaction, handleFailedTransaction, uuidv4());
    } catch (e) {
      Sentry.captureException(e);
      showModal('state', { type: 'error', title: t('TRANSACTION_ERROR'), description: e.toString(), onSuccess: hideModal, onFailure: hideModal });
    }
  };

  const handleSuccessfulTransaction = async (result: any, analyticsData: any) => {
    activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.POST, value: { ...activityRef.current, status: ActivityStatus.SUCCESS, transactionHash: result.transactionHash } });

    let willPrompt: boolean;
    if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(ChainNameToContactsChainNameMapping[chainDetails?.name])) {
      willPrompt = !(addressText in addressDirectory.evmAddresses);
    } else {
      willPrompt = !(addressText in addressDirectory[ChainNameToContactsChainNameMapping[tokenData.chainDetails?.name]]);
    }

    if (willPrompt) {
      showModal('state', {
        type: 'custom',
        title: t('TRANSACTION_SUCCESS'),
        modalImage: AppImages.CYPHER_SUCCESS,
        modalButtonText: { success: t('YES'), failure: t('MAYBE_LATER').toUpperCase() },
        description: renderSuccessTransaction(result.transactionHash, willPrompt),
        onSuccess: onModalHide,
        onFailure: onModalHideWithNo
      });
    } else {
      showModal('state', {
        type: 'success',
        title: t('TRANSACTION_SUCCESS'),
        description: renderSuccessTransaction(result.transactionHash, willPrompt),
        onSuccess: onModalHideWithNo,
        onFailure: onModalHideWithNo
      });
    }

    await analytics().logEvent('transaction_submit', analyticsData);
  };

  const handleFailedTransaction = async (err: any, uuid: string) => {
    activityRef.current && activityContext.dispatch({ type: ActivityReducerAction.POST, value: { ...activityRef.current, status: ActivityStatus.FAILED, reason: JSON.stringify(err) } });
    Sentry.captureException(err);
    showModal('state', { type: 'error', title: t('TRANSACTION_ERROR'), description: JSON.stringify(err), onSuccess: hideModal, onFailure: hideModal });
  };

  const evmosTransaction = async (address: string, toAddress: string, ethereumData: any) => {
    try {
      setLoading(true);
      const gasWanted = await evmosSendSimulation(address, toAddress, ethereumData, valueForUsd);

      tokenData?.chainDetails && payTokenModal({
        chain: tokenData.chainDetails.name,
        appImage: tokenData.chainDetails.logo_url,
        sentTokenAmount: valueForUsd,
        sentTokenSymbol: tokenData.symbol,
        sentValueUSD: (parseFloat(valueForUsd) * parseFloat(tokenData.price)).toFixed(6),
        to_address: ensRef.current ? `${ensRef.current} ${getMaskedAddress(addressRef.current.trim(), 3)}` : getMaskedAddress(addressRef.current.trim(), 6),
        fromNativeTokenSymbol: tokenData.chainDetails.symbol,
        gasFeeNative: (cosmosConfig.evmos.gasPrice * gasWanted).toFixed(4),
        gasFeeDollar: (cosmosConfig.evmos.gasPrice * gasWanted * parseFloat(tokenData.price)).toFixed(4),
        gasLimit: gasWanted
      });
    } catch (e) {
      Sentry.captureException(e);
      showModal('state', { type: 'error', title: t('TRANSACTION_ERROR'), description: e.toString(), onSuccess: hideModal, onFailure: hideModal });
    }
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
      chainName: chainDetails?.name ?? ChainNames.ETH,
      symbol: chainDetails?.symbol ?? ChainNames.ETH,
      logoUrl: chainDetails?.logo_url ?? '',
      datetime: new Date(),
      gasAmount: '0',
      tokenName: tokenData.name,
      tokenLogo: tokenData.logoUrl
    };

    const { ethereum, cosmos, osmosis, juno, stargaze, noble, evmos } = hdWalletContext.state.wallet;

    let error = false;
    addressRef.current = addressText;

    // checking for ens
    if (chainDetails?.chainName === ChainNames.ETH && Object.keys(EnsCoinTypes).includes(tokenData.chainDetails.backendName) && isValidEns(addressRef.current)) {
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
      if (chainDetails?.chainName === ChainNames.EVMOS) {
        if (isEvmosAddress(addressRef.current)) {
          await evmosTransaction(evmos.address, addressRef.current, ethereum);
          activityData.fromAddress = evmos.address;
        } else {
          getGasPrice(addressRef.current);
          activityData.fromAddress = ethereum.address;
        }
      } else if (chainDetails?.chainName === ChainNames.COSMOS && isCosmosAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.COSMOS);
        activityData.fromAddress = cosmos.address;
      } else if (chainDetails?.chainName === ChainNames.OSMOSIS && isOsmosisAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.OSMOSIS);
        activityData.fromAddress = osmosis.address;
      } else if (chainDetails?.chainName === ChainNames.JUNO && isJunoAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.JUNO);
        activityData.fromAddress = juno.address;
      } else if (chainDetails?.chainName === ChainNames.STARGAZE && isStargazeAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.STARGAZE);
        activityData.fromAddress = stargaze.address;
      } else if (chainDetails?.chainName === ChainNames.NOBLE && isNobleAddress(addressRef.current)) {
        await cosmosTransaction(addressRef.current, ChainNames.NOBLE);
        activityData.fromAddress = noble.address;
      } else if (chainDetails?.chainName === ChainNames.ETH) {
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
      chainDetails?.chainName && await AsyncStorage.setItem(`address_book_${tokenData.chainDetails.chainName}`, JSON.stringify(finalArray));
      activityRef.current = activityData;
    }
  };

  const onSuccess = async (readEvent: BarCodeReadEvent) => {
    let error = false;
    const content = readEvent.data;
    // To handle metamask address: ethereum:0xBd1cD305900424CD4fAd1736a2B4d118c7CA935D@9001
    const regEx = content.match(/(\b0x[a-fA-F0-9]{40}\b)/g);
    // Check if multiple regEx occurences are matching like in case of scanning a coinbase QR
    if (regEx?.length === 1 || regEx === null) {
      const address = regEx && regEx.length === 1 ? regEx[0] : content;
      const web3 = new Web3(getWeb3Endpoint(tokenData?.chainDetails ?? CHAIN_ETH, globalContext));
      switch (chainDetails?.chainName) {
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
        case ChainNames.NOBLE:
          if (!isNobleAddress(address)) {
            error = true;
            showModal('state', { type: 'error', title: t('INVALID_ADDRESS'), description: t('NOT_VALID_NOBLE_ADDRESS'), onSuccess: hideModal, onFailure: hideModal });
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
    } else {
      showModal('state', { type: 'error', title: t('UNRECOGNIZED_QR_CODE'), description: t('UNRECOGNIZED_QR_CODE_DESCRIPTION'), onSuccess: hideModal, onFailure: hideModal });
    }
  };

  const isMemoNeeded = () => {
    return chainDetails?.chainName === ChainNames.COSMOS || chainDetails?.chainName === ChainNames.OSMOSIS || chainDetails?.chainName === ChainNames.JUNO;
  };

  const onPayPress = async () => {
    setPayTokenBottomConfirm(false);
    if (chainDetails?.chainName === ChainNames.COSMOS && isCosmosAddress(addressRef.current)) {
      await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.COSMOS);
    } else if (chainDetails?.chainName === ChainNames.OSMOSIS && isOsmosisAddress(addressRef.current)) {
      await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.OSMOSIS);
    } else if (chainDetails?.chainName === ChainNames.JUNO && isJunoAddress(addressRef.current)) {
      await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.JUNO);
    } else if (chainDetails?.chainName === ChainNames.STARGAZE && isStargazeAddress(addressRef.current)) {
      await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.STARGAZE);
    } else if (chainDetails?.chainName === ChainNames.NOBLE && isNobleAddress(addressRef.current)) {
      await sendCosmosTransaction(payTokenModalParams.to_address, payTokenModalParams.sentTokenAmount, payTokenModalParams.signingClient, payTokenModalParams.fee, ChainNames.NOBLE);
    } else if (chainDetails?.chainName === ChainNames.EVMOS && isEvmosAddress(addressRef.current)) {
      await sendEvmosTransaction();
    } else {
      sendTransaction(payTokenModalParams);
    }
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
        <CyDSafeAreaView className='flex-1 bg-white'>
          <CyDView>
            <BottomSendToConfirm
                isModalVisible={payTokenBottomConfirm}
                modalParams={payTokenModalParams}
                onPayPress={() => {
                  setPayTokenBottomConfirm(false);
                  isSignableTransaction(ActivityType.SEND, isReadOnlyWallet ? submitSendTransaction : onPayPress);
                }}
                onCancelPress={() => {
                  setPayTokenBottomConfirm(false);
                  setLoading(false);
                }}
                lowBalance={lowBalance}
            />

            <CyDView className='h-full mx-[20px] pt-[10px]'>
                <CyDText className='text-[16px] font-semibold'>{t<string>('ADDRESS')}</CyDText>
                <CyDView className={clsx('flex flex-row justify-between items-center mt-[7px] border-[0.5px] border-greyButtonBackgroundColor rounded-[5px] pl-[15px] pr-[10px] py-[5px]', { 'border-errorTextRed': !isAddressValid, 'border-greyButtonBackgroundColor': addressText === '' })}>
                  <CyDTextInput
                    className={'max-w-[90%] pr-[0px]'}
                    value={addressText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(text) => { setAddressText(text); handleSearch(text); }}
                    returnKeyType='done'
                    blurOnSubmit={true}
                    multiline={true}
                    textAlignVertical={'top'}
                    placeholderTextColor={Colors.placeHolderColor}
                    placeholder={getSendAddressFieldPlaceholder(chainDetails?.chainName ?? '', chainDetails?.backendName ?? '')}
                  />
                    <CyDTouchView className='w-[5%]' onPress={() => { addressText === '' ? props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, { fromPage: QRScannerScreens.SEND, onSuccess }) : setAddressText(''); }}>
                      <CyDImage className={'h-[22px] w-[22px]'} source={addressText === '' ? AppImages.QR_CODE_SCANNER : AppImages.CLOSE_CIRCLE}/>
                    </CyDTouchView>
                </CyDView>
                {!isDropDown &&
                <CyDView className='flex-1 flex-col items-center'>
                  <CyDView className={'flex flex-row w-[100%] justify-end mt-[15px]'}>
                    <CyDTouchView className={'flex flex-row justify-end items-start'} onPress={() => { void (async () => await fetchCopiedText())(); }}>
                      <CyDImage source={AppImages.COPY} className={'w-[14px] h-[16px] mr-[7px]'} />
                      <CyDText className={'text-[#434343] text-[12px] font-bold'}>{t<string>('PASTE_CLIPBOARD')}</CyDText>
                    </CyDTouchView>
                  </CyDView>
                  {isMemoNeeded() && <CyDView className='w-full mt-[25px]'>
                    <CyDText className='text-[16px] font-semibold'>{t<string>('MEMO')}</CyDText>
                    <CyDView className={'flex flex-row justify-between items-center mt-[7px] bg-secondaryBackgroundColor border-[0.5px] border-black rounded-[9px] pl-[15px] pr-[10px] py-[1px]'}>
                      <CyDTextInput
                        className={'self-center py-[12px] w-[90%] pr-[10px]'}
                        value={memo}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={(text) => { setMemo(text); }}
                        placeholderTextColor={Colors.placeholderTextColor}
                        placeholder={t('MEMO')}
                        multiline={true}
                      />
                      {memo !== '' && <CyDTouchView onPress={() => { setMemo(''); }}>
                        <CyDImage className={'h-[22px] w-[22px]'} source={ AppImages.CLOSE_CIRCLE} resizeMode='contain'/>
                      </CyDTouchView>}
                    </CyDView>
                    </CyDView>}
                  <CyDText className='text-[16px] w-full text-left mt-[20px] font-semibold'>{t<string>('RECENT_ADDRESS')}:</CyDText>
                  <CyDFlatList
                    data={Data}
                    renderItem={renderItem}
                    ListEmptyComponent={emptyView}
                    style={{ marginBottom: 60, flexGrow: 0 }}
                    showsVerticalScrollIndicator={false}
                  />
                </CyDView>}
                {isDropDown &&
                  <CyDView className='items-center mt-[-10px] mb-[150px]'>
                    <AddressProfile content={filteredContactBook} chainChoosen={chainDetails?.backendName} setAddressText={setAddressText} setIsDropDown={setIsDropDown}/>
                  </CyDView>
                }
                <CyDView className='w-full absolute mb-[4px] items-center' style={keyboardHeight ? { top: keyboardHeight - 60 } : { bottom: 8 }}>
                    <Button title={t('SEND')} onPress={() => {
                      void (async () => await submitSendTransaction())();
                    }} type={ButtonType.PRIMARY} loading={loading} style=' h-[60px] w-[90%]'/>
                </CyDView>
            </CyDView>
            </CyDView>
        </CyDSafeAreaView>
  );
}