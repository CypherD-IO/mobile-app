/**
 * @format
 * @flow
 */
import clsx from 'clsx';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';
import AppImages from '../../../assets/images/appImages';
import { useGlobalModalContext } from '../../components/v2/GlobalModal';
import { BuyOrBridge } from '../../components/v2/StateModal';
import { gasFeeReservation } from '../../constants/data';
import * as C from '../../constants/index';
import { ChainNameMapping, NativeTokenMapping } from '../../constants/server';
import { Colors } from '../../constants/theme';
import { Holding } from '../../core/Portfolio';
import { getNativeTokenBalance, PortfolioContext, limitDecimalPlaces } from '../../core/util';
import { CyDImage, CyDScrollView, CyDText, CyDTextInput, CyDTouchView, CyDView } from '../../styles/tailwindStyles';

const {
  CText,
  DynamicView,
  DynamicImage
} = require('../../styles');

export default function EnterAmount (props) {
  // NOTE: DEFINE VARIABLE 🍎🍎🍎🍎🍎🍎
  const { t } = useTranslation();
  const { route } = props;
  const { tokenData }: { tokenData: Holding } = route.params;
  const [valueForUsd, setValueForUsd] = useState('0.00'); // native token amount
  const [usdValue, setUsdValue] = useState<string>('0.00');
  const [cryptoValue, setCryptoValue] = useState<string>('0.00');
  const [enterCryptoAmount, setEnterCryptoAmount] = useState<boolean>(true);
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  });
  const portfolioState = useContext<any>(PortfolioContext);

  const { showModal, hideModal } = useGlobalModalContext();

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

  const formatAmount = (amount: string) => {
    if (amount.includes('.')) {
      return amount.slice(0, amount.indexOf('.') + (tokenData.name === 'Ether' ? 7 : 3));
    } else if (amount === '0') return '0.00';
    return amount;
  };

  const renderModalBody = (text: string) => {
    return <BuyOrBridge
      text={text}
      navigation={props.navigation}
      portfolioState={portfolioState}
      hideModal={hideModal}
    />;
  };

  const isGasReservedForNative = (cryptoValue: string) => {
    const nativeTokenSymbol = NativeTokenMapping[tokenData.chainDetails.symbol] || tokenData.chainDetails.symbol;
    const isNative = tokenData.symbol === nativeTokenSymbol;
    if (!isNative) return true;
    const gasReserved = isNative ? gasFeeReservation[tokenData.chainDetails?.backendName] : 0;
    return parseFloat((parseFloat(tokenData.actualBalance) - gasReserved).toFixed(6)) >= parseFloat(cryptoValue);
  };

  const haveEnoughNativeBalance = (cryptoValue: string) => {
    const nativeBackendName = tokenData.chainDetails.backendName;
    const nativeTokenSymbol = NativeTokenMapping[tokenData.chainDetails.symbol] || tokenData.chainDetails.symbol;
    const nativeTokenBalance = getNativeTokenBalance(nativeTokenSymbol, portfolioState.statePortfolio.tokenPortfolio[
      ChainNameMapping[nativeBackendName]
    ].holdings);
    const gasReserved = gasFeeReservation[tokenData.chainDetails?.backendName];

    return nativeTokenBalance <= gasReserved;
  };

  const _validateValueForUsd = () => {
    const nativeTokenSymbol = NativeTokenMapping[tokenData.chainDetails.symbol] || tokenData.chainDetails.symbol;

    if (parseFloat(cryptoValue) >= parseFloat(tokenData.actualBalance)) {
      showModal('state', { type: 'error', title: t('INSUFFICIENT_FUNDS'), description: t('ENETER_AMOUNT_LESS_THAN_BALANCE'), onSuccess: hideModal, onFailure: hideModal });
    } else if (haveEnoughNativeBalance(cryptoValue)) {
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_FUNDS'),
        description: renderModalBody(`You don't have sufficient ${nativeTokenSymbol} to pay gas fee. Would you like to buy or bridge?`),
        onSuccess: hideModal,
        onFailure: hideModal
      });
    } else if (!isGasReservedForNative(cryptoValue)) {
      const cryVal = parseFloat(tokenData.actualBalance) - gasFeeReservation[tokenData.chainDetails.backendName];
      const reqAmount = enterCryptoAmount ? `${cryVal.toFixed(6)} ${tokenData.symbol}` : `${parseFloat((cryVal * parseFloat(tokenData.price)).toFixed(6))} USD`;
      showModal('state', {
        type: 'error',
        title: t('INSUFFICIENT_GAS_FEE'),
        description: `Enter amount lesser than ${reqAmount}`,
        onSuccess: hideModal,
        onFailure: hideModal
      });
    } else {
      props.navigation.navigate(C.screenTitle.SEND_TO, {
        valueForUsd: cryptoValue,
        tokenData
      });
    }
  };

  // NOTE: LIFE CYCLE METHOD 🍎🍎🍎🍎
  return (
    <CyDScrollView className={'bg-white h-full w-full'}>
        <CyDView className={'px-[10px]'}>
          <CyDView className={'flex items-center justify-center pb-[35px] pt-[15px] w-full bg-[#F7F8FE] rounded-[25px]'}>
            <CyDView className={'flex items-center justify-center w-full relative'}>
              <CyDTouchView
                onPress={() => {
                  const gasReserved = (NativeTokenMapping[tokenData?.chainDetails?.symbol] || tokenData?.chainDetails?.symbol) === tokenData?.symbol ? gasFeeReservation[tokenData.chainDetails.backendName] : 0;

                  const maxAmount = parseFloat(tokenData?.actualBalance) - gasReserved;
                  const textAmount = maxAmount < 0 ? '0.00' : limitDecimalPlaces(maxAmount.toString(), 6);
                  setValueForUsd(textAmount);

                  if (enterCryptoAmount) {
                    setCryptoValue(textAmount);
                    setUsdValue((parseFloat(textAmount) * tokenData.price).toString());
                  } else {
                    setCryptoValue((parseFloat(textAmount) / tokenData.price).toString());
                    setUsdValue(textAmount);
                  }
                }}
                className={clsx(
                  'absolute left-[10%] bottom-[60%] bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]'
                )}
              >
                <CyDText className={'font-nunito text-black '}>{t<string>('MAX')}</CyDText>
              </CyDTouchView>
              <CyDTouchView
                onPress={() => {
                  if (enterCryptoAmount) setValueForUsd(limitDecimalPlaces(usdValue, 6));
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
                  'absolute right-[10%] bottom-[60%] bg-white rounded-full h-[40px] w-[40px] flex justify-center items-center p-[4px]'
                )}
              >
                <CyDImage source={AppImages.TOGGLE_ICON} className={'w-[14px] h-[16px]'} />
              </CyDTouchView>
              <CText dynamic fF={C.fontsName.FONT_BOLD} fS={15} color={Colors.primaryTextColor}>{enterCryptoAmount ? tokenData.symbol : 'USD'}</CText>
              <CyDView className={'flex-col w-8/12 mx-[6px] items-center'}>
                <CyDTextInput
                  className={clsx(
                    'font-bold text-center text-black h-[85px] font-nunito',
                    {
                      'text-[70px]': valueForUsd.length <= 5,
                      'text-[40px]': valueForUsd.length > 5
                    }
                  )}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    setValueForUsd(text);
                    if (enterCryptoAmount) {
                      setCryptoValue(text);
                      setUsdValue((parseFloat(text) * tokenData.price).toString());
                    } else {
                      setCryptoValue((parseFloat(text) / tokenData.price).toString());
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
              <CText dynamic fF={C.fontsName.FONT_BOLD} fS={15} color={Colors.subTextColor}>{enterCryptoAmount ? (!isNaN(parseFloat(usdValue)) ? formatAmount(usdValue) : '0.00') + ' USD' : (!isNaN(parseFloat(cryptoValue)) ? formatAmount(cryptoValue) : '0.00') + ` ${tokenData.name}`}</CText>

              <DynamicView dynamic dynamicWidth jC={'center'} width={90} height={70} pH={10} mT={30} bR={10} bGC={Colors.whiteColor}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.8,
                  elevation: 5,
                  shadowRadius: 1
                }}>

                <DynamicView dynamic fD={'row'} pV={8} >
                  <DynamicView dynamic mL={10} fD={'row'} bR={20}>
                    <DynamicView dynamic dynamicWidthFix dynamicHeightFix height={25} width={25} aLIT='center'
                      fD={'row'} jC='center' bGC='#EFEFEF' bR={20}>
                      <DynamicImage dynamic dynamicWidthFix dynamicHeightFix height={30} width={30} resizemode='contain'
                        source={{
                          uri: tokenData.logoUrl
                        }}
                      />
                    </DynamicView>
                    <DynamicView dynamic mL={5} dynamicHeightFix height={54} dynamicWidthFix width={140} fD={'row'}>
                      <DynamicView dynamic dynamicHeightFix height={54} aLIT='flex-start' fD={'column'} jC='center' pH={8}>
                        <CText numberOfLines={2} tA={'left'} dynamicWidth width={100} dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={15} color={Colors.primaryTextColor}>{tokenData.name}</CText>
                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} tA={'left'} color={Colors.subTextColor}>{tokenData.symbol}</CText>
                      </DynamicView>
                    </DynamicView>
                    <DynamicView dynamic dynamicHeightFix height={54} fD={'row'} jC='center'>
                      <DynamicView dynamic dynamicWidthFix width={120} dynamicHeightFix height={54} aLIT='flex-end' fD={'column'} jC='center' pH={8}>
                        <CText dynamic fF={C.fontsName.FONT_EXTRA_BOLD} fS={14} color={Colors.primaryTextColor}>{currencyFormatter.format(tokenData.totalValue)}</CText>
                        <CText dynamic fF={C.fontsName.FONT_BOLD} fS={14} color={Colors.subTextColor}>{new Intl.NumberFormat('en-US', { maximumSignificantDigits: 4 }).format(tokenData.actualBalance)}</CText>
                      </DynamicView>
                    </DynamicView>
                  </DynamicView>
                </DynamicView>
              </DynamicView>

              <DynamicView dynamic dynamicWidth fD={'row'} jC={'center'} width={80} mT={20} aLIT={'center'} >
                <CText dynamic fF={C.fontsName.FONT_BOLD} fS={15} color={Colors.primaryTextColor}>Send on</CText>
                <DynamicImage dynamic dynamicWidthFix dynamicHeightFix height={15} width={15} mL={5} mT={2} resizemode='contain'
                  source={tokenData.chainDetails.logo_url} />
                <CText dynamic fF={C.fontsName.FONT_BOLD} fS={15} mL={5} color={Colors.primaryTextColor}>{tokenData.chainDetails.name}</CText>
              </DynamicView>

            </CyDView>
          </CyDView>
        </CyDView>

        <CyDView className={'flex flex-row items-center justify-center top-[-30px]'}>
          <CyDTouchView
            onPress={() => {
              if (valueForUsd.length > 0) {
                _validateValueForUsd();
              }
            }}
            disabled={
              parseFloat(valueForUsd) <= 0
            }
            className={clsx(
              'rounded-[12px] flex items-center w-3/4 flex flex-row justify-center',
              {
                'bg-[#FFDE59]': parseFloat(valueForUsd) > 0,
                'bg-[#dddddd]': parseFloat(valueForUsd) <= 0 || valueForUsd === ''
              }
            )}
          >
            {
              <CyDText
                className={
                  'font-nunito text-[15px] text-[#1F1F1F] font-extrabold my-[20px]'
                }
              >
                {t<string>('CONTINUE')}
              </CyDText>
            }
          </CyDTouchView>
        </CyDView>
    </CyDScrollView>
  );
}
