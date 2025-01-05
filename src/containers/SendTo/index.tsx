/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable react-native/no-inline-styles */

/* @typescript-eslint/no-empty-function */

/**
 * @format
 * @flow
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useIsFocused } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import clsx from 'clsx';
import Fuse from 'fuse.js';
import { get, random } from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import { BarCodeReadEvent } from 'react-native-camera';
import Web3 from 'web3';
import AppImages from '../../../assets/images/appImages';
import EmptyView from '../../components/EmptyView';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import TokenSendConfirmationModal from '../../components/v2/tokenSendConfirmationModal';
import { AnalyticsType, ButtonType } from '../../constants/enum';
import * as C from '../../constants/index';
import {
  Chain,
  CHAIN_ETH,
  ChainNames,
  ChainNameToContactsChainNameMapping,
  EnsCoinTypes,
  EVM_CHAINS_FOR_ADDRESS_DIR,
  QRScannerScreens,
} from '../../constants/server';
import { Colors } from '../../constants/theme';
import { GlobalContext } from '../../core/globalContext';
import { MODAL_HIDE_TIMEOUT_250 } from '../../core/Http';
import { Holding } from '../../core/portfolio';
import {
  ActivityContext,
  formatAmount,
  getMaskedAddress,
  getSendAddressFieldPlaceholder,
  getWeb3Endpoint,
  HdWalletContext,
  isValidEns,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
  SendToAddressValidator,
} from '../../core/util';
import useEns from '../../hooks/useEns';
import useGasService from '../../hooks/useGasService';
import { useKeyboard } from '../../hooks/useKeyboard';
import useTransactionManager from '../../hooks/useTransactionManager';
import { TokenSendConfirmationParams } from '../../models/tokenSendConfirmationParams.interface';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  SendTransactionActivity,
} from '../../reducers/activity_reducer';
import {
  CyDFlatList,
  CyDImage,
  CydMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import AddressProfile from '../AddressBook/addressProfile';
import { genId } from '../utilities/activityUtilities';
import { intercomAnalyticsLog } from '../utilities/analyticsUtility';
import {
  Contact,
  getContactBookWithMultipleAddress,
} from '../utilities/contactBookUtility';
import { isCoreumAddress } from '../utilities/coreumUtilities';
import { isCosmosAddress } from '../utilities/cosmosSendUtility';
import { isInjectiveAddress } from '../utilities/injectiveUtilities';
import { isJunoAddress } from '../utilities/junoSendUtility';
import { isKujiraAddress } from '../utilities/kujiraUtilities';
import { isNobleAddress } from '../utilities/nobleSendUtility';
import { isOsmosisAddress } from '../utilities/osmosisSendUtility';
import { isSolanaAddress } from '../utilities/solanaUtilities';
import { isStargazeAddress } from '../utilities/stargazeSendUtility';
import { isAddress } from 'web3-validator';

export default function SendTo(props: { navigation?: any; route?: any }) {
  const { t } = useTranslation();
  const { route } = props;
  const {
    valueForUsd,
    tokenData,
    sendAddress = '',
  }: {
    valueForUsd: string;
    tokenData: Holding;
    sendAddress: string;
  } = route.params;
  const [Data, setData] = useState<string[]>([]);
  const [addressText, setAddressText] = useState<string>(sendAddress);
  const addressRef = useRef('');
  const ensRef = useRef<string | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [memo, setMemo] = useState<string>(t('SEND_TOKENS_MEMO'));
  const hdWalletContext = useContext<any>(HdWalletContext);
  const activityContext = useContext<any>(ActivityContext);
  const globalContext = useContext<any>(GlobalContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [resolveAddress] = useEns();
  const [isDropDown, setIsDropDown] = useState(false);
  const [contactBook, setContactBook] = useState({});
  const [addressDirectory, setAddressDirectory] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const isFocused = useIsFocused();
  const [filteredContactBook, setFilteredContactBook] = useState({});
  const { showModal, hideModal } = useGlobalModalContext();
  const chainDetails = tokenData?.chainDetails;
  const { keyboardHeight } = useKeyboard();
  const [tokenSendConfirmationParams, setTokenSendConfirmationParams] =
    useState<TokenSendConfirmationParams>({
      isModalVisible: false,
      tokenSendParams: {
        onConfirm: () => {},
        onCancel: () => {},
        chain: CHAIN_ETH,
        amountInCrypto: '',
        amountInFiat: '',
        symbol: '',
        toAddress: '',
        gasFeeInCrypto: '',
        gasFeeInFiat: '',
        nativeTokenSymbol: '',
      },
    });
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
  };
  const fuseByNames = new Fuse(Object.keys(contactBook), searchOptions);
  const { estimateGasForEvm } = useGasService();
  const { sendEvmToken, sendCosmosToken, sendSolanaTokens } =
    useTransactionManager();

  let fuseByAddresses: Fuse<string>;
  if (Object.keys(addressDirectory).length) {
    if (
      EVM_CHAINS_FOR_ADDRESS_DIR.includes(
        get(ChainNameToContactsChainNameMapping, [chainDetails.name], ''),
      )
    ) {
      fuseByAddresses = new Fuse(Object.keys(addressDirectory.evmAddresses));
    } else {
      fuseByAddresses = new Fuse(
        Object.keys(
          get(
            addressDirectory,
            get(ChainNameToContactsChainNameMapping, [chainDetails.name], ''),
            '',
          ),
        ),
      );
    }
  } else {
    fuseByAddresses = new Fuse([]);
  }

  const handleSearch = (text: string) => {
    if (text !== '') {
      const filteredContactNames = fuseByNames
        .search(text)
        .map(contact => contact.item)
        .filter(contact => {
          let chains: string[];
          if (contact) {
            chains = Object.keys(contactBook[contact].addresses);
          } else {
            chains = [];
          }
          return (
            chains.includes(chainDetails?.chainName) ||
            EVM_CHAINS_FOR_ADDRESS_DIR.includes(
              get(
                ChainNameToContactsChainNameMapping,
                [tokenData.chainDetails.name],
                '',
              ),
            )
          );
        });
      const filteredContactNamesByAddresses: string[] = [];
      fuseByAddresses
        .search(text)
        .map(address => address.item)
        .map(address => {
          if (
            EVM_CHAINS_FOR_ADDRESS_DIR.includes(
              get(ChainNameToContactsChainNameMapping, [chainDetails.name], ''),
            )
          ) {
            return addressDirectory.evmAddresses[address];
          }
          return addressDirectory[
            get(
              ChainNameToContactsChainNameMapping,
              [tokenData.chainDetails.name],
              '',
            )
          ][address];
        })
        .forEach(nameList => {
          if (nameList) {
            for (const nameInList of nameList) {
              filteredContactNamesByAddresses.push(nameInList);
            }
          }
        });
      const filteredContactsByNamesAndAddresses = [
        ...new Set([
          ...filteredContactNamesByAddresses,
          ...filteredContactNames,
        ]),
      ];
      const filteredContacts = Object.fromEntries(
        Object.entries(contactBook).filter(([key, value]) =>
          filteredContactsByNamesAndAddresses.includes(key),
        ),
      );
      if (filteredContactsByNamesAndAddresses?.length && !isDropDown) {
        setIsDropDown(true);
      }
      setFilteredContactBook(filteredContacts);
    } else {
      setFilteredContactBook(contactBook);
    }
  };

  const activityRef = useRef<SendTransactionActivity | null>(null);
  const {
    cosmos,
    osmosis,
    juno,
    stargaze,
    noble,
    coreum,
    injective,
    kujira,
    solana,
  } = hdWalletContext.state.wallet;
  const senderAddress: Record<string, string> = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    juno: juno.address,
    stargaze: stargaze.address,
    noble: noble.address,
    coreum: coreum.address,
    injective: injective.address,
    kujira: kujira.address,
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
    addressText !== '' &&
      setIsAddressValid(
        SendToAddressValidator(
          chainDetails?.chainName,
          chainDetails?.backendName,
          addressText,
        ),
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
    const tempContactBook: Record<string, Contact> =
      await getContactBookWithMultipleAddress();

    const tempAddressDirectory: Record<string, Record<string, string[]>> = {
      evmAddresses: {},
      ethereum: {},
      cosmos: {},
      juno: {},
      osmosis: {},
      stargaze: {},
      noble: {},
      coreum: {},
      injective: {},
      kujira: {},
      binance: {},
      polygon: {},
      avalanche: {},
      optimism: {},
      arbitrum: {},
      shardeum: {},
      shardeum_sphinx: {},
      zksync_era: {},
      base: {},
      polygon_zkevm: {},
      aurora: {},
      moonbeam: {},
      moonriver: {},
      solana: {},
    };
    if (tempContactBook) {
      setContactBook(tempContactBook);
      for (const contact in tempContactBook) {
        for (const [chainName, listOfAddresses] of Object.entries(
          tempContactBook[contact].addresses,
        )) {
          for (const address of listOfAddresses) {
            if (tempAddressDirectory[chainName][address]) {
              tempAddressDirectory[chainName][address] = [
                ...tempAddressDirectory[chainName][address],
                tempContactBook[contact].name,
              ];
            } else {
              tempAddressDirectory[chainName][address] = [
                tempContactBook[contact].name,
              ];
            }
            if (EVM_CHAINS_FOR_ADDRESS_DIR.includes(chainName)) {
              if (tempAddressDirectory.evmAddresses[address]) {
                tempAddressDirectory.evmAddresses[address] = [
                  ...tempAddressDirectory.evmAddresses[address],
                  tempContactBook[contact].name,
                ];
              } else {
                tempAddressDirectory.evmAddresses[address] = [
                  tempContactBook[contact].name,
                ];
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
      <CyDView className='h-full w-full justify-center items-center'>
        <EmptyView
          text={t('NO_SEND_HISTORY')}
          image={AppImages.SENDTO_EMPTY}
          buyVisible={false}
          marginTop={10}
          width={200}
        />
      </CyDView>
    );
  };

  useEffect(() => {
    chainDetails?.chainName &&
      AsyncStorage.getItem(`address_book_${chainDetails?.chainName}`)
        .then(myArray => {
          myArray !== null && setData(JSON.parse(myArray));
        })
        .catch(Sentry.captureException);
  }, []);

  const renderItem = ({ item }: { item: string }) => {
    const address = item.split(':');
    const isEnsPresent = address.length === 2;
    const formatted = isEnsPresent
      ? `${address[0]} (${getMaskedAddress(address[1], 3)})`
      : getMaskedAddress(address[0], 8);
    return (
      <CyDView>
        <CyDTouchView
          className='flex flex-row justify-between items-center py-[10px]'
          onPress={() => {
            addressRef.current = item;
            setAddressText(address[0]);
          }}>
          <CyDView className='flex flex-row flex-wrap justify-start items-center w-[100%]'>
            <CyDView
              className={`p-[5px] rounded-[30px] bg-${chainDetails?.chainName}`}>
              <CyDImage
                source={chainDetails?.logo_url}
                className='h-[20px] w-[20px]'
                resizeMode='contain'
              />
            </CyDView>
            <CyDText className='ml-[10px] font-bold text-[11px]'>
              {chainDetails?.backendName}
            </CyDText>
            <CyDText className='ml-[5px] text-[11px]'>{formatted}</CyDText>
          </CyDView>
          <CyDView className='flex flex-row justify-between items-center' />
        </CyDTouchView>
        <CyDView
          style={{ width: '100%', height: 1, backgroundColor: '#C5C5C5' }}
        />
      </CyDView>
    );
  };

  function onModalHide() {
    hideModal();
    void intercomAnalyticsLog('save_as_a_contact_yes');
    props.navigation.popToTop();
    props.navigation.navigate(C.screenTitle.OPTIONS);
    setTimeout(() => {
      props.navigation.navigate(C.screenTitle.OPTIONS, {
        screen: C.screenTitle.CREATE_CONTACT,
        params: {
          additionalAddress: {
            chain: get(ChainNameToContactsChainNameMapping, [
              tokenData.chainDetails.name,
            ]),
            toAddress: addressText,
          },
        },
      });
    }, MODAL_HIDE_TIMEOUT_250);
  }

  const renderSuccessTransaction = (hash: string, willPrompt: boolean) => {
    return (
      <>
        <SuccessTransaction
          hash={hash}
          symbol={chainDetails?.symbol ?? ''}
          name={chainDetails?.name ?? ''}
          navigation={props.navigation}
          hideModal={hideModal}
        />
        {willPrompt ? (
          <CyDText className='font-bold text-[14px] text-center'>
            {t('SAVE_AS_A_CONTACT_PROMPT')}
          </CyDText>
        ) : (
          <></>
        )}
      </>
    );
  };

  function onModalHideWithNo() {
    hideModal();
    void intercomAnalyticsLog('save_as_a_contact_no');
    props.navigation.popToTop();
    props.navigation.navigate(C.screenTitle.OPTIONS);
    setTimeout(() => {
      props.navigation.navigate(C.screenTitle.OPTIONS, {
        screen: C.screenTitle.ACTIVITIES,
        initial: false,
      });
    }, MODAL_HIDE_TIMEOUT_250);
  }

  const cosmosTransaction = async (chain: Chain) => {
    setLoading(true);

    const amountToSend = limitDecimalPlaces(
      valueForUsd,
      tokenData.contractDecimals,
    );

    const randomGas = random(0.001, 0.01, true);

    setTokenSendConfirmationParams({
      isModalVisible: true,
      tokenSendParams: {
        onConfirm: () => {
          void onConfirmConfirmationModal();
        },
        onCancel: () => {
          onCancelConfirmationModal();
        },
        chain,
        amountInCrypto: amountToSend,
        amountInFiat: String(
          formatAmount(Number(amountToSend) * Number(tokenData?.price ?? 0)),
        ),
        symbol: tokenData.symbol,
        toAddress: addressRef.current,
        gasFeeInCrypto: parseFloat(String(randomGas)).toFixed(4),
        gasFeeInFiat: parseFloat(
          String(formatAmount(randomGas * Number(tokenData?.price ?? 0))),
        ).toFixed(4),
        nativeTokenSymbol: String(tokenData.chainDetails?.symbol),
      },
    });
    setLoading(false);
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
      tokenLogo: tokenData.logoUrl,
    };

    let error = false;
    addressRef.current = addressText;

    // checking for ens
    if (
      chainDetails?.chainName === ChainNames.ETH &&
      Object.keys(EnsCoinTypes).includes(tokenData.chainDetails.backendName) &&
      isValidEns(addressRef.current)
    ) {
      const ens = addressText;
      const addr = await resolveAddress(
        ens,
        tokenData.chainDetails.backendName,
      );
      if (addr && isAddress(addr)) {
        addressRef.current = addr;
        ensRef.current = ens;
      } else {
        error = true;
        showModal('state', {
          type: 'error',
          title: t('NOT_VALID_ENS'),
          description: `This ens domain is not mapped for ${tokenData.chainDetails.name.toLowerCase()} in ens.domains`,
          onSuccess: hideModal,
          onFailure: hideModal,
        });
        return;
      }
    }

    try {
      activityData.toAddress = addressRef.current;
      if (
        chainDetails?.chainName === ChainNames.COSMOS &&
        isCosmosAddress(addressRef.current)
      ) {
        activityData.fromAddress = cosmos.address;
      } else if (
        chainDetails?.chainName === ChainNames.OSMOSIS &&
        isOsmosisAddress(addressRef.current)
      ) {
        activityData.fromAddress = osmosis.address;
      } else if (
        chainDetails?.chainName === ChainNames.JUNO &&
        isJunoAddress(addressRef.current)
      ) {
        activityData.fromAddress = juno.address;
      } else if (
        chainDetails?.chainName === ChainNames.STARGAZE &&
        isStargazeAddress(addressRef.current)
      ) {
        activityData.fromAddress = stargaze.address;
      } else if (
        chainDetails?.chainName === ChainNames.NOBLE &&
        isNobleAddress(addressRef.current)
      ) {
        activityData.fromAddress = noble.address;
      } else if (
        chainDetails?.chainName === ChainNames.COREUM &&
        isCoreumAddress(addressRef.current)
      ) {
        activityData.fromAddress = coreum.address;
      } else if (
        chainDetails?.chainName === ChainNames.INJECTIVE &&
        isInjectiveAddress(addressRef.current)
      ) {
        activityData.fromAddress = injective.address;
      } else if (
        chainDetails?.chainName === ChainNames.KUJIRA &&
        isKujiraAddress(addressRef.current)
      ) {
        activityData.fromAddress = kujira.address;
      } else if (
        chainDetails?.chainName === ChainNames.SOLANA &&
        isSolanaAddress(addressRef.current)
      ) {
        activityData.fromAddress = solana.address;
      } else {
        error = true;
        showModal('state', {
          type: 'error',
          title: t('NOT_VALID_ADDRESS'),
          description: t('CHECK_RECEIVER_ADDRESS'),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      await cosmosTransaction(chainDetails);
    } catch (e) {
      error = true;
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: chainDetails?.backendName ?? '',
        message: parseErrorMessage(e),
        screen: route.name,
      });
      Sentry.captureException(e);
    }

    if (!error) {
      const finalArray = Data;
      const toAddrBook = ensRef.current
        ? `${ensRef.current}:${addressRef.current}`
        : addressRef.current;
      if (!finalArray.includes(toAddrBook)) {
        finalArray.push(toAddrBook);
      }
      chainDetails?.chainName &&
        (await AsyncStorage.setItem(
          `address_book_${tokenData.chainDetails.chainName}`,
          JSON.stringify(finalArray),
        ));
      activityRef.current = activityData;
    }
  };

  const onCancelConfirmationModal = () => {
    setTokenSendConfirmationParams({
      ...tokenSendConfirmationParams,
      isModalVisible: false,
    });
  };

  const onConfirmConfirmationModal = async () => {
    let fromAddress: string;
    const amountToSend = limitDecimalPlaces(
      valueForUsd,
      tokenData.contractDecimals,
    );
    setTokenSendConfirmationParams({
      ...tokenSendConfirmationParams,
      isModalVisible: false,
    });
    setLoading(true);
    let response: {
      isError: boolean;
      hash: string;
      error?: string;
      gasFeeInCrypto?: string | undefined;
      contractData?: string;
    };
    if (chainDetails?.chainName === ChainNames.ETH) {
      const ethereum = hdWalletContext.state.wallet.ethereum;
      fromAddress = ethereum.address;
      response = await sendEvmToken({
        chain: tokenData.chainDetails.backendName,
        amountToSend,
        toAddress: addressRef.current,
        contractAddress: tokenData.contractAddress,
        contractDecimals: tokenData.contractDecimals,
        symbol: tokenData.symbol,
      });
    } else if (chainDetails?.chainName === ChainNames.SOLANA) {
      response = await sendSolanaTokens({
        amountToSend,
        toAddress: addressRef.current,
        contractAddress: tokenData.contractAddress,
        contractDecimals: tokenData.contractDecimals,
      });
    } else {
      fromAddress = get(senderAddress, chainDetails.chainName, '');
      response = await sendCosmosToken({
        fromChain: chainDetails,
        denom: tokenData.denom ?? '',
        amount: amountToSend,
        fromAddress,
        toAddress: addressRef.current,
        contractDecimals: tokenData.contractDecimals,
      });
    }
    if (!response?.isError) {
      let willPrompt: boolean;
      if (
        EVM_CHAINS_FOR_ADDRESS_DIR.includes(
          get(ChainNameToContactsChainNameMapping, chainDetails?.name),
        )
      ) {
        willPrompt = !(addressText in addressDirectory.evmAddresses);
      } else {
        willPrompt = !(
          addressText in
          addressDirectory[
            get(
              ChainNameToContactsChainNameMapping,
              tokenData.chainDetails?.name,
            )
          ]
        );
      }
      try {
        const finalArray = Data;
        const toAddrBook = ensRef.current
          ? `${ensRef.current}:${addressRef.current}`
          : addressRef.current;
        if (!finalArray.includes(toAddrBook)) {
          finalArray.push(toAddrBook);
        }
        const chainName = tokenData.chainDetails.chainName;
        if (chainName) {
          const key = `address_book_${chainName}`;
          const valueToStore = JSON.stringify(finalArray);
          await AsyncStorage.setItem(key, valueToStore);
        }
      } catch (error) {}

      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: {
          ...activityRef.current,
          gasAmount: response.gasFeeInCrypto
            ? parseFloat(
                String(
                  Number(response?.gasFeeInCrypto) * Number(tokenData.price),
                ),
              ).toFixed(4)
            : activityRef.current?.gasAmount,
          status: ActivityStatus.SUCCESS,
          transactionHash: response?.hash,
        },
      });
      setLoading(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.SUCCESS,
        txnHash: response?.hash,
        chain: chainDetails?.backendName ?? '',
        ...(response?.contractData
          ? { contractData: response?.contractData }
          : ''),
        screen: route.name,
      });
      if (willPrompt) {
        showModal('state', {
          type: 'custom',
          title: t('TRANSACTION_SUCCESS'),
          modalImage: AppImages.CYPHER_SUCCESS,
          modalButtonText: {
            success: t('YES'),
            failure: t('MAYBE_LATER').toUpperCase(),
          },
          description: renderSuccessTransaction(response?.hash, willPrompt),
          onSuccess: onModalHide,
          onFailure: onModalHideWithNo,
        });
      } else {
        showModal('state', {
          type: 'success',
          title: t('TRANSACTION_SUCCESS'),
          description: renderSuccessTransaction(response.hash, willPrompt),
          onSuccess: onModalHideWithNo,
          onFailure: onModalHideWithNo,
        });
      }
    } else {
      setLoading(false);
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: chainDetails?.backendName ?? '',
        message: parseErrorMessage(response.error),
        screen: route.name,
      });
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: {
          ...activityRef.current,
          status: ActivityStatus.FAILED,
          reason: response.error,
        },
      });
      showModal('state', {
        type: 'error',
        title: t('TRANSACTION_FAILED'),
        description: parseErrorMessage(response.error),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const showGasQuote = async () => {
    addressRef.current = addressText;
    if (chainDetails?.chainName === ChainNames.ETH) {
      if (
        chainDetails?.chainName === ChainNames.ETH &&
        Object.keys(EnsCoinTypes).includes(
          tokenData.chainDetails.backendName,
        ) &&
        isValidEns(addressRef.current)
      ) {
        const ens = addressText;
        const addr = await resolveAddress(
          ens,
          tokenData.chainDetails.backendName,
        );
        if (addr && isAddress(addr)) {
          addressRef.current = addr;
          ensRef.current = ens;
        } else {
          showModal('state', {
            type: 'error',
            title: t('NOT_VALID_ENS'),
            description: `This ens domain is not mapped for ${tokenData.chainDetails.name.toLowerCase()} in ens.domains`,
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          return;
        }
      }
      const amountToSend = limitDecimalPlaces(
        valueForUsd,
        tokenData.contractDecimals,
      );
      setLoading(true);
      const { ethereum } = hdWalletContext.state.wallet;
      const { backendName: chainBackendName } = tokenData.chainDetails;
      const web3 = new Web3(
        getWeb3Endpoint(tokenData?.chainDetails ?? CHAIN_ETH, globalContext),
      );
      const id = genId();
      const activityData: SendTransactionActivity = {
        id,
        status: ActivityStatus.PENDING,
        type: ActivityType.SEND,
        transactionHash: '',
        fromAddress: ethereum.address,
        toAddress: addressRef.current,
        amount: amountToSend,
        chainName: chainDetails?.name ?? ChainNames.ETH,
        symbol: chainDetails?.symbol ?? ChainNames.ETH,
        logoUrl: chainDetails?.logo_url ?? '',
        datetime: new Date(),
        gasAmount: '0',
        tokenName: tokenData.name,
        tokenLogo: tokenData.logoUrl,
      };
      activityRef.current = activityData;
      let gasDetails;

      gasDetails = await estimateGasForEvm({
        web3,
        chain: chainBackendName,
        fromAddress: ethereum?.address,
        toAddress: addressRef.current,
        amountToSend,
        contractAddress: tokenData.contractAddress,
        contractDecimals: tokenData.contractDecimals,
      });
      setLoading(false);

      activityRef.current.gasAmount = String(
        formatAmount(
          Number(gasDetails?.gasFeeInCrypto) * Number(tokenData?.price ?? 0),
        ),
      );
      setTokenSendConfirmationParams({
        isModalVisible: true,
        tokenSendParams: {
          onConfirm: () => {
            void onConfirmConfirmationModal();
          },
          onCancel: () => {
            onCancelConfirmationModal();
          },
          chain: tokenData.chainDetails,
          amountInCrypto: amountToSend,
          amountInFiat: String(
            formatAmount(Number(amountToSend) * Number(tokenData?.price ?? 0)),
          ),
          symbol: tokenData.symbol,
          toAddress: addressRef.current,
          gasFeeInCrypto: String(
            formatAmount(Number(gasDetails?.gasFeeInCrypto)),
          ),
          gasFeeInFiat: String(
            formatAmount(
              Number(gasDetails?.gasFeeInCrypto) *
                Number(tokenData?.price ?? 0),
            ),
          ),
          nativeTokenSymbol: String(tokenData.chainDetails?.symbol),
        },
      });
    } else {
      void submitSendTransaction();
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
      const web3 = new Web3(
        getWeb3Endpoint(tokenData?.chainDetails ?? CHAIN_ETH, globalContext),
      );
      switch (chainDetails?.chainName) {
        case ChainNames.COSMOS:
          if (!isCosmosAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_COSMOS_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.OSMOSIS:
          if (!isOsmosisAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_OSMOSIS_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.JUNO:
          if (!isJunoAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_JUNO_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.STARGAZE:
          if (!isStargazeAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_STARGAZE_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.NOBLE:
          if (!isNobleAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_NOBLE_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.COREUM:
          if (!isCoreumAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_NOBLE_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.INJECTIVE:
          if (!isInjectiveAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_NOBLE_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.KUJIRA:
          if (!isKujiraAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_NOBLE_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.ETH:
          if (!isAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
        case ChainNames.SOLANA:
          if (!isSolanaAddress(address)) {
            error = true;
            showModal('state', {
              type: 'error',
              title: t('INVALID_ADDRESS'),
              description: t('NOT_VALID_NOBLE_ADDRESS'),
              onSuccess: hideModal,
              onFailure: hideModal,
            });
          }
          break;
      }
      if (!error) {
        addressRef.current = address;
        setAddressText(address);
      }
    } else {
      showModal('state', {
        type: 'error',
        title: t('UNRECOGNIZED_QR_CODE'),
        description: t('UNRECOGNIZED_QR_CODE_DESCRIPTION'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    }
  };

  const isMemoNeeded = () => {
    return (
      chainDetails?.chainName === ChainNames.COSMOS ||
      chainDetails?.chainName === ChainNames.OSMOSIS ||
      chainDetails?.chainName === ChainNames.JUNO
    );
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className='flex-1 bg-n20'>
      <CyDView>
        <TokenSendConfirmationModal
          isModalVisible={tokenSendConfirmationParams.isModalVisible}
          tokenSendParams={tokenSendConfirmationParams.tokenSendParams}
        />
        <CyDView className='h-full mx-[20px] pt-[10px]'>
          <CyDText className='text-[16px] font-semibold'>
            {t<string>('ADDRESS')}
          </CyDText>
          <CyDView
            className={clsx(
              'flex flex-row justify-between items-center mt-[7px] border-[0.5px] border-n40 rounded-[5px] pl-[15px] pr-[10px] py-[5px]',
              {
                'border-red80': !isAddressValid,
                'border-n40': addressText === '',
              },
            )}>
            <CyDTextInput
              className={clsx('max-w-[90%] pr-[0px]', {
                'py-[12px]': !(chainDetails?.chainName === ChainNames.ETH),
              })}
              value={addressText}
              autoCapitalize='none'
              autoCorrect={false}
              onChangeText={text => {
                setAddressText(text);
                handleSearch(text);
              }}
              returnKeyType='done'
              blurOnSubmit={true}
              multiline={true}
              textAlignVertical={'top'}
              placeholderTextColor={Colors.placeHolderColor}
              placeholder={getSendAddressFieldPlaceholder(
                chainDetails?.chainName ?? '',
                chainDetails?.backendName ?? '',
              )}
            />
            <CyDTouchView
              className='w-[5%]'
              onPress={() => {
                addressText === ''
                  ? props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
                      fromPage: QRScannerScreens.SEND,
                      onSuccess,
                    })
                  : setAddressText('');
              }}>
              <CydMaterialDesignIcons
                name={addressText === '' ? 'qrcode-scan' : 'close'}
                size={24}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          {!isDropDown && (
            <CyDView className='flex-1 flex-col items-center'>
              <CyDView
                className={'flex flex-row w-[100%] justify-end mt-[15px]'}>
                <CyDTouchView
                  className={'flex flex-row justify-end items-start'}
                  onPress={() => {
                    void (async () => await fetchCopiedText())();
                  }}>
                  <CydMaterialDesignIcons
                    name={'content-copy'}
                    size={14}
                    className='text-base400 mr-[8px]'
                  />
                  <CyDText className={'text-[#434343] text-[12px] font-bold'}>
                    {t<string>('PASTE_CLIPBOARD')}
                  </CyDText>
                </CyDTouchView>
              </CyDView>
              {isMemoNeeded() && (
                <CyDView className='w-full mt-[25px]'>
                  <CyDText className='text-[16px] font-semibold'>
                    {t<string>('MEMO')}
                  </CyDText>
                  <CyDView
                    className={
                      'flex flex-row justify-between items-center mt-[7px] bg-n10 border-[0.5px] border-n40 rounded-[9px] pl-[15px] pr-[10px] py-[1px]'
                    }>
                    <CyDTextInput
                      className={'self-center py-[12px] w-[90%] pr-[10px]'}
                      value={memo}
                      autoCapitalize='none'
                      autoCorrect={false}
                      onChangeText={text => {
                        setMemo(text);
                      }}
                      placeholderTextColor={Colors.placeholderTextColor}
                      placeholder={t('MEMO')}
                      multiline={true}
                    />
                    {memo !== '' && (
                      <CyDTouchView
                        onPress={() => {
                          setMemo('');
                        }}>
                        <CydMaterialDesignIcons
                          name={'close'}
                          size={24}
                          className='text-base400'
                        />
                      </CyDTouchView>
                    )}
                  </CyDView>
                </CyDView>
              )}
              <CyDView className='h-full w-full pb-[80px]'>
                <CyDText className='text-[16px] w-full text-left mt-[20px] font-semibold'>
                  {t<string>('RECENT_ADDRESS')}:
                </CyDText>
                <CyDFlatList
                  data={Data}
                  renderItem={renderItem as any}
                  ListEmptyComponent={emptyView}
                  style={{ marginBottom: 60, flexGrow: 0 }}
                  showsVerticalScrollIndicator={false}
                />
              </CyDView>
            </CyDView>
          )}
          {isDropDown && (
            <CyDView className='items-center mt-[-10px] mb-[150px]'>
              <AddressProfile
                content={filteredContactBook}
                chainChoosen={chainDetails?.backendName}
                setAddressText={setAddressText}
                setIsDropDown={setIsDropDown}
              />
            </CyDView>
          )}
          <CyDView
            className='h-[80px] pb-[10px] w-full absolute justify-center items-center bg-n0'
            style={
              keyboardHeight ? { top: keyboardHeight - 60 } : { bottom: 8 }
            }>
            <Button
              title={t('SEND')}
              onPress={() => {
                void (async () => {
                  await showGasQuote();
                })();
              }}
              type={ButtonType.PRIMARY}
              disabled={!isAddressValid || addressText === ''}
              loading={loading}
              style=' h-[60px] w-[90%]'
            />
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
