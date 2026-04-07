import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
  CyDScrollView,
  CyDKeyboardAwareScrollView,
} from '../../../styles/tailwindComponents';
import { screenTitle } from '../../../constants';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import { HdWalletContext } from '../../../core/util';
import ReviewCard from '../components/ReviewCard';

const CHAINS = [
  { value: 'ethereum', label: 'Ethereum', flag: '\u2B21' },
  { value: 'arbitrum', label: 'Arbitrum', flag: '\u25B3' },
  { value: 'polygon', label: 'Polygon', flag: '\u2B23' },
  { value: 'base', label: 'Base', flag: '\u25CF' },
  { value: 'solana', label: 'Solana', flag: '\u25C8' },
];

const TOKENS = [
  { value: 'USDC', label: 'USDC' },
  { value: 'USDT', label: 'USDT' },
];

const FIAT_MAP: Record<string, string> = {
  ach: 'USD', wire: 'USD', rtp: 'USD',
  pix: 'BRL', pix_safe: 'BRL',
  spei_bitso: 'MXN',
  ach_cop_bitso: 'COP',
  transfers_bitso: 'ARS',
  international_swift: 'USD',
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DropdownSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string;
  options: { value: string; label: string }[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType='fade' onRequestClose={onClose}>
      <CyDView className='flex-1 justify-end bg-black/40'>
        <CyDTouchView className='flex-1' onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(300)}>
          <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
            <CyDView className='items-center pt-[12px] pb-[16px]'>
              <CyDView className='w-[32px] h-[4px] bg-n50 rounded-[5px]' />
            </CyDView>
            <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
              {title}
            </CyDText>
            <CyDScrollView className='max-h-[300px]' showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); onClose(); }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>{opt.label}</CyDText>
                  {selected === opt.value ? (
                    <CyDMaterialDesignIcons name='check' size={20} className='text-[#FBC02D]' />
                  ) : null}
                </CyDTouchView>
              ))}
            </CyDScrollView>
          </CyDView>
        </Animated.View>
      </CyDView>
    </Modal>
  );
}

