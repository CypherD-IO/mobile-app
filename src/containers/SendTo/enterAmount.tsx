/**
 * @format
 * @flow
 */
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { get } from 'lodash';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, ActivityIndicator } from 'react-native';
import Button from '../../components/v2/button';
import ChooseTokenModal from '../../components/v2/chooseTokenModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';
import { AllChainsEnum, ButtonType } from '../../constants/enum';
import * as C from '../../constants/index';
import {
  CAN_ESTIMATE_L1_FEE_CHAINS,
  ChainBackendNames,
  ChainNames,
  COSMOS_CHAINS,
  EVM_CHAINS_BACKEND_NAMES,
  GASLESS_CHAINS,
  NativeTokenMapping,
} from '../../constants/server';
import { CHOOSE_TOKEN_MODAL_TIMEOUT } from '../../constants/timeOuts';
import {
  formatAmount,
  getViemPublicClient,
  getWeb3Endpoint,
  HdWalletContext,
  isNativeToken,
  limitDecimalPlaces,
} from '../../core/util';
import usePortfolio from '../../hooks/usePortfolio';
import { TokenMeta } from '../../models/tokenMetaData.model';
import {
  CyDFastImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../styles/tailwindStyles';
import { GlobalContext, GlobalContextDef } from '../../core/globalContext';
import { DecimalHelper } from '../../utils/decimalHelper';
import useGasService from '../../hooks/useGasService';
import { HdWalletContextDef } from '../../reducers/hdwallet_reducer';

export default function EnterAmount(props: any) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const { route, navigation } = props;
  const { sendAddress = '' } = route.params ?? {};
  const [tokenData, setTokenData] = useState<TokenMeta>(
    props?.route?.params?.tokenData,
  );
  // const { tokenData }: { tokenData: Holding } = route.params;
  const [valueForUsd, setValueForUsd] = useState('0.00'); // native token amount
  const [usdValue, setUsdValue] = useState<string>('0.00');
  const [cryptoValue, setCryptoValue] = useState<string>('0.00');
  const [enterCryptoAmount, setEnterCryptoAmount] = useState<boolean>(true);
  const { getNativeToken } = usePortfolio();
  const [isChooseTokenVisible, setIsChooseTokenVisible] =
    useState<boolean>(false);
  const isFocused = useIsFocused();
  const {
    estimateGasForEvm,
    estimateGasForSolana,
    estimateGasForCosmosRest,
    estimateReserveFee,
  } = useGasService();
  const globalContext = useContext(GlobalContext) as GlobalContextDef;
  const hdWallet = useContext(HdWalletContext) as HdWalletContextDef;

  const { showModal, hideModal } = useGlobalModalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isMaxLoading, setIsMaxLoading] = useState(false);

  const handleBackButton = () => {
    navigation.goBack();
    return true;
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (props.route.params?.tokenData) {
        setTokenData(props.route.params.tokenData);
      } else {
        setTimeout(() => {
          setIsChooseTokenVisible(true);
        }, CHOOSE_TOKEN_MODAL_TIMEOUT);
      }
    }
  }, [isFocused]);

  const getGasFee = async (
    chainName: string,
  ): Promise<{ gasFeeInCrypto: number }> => {
    let gasEstimate;
    const amountToSend = DecimalHelper.subtract(
      tokenData.balanceDecimal,
      DecimalHelper.divide(tokenData.balanceDecimal, 2),
    ).toString();
    if (chainName === ChainNames.ETH) {
      const publicClient = getViemPublicClient(
        getWeb3Endpoint(tokenData.chainDetails, globalContext),
      );
      const ethereum = hdWallet.state.wallet.ethereum;
      gasEstimate = await estimateGasForEvm({
        publicClient,
        chain: tokenData.chainDetails.backendName,
        fromAddress: ethereum.address as `0x${string}`,
        toAddress: ethereum.address as `0x${string}`,
        amountToSend,
        contractAddress: tokenData.contractAddress as `0x${string}`,
        contractDecimals: tokenData.contractDecimals,
        isErc20: !isNativeToken(tokenData),
      });
    } else if (chainName === ChainNames.SOLANA) {
      const solana = hdWallet.state.wallet.solana;
      gasEstimate = await estimateGasForSolana({
        fromAddress: solana.address ?? '',
        toAddress: solana.address ?? '',
        amountToSend,
        contractAddress: tokenData.contractAddress,
        contractDecimals: tokenData.contractDecimals,
      });
    } else if (COSMOS_CHAINS.includes(tokenData.chainDetails.chainName)) {
      const cosmosWallet = get(hdWallet.state.wallet, chainName, null);
      gasEstimate = await estimateGasForCosmosRest({
        chain: tokenData.chainDetails,
        denom: tokenData.denom,
        amount: amountToSend,
        fromAddress: cosmosWallet?.address ?? '',
        toAddress: cosmosWallet?.address ?? '',
      });
    }
    if (gasEstimate?.isError) {
      return { gasFeeInCrypto: 0 };
    }
    return { gasFeeInCrypto: Number(gasEstimate?.gasFeeInCrypto) };
  };

  const isGasReservedForNative = async (
    cryptoValue: string,
    gasReserved: number,
  ) => {
    const nativeTokenSymbol =
      get(NativeTokenMapping, tokenData.chainDetails.symbol) ||
      tokenData.chainDetails.symbol;
    const isNative = tokenData.symbol === nativeTokenSymbol;
    if (!isNative) return true;
    const balanceAfterGasReservation = DecimalHelper.subtract(
      tokenData.balanceDecimal,
      gasReserved,
    );
    return DecimalHelper.isGreaterThanOrEqualTo(
      balanceAfterGasReservation,
      cryptoValue,
    );
  };

  const haveEnoughNativeBalance = async (
    cryptoValue: string,
    gasReserved: number,
  ) => {
    const { backendName, symbol } = tokenData.chainDetails;
    if (GASLESS_CHAINS.includes(backendName)) {
      return true;
    }
    const nativeBackendName = backendName;
    const nativeToken = await getNativeToken(nativeBackendName);
    const nativeTokenBalance = nativeToken.actualBalance;
    return DecimalHelper.isGreaterThanOrEqualTo(
      nativeTokenBalance,
      gasReserved,
    );
  };

  const _validateValueForUsd = async () => {
    setIsLoading(true);
    const nativeTokenSymbol =
      NativeTokenMapping[tokenData.chainDetails.symbol] ||
      tokenData.chainDetails.symbol;
    const gasReserved = (await getGasFee(tokenData.chainDetails?.chainName))
      ?.gasFeeInCrypto;

    if (DecimalHelper.isGreaterThan(cryptoValue, tokenData.actualBalance)) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: t('ENTER_AMOUNT_LESS_THAN_BALANCE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else if (!(await haveEnoughNativeBalance(cryptoValue, gasReserved))) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: `You don't have sufficient ${nativeTokenSymbol} to pay gas fee.`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else if (!(await isGasReservedForNative(cryptoValue, gasReserved))) {
      const cryVal = DecimalHelper.subtract(
        tokenData.actualBalance,
        gasReserved,
      );
      const reqAmount = enterCryptoAmount
        ? `${DecimalHelper.toString(cryVal)} ${tokenData.symbol}`
        : `${DecimalHelper.toString(
            DecimalHelper.multiply(cryVal, tokenData.price),
          )} USD`;
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_GAS_FEE'),
        description: `Enter amount lesser than ${reqAmount}`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else {
      navigation.navigate(C.screenTitle.SEND_TO, {
        valueForUsd: cryptoValue,
        tokenData,
        sendAddress,
      });
    }
    setIsLoading(false);
  };

  const onMaxPress = async () => {
    setIsMaxLoading(true);
    try {
      // remove this gasFeeReservation once we have gas estimation for eip1599 chains
      let gasReservedForNativeToken;
      if (
        EVM_CHAINS_BACKEND_NAMES.includes(tokenData.chainDetails.backendName) &&
        isNativeToken(tokenData) &&
        CAN_ESTIMATE_L1_FEE_CHAINS.includes(tokenData.chainDetails.backendName)
      ) {
        const publicClient = getViemPublicClient(
          getWeb3Endpoint(tokenData.chainDetails, globalContext),
        );
        gasReservedForNativeToken = await estimateReserveFee({
          tokenData,
          fromAddress: hdWallet.state.wallet.ethereum.address as `0x${string}`,
          toAddress:
            sendAddress !== ''
              ? sendAddress
              : hdWallet.state.wallet.ethereum.address,
          publicClient,
          rpc: getWeb3Endpoint(tokenData.chainDetails, globalContext),
        });
      } else if (isNativeToken(tokenData)) {
        const gasFeeDetails = await getGasFee(
          tokenData.chainDetails?.chainName,
        );
        gasReservedForNativeToken = gasFeeDetails?.gasFeeInCrypto;
        if (tokenData.chainDetails.backendName !== ChainBackendNames.SOLANA) {
          // adding a 10% buffer to the gas fee calculated as ther will be another gas fee calculation subsequently when continuing
          // not doing it or solana because if we are sending max amount, then there should be 0 SOL balance in the account, or there should SOL balance enough
          // for handling the account rent, else we will get the error InsufficientFundsForRent, since we will not be having enough SOL
          gasReservedForNativeToken = DecimalHelper.multiply(
            gasReservedForNativeToken,
            1.1,
          );
        }
      }

      const gasReserved =
        (NativeTokenMapping[tokenData?.chainDetails?.symbol as AllChainsEnum] ||
          tokenData?.chainDetails?.symbol) === tokenData?.symbol
          ? gasReservedForNativeToken
          : 0;

      const maxAmountDecimal = DecimalHelper.subtract(
        tokenData.balanceDecimal,
        String(gasReserved),
      );

      const textAmount = DecimalHelper.isLessThan(maxAmountDecimal, 0)
        ? '0.00'
        : DecimalHelper.toString(maxAmountDecimal);
      setValueForUsd(
        enterCryptoAmount
          ? textAmount
          : DecimalHelper.toString(
              DecimalHelper.multiply(textAmount, tokenData.price),
            ),
      );
      setCryptoValue(textAmount);
      setUsdValue(
        DecimalHelper.toString(
          DecimalHelper.multiply(textAmount, tokenData.price),
        ),
      );
    } finally {
      setIsMaxLoading(false);
    }
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDSafeAreaView className='flex-1 bg-n0'>
      <ChooseTokenModal
        isChooseTokenModalVisible={isChooseTokenVisible}
        onSelectingToken={token => {
          setIsChooseTokenVisible(false);
          setTokenData(token);
        }}
        onCancel={() => {
          setIsChooseTokenVisible(false);
          navigation.goBack();
        }}
      />
      <CyDView className={'bg-n0 w-full'}>
        <CyDView>
          <CyDView
            className={
              'flex items-center justify-center pb-[35px] pt-[15px] w-full bg-n20 rounded-b-[25px]'
            }>
            {tokenData && (
              <CyDView
                className={'flex items-center justify-center w-full relative'}>
                <CyDTouchView
                  onPress={() => {
                    void onMaxPress();
                  }}
                  className={clsx(
                    'absolute left-[10%] bottom-[60%] bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px] shadow-md',
                  )}>
                  {isMaxLoading ? (
                    <ActivityIndicator
                      size='small'
                      color='var(--color-base400)'
                    />
                  ) : (
                    <CyDText className={' text-black '}>
                      {t<string>('MAX')}
                    </CyDText>
                  )}
                </CyDTouchView>
                <CyDTouchView
                  onPress={() => {
                    if (enterCryptoAmount)
                      setValueForUsd(limitDecimalPlaces(usdValue, 6));
                    else setValueForUsd(limitDecimalPlaces(cryptoValue, 6));
                    setEnterCryptoAmount(!enterCryptoAmount);
                    // if (!enterCryptoAmount) {
                    //   setCryptoValue(val);
                    //   setUsdValue((parseFloat(val) * tokenData.price).toString());
                    // } else {
                    //   setCryptoValue((parseFloat(val) / tokenData.price).toString());
                    //   setUsdValue(val);
                    // }
                  }}
                  className={clsx(
                    'absolute right-[10%] bottom-[60%] bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px] shadow-md',
                  )}>
                  <CyDMaterialDesignIcons
                    name='swap-vertical'
                    size={16}
                    className='text-black self-center items-center'
                  />
                </CyDTouchView>
                <CyDText className=' text-[15px] font-bold '>
                  {enterCryptoAmount ? tokenData.symbol : 'USD'}
                </CyDText>
                <CyDView className={'flex-col w-6/12 mx-[6px] items-center'}>
                  <CyDTextInput
                    className={clsx(
                      'font-bold text-center text-base400 bg-n20 min-h-[80px]',
                      {
                        'text-[70px]': valueForUsd.length <= 5,
                        'text-[40px]': valueForUsd.length > 5,
                      },
                    )}
                    keyboardType='numeric'
                    onChangeText={text => {
                      setValueForUsd(text);
                      if (enterCryptoAmount) {
                        setCryptoValue(Number.isNaN(text) ? '0' : text);
                        setUsdValue(
                          DecimalHelper.toString(
                            DecimalHelper.multiply(text, tokenData.price),
                          ),
                        );
                      } else {
                        setCryptoValue(
                          DecimalHelper.toString(
                            DecimalHelper.divide(text, tokenData.price),
                          ),
                        );
                        setUsdValue(text);
                      }
                    }}
                    value={valueForUsd}
                    onFocus={() => {
                      if (valueForUsd === '0.00') setValueForUsd('');
                    }}
                    onBlur={() => {
                      if (valueForUsd === '') setValueForUsd('0.00');
                    }}
                  />
                </CyDView>
                <CyDText className='text-[15px] font-bold text-base400'>
                  {enterCryptoAmount
                    ? (!isNaN(parseFloat(usdValue))
                        ? formatAmount(usdValue)
                        : '0.00') + ' USD'
                    : (!isNaN(parseFloat(cryptoValue))
                        ? formatAmount(cryptoValue)
                        : '0.00') + ` ${tokenData.name}`}
                </CyDText>

                <CyDView className='flex flex-row mt-[12px] mb-[6px] items-center rounded-[10px] self-center px-[10px] bg-n0'>
                  <CyDView>
                    <CyDFastImage
                      className={'h-[35px] w-[35px] rounded-[50px]'}
                      source={{
                        uri: tokenData.logoUrl,
                      }}
                      resizeMode='contain'
                    />
                  </CyDView>
                  <CyDView className={'flex w-[82%]'}>
                    <CyDView className='flex flex-row w-full justify-between max-h-[90px] py-[10px] items-center'>
                      <CyDView className='ml-[10px] max-w-[75%]'>
                        <CyDView className={'flex flex-row align-center'}>
                          <CyDText className={'font-extrabold text-[16px]'}>
                            {tokenData.name}
                          </CyDText>
                        </CyDView>
                        <CyDText
                          className={
                            'text-[14px] text-subTextColor font-bold mt-[2px]'
                          }>
                          {tokenData.symbol}
                        </CyDText>
                      </CyDView>
                      <CyDView className='flex self-center items-end'>
                        <CyDTokenValue className='text-[16px] font-extrabold'>
                          {tokenData.totalValue}
                        </CyDTokenValue>
                        <CyDTokenAmount className='text-[14px] text-subTextColor font-bold'>
                          {tokenData.actualBalance}
                        </CyDTokenAmount>
                      </CyDView>
                    </CyDView>
                  </CyDView>
                </CyDView>
                <CyDView className='flex flex-row justify-center items-center mt-[20px] w-[80px]'>
                  <CyDText className='text-[15px]'>{t('NETWORK')}</CyDText>
                  <CyDFastImage
                    className='h-[15px] w-[15px] mt-[2px] ml-[5px]'
                    source={tokenData.chainDetails?.logo_url}
                    resizeMode='contain'
                  />
                  <CyDText className='text-[15px] ml-[5px]'>
                    {tokenData.chainDetails?.name}
                  </CyDText>
                </CyDView>
              </CyDView>
            )}
          </CyDView>
        </CyDView>
      </CyDView>
      <CyDView className={'w-full items-center top-[-30px]'}>
        <Button
          title={t('CONTINUE')}
          disabled={
            DecimalHelper.isLessThanOrEqualTo(valueForUsd, 0) ||
            valueForUsd === ''
          }
          onPress={() => {
            if (valueForUsd.length > 0) {
              void _validateValueForUsd();
            }
          }}
          loading={isLoading}
          type={ButtonType.PRIMARY}
          style='h-[60px] w-3/4'
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
