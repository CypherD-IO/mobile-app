import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, FlatList } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
  CyDKeyboardAwareScrollView,
} from '../../styles/tailwindComponents';
import CyDTokenValue from '../../components/v2/tokenValue';
import { screenTitle } from '../../constants';
import { showToast } from '../../containers/utilities/toastUtility';
import useBlindPayApi from './api';

// ── Config ──

const PROD_TOKENS = ['USDC', 'USDT'];
const TOKEN_OPTIONS = __DEV__ ? [...PROD_TOKENS, 'USDB'] : PROD_TOKENS;

const FIAT_CONFIG: Record<string, { code: string; symbol: string; flag: string }> = {
  USD: { code: 'USD', symbol: '$', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  BRL: { code: 'BRL', symbol: 'R$', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  MXN: { code: 'MXN', symbol: '$', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
  COP: { code: 'COP', symbol: '$', flag: '\uD83C\uDDE8\uD83C\uDDF4' },
  ARS: { code: 'ARS', symbol: '$', flag: '\uD83C\uDDE6\uD83C\uDDF7' },
};
const FIAT_CODES = Object.keys(FIAT_CONFIG);

// ── Numpad ──

function NumPad({ onPress }: { onPress: (key: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <CyDView className='flex-row flex-wrap justify-center'>
      {keys.map(k => (
        <CyDTouchView key={k} onPress={() => onPress(k)}
          className='w-[33%] items-center justify-center py-[18px]'>
          {k === 'del' ? (
            <CyDText className='text-[24px] font-extrabold text-base400'>{'<'}</CyDText>
          ) : k === '.' ? (
            <CyDText className='text-[24px] font-extrabold text-base400'>.</CyDText>
          ) : (
            <CyDText className='text-[30px] font-bold text-base400 tracking-[-0.9px]'>{k}</CyDText>
          )}
        </CyDTouchView>
      ))}
    </CyDView>
  );
}

export default function BlindPayFxPreviewScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { getFxQuote, initiateTerms } = useBlindPayApi();

  const [fromToken, setFromToken] = useState('USDC');
  const [toFiatCode, setToFiatCode] = useState('USD');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [inputMode, setInputMode] = useState<'crypto' | 'fiat' | null>(null);
  const [lastInputMode, setLastInputMode] = useState<'crypto' | 'fiat'>('crypto');
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [tosLoading, setTosLoading] = useState(false);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [fiatPickerOpen, setFiatPickerOpen] = useState(false);

  const fiat = FIAT_CONFIG[toFiatCode] ?? FIAT_CONFIG.USD;

  const handleNumPad = useCallback((key: string, setter: (v: string) => void, current: string) => {
    if (key === 'del') {
      setter(current.slice(0, -1));
    } else if (key === '.') {
      if (!current.includes('.')) setter(current + '.');
    } else {
      const dotIdx = current.indexOf('.');
      if (dotIdx >= 0 && current.length - dotIdx >= 2) return;
      setter(current + key);
    }
  }, []);

  const handleGetQuote = useCallback(async () => {
    const isFiatMode = lastInputMode === 'fiat';
    const amount = isFiatMode ? fiatAmount : cryptoAmount;
    if (!amount || Number(amount) <= 0) return;

    const cents = Math.round(Number(amount) * 100);
    if (cents < 500) {
      showToast('Minimum amount is $5.00', 'error');
      return;
    }

    setQuoteLoading(true);
    const res = await getFxQuote({
      from: fromToken,
      to: toFiatCode,
      requestAmount: cents,
      currencyType: isFiatMode ? 'receiver' : 'sender',
    });
    setQuoteLoading(false);

    if (res.isError) {
      showToast(res.errorMessage ?? 'Failed to get quote', 'error');
      return;
    }
    setQuoteResult(res.data);
    // Fill the other amount
    if (res.data?.resultAmount) {
      if (!isFiatMode) {
        setFiatAmount((res.data.resultAmount / 100).toFixed(2));
      } else {
        setCryptoAmount((res.data.resultAmount / 100).toFixed(2));
      }
    }
  }, [fromToken, toFiatCode, cryptoAmount, fiatAmount, lastInputMode, getFxQuote]);

  const handleCompleteKyc = useCallback(async () => {
    Keyboard.dismiss();
    setTosLoading(true);
    const init = await initiateTerms();
    setTosLoading(false);
    if (init.isError) {
      showToast(init.errorMessage ?? 'Something went wrong', 'error');
      return;
    }
    if (init.data?.url) {
      navigation.navigate(screenTitle.BLINDPAY_TOS_WEBVIEW, {
        url: init.data.url,
        idempotencyKey: init.data.idempotencyKey,
      });
    }
  }, [initiateTerms, navigation]);

  // ── Crypto numpad screen ──
  if (inputMode === 'crypto') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        <CyDView className='flex-row items-center justify-between px-[16px] h-[56px]'>
          <CyDTouchView onPress={() => setInputMode(null)} hitSlop={12}
            className='w-[32px] h-[32px] items-center justify-center'>
            <CyDIcons name='arrow-left' size={22} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>You send</CyDText>
          <CyDView className='w-[32px]' />
        </CyDView>
        <CyDView className='flex-1 items-center justify-center gap-[8px]'>
          <CyDView className='flex-row items-center gap-[6px] bg-n0 rounded-full px-[10px] py-[6px]'>
            <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>{fromToken}</CyDText>
          </CyDView>
          <CyDText
            className='font-bold text-p200 text-center tracking-[-1.44px]'
            style={{ fontSize: Math.round(72 * Math.max(0.4, 7 / Math.max(7, `$${cryptoAmount || '0'}`.length))) }}>
            ${cryptoAmount || '0'}
          </CyDText>
        </CyDView>
        <NumPad onPress={k => handleNumPad(k, setCryptoAmount, cryptoAmount)} />
        <CyDView className='px-[16px] pt-[16px]' style={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <CyDTouchView
            onPress={() => { setInputMode(null); void handleGetQuote(); }}
            disabled={!cryptoAmount || Number(cryptoAmount) <= 0}
            className={`rounded-full h-[58px] items-center justify-center ${
              cryptoAmount && Number(cryptoAmount) > 0 ? 'bg-[#FFDE59]' : 'bg-n40'
            }`}>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>Get Quote</CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  // ── Fiat numpad screen ──
  if (inputMode === 'fiat') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        <CyDView className='flex-row items-center justify-between px-[16px] h-[56px]'>
          <CyDTouchView onPress={() => setInputMode(null)} hitSlop={12}
            className='w-[32px] h-[32px] items-center justify-center'>
            <CyDIcons name='arrow-left' size={22} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>Recipient gets</CyDText>
          <CyDView className='w-[32px]' />
        </CyDView>
        <CyDView className='flex-1 items-center justify-center gap-[8px]'>
          <CyDView className='flex-row items-center gap-[6px] bg-n0 rounded-full px-[10px] py-[6px]'>
            <CyDText className='text-[14px]'>{fiat.flag}</CyDText>
            <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>{toFiatCode}</CyDText>
          </CyDView>
          <CyDTokenValue prefix={fiat.symbol} maxFontSize={72}>
            {Number(fiatAmount || 0)}
          </CyDTokenValue>
        </CyDView>
        <NumPad onPress={k => handleNumPad(k, setFiatAmount, fiatAmount)} />
        <CyDView className='px-[16px] pt-[16px]' style={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <CyDTouchView
            onPress={() => { setInputMode(null); void handleGetQuote(); }}
            disabled={!fiatAmount || Number(fiatAmount) <= 0}
            className={`rounded-full h-[58px] items-center justify-center ${
              fiatAmount && Number(fiatAmount) > 0 ? 'bg-[#FFDE59]' : 'bg-n40'
            }`}>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>Get Quote</CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  // ── Token picker ──
  function renderTokenPicker() {
    return (
      <Modal visible transparent animationType='fade' onRequestClose={() => setTokenPickerOpen(false)}>
        <CyDView className='flex-1 justify-end bg-black/50'>
          <CyDTouchView className='flex-1' onPress={() => setTokenPickerOpen(false)} />
          <Animated.View entering={SlideInDown.duration(300)} style={{ maxHeight: '60%' }}>
            <CyDView className='bg-n20 rounded-t-[24px]'>
              <CyDView className='items-center pt-[12px] pb-[8px]'>
                <CyDView className='w-[32px] h-[4px] bg-n50 rounded-[5px]' />
              </CyDView>
              <CyDView className='px-[16px] pb-[10px]'>
                <CyDText className='text-[16px] font-semibold text-n90 tracking-[-0.8px]'>Select Token</CyDText>
              </CyDView>
              {TOKEN_OPTIONS.map(token => (
                <CyDTouchView key={token}
                  onPress={() => { setFromToken(token); setTokenPickerOpen(false); setQuoteResult(null); }}
                  className='bg-n0 px-[16px] py-[14px] flex-row items-center justify-between border-b border-n40'>
                  <CyDText className='text-[16px] font-semibold text-base400'>{token}</CyDText>
                  {token === fromToken ? <CyDMaterialDesignIcons name='check-circle' size={20} className='text-[#FBC02D]' /> : null}
                </CyDTouchView>
              ))}
              <CyDView style={{ height: insets.bottom + 16 }} />
            </CyDView>
          </Animated.View>
        </CyDView>
      </Modal>
    );
  }

  // ── Fiat picker ──
  function renderFiatPicker() {
    return (
      <Modal visible transparent animationType='fade' onRequestClose={() => setFiatPickerOpen(false)}>
        <CyDView className='flex-1 justify-end bg-black/50'>
          <CyDTouchView className='flex-1' onPress={() => setFiatPickerOpen(false)} />
          <Animated.View entering={SlideInDown.duration(300)} style={{ maxHeight: '60%' }}>
            <CyDView className='bg-n20 rounded-t-[24px]'>
              <CyDView className='items-center pt-[12px] pb-[8px]'>
                <CyDView className='w-[32px] h-[4px] bg-n50 rounded-[5px]' />
              </CyDView>
              <CyDView className='px-[16px] pb-[10px]'>
                <CyDText className='text-[16px] font-semibold text-n90 tracking-[-0.8px]'>Select Currency</CyDText>
              </CyDView>
              {FIAT_CODES.map(code => {
                const f = FIAT_CONFIG[code];
                return (
                  <CyDTouchView key={code}
                    onPress={() => { setToFiatCode(code); setFiatPickerOpen(false); setQuoteResult(null); }}
                    className='bg-n0 px-[16px] py-[14px] flex-row items-center justify-between border-b border-n40'>
                    <CyDView className='flex-row items-center gap-[10px]'>
                      <CyDText className='text-[18px]'>{f.flag}</CyDText>
                      <CyDText className='text-[16px] font-semibold text-base400'>{code}</CyDText>
                    </CyDView>
                    {code === toFiatCode ? <CyDMaterialDesignIcons name='check-circle' size={20} className='text-[#FBC02D]' /> : null}
                  </CyDTouchView>
                );
              })}
              <CyDView style={{ height: insets.bottom + 16 }} />
            </CyDView>
          </Animated.View>
        </CyDView>
      </Modal>
    );
  }

  // ── Main page ──
  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      <CyDView className='flex-row items-center gap-[4px] px-[4px] py-[8px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
          className='w-[48px] h-[48px] items-center justify-center'>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] flex-1'>
          Convert Preview
        </CyDText>
      </CyDView>

      <CyDKeyboardAwareScrollView className='flex-1' enableOnAndroid enableAutomaticScroll
        keyboardShouldPersistTaps='handled'
        contentContainerClassName='px-[16px] pb-[24px] gap-[12px]'>

        {/* Complete KYC button */}
        <CyDTouchView
          onPress={handleCompleteKyc}
          disabled={tosLoading}
          className={`rounded-full h-[44px] items-center justify-center ${tosLoading ? 'bg-n40' : 'bg-[#F7C645]'}`}>
          <CyDView className='relative items-center justify-center'>
            <CyDText className={`text-[14px] font-bold text-black tracking-[-0.16px] ${tosLoading ? 'opacity-0' : ''}`}>
              Complete KYC to Get Started
            </CyDText>
            {tosLoading ? <CyDView className='absolute inset-0 items-center justify-center'><ActivityIndicator color='#0D0D0D' /></CyDView> : null}
          </CyDView>
        </CyDTouchView>

        {/* Info banner */}
        <CyDView className='bg-[#FFF9EA] border border-n30 rounded-[12px] p-[12px] flex-row items-center gap-[8px]'>
          <CyDMaterialDesignIcons name='information-outline' size={18} className='text-[#C99200]' />
          <CyDText className='text-[12px] font-medium text-base400 flex-1 leading-[1.45]'>
            Preview exchange rates. Complete KYC to start sending money.
          </CyDText>
        </CyDView>

        {/* Amount card */}
        <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[14px]'>
          {/* You send */}
          <CyDView className='gap-[6px]'>
            <CyDText className='text-[14px] font-medium text-n90 tracking-[-0.6px]'>You send exactly</CyDText>
            <CyDView className='flex-row items-center justify-between'>
              <CyDTouchView onPress={() => setTokenPickerOpen(true)}
                className='flex-row items-center gap-[6px] bg-n30 rounded-[24px] px-[10px] py-[5px]'>
                <CyDText className='text-[14px] font-semibold text-base400'>{fromToken}</CyDText>
                <CyDMaterialDesignIcons name='chevron-down' size={16} className='text-base400' />
              </CyDTouchView>
              <CyDTouchView onPress={() => { setLastInputMode('crypto'); setInputMode('crypto'); }}>
                <CyDTokenValue prefix='$' className='text-[32px]'>{Number(cryptoAmount || 0)}</CyDTokenValue>
              </CyDTouchView>
            </CyDView>
          </CyDView>

          <CyDView className='h-px bg-n30' />

          {/* Recipient gets */}
          <CyDView className='gap-[6px]'>
            <CyDText className='text-[14px] font-medium text-n90 tracking-[-0.6px]'>Recipient gets</CyDText>
            <CyDView className='flex-row items-center justify-between'>
              <CyDTouchView onPress={() => setFiatPickerOpen(true)}
                className='flex-row items-center gap-[4px] bg-n30 rounded-[24px] px-[10px] py-[5px]'>
                <CyDText className='text-[14px]'>{fiat.flag}</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400'>{toFiatCode}</CyDText>
                <CyDMaterialDesignIcons name='chevron-down' size={16} className='text-base400' />
              </CyDTouchView>
              <CyDTouchView onPress={() => { setLastInputMode('fiat'); setInputMode('fiat'); }}>
                {quoteLoading ? (
                  <ActivityIndicator size='small' />
                ) : (
                  <CyDTokenValue prefix={fiat.symbol} className='text-[28px]'>
                    {quoteResult?.resultAmount ? quoteResult.resultAmount / 100 : Number(fiatAmount || 0)}
                  </CyDTokenValue>
                )}
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Rate details */}
        {quoteResult ? (
          <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[14px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[14px] font-medium text-n90'>Exchange rate</CyDText>
              <CyDText className='text-[14px] font-semibold text-base400'>
                1 {fromToken} = {((quoteResult.blindpayQuotation ?? 0) / 100).toFixed(2)} {toFiatCode}
              </CyDText>
            </CyDView>
            {quoteResult.instanceFlatFee != null ? (
              <>
                <CyDView className='h-px bg-n30' />
                <CyDView className='flex-row items-center justify-between'>
                  <CyDText className='text-[14px] font-medium text-n90'>Fees</CyDText>
                  <CyDText className='text-[14px] font-semibold text-base400'>
                    {quoteResult.instanceFlatFee === 0 ? 'Free' : `${fiat.symbol}${(quoteResult.instanceFlatFee / 100).toFixed(2)}`}
                  </CyDText>
                </CyDView>
              </>
            ) : null}
          </CyDView>
        ) : null}
      </CyDKeyboardAwareScrollView>

      {/* Bottom: Get Quote */}
      <CyDView className='px-[16px] pt-[12px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDTouchView
          onPress={() => void handleGetQuote()}
          disabled={quoteLoading || (!cryptoAmount && !fiatAmount)}
          className={`rounded-full h-[48px] items-center justify-center ${
            (cryptoAmount || fiatAmount) && !quoteLoading ? 'bg-[#F7C645]' : 'bg-n40'
          }`}>
          <CyDView className='relative items-center justify-center'>
            <CyDText className={`text-[16px] font-bold text-black tracking-[-0.16px] ${quoteLoading ? 'opacity-0' : ''}`}>
              Get Quote
            </CyDText>
            {quoteLoading ? <CyDView className='absolute inset-0 items-center justify-center'><ActivityIndicator color='#0D0D0D' /></CyDView> : null}
          </CyDView>
        </CyDTouchView>
      </CyDView>

      {tokenPickerOpen ? renderTokenPicker() : null}
      {fiatPickerOpen ? renderFiatPicker() : null}
    </CyDSafeAreaView>
  );
}