export default function BlindPayPayoutFormScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, { bankAccount?: any }>, string>>();
  const insets = useSafeAreaInsets();
  const { getStatus, getFxQuote, createQuote, createEvmPayout, createSolanaPayout, prepareSolanaDelegate } = useBlindPayApi();
  const hdWallet = useContext(HdWalletContext) as any;

  const evmAddress = hdWallet?.state?.wallet?.ethereum?.address ?? '';
  const solanaAddress = hdWallet?.state?.wallet?.solana?.address ?? '';

  // Form state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(route.params?.bankAccount ?? null);
  const [token, setToken] = useState('USDC');
  const [chain, setChain] = useState('arbitrum');
  const [amount, setAmount] = useState('');
  const [currencyType, setCurrencyType] = useState<'sender' | 'receiver'>('sender');

  // Pickers
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);

  // FX preview
  const [fxRate, setFxRate] = useState<any>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const fxTimer = useRef<any>(null);

  // Quote + payout
  const [step, setStep] = useState<'form' | 'confirm' | 'status'>('form');
  const [quote, setQuote] = useState<any>(null);
  const [payout, setPayout] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getStatusRef.current().then(res => {
        if (cancelled) return;
        if (!res.isError && res.data?.blindpay?.bankAccounts) {
          setAccounts(res.data.blindpay.bankAccounts);
        }
      });
      return () => { cancelled = true; };
    }, []),
  );

  const fiatCurrency = useMemo(
    () => FIAT_MAP[selectedAccount?.type] ?? 'USD',
    [selectedAccount],
  );

  const isSolana = chain === 'solana' || chain === 'solana_devnet';
  const walletAddress = isSolana ? solanaAddress : evmAddress;

  // Debounced FX quote
  useEffect(() => {
    if (fxTimer.current) clearTimeout(fxTimer.current);
    const amountCents = Math.round(Number(amount) * 100);
    if (!amount || isNaN(amountCents) || amountCents < 500) {
      setFxRate(null);
      return;
    }
    setFxLoading(true);
    fxTimer.current = setTimeout(async () => {
      const res = await getFxQuote({
        from: token,
        to: fiatCurrency,
        requestAmount: amountCents,
        currencyType,
      });
      setFxLoading(false);
      if (!res.isError && res.data) setFxRate(res.data);
      else setFxRate(null);
    }, 500);
    return () => { if (fxTimer.current) clearTimeout(fxTimer.current); };
  }, [amount, token, fiatCurrency, currencyType]);

  const handleGetQuote = useCallback(async () => {
    Keyboard.dismiss();
    const e: Record<string, string> = {};
    if (!selectedAccount) e.account = 'Select a bank account';
    const amountCents = Math.round(Number(amount) * 100);
    if (!amount || isNaN(amountCents) || amountCents < 500) e.amount = 'Minimum $5.00';
    if (!walletAddress) e.wallet = 'No wallet address available';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    const res = await createQuote({
      bankAccountId: selectedAccount.id,
      currencyType,
      requestAmount: amountCents,
      network: chain,
      token,
      coverFees: true,
    });
    setSubmitting(false);

    if (res.isError) {
      showToast(res.errorMessage ?? 'Failed to get quote', 'error');
      return;
    }
    setQuote(res.data);
    setStep('confirm');
  }, [selectedAccount, amount, chain, token, currencyType, walletAddress, createQuote]);

  const handleConfirmPayout = useCallback(async () => {
    if (!quote) return;
    setSubmitting(true);

    if (isSolana) {
      // Solana: prepare delegate → sign → create payout
      const prepRes = await prepareSolanaDelegate({
        ownerAddress: solanaAddress,
        quoteId: quote.id,
      });
      if (prepRes.isError) {
        setSubmitting(false);
        showToast(prepRes.errorMessage ?? 'Failed to prepare transaction', 'error');
        return;
      }
      // TODO: Sign the transaction with the user's Solana wallet
      // For now, show error that Solana signing is not yet implemented
      setSubmitting(false);
      showToast('Solana transaction signing coming soon', 'error');
      return;
    }

    // EVM payout
    const payRes = await createEvmPayout({
      quoteId: quote.id,
      senderWalletAddress: evmAddress,
    });
    setSubmitting(false);

    if (payRes.isError) {
      showToast(payRes.errorMessage ?? 'Failed to create payout', 'error');
      return;
    }
    if (payRes.data) {
      setPayout(payRes.data);
      navigation.navigate(screenTitle.BLINDPAY_PAYOUT_STATUS, {
        payoutId: payRes.data.id,
        payout: payRes.data,
      });
    }
  }, [quote, isSolana, solanaAddress, evmAddress, createEvmPayout, prepareSolanaDelegate, navigation]);

  // ── Form step ──
  if (step === 'form') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
        <CyDView className='flex-row items-center px-[16px] h-[64px]'>
          <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>

        <CyDView className='px-[16px] pb-[12px]'>
          <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
            Send Money
          </CyDText>
        </CyDView>

        <CyDKeyboardAwareScrollView
          className='flex-1'
          enableOnAndroid enableAutomaticScroll
          keyboardShouldPersistTaps='handled'
          extraScrollHeight={32}
          contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'>

          {/* Bank account selector */}
          <CyDView className='gap-[4px]'>
            <CyDText className='text-[14px] font-normal text-n200 tracking-[-0.6px]'>Recipient</CyDText>
            <CyDTouchView
              onPress={() => setAccountPickerOpen(true)}
              className={`bg-n0 border ${errors.account ? 'border-errorText' : 'border-n40'} rounded-[8px] px-[12px] h-[48px] flex-row items-center justify-between`}>
              <CyDText className={`text-[16px] tracking-[-0.8px] ${selectedAccount ? 'font-medium text-base400' : 'font-normal text-n70'}`}>
                {selectedAccount?.name ?? 'Select bank account'}
              </CyDText>
              <CyDMaterialDesignIcons name='chevron-down' size={20} className='text-n70' />
            </CyDTouchView>
            {errors.account ? <CyDText className='text-[12px] text-errorText'>{errors.account}</CyDText> : null}
          </CyDView>

          {/* Token + Chain row */}
          <CyDView className='flex-row gap-[12px]'>
            <CyDView className='flex-1 gap-[4px]'>
              <CyDText className='text-[14px] font-normal text-n200 tracking-[-0.6px]'>Token</CyDText>
              <CyDTouchView
                onPress={() => setOpenPicker('token')}
                className='bg-n0 border border-n40 rounded-[8px] px-[12px] h-[48px] flex-row items-center justify-between'>
                <CyDText className='text-[16px] font-medium text-base400'>{token}</CyDText>
                <CyDMaterialDesignIcons name='chevron-down' size={18} className='text-n70' />
              </CyDTouchView>
            </CyDView>
            <CyDView className='flex-1 gap-[4px]'>
              <CyDText className='text-[14px] font-normal text-n200 tracking-[-0.6px]'>Chain</CyDText>
              <CyDTouchView
                onPress={() => setOpenPicker('chain')}
                className='bg-n0 border border-n40 rounded-[8px] px-[12px] h-[48px] flex-row items-center justify-between'>
                <CyDText className='text-[16px] font-medium text-base400'>
                  {CHAINS.find(c => c.value === chain)?.label ?? chain}
                </CyDText>
                <CyDMaterialDesignIcons name='chevron-down' size={18} className='text-n70' />
              </CyDTouchView>
            </CyDView>
          </CyDView>

          {/* Amount input */}
          <CyDView className='gap-[4px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[14px] font-normal text-n200 tracking-[-0.6px]'>
                {currencyType === 'sender' ? 'You send' : 'Recipient gets'}
              </CyDText>
              <CyDTouchView
                onPress={() => setCurrencyType(currencyType === 'sender' ? 'receiver' : 'sender')}
                className='flex-row items-center gap-[4px]'>
                <CyDMaterialDesignIcons name='swap-horizontal' size={16} className='text-n200' />
                <CyDText className='text-[12px] font-medium text-n200'>
                  {currencyType === 'sender' ? `Switch to ${fiatCurrency}` : `Switch to ${token}`}
                </CyDText>
              </CyDTouchView>
            </CyDView>
            <CyDView className={`bg-n0 border ${errors.amount ? 'border-errorText' : 'border-n40'} rounded-[8px] px-[12px] h-[56px] flex-row items-center`}>
              <CyDText className='text-[24px] font-semibold text-base400 mr-[4px]'>$</CyDText>
              <CyDTextInput
                className='flex-1 text-[24px] font-semibold text-base400 py-0 bg-transparent'
                value={amount}
                onChangeText={v => { setAmount(v.replace(/[^0-9.]/g, '')); setErrors({}); }}
                placeholder='0.00'
                placeholderTextColor='#C2C7D0'
                keyboardType='decimal-pad'
                returnKeyType='done'
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <CyDText className='text-[14px] font-medium text-n200'>
                {currencyType === 'sender' ? token : fiatCurrency}
              </CyDText>
            </CyDView>
            {errors.amount ? <CyDText className='text-[12px] text-errorText'>{errors.amount}</CyDText> : null}
          </CyDView>

          {/* FX rate preview */}
          {fxLoading ? (
            <CyDView className='flex-row items-center gap-[8px] py-[8px]'>
              <ActivityIndicator size='small' />
              <CyDText className='text-[13px] text-n200'>Getting rate...</CyDText>
            </CyDView>
          ) : fxRate ? (
            <CyDView className='bg-n10 rounded-[8px] p-[12px] gap-[4px]'>
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[13px] text-n200'>Rate</CyDText>
                <CyDText className='text-[13px] font-medium text-base400'>
                  1 {token} = {fxRate.exchangeRate} {fiatCurrency}
                </CyDText>
              </CyDView>
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[13px] text-n200'>Recipient gets</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400'>
                  ${formatCents(fxRate.receiverAmount)} {fiatCurrency}
                </CyDText>
              </CyDView>
            </CyDView>
          ) : null}

          {errors.wallet ? <CyDText className='text-[12px] text-errorText'>{errors.wallet}</CyDText> : null}
        </CyDKeyboardAwareScrollView>

        {/* Bottom */}
        <CyDView className='px-[16px] pt-[12px] border-t border-n40' style={{ paddingBottom: Math.max(8, insets.bottom) }}>
          <CyDTouchView
            onPress={() => { void handleGetQuote(); }}
            disabled={submitting}
            className='rounded-full h-[48px] bg-[#FBC02D] items-center justify-center'>
            <CyDView className='relative items-center justify-center'>
              <CyDText className={`text-[16px] font-bold text-black tracking-[-0.16px] ${submitting ? 'opacity-0' : ''}`}>
                Get Quote
              </CyDText>
              {submitting ? <CyDView className='absolute inset-0 items-center justify-center'><ActivityIndicator color='#0D0D0D' /></CyDView> : null}
            </CyDView>
          </CyDTouchView>
        </CyDView>

        {/* Pickers */}
        <DropdownSheet visible={openPicker === 'token'} title='Token' options={TOKENS} selected={token}
          onSelect={v => { setToken(v); setFxRate(null); }} onClose={() => setOpenPicker(null)} />
        <DropdownSheet visible={openPicker === 'chain'} title='Chain' options={CHAINS} selected={chain}
          onSelect={setChain} onClose={() => setOpenPicker(null)} />
        <DropdownSheet visible={accountPickerOpen} title='Select Account'
          options={accounts.map(a => ({ value: a.id, label: a.name ?? 'Account' }))}
          selected={selectedAccount?.id ?? ''}
          onSelect={v => { setSelectedAccount(accounts.find(a => a.id === v)); setErrors({}); }}
          onClose={() => setAccountPickerOpen(false)} />
      </CyDSafeAreaView>
    );
  }

  // ── Confirm step ──
  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center px-[16px] h-[64px]'>
        <CyDTouchView onPress={() => setStep('form')} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          Confirm Payout
        </CyDText>
      </CyDView>

      <CyDScrollView className='flex-1' contentContainerClassName='px-[16px] pb-[24px] gap-[12px]'>
        {quote ? (
          <>
            <ReviewCard title='Payout Details' rows={[
              { label: 'You send', value: `${formatCents(quote.senderAmount)} ${token}` },
              { label: 'Recipient gets', value: `$${formatCents(quote.receiverAmount)} ${fiatCurrency}` },
              { label: 'Exchange rate', value: `${quote.exchangeRate}` },
              { label: 'Fees', value: quote.fees ? `$${formatCents(quote.fees)}` : 'Free' },
            ]} />
            <ReviewCard title='Route' rows={[
              { label: 'Chain', value: CHAINS.find(c => c.value === chain)?.label ?? chain },
              { label: 'Token', value: token },
              { label: 'Bank account', value: selectedAccount?.name ?? '—' },
            ]} />
            <ReviewCard title='Wallet' rows={[
              { label: 'Address', value: walletAddress ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-6)}` : '—' },
            ]} />
            {quote.expiresAt ? (
              <CyDView className='bg-n10 rounded-[8px] p-[10px] flex-row items-center gap-[6px]'>
                <CyDMaterialDesignIcons name='clock-outline' size={16} className='text-n200' />
                <CyDText className='text-[12px] font-medium text-n200'>
                  Quote expires: {new Date(quote.expiresAt).toLocaleTimeString()}
                </CyDText>
              </CyDView>
            ) : null}
          </>
        ) : null}
      </CyDScrollView>

      <CyDView className='px-[16px] pt-[12px] border-t border-n40' style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDTouchView
          onPress={() => { void handleConfirmPayout(); }}
          disabled={submitting}
          className='rounded-full h-[48px] bg-[#FBC02D] items-center justify-center'>
          <CyDView className='relative items-center justify-center'>
            <CyDText className={`text-[16px] font-bold text-black tracking-[-0.16px] ${submitting ? 'opacity-0' : ''}`}>
              Confirm & Pay
            </CyDText>
            {submitting ? <CyDView className='absolute inset-0 items-center justify-center'><ActivityIndicator color='#0D0D0D' /></CyDView> : null}
          </CyDView>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
