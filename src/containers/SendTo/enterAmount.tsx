/**
 * @format
 * @flow
 */
import { useIsFocused } from '@react-navigation/native';
import clsx from 'clsx';
import { get } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import Button from '../../components/v2/button';
import ChooseTokenModal from '../../components/v2/chooseTokenModal';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';
import { gasFeeReservation } from '../../constants/data';
import { ButtonType } from '../../constants/enum';
import * as C from '../../constants/index';
import {
  ChainBackendNames,
  GASLESS_CHAINS,
  NativeTokenMapping,
} from '../../constants/server';
import { CHOOSE_TOKEN_MODAL_TIMEOUT } from '../../constants/timeOuts';
import { formatAmount, limitDecimalPlaces } from '../../core/util';
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

  const { showModal, hideModal } = useGlobalModalContext();

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

  const isGasReservedForNative = (cryptoValue: string) => {
    const nativeTokenSymbol =
      get(NativeTokenMapping, tokenData.chainDetails.symbol) ||
      tokenData.chainDetails.symbol;
    const isNative = tokenData.symbol === nativeTokenSymbol;
    if (!isNative) return true;
    const gasReserved = isNative
      ? gasFeeReservation[tokenData.chainDetails?.backendName]
      : 0;
    return (
      parseFloat(
        (parseFloat(String(tokenData.actualBalance)) - gasReserved).toFixed(6),
      ) >= parseFloat(cryptoValue)
    );
  };

  const haveEnoughNativeBalance = async (cryptoValue: string) => {
    const { backendName, symbol } = tokenData.chainDetails;
    if (GASLESS_CHAINS.includes(backendName as ChainBackendNames)) {
      return true;
    }
    const nativeBackendName = backendName;
    const nativeToken = await getNativeToken(
      nativeBackendName as ChainBackendNames,
    );
    const nativeTokenBalance = nativeToken.actualBalance;
    const gasReserved = gasFeeReservation[backendName];
    return nativeTokenBalance >= gasReserved;
  };

  const _validateValueForUsd = async () => {
    const nativeTokenSymbol =
      NativeTokenMapping[tokenData.chainDetails.symbol] ||
      tokenData.chainDetails.symbol;
    if (parseFloat(cryptoValue) > parseFloat(tokenData.actualBalance)) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: t('ENTER_AMOUNT_LESS_THAN_BALANCE'),
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else if (!(await haveEnoughNativeBalance(cryptoValue))) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: `You don't have sufficient ${nativeTokenSymbol} to pay gas fee.`,
        onSuccess: hideModal,
        onFailure: hideModal,
      });
    } else if (!isGasReservedForNative(cryptoValue)) {
      const cryVal =
        parseFloat(tokenData.actualBalance) -
        gasFeeReservation[tokenData.chainDetails.backendName];
      const reqAmount = enterCryptoAmount
        ? `${cryVal.toFixed(6)} ${tokenData.symbol}`
        : `${parseFloat(
            (cryVal * parseFloat(tokenData.price)).toFixed(6),
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
                    const gasReserved =
                      (NativeTokenMapping[tokenData?.chainDetails?.symbol] ||
                        tokenData?.chainDetails?.symbol) === tokenData?.symbol
                        ? gasFeeReservation[tokenData.chainDetails.backendName]
                        : 0;

                    const maxAmount =
                      parseFloat(tokenData?.actualBalance) - gasReserved;
                    const textAmount =
                      maxAmount < 0
                        ? '0.00'
                        : limitDecimalPlaces(maxAmount.toString(), 6);
                    setValueForUsd(textAmount);

                    if (enterCryptoAmount) {
                      setCryptoValue(textAmount);
                      setUsdValue(
                        (parseFloat(textAmount) * tokenData.price).toString(),
                      );
                    } else {
                      setCryptoValue(
                        (parseFloat(textAmount) / tokenData.price).toString(),
                      );
                      setUsdValue(textAmount);
                    }
                  }}
                  className={clsx(
                    'absolute left-[10%] bottom-[60%] bg-n0 rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px] shadow-md',
                  )}>
                  <CyDText className={' text-[10px]  font-bold'}>
                    {t<string>('MAX')}
                  </CyDText>
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
                    'absolute right-[10%] bottom-[60%] bg-n0 rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px] shadow-md',
                  )}>
                  <CyDMaterialDesignIcons
                    name='swap-vertical'
                    size={16}
                    className='text-base400 self-center items-center'
                  />
                </CyDTouchView>
                <CyDText className=' text-[15px] font-bold '>
                  {enterCryptoAmount ? tokenData.symbol : 'USD'}
                </CyDText>
                <CyDView className={'flex-col w-8/12 mx-[6px] items-center'}>
                  <CyDTextInput
                    className={clsx(
                      'font-bold text-center text-base400 h-[85px] bg-n20',
                      {
                        'text-[70px]': valueForUsd.length <= 5,
                        'text-[40px]': valueForUsd.length > 5,
                      },
                    )}
                    keyboardType='numeric'
                    onChangeText={text => {
                      setValueForUsd(text);
                      if (enterCryptoAmount) {
                        setCryptoValue(text);
                        setUsdValue(
                          (parseFloat(text) * tokenData.price).toString(),
                        );
                      } else {
                        setCryptoValue(
                          (parseFloat(text) / tokenData.price).toString(),
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
                  <CyDText className='text-[15px]'>{t('SEND_ON')}</CyDText>
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
          disabled={parseFloat(valueForUsd) <= 0 || valueForUsd === ''}
          onPress={() => {
            if (valueForUsd.length > 0) {
              void _validateValueForUsd();
            }
          }}
          type={ButtonType.PRIMARY}
          style='h-[60px] w-3/4'
        />
      </CyDView>
    </CyDSafeAreaView>
  );
}
