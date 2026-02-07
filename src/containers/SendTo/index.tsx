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
import { get } from 'lodash';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import Button from '../../components/v2/button';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { SuccessTransaction } from '../../components/v2/StateModal';
import TokenSendConfirmationModal from '../../components/v2/tokenSendConfirmationModal';
import { AnalyticsType, ButtonType } from '../../constants/enum';
import * as C from '../../constants/index';
import {
  CHAIN_ETH,
  ChainNames,
  ChainNameToContactsChainNameMapping,
  COSMOS_CHAINS,
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
  getViemPublicClient,
  getWeb3Endpoint,
  hasSufficientBalanceAndGasFee,
  HdWalletContext,
  isEthereumAddress,
  isValidEns,
  limitDecimalPlaces,
  logAnalytics,
  parseErrorMessage,
  SendToAddressValidator,
  extractAddressFromURI,
} from '../../core/util';
import useEns from '../../hooks/useEns';
import useGasService from '../../hooks/useGasService';
import { useKeyboard } from '../../hooks/useKeyboard';
import useTransactionManager from '../../hooks/useTransactionManager';
import { useAppKitTransactionModal } from '../../hooks/useAppKitTransactionModal';
import { AppKitTransactionModal } from '../../components/v2/AppKitTransactionModal';
import { useWalletInfo } from '@reown/appkit-react-native';
import { getConnectionType } from '../../core/asyncStorage';
import { ConnectionTypes } from '../../constants/enum';
import { TokenSendConfirmationParams } from '../../models/tokenSendConfirmationParams.interface';
import {
  ActivityReducerAction,
  ActivityStatus,
  ActivityType,
  SendTransactionActivity,
} from '../../reducers/activity_reducer';
import {
  CyDFastImage,
  CyDFlatList,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindComponents';
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
import { isNobleAddress } from '../utilities/nobleSendUtility';
import { isOsmosisAddress } from '../utilities/osmosisSendUtility';
import { isSolanaAddress } from '../utilities/solanaUtilities';
import { isAddress } from 'web3-validator';
import { DecimalHelper } from '../../utils/decimalHelper';
import usePortfolio from '../../hooks/usePortfolio';
import { usePortfolioRefresh } from '../../hooks/usePortfolioRefresh';
import PageHeader from '../../components/PageHeader';
import type { QRScanEvent } from '../../types/qr';

export default function SendTo(props: { navigation?: any; route?: any }) {
  const { t } = useTranslation();
  const { route } = props;
  const {
    valueForUsd,
    tokenData,
    sendAddress = '',
    isMaxGasEstimation = false,
  }: {
    valueForUsd: string;
    tokenData: Holding;
    sendAddress: string;
    isMaxGasEstimation?: boolean;
  } = route.params;
  const [Data, setData] = useState<string[]>([]);
  const [addressText, setAddressText] = useState<string>(sendAddress);
  const addressRef = useRef('');
  const ensRef = useRef<string | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [addressError, setAddressError] = useState<string>('');
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
  const { estimateGasForEvm, estimateGasForSolana, estimateGasForCosmosRest } =
    useGasService();
  const { sendEvmToken, sendCosmosToken, sendSolanaTokens } =
    useTransactionManager();
  const { getNativeToken } = usePortfolio();
  const isFocused = useIsFocused();
  const [filteredContactBook, setFilteredContactBook] = useState({});
  const { showModal, hideModal } = useGlobalModalContext();
  const chainDetails = tokenData?.chainDetails;
  const { keyboardHeight } = useKeyboard();
  const { walletInfo } = useWalletInfo();
  
  // AppKit transaction modal state
  const pendingTxParamsRef = useRef<any>(null);
  const [connectionType, setConnectionTypeState] = useState<string | null>(null);
  const {
    isModalVisible: isTxModalVisible,
    modalState: txModalState,
    showModal: showTxModal,
    hideModal: hideTxModal,
    setTimedOut: setTxTimedOut,
    handleResend,
    handleCancel: handleTxCancel,
  } = useAppKitTransactionModal({
    walletName: walletInfo?.name ?? 'your wallet',
    onTimeout: () => {
    },
  });

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
  const autoTriggerAttempted = useRef(false);
  const searchOptions = {
    isCaseSensitive: false,
    includeScore: true,
    shouldSort: true,
    threshold: 0.1,
  };
  const fuseByNames = new Fuse(Object.keys(contactBook), searchOptions);
  const [nativeTokenDetails, setNativeTokenDetails] = useState<Holding>();
  const { refreshPortfolio } = usePortfolioRefresh();

  // Check connection type for AppKit modal
  useEffect(() => {
    const checkConnectionType = async () => {
      const connType = await getConnectionType();
      setConnectionTypeState(connType);
    };
    void checkConnectionType();
  }, []);

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
  const { cosmos, osmosis, noble, coreum, injective, solana, ethereum } =
    hdWalletContext.state.wallet;
  const senderAddress: Record<string, string> = {
    cosmos: cosmos.address,
    osmosis: osmosis.address,
    noble: noble.address,
    coreum: coreum.address,
    injective: injective.address,
    ethereum: ethereum.address,
    solana: solana.address,
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
    if (addressText !== '') {
      const isValid = SendToAddressValidator(
        chainDetails?.chainName,
        chainDetails?.backendName,
        addressText,
      );
      setIsAddressValid(isValid);

      // Set appropriate error message if address is invalid
      if (!isValid) {
        let errorMessage = '';
        switch (chainDetails?.chainName) {
          case ChainNames.COSMOS:
            errorMessage = t('NOT_VALID_COSMOS_ADDRESS');
            break;
          case ChainNames.OSMOSIS:
            errorMessage = t('NOT_VALID_OSMOSIS_ADDRESS');
            break;
          case ChainNames.NOBLE:
            errorMessage = t('NOT_VALID_NOBLE_ADDRESS');
            break;
          case ChainNames.COREUM:
            errorMessage = t('NOT_VALID_COREUM_ADDRESS');
            break;
          case ChainNames.INJECTIVE:
            errorMessage = t('NOT_VALID_INJECTIVE_ADDRESS');
            break;
          case ChainNames.ETH:
            errorMessage = t('NOT_VALID_ETH_ADDRESS');
            break;
          case ChainNames.SOLANA:
            errorMessage = t('NOT_VALID_SOLANA_ADDRESS');
            break;
          default:
            errorMessage = t('INVALID_ADDRESS');
            break;
        }
        setAddressError(errorMessage);
      } else {
        setAddressError('');
      }
    } else {
      setIsDropDown(false);
      setAddressError('');
    }
  }, [addressText, chainDetails?.chainName, t]);

  useEffect(() => {
    if (isFocused) {
      void buildAddressDirectory();
      void fetchNativeTokenDetails();
    }
  }, [isFocused]);

  // Auto-trigger send when address is pre-filled (from any source)
  useEffect(() => {
    if (
      sendAddress &&
      sendAddress !== '' &&
      isAddressValid &&
      isFocused &&
      !loading &&
      nativeTokenDetails && // Wait for native token details to load
      Object.keys(addressDirectory).length > 0 && // Wait for address directory to load
      !autoTriggerAttempted.current // Only trigger once
    ) {
      autoTriggerAttempted.current = true; // Mark as attempted
      void submitSendTransaction();
    }
  }, [
    sendAddress,
    isAddressValid,
    isFocused,
    loading,
    nativeTokenDetails,
    addressDirectory,
  ]);

  const fetchNativeTokenDetails = async () => {
    const nativeToken = await getNativeToken(chainDetails.backendName);
    setNativeTokenDetails(nativeToken);
  };

  const buildAddressDirectory = async () => {
    const tempContactBook: Record<string, Contact> =
      await getContactBookWithMultipleAddress();

    const tempAddressDirectory: Record<string, Record<string, string[]>> = {
      evmAddresses: {},
      ethereum: {},
      cosmos: {},
      osmosis: {},
      noble: {},
      coreum: {},
      injective: {},
      binance: {},
      polygon: {},
      avalanche: {},
      optimism: {},
      arbitrum: {},
      zksync_era: {},
      base: {},
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
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const emptyView = () => {
    return (
      <CyDView className='h-full w-full justify-center items-center'>
        <CyDView className='flex flex-col justify-center items-center w-[200px] mt-3'>
          <CyDFastImage
            source={AppImages.SENDTO_EMPTY}
            className='w-[150px] h-[150px] '
          />
          <CyDText className='mt-[15px] text-[14px]'>
            {t('NO_SEND_HISTORY')}
          </CyDText>
        </CyDView>
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
        <CyDView className='h-[1px] bg-n40' />
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

  const getGasFee = async (
    chainName: string,
    address: string,
    isMaxGasEstimation = false,
  ): Promise<{ gasFeeInCrypto: number }> => {
    let gasEstimate;
    const amountToSend = limitDecimalPlaces(
      valueForUsd,
      tokenData.contractDecimals,
    );
    if (chainName === ChainNames.ETH) {
      const publicClient = getViemPublicClient(
        getWeb3Endpoint(tokenData.chainDetails, globalContext),
      );
      gasEstimate = await estimateGasForEvm({
        publicClient,
        chain: tokenData.chainDetails.backendName,
        fromAddress: (address ?? '') as `0x${string}`,
        toAddress: (address ?? '') as `0x${string}`,
        amountToSend,
        contractAddress: tokenData.contractAddress as `0x${string}`,
        contractDecimals: tokenData.contractDecimals,
        isErc20: !tokenData.isNativeToken,
      });
    } else if (chainName === ChainNames.SOLANA) {
      gasEstimate = await estimateGasForSolana({
        fromAddress: address ?? '',
        toAddress: address ?? '',
        amountToSend,
        contractAddress: tokenData.contractAddress,
        tokenContractDecimals: tokenData.contractDecimals,
        isMaxGasEstimation,
      });
    } else if (COSMOS_CHAINS.includes(tokenData.chainDetails.chainName)) {
      gasEstimate = await estimateGasForCosmosRest({
        chain: tokenData.chainDetails,
        denom: tokenData.denom,
        amount: amountToSend,
        fromAddress: address ?? '',
        toAddress: address ?? '',
      });
    }
    if (gasEstimate?.isError) {
      throw new Error('Gas estimation failed');
    }
    return { gasFeeInCrypto: Number(gasEstimate?.gasFeeInCrypto) };
  };

  const submitSendTransaction = async () => {
    setLoading(true);
    const id = genId();
    const activityData: SendTransactionActivity = {
      id,
      status: ActivityStatus.PENDING,
      type: ActivityType.SEND,
      transactionHash: '',
      fromAddress: '',
      toAddress: '',
      amount: formatAmount(valueForUsd, 6),
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
        chainDetails?.chainName === ChainNames.ETH &&
        isEthereumAddress(addressRef.current)
      ) {
        activityData.fromAddress = ethereum.address;
      } else if (
        chainDetails?.chainName === ChainNames.SOLANA &&
        isSolanaAddress(addressRef.current)
      ) {
        activityData.fromAddress = solana.address;
      } else if (
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

      const gasFee = await getGasFee(
        chainDetails.chainName,
        activityData.fromAddress,
        isMaxGasEstimation,
      );

      const amountToSend = limitDecimalPlaces(
        valueForUsd,
        tokenData.contractDecimals,
      );

      if (gasFee) {
        const { hasSufficientBalance, hasSufficientGasFee } =
          hasSufficientBalanceAndGasFee(
            tokenData.isNativeToken,
            String(gasFee.gasFeeInCrypto),
            nativeTokenDetails?.balanceDecimal,
            amountToSend,
            tokenData.balanceDecimal,
          );
        const hasSufficient = hasSufficientBalance && hasSufficientGasFee;
        if (!hasSufficient) {
          showModal('state', {
            type: 'error',
            title: t('GAS_ESTIMATION_FAILED'),
            description: t('GAS_ESTIMATION_FAILED_DESCRIPTION_WITH_LOAD_MORE', {
              tokenName: nativeTokenDetails?.name,
              chainName: chainDetails.name,
              gasFeeRequired: formatAmount(gasFee.gasFeeInCrypto),
            }),
            onSuccess: hideModal,
            onFailure: hideModal,
          });
          setLoading(false);
          return;
        }
      }

      activityData.gasAmount = String(
        formatAmount(
          DecimalHelper.multiply(gasFee.gasFeeInCrypto, tokenData?.price ?? 0),
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
          amountInFiat: formatAmount(
            DecimalHelper.multiply(amountToSend, tokenData?.price ?? 0),
          ),
          symbol: tokenData.symbol,
          toAddress: addressRef.current,
          gasFeeInCrypto: formatAmount(gasFee.gasFeeInCrypto),
          gasFeeInFiat: formatAmount(
            DecimalHelper.multiply(
              gasFee.gasFeeInCrypto,
              tokenData?.price ?? 0,
            ),
          ),
          nativeTokenSymbol: String(tokenData.chainDetails?.symbol),
        },
      });

      setLoading(false);
    } catch (e) {
      error = true;
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: chainDetails?.backendName ?? '',
        message: parseErrorMessage(e),
        screen: route.name,
        address: activityData.fromAddress,
        other: {
          token: tokenData.symbol,
          amount: valueForUsd,
          balance: tokenData.balanceDecimal,
          toAddress: addressRef.current,
        },
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
    
    // Store transaction params for resend functionality
    const txParams = {
      chain: tokenData.chainDetails.backendName,
      amountToSend,
      toAddress: addressRef.current,
      contractAddress: tokenData.contractAddress,
      contractDecimals: tokenData.contractDecimals,
      symbol: tokenData.symbol,
      chainName: chainDetails?.chainName,
    };
    pendingTxParamsRef.current = txParams;
    
    // Show AppKit transaction modal for WalletConnect users
    const isWalletConnect = connectionType === ConnectionTypes.WALLET_CONNECT;
    if (isWalletConnect && chainDetails?.chainName === ChainNames.ETH) {
      showTxModal();
    }
    
    let response;
    try {
      if (chainDetails?.chainName === ChainNames.ETH) {
        fromAddress = ethereum.address;
        response = await sendEvmToken({
          chain: tokenData.chainDetails.backendName,
          amountToSend,
          toAddress: addressRef.current as `0x${string}`,
          contractAddress: tokenData.contractAddress as `0x${string}`,
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
    
    // Hide AppKit modal on success for WalletConnect users
    if (isWalletConnect && chainDetails?.chainName === ChainNames.ETH) {
      hideTxModal();
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
            ? DecimalHelper.toString(
                DecimalHelper.multiply(
                  response?.gasFeeInCrypto ?? 0,
                  tokenData?.price ?? 0,
                ),
                4,
              )
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
        screen: route.name,
        address: get(senderAddress, chainDetails.chainName, ''),
        other: {
          token: tokenData.symbol,
          balance: tokenData.balanceDecimal,
          amount: valueForUsd,
          toAddress: addressRef.current,
        },
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
      void refreshPortfolio();
    } else {
      setLoading(false);
      
      // Check if it's a timeout error for WalletConnect users
      const connType = connectionType ?? '';
      const isWc = connType === ConnectionTypes.WALLET_CONNECT;
      const isTimeoutError = response?.error?.message?.includes('timed out') || 
                             response?.error?.message?.includes('timeout');
      
      if (isWc && isTimeoutError && chainDetails?.chainName === ChainNames.ETH) {
        // Show timeout state in AppKit modal
        setTxTimedOut();
        // Modal will stay visible with timeout state
        // Don't show the generic error modal
      } else {
        // Hide AppKit modal if it was shown
        if (isWc && chainDetails?.chainName === ChainNames.ETH) {
          hideTxModal();
        }
        
        // Show generic error modal
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_FAILED'),
          description: parseErrorMessage(response.error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      
      // monitoring api
      void logAnalytics({
        type: AnalyticsType.ERROR,
        chain: chainDetails?.backendName ?? '',
        message: parseErrorMessage(response.error),
        screen: route.name,
        address: get(senderAddress, chainDetails.chainName, ''),
        other: {
          token: tokenData.symbol,
          amount: valueForUsd,
          balance: tokenData.balanceDecimal,
          toAddress: addressRef.current,
        },
      });
      activityContext.dispatch({
        type: ActivityReducerAction.POST,
        value: {
          ...activityRef.current,
          status: ActivityStatus.FAILED,
          reason: response.error,
        },
      });
    }
    } catch (error) {
      setLoading(false);
      
      // Check if it's a timeout error for WalletConnect users
      const connType = connectionType ?? '';
      const isWc = connType === ConnectionTypes.WALLET_CONNECT;
      const errorMessage = (error as Error)?.message ?? '';
      const isTimeoutError = errorMessage.includes('timed out') || errorMessage.includes('timeout');
      
      if (isWc && isTimeoutError && chainDetails?.chainName === ChainNames.ETH) {
        // Show timeout state in AppKit modal
        setTxTimedOut();
      } else {
        // Hide AppKit modal if it was shown
        if (isWc && chainDetails?.chainName === ChainNames.ETH) {
          hideTxModal();
        }
        
        // Show generic error modal
        showModal('state', {
          type: 'error',
          title: t('TRANSACTION_FAILED'),
          description: parseErrorMessage(error),
          onSuccess: hideModal,
          onFailure: hideModal,
        });
      }
      
      Sentry.captureException(error);
    }
  };

  // Handle resend transaction request for AppKit modal
  const handleResendTransaction = async () => {
    const txParams = pendingTxParamsRef.current;
    if (!txParams) return;

    await handleResend(async () => {
      await sendEvmToken({
        chain: txParams.chain,
        amountToSend: txParams.amountToSend,
        toAddress: txParams.toAddress as `0x${string}`,
        contractAddress: txParams.contractAddress as `0x${string}`,
        contractDecimals: txParams.contractDecimals,
        symbol: txParams.symbol,
      });
      
      hideTxModal();
      void refreshPortfolio();
    });
  };

  // Handle retry after timeout
  const handleRetryTransaction = () => {
    hideTxModal();
    // Trigger the confirmation modal again
    setTokenSendConfirmationParams({
      ...tokenSendConfirmationParams,
      isModalVisible: true,
    });
  };

  const onSuccess = async (readEvent: QRScanEvent) => {
    let error = false;
    const content = readEvent.data;

    // Extract address from URI schemes using utility function
    const address = extractAddressFromURI(content);

    // Validate the extracted address
    if (address) {
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
              description: t('NOT_VALID_COREUM_ADDRESS'),
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
              description: t('NOT_VALID_INJECTIVE_ADDRESS'),
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
              description: t('NOT_VALID_SOLANA_ADDRESS'),
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
      // No valid address could be extracted from the QR code
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
      chainDetails?.chainName === ChainNames.OSMOSIS
    );
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <PageHeader title={'SEND_TO'} navigation={props.navigation} />
      <CyDView className='flex-1 bg-n20 pt-[24px]'>
        <TokenSendConfirmationModal
          isModalVisible={tokenSendConfirmationParams.isModalVisible}
          tokenSendParams={tokenSendConfirmationParams.tokenSendParams}
        />
        
        {/* AppKit Transaction Modal for WalletConnect users */}
        <AppKitTransactionModal
          isVisible={isTxModalVisible}
          walletName={walletInfo?.name ?? 'your wallet'}
          onResend={() => void handleResendTransaction()}
          onCancel={handleTxCancel}
          onRetry={handleRetryTransaction}
          state={txModalState}
        />
        
        <CyDView className='h-full mx-[20px] pt-[10px]'>
          {/* Address label with QR scanner icon */}
          <CyDView className='flex flex-row justify-between items-center'>
            <CyDText className='text-[16px] font-semibold'>
              {t<string>('ADDRESS')}
            </CyDText>
            <CyDTouchView
              className='flex flex-row justify-center items-center'
              onPress={() => {
                props.navigation.navigate(C.screenTitle.QR_CODE_SCANNER, {
                  fromPage: QRScannerScreens.SEND,
                  onSuccess,
                });
              }}>
              <CyDMaterialDesignIcons
                name='qrcode-scan'
                size={20}
                className='text-base400 mr-[5px]'
              />
              <CyDText className='text-[12px] font-medium text-base400'>
                Scan
              </CyDText>
            </CyDTouchView>
          </CyDView>
          {/* Address input with paste icon */}
          <CyDView
            className={clsx(
              'flex flex-row justify-between items-center mt-[7px] border-[0.5px] border-n40 rounded-[5px] px-[15px] py-[5px]',
              {
                'border-red80': !isAddressValid,
                'border-n40': addressText === '',
              },
            )}>
            <CyDTextInput
              className={clsx('w-[90%] p-[12px] bg-n20', {
                // 'py-[12px]': !(chainDetails?.chainName === ChainNames.ETH),
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
              className=''
              onPress={() => {
                addressText === ''
                  ? void (async () => await fetchCopiedText())()
                  : setAddressText('');
              }}>
              <CyDMaterialDesignIcons
                name={addressText === '' ? 'content-paste' : 'close'}
                size={20}
                className='text-base400'
              />
            </CyDTouchView>
          </CyDView>
          {/* Display address validation error below input */}
          {!isAddressValid && addressError && (
            <CyDView className='w-full mt-[8px]'>
              <CyDText className='text-red-500 text-[12px] font-medium text-left'>
                {addressError}
              </CyDText>
            </CyDView>
          )}
          {!isDropDown && (
            <CyDView className='flex-1 flex-col items-center'>
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
                        <CyDMaterialDesignIcons
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
            className='h-[80px] pb-[10px] w-full absolute justify-center items-center'
            style={
              keyboardHeight ? { top: keyboardHeight - 60 } : { bottom: 8 }
            }>
            <Button
              title={t('SEND')}
              onPress={() => {
                void (async () => {
                  await submitSendTransaction();
                })();
              }}
              type={ButtonType.PRIMARY}
              disabled={
                !isAddressValid ||
                addressText === '' ||
                !nativeTokenDetails ||
                Object.keys(addressDirectory).length === 0
              }
              loading={
                loading ||
                !nativeTokenDetails ||
                Object.keys(addressDirectory).length === 0
              }
              style=' h-[60px] w-[90%]'
            />
          </CyDView>
        </CyDView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
