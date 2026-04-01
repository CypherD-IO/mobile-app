import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDImage,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
  CyDKeyboardAwareScrollView,
} from '../../styles/tailwindComponents';
import { screenTitle } from '../../constants';
import { showToast } from '../../containers/utilities/toastUtility';
import useBlindPayApi from './api';
import { HdWalletContext } from '../../core/util';
import { useGlobalBottomSheet } from '../../components/v2/GlobalBottomSheetProvider';
import type { Holding } from '../../core/portfolio';
import CyDTokenAmount from '../../components/v2/tokenAmount';
import CyDTokenValue from '../../components/v2/tokenValue';


const RAIL_FLAGS: Record<string, string> = {
  ach: '\uD83C\uDDFA\uD83C\uDDF8', wire: '\uD83C\uDDFA\uD83C\uDDF8',
  rtp: '\uD83C\uDDFA\uD83C\uDDF8', pix: '\uD83C\uDDE7\uD83C\uDDF7',
  pix_safe: '\uD83C\uDDE7\uD83C\uDDF7', spei_bitso: '\uD83C\uDDF2\uD83C\uDDFD',
  transfers_bitso: '\uD83C\uDDE6\uD83C\uDDF7', ach_cop_bitso: '\uD83C\uDDE8\uD83C\uDDF4',
  international_swift: '\uD83C\uDF10',
};
const RAIL_LABELS: Record<string, string> = {
  ach: 'ACH', wire: 'Wire', rtp: 'RTP', pix: 'PIX', pix_safe: 'PIX Safe',
  spei_bitso: 'SPEI', transfers_bitso: 'Transfers', ach_cop_bitso: 'ACH COP',
  international_swift: 'SWIFT',
};
const RAIL_SETTLEMENT: Record<string, string> = {
  international_swift: '~5 business days',
  ach: '~2 business days',
  wire: '~1 business day',
  rtp: 'Instant',
  pix: 'Instant',
  pix_safe: 'Instant',
  spei_bitso: 'Instant',
  ach_cop_bitso: '~1 business day',
  transfers_bitso: 'Instant',
};
const PROD_CHAINS = ['eth', 'arbitrum', 'polygon', 'base', 'solana'];
const SUPPORTED_CHAINS = __DEV__
  ? [...PROD_CHAINS, 'base_sepolia']
  : PROD_CHAINS;
const PROD_TOKEN_SYMBOLS = ['USDC', 'USDT'];
const TEST_TOKEN_SYMBOLS = ['USDB'];
const TOKEN_SYMBOLS = __DEV__
  ? [...PROD_TOKEN_SYMBOLS, ...TEST_TOKEN_SYMBOLS]
  : PROD_TOKEN_SYMBOLS;

const CHAIN_TO_NETWORK: Record<string, string> = {
  eth: 'ethereum', arbitrum: 'arbitrum', polygon: 'polygon', base: 'base',
  solana: 'solana', base_sepolia: 'base_sepolia',
};

const FIAT_CONFIG: Record<string, { code: string; symbol: string; name: string; flag: string }> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', flag: '\uD83C\uDDE8\uD83C\uDDF4' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', flag: '\uD83C\uDDE6\uD83C\uDDF7' },
};
const RAIL_TO_FIAT: Record<string, string> = {
  ach: 'USD', wire: 'USD', rtp: 'USD', pix: 'BRL', pix_safe: 'BRL',
  spei_bitso: 'MXN', ach_cop_bitso: 'COP', transfers_bitso: 'ARS',
  international_swift: 'USD',
};

function formatCents(c: number) {
  return (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTimer(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// ── Token logo with chain badge overlay ──
function TokenLogoWithChain({
  logoUrl, chainLogoSource, size = 44,
}: { logoUrl?: string; chainLogoSource?: any; size?: number }) {
  const badgeSize = Math.max(14, Math.round(size * 0.42));
  return (
    <CyDView style={{ width: size, height: size }}>
      {logoUrl ? (
        <CyDImage source={{ uri: logoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode='contain' />
      ) : (
        <CyDView style={{ width: size, height: size, borderRadius: size / 2 }}
          className='bg-n30 items-center justify-center'>
          <CyDText className='text-[12px] font-bold text-base400'>?</CyDText>
        </CyDView>
      )}
      {chainLogoSource ? (
        <CyDView
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            borderWidth: 1.5,
            borderColor: '#F2F4F5',
            overflow: 'hidden',
          }}>
          <CyDImage source={chainLogoSource}
            style={{ width: badgeSize - 3, height: badgeSize - 3 }}
            resizeMode='contain' />
        </CyDView>
      ) : null}
    </CyDView>
  );
}

// ── Token+Chain item for the combined selector ──
interface TokenChainItem {
  symbol: string;
  chain: string;
  chainName: string;
  network: string;
  logoUrl: string;
  chainLogo: any;
  balance: number;
  balanceToken: string;
}

// ── Custom numpad (matches Figma) ──
function NumPad({ onPress }: { onPress: (key: string) => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','del'];
  return (
    <CyDView className='flex-row flex-wrap justify-center'>
      {keys.map(k => (
        <CyDTouchView
          key={k}
          onPress={() => onPress(k)}
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

// ── Main screen ──
export default function BlindPaySendMoneyScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { getStatus, createQuote } = useBlindPayApi();
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;
  const hdWallet = useContext(HdWalletContext) as any;
  const evmAddress = hdWallet?.state?.wallet?.ethereum?.address ?? '';
  const { showBottomSheet, hideBottomSheet } = useGlobalBottomSheet();

  // Data
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [allTokens, setAllTokens] = useState<TokenChainItem[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenChainItem | null>(null);

  // Amount
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [inputMode, setInputMode] = useState<'crypto' | 'fiat' | null>(null);
  const [lastInputMode, setLastInputMode] = useState<'crypto' | 'fiat'>('crypto');

  // Quote
  const [quote, setQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteExpiryMs, setQuoteExpiryMs] = useState(0);
  const [quoteTimeLeft, setQuoteTimeLeft] = useState(0);

  // Pickers
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  const hasRecipient = !!selectedAccount;
  const fiatCode = RAIL_TO_FIAT[selectedAccount?.type] ?? 'USD';
  const fiat = FIAT_CONFIG[fiatCode] ?? FIAT_CONFIG.USD;

  // Fetch accounts + portfolio tokens
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const statusRes = await getStatusRef.current();
        if (cancelled) return;
        if (!statusRes.isError && statusRes.data?.blindpay?.bankAccounts) {
          setAccounts(statusRes.data.blindpay.bankAccounts);
        }
        // Load portfolio tokens
        try {
          const addr = evmAddress;
          if (!addr) return;
          const { getPortfolioData } = await import('../../core/asyncStorage');
          const portfolio = await getPortfolioData(addr);
          if (!portfolio?.data || cancelled) return;
          const items: TokenChainItem[] = [];
          for (const chainKey of SUPPORTED_CHAINS) {
            const holdings: Holding[] = (portfolio.data as any)[chainKey]?.totalHoldings ?? [];
            for (const h of holdings) {
              if (TOKEN_SYMBOLS.includes(h.symbol?.toUpperCase())) {
                items.push({
                  symbol: h.symbol?.toUpperCase(),
                  chain: chainKey,
                  chainName: h.chainDetails?.name ?? chainKey,
                  network: CHAIN_TO_NETWORK[chainKey] ?? chainKey,
                  logoUrl: h.logoUrl ?? '',
                  chainLogo: h.chainDetails?.logo_url,
                  balance: h.totalValue ?? 0,
                  balanceToken: h.balanceDecimal ?? '0',
                });
              }
            }
          }
          // Sort: highest balance first
          items.sort((a, b) => b.balance - a.balance);
          if (!cancelled) {
            setAllTokens(items);
            if (!selectedToken && items.length > 0) setSelectedToken(items[0]);
          }
        } catch {}
      })();
      return () => { cancelled = true; };
    }, [evmAddress]),
  );

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return allTokens;
    const q = searchQuery.toLowerCase();
    return allTokens.filter(t =>
      t.symbol.toLowerCase().includes(q) || t.chain.toLowerCase().includes(q));
  }, [allTokens, searchQuery]);

  // Numpad handler
  const handleNumPad = useCallback((key: string, setter: (v: string) => void, current: string) => {
    if (key === 'del') {
      setter(current.slice(0, -1));
    } else if (key === '.') {
      if (!current.includes('.')) setter(current + '.');
    } else {
      // Limit to 2 decimal places
      const dotIdx = current.indexOf('.');
      if (dotIdx >= 0 && current.length - dotIdx >= 2) return;
      setter(current + key);
    }
  }, []);

  // Get quote
  const handleGetQuote = useCallback(async () => {
    if (!selectedAccount || !selectedToken) return;
    const coverFees = lastInputMode === 'fiat';
    const amount = coverFees ? fiatAmount : cryptoAmount;
    if (!amount || Number(amount) <= 0) return;

    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents < 500) {
      showToast('Minimum amount is $5.00', 'error');
      return;
    }

    setQuoteLoading(true);
    const res = await createQuote({
      bankAccountId: selectedAccount.id,
      currencyType: coverFees ? 'receiver' : 'sender',
      requestAmount: amountCents,
      network: selectedToken.network,
      token: selectedToken.symbol,
      coverFees,
    });
    setQuoteLoading(false);

    if (res.isError) {
      showToast(res.errorMessage ?? 'Failed to get quote', 'error');
      return;
    }
    setQuote(res.data);
    // Set expiry timer (minus 30s safety margin)
    if (res.data?.expiresAt) {
      const expiryMs = new Date(res.data.expiresAt).getTime() - 30_000;
      setQuoteExpiryMs(expiryMs);
      setQuoteTimeLeft(Math.max(0, expiryMs - Date.now()));
    }
    // Fill the other amount from quote (use plain number, not locale-formatted)
    if (!coverFees && res.data?.receiverAmount) {
      setFiatAmount((res.data.receiverAmount / 100).toFixed(2));
    }
    if (coverFees && res.data?.senderAmount) {
      setCryptoAmount((res.data.senderAmount / 100).toFixed(2));
    }
  }, [selectedAccount, selectedToken, cryptoAmount, fiatAmount, lastInputMode, createQuote]);

  // Quote countdown timer
  useEffect(() => {
    if (!quoteExpiryMs || !quote) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, quoteExpiryMs - Date.now());
      setQuoteTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setQuote(null);
        setQuoteExpiryMs(0);
        hideBottomSheet('blindpay-review');
        showToast('Quote expired. Please get a new quote.', 'error');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quoteExpiryMs, quote]);

  // Navigate to payout status screen (approve + sign happens there)
  const handleConfirm = useCallback(() => {
    if (!quote || !evmAddress) return;
    hideBottomSheet('blindpay-review');
    // Clear quote and reset inputs
    const navQuote = quote;
    setQuote(null);
    setQuoteExpiryMs(0);
    setQuoteTimeLeft(0);
    setCryptoAmount('');
    setFiatAmount('');
    navigation.navigate(screenTitle.BLINDPAY_PAYOUT_STATUS, {
      quote: navQuote,
      evmAddress,
      selectedAccount,
      selectedToken,
      fiatCode,
      fiatSymbol: fiat.symbol,
    });
  }, [quote, evmAddress, selectedAccount, selectedToken, fiatCode, fiat.symbol, hideBottomSheet, navigation]);

  const balanceLow = selectedToken && Number(cryptoAmount || 0) > selectedToken.balance;

  // Open review bottom sheet
  const openReviewSheet = useCallback(() => {
    if (!quote) return;
    const settlement = RAIL_SETTLEMENT[selectedAccount?.type] ?? '~2 business days';
    const isInstant = settlement === 'Instant';
    const totalFee = (quote.flatFee ?? 0) + (quote.billingFeeAmount ?? 0) + (quote.partnerFeeAmount ?? 0);
    const isFree = totalFee === 0;
    const senderPaysFee = lastInputMode === 'fiat';
    const feeDisplay = senderPaysFee
      ? `${formatCents(totalFee)} ${selectedToken?.symbol ?? 'USDC'}`
      : `${fiat.symbol}${formatCents(totalFee)}`;

    showBottomSheet({
      id: 'blindpay-review',
      snapPoints: ['75%', '95%'],
      showHandle: true,
      showCloseButton: true,
      scrollable: false,
      enableContentPanningGesture: false,
      onClose: () => hideBottomSheet('blindpay-review'),
      content: (
        <CyDView className='px-[16px] pb-[16px] gap-[12px]'>
          {/* Title */}
          <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px]'>
            Review Transaction
          </CyDText>

          {/* Section label */}
          <CyDView className='flex-row items-center gap-[5px]'>
            <CyDMaterialDesignIcons name='shield-check-outline' size={16} className='text-n90' />
            <CyDText className='text-[12px] font-medium text-n90'>Your Transaction</CyDText>
          </CyDView>

          {/* Transaction card */}
          <CyDView className='bg-n0 rounded-[10px]'>
            {/* From section */}
            <CyDView className='p-[12px] gap-[12px]'>
              <CyDText className='text-[12px] font-medium text-n200'>From</CyDText>
              <CyDView className='flex-row items-center gap-[8px]'>
                {selectedToken ? (
                  <TokenLogoWithChain logoUrl={selectedToken.logoUrl} chainLogoSource={selectedToken.chainLogo} size={36} />
                ) : null}
                <CyDTokenValue className='text-[24px]' prefix=''>
                  {quote.senderAmount ? quote.senderAmount / 100 : Number(cryptoAmount || 0)}
                </CyDTokenValue>
              </CyDView>
              <CyDText className='text-[12px] font-medium text-n90'>
                Will be deducted from your spending balance
              </CyDText>
            </CyDView>

            <CyDView className='h-px bg-n30' />

            {/* Est. Received section */}
            <CyDView className='p-[12px] gap-[12px]'>
              <CyDText className='text-[12px] font-medium text-n200'>Est. Received</CyDText>
              <CyDView className='flex-row items-center gap-[1px]'>
                <CyDTokenValue className='text-[24px]' prefix=''>
                  {quote.receiverAmount ? quote.receiverAmount / 100 : Number(fiatAmount || 0)}
                </CyDTokenValue>
                <CyDText className='!font-gambetta font-normal text-base200 text-[20px] tracking-[-1px] ml-[2px]'>
                  {fiatCode}
                </CyDText>
              </CyDView>
              {/* Recipient */}
              <CyDView className='flex-row items-center gap-[4px]'>
                <CyDText className='text-[12px] font-medium text-n50'>Recipient:</CyDText>
                <CyDView className='flex-row items-center gap-[6px]'>
                  <CyDView className='w-[24px] h-[24px] rounded-full bg-n20 items-center justify-center'>
                    <CyDText className='text-[14px]'>
                      {RAIL_FLAGS[selectedAccount?.type] ?? '\uD83C\uDF10'}
                    </CyDText>
                  </CyDView>
                  <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                    {selectedAccount?.name ?? 'Recipient'}
                  </CyDText>
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>

          {/* Details card */}
          <CyDView className='bg-n0 rounded-[10px] p-[12px] gap-[12px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[12px] font-medium text-n200'>Arrival time</CyDText>
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
                {isInstant ? '\u26A1\uFE0F Fastest arrival' : settlement}
              </CyDText>
            </CyDView>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[12px] font-medium text-n200'>Fees</CyDText>
              {isFree ? (
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>Free</CyDText>
              ) : (
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
                  {feeDisplay}
                </CyDText>
              )}
            </CyDView>
          </CyDView>

          {/* Timer */}
          <CyDText className='text-[14px] font-medium text-base200 text-center tracking-[-0.6px]'>
            Your quote will get refreshed in{' '}
            <CyDText style={{ fontVariant: ['tabular-nums'] }} className='text-[14px] font-medium text-base200 tracking-[-0.6px]'>
              {formatTimer(quoteTimeLeft)}
            </CyDText>
          </CyDText>

          {/* Continue button */}
          <CyDTouchView
            onPress={handleConfirm}
            disabled={quoteTimeLeft <= 0}
            className={`rounded-full h-[48px] items-center justify-center shadow-sm ${
              quoteTimeLeft > 0 ? 'bg-[#F7C645]' : 'bg-n40'
            }`}>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              Continue
            </CyDText>
          </CyDTouchView>
        </CyDView>
      ),
    });
  }, [quote, selectedAccount, selectedToken, cryptoAmount, fiatAmount, fiatCode, fiat.symbol, lastInputMode, quoteTimeLeft, handleConfirm, showBottomSheet, hideBottomSheet]);

  // ── Amount input screens (Figma-matched) ──
  if (inputMode === 'crypto') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        {/* Header */}
        <CyDView className='flex-row items-center justify-between px-[16px] h-[56px]'>
          <CyDTouchView onPress={() => setInputMode(null)} hitSlop={12} className='w-[32px] h-[32px] items-center justify-center'>
            <CyDIcons name='arrow-left' size={22} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
            You send exactly
          </CyDText>
          <CyDView className='w-[32px]' />
        </CyDView>

        {/* Center content */}
        <CyDView className='flex-1 items-center justify-center gap-[8px]'>
          {/* Token pill with chain badge */}
          {selectedToken ? (
            <CyDTouchView onPress={() => setTokenPickerOpen(true)}
              className='flex-row items-center gap-[6px] bg-n0 rounded-full px-[6px] py-[5px] pr-[10px]'>
              <TokenLogoWithChain logoUrl={selectedToken.logoUrl} chainLogoSource={selectedToken.chainLogo} size={26} />
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
                {selectedToken.symbol}
              </CyDText>
              <CyDMaterialDesignIcons name='chevron-down' size={18} className='text-base400' />
            </CyDTouchView>
          ) : null}

          {/* Amount */}
          <CyDText
            className='font-bold text-p200 text-center tracking-[-1.44px]'
            style={{ fontSize: Math.round(72 * Math.max(0.4, 7 / Math.max(7, `$${cryptoAmount || '0'}`.length))) }}>
            ${cryptoAmount || '0'}
          </CyDText>

          {/* Subtitle */}
          {selectedToken ? (
            <CyDText className='text-[14px] font-medium text-n90 tracking-[-0.6px]'>
              {Number(cryptoAmount || 0).toFixed(2)} {selectedToken.symbol}
            </CyDText>
          ) : null}
        </CyDView>

        {/* Numpad */}
        <NumPad onPress={k => handleNumPad(k, setCryptoAmount, cryptoAmount)} />

        {/* Button */}
        <CyDView className='px-[16px] pt-[16px]' style={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <CyDTouchView
            onPress={() => { setInputMode(null); void handleGetQuote(); }}
            disabled={!cryptoAmount || Number(cryptoAmount) <= 0}
            className={`rounded-full h-[58px] items-center justify-center ${
              cryptoAmount && Number(cryptoAmount) > 0 ? 'bg-[#FFDE59]' : 'bg-n40'
            }`}>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              Get Quote
            </CyDText>
          </CyDTouchView>
        </CyDView>

        {tokenPickerOpen ? renderTokenPicker() : null}
      </CyDSafeAreaView>
    );
  }

  if (inputMode === 'fiat') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        {/* Header */}
        <CyDView className='flex-row items-center justify-between px-[16px] h-[56px]'>
          <CyDTouchView onPress={() => setInputMode(null)} hitSlop={12} className='w-[32px] h-[32px] items-center justify-center'>
            <CyDIcons name='arrow-left' size={22} className='text-base400' />
          </CyDTouchView>
          <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
            Recipient gets
          </CyDText>
          <CyDView className='w-[32px]' />
        </CyDView>

        {/* Center content */}
        <CyDView className='flex-1 items-center justify-center gap-[8px]'>
          {/* Fiat pill */}
          <CyDView className='flex-row items-center gap-[6px] bg-n0 rounded-full px-[10px] py-[6px]'>
            <CyDText className='text-[14px]'>{fiat.flag}</CyDText>
            <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
              {fiatCode}
            </CyDText>
          </CyDView>

          {/* Amount */}
          <CyDTokenValue prefix={fiat.symbol} maxFontSize={72}>
            {Number(fiatAmount || 0)}
          </CyDTokenValue>

        </CyDView>

        {/* Numpad */}
        <NumPad onPress={k => handleNumPad(k, setFiatAmount, fiatAmount)} />

        {/* Button */}
        <CyDView className='px-[16px] pt-[16px]' style={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <CyDTouchView
            onPress={() => { setInputMode(null); void handleGetQuote(); }}
            disabled={!fiatAmount || Number(fiatAmount) <= 0}
            className={`rounded-full h-[58px] items-center justify-center ${
              fiatAmount && Number(fiatAmount) > 0 ? 'bg-[#FFDE59]' : 'bg-n40'
            }`}>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              Get Quote
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  // ── Token picker renderer ──
  function renderTokenPicker() {
    return (
      <Modal visible transparent animationType='fade'
        onRequestClose={() => setTokenPickerOpen(false)}>
        <CyDView className='flex-1 justify-end bg-black/50'>
          <CyDTouchView className='flex-1' onPress={() => setTokenPickerOpen(false)} />
          <Animated.View entering={SlideInDown.duration(300)}
            style={{ maxHeight: '60%' }}>
            <CyDView className='bg-n20 rounded-t-[24px]'>
              {/* Drag handle */}
              <CyDView className='items-center pt-[12px] pb-[8px]'>
                <CyDView className='w-[32px] h-[4px] bg-n50 rounded-[5px]' />
              </CyDView>
              {/* Header */}
              <CyDView className='px-[16px] pb-[10px] flex-row items-center gap-[5px]'>
                <CyDIcons name='coins-stacked' size={16} className='text-n90' />
                <CyDText className='text-[16px] font-semibold text-n90 tracking-[-0.8px]'>
                  Supported Tokens
                </CyDText>
              </CyDView>
              <FlatList
                data={filteredTokens}
                keyExtractor={(item, idx) => `${item.symbol}-${item.chain}-${idx}`}
                keyboardShouldPersistTaps='handled'
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={
              <CyDView className='items-center py-[24px]'>
                <CyDText className='text-[14px] text-n200'>No tokens found</CyDText>
              </CyDView>
            }
            renderItem={({ item }) => (
              <CyDTouchView
                onPress={() => {
                  setSelectedToken(item);
                  setTokenPickerOpen(false);
                  setQuote(null);
                }}
                className='bg-n0 px-[16px] py-[16px] flex-row items-center gap-[14px] border-b border-n40'>
                <TokenLogoWithChain logoUrl={item.logoUrl} chainLogoSource={item.chainLogo} size={44} />
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.4px]'>
                    {item.symbol}
                  </CyDText>
                  <CyDText className='text-[13px] font-medium text-n200'>
                    {item.chainName}
                  </CyDText>
                </CyDView>
                <CyDView className='items-end'>
                  <CyDTokenValue className='text-[16px]'>{item.balance}</CyDTokenValue>
                  <CyDText className='text-[13px] !font-gambetta font-normal text-n200'>{Number(item.balanceToken).toFixed(2)} {item.symbol}
                  </CyDText>
                </CyDView>
              </CyDTouchView>
            )}
              />
            </CyDView>
          </Animated.View>
        </CyDView>
      </Modal>
    );
  }

  // ── Main send money page ──
  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      <CyDView className='flex-row items-center gap-[4px] px-[4px] py-[8px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
          className='w-[48px] h-[48px] items-center justify-center'>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] flex-1'>
          Send Money
        </CyDText>
      </CyDView>

      <CyDKeyboardAwareScrollView
        className='flex-1'
        enableOnAndroid enableAutomaticScroll
        keyboardShouldPersistTaps='handled'
        contentContainerClassName='px-[16px] pb-[24px] gap-[12px]'>

        {/* Recipient card */}
        <CyDView className='bg-n0 border border-n30 rounded-[12px]'>
          <CyDView className='px-[16px] py-[12px]'>
            <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>Recipient</CyDText>
          </CyDView>
          <CyDView className='h-px bg-n30' />
          <CyDTouchView onPress={() => {
            if (accounts.length === 0) navigation.navigate(screenTitle.BLINDPAY_ADD_RECIPIENT);
            else { setSearchQuery(''); setRecipientPickerOpen(true); }
          }} className='px-[16px] py-[12px] flex-row items-center justify-between'>
            {selectedAccount ? (
              <CyDView className='flex-row items-center gap-[10px] flex-1'>
                <CyDView className='w-[36px] h-[36px] rounded-full bg-n20 items-center justify-center'>
                  <CyDText className='text-[18px]'>{RAIL_FLAGS[selectedAccount.type] ?? '\uD83C\uDF10'}</CyDText>
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[15px] font-semibold text-base400 tracking-[-0.6px]'>{selectedAccount.name}</CyDText>
                  <CyDText className='text-[12px] font-medium text-n200'>
                    {RAIL_LABELS[selectedAccount.type] ?? selectedAccount.type}
                    {selectedAccount.lastFour ? ` · ****${selectedAccount.lastFour}` : ''}
                  </CyDText>
                </CyDView>
              </CyDView>
            ) : (
              <CyDText className='text-[14px] font-medium text-n90'>Select Recipient</CyDText>
            )}
            <CyDMaterialDesignIcons name='chevron-right' size={22} className='text-base400' />
          </CyDTouchView>
        </CyDView>

        {/* Amount card */}
        <CyDView className={`bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[14px] ${!hasRecipient ? 'opacity-40' : ''}`}
          pointerEvents={hasRecipient ? 'auto' : 'none'}>
          {/* You send */}
          <CyDView className='gap-[6px]'>
            <CyDText className='text-[14px] font-medium text-n90 tracking-[-0.6px]'>You send exactly</CyDText>
            <CyDView className='flex-row items-center justify-between'>
              <CyDTouchView onPress={() => setTokenPickerOpen(true)}
                className='flex-row items-center gap-[6px] bg-n30 rounded-[24px] px-[8px] py-[4px] pr-[10px]'>
                {selectedToken ? (
                  <TokenLogoWithChain logoUrl={selectedToken.logoUrl} chainLogoSource={selectedToken.chainLogo} size={28} />
                ) : null}
                <CyDText className='text-[14px] font-semibold text-base400'>{selectedToken?.symbol ?? 'USDC'}</CyDText>
                <CyDMaterialDesignIcons name='chevron-down' size={16} className='text-base400' />
              </CyDTouchView>
              <CyDTouchView onPress={() => { setLastInputMode('crypto'); setInputMode('crypto'); }}>
                <CyDTokenValue prefix='$' className='text-[32px]'>{Number(cryptoAmount || 0)}</CyDTokenValue>
              </CyDTouchView>
            </CyDView>
            {selectedToken ? (
              <CyDText className='text-[12px] font-medium text-n200'>
                Available Balance: <CyDTokenAmount decimalPlaces={2}>{selectedToken.balance}</CyDTokenAmount> {selectedToken.symbol}
              </CyDText>
            ) : null}
          </CyDView>

          {/* Low balance warning */}
          {balanceLow ? (
            <CyDView className='flex-row items-start gap-[8px] bg-[#FFF8E1] rounded-[8px] p-[10px]'>
              <CyDMaterialDesignIcons name='information-outline' size={18} className='text-[#C99200]' />
              <CyDText className='text-[13px] font-medium text-[#846000] flex-1 leading-[1.45]'>
                It seems your balance is a bit low to send funds. You might want to top up your wallet or switch tokens.
              </CyDText>
            </CyDView>
          ) : null}

          <CyDView className='h-px bg-n30' />

          {/* Recipient gets */}
          <CyDView className='gap-[6px]'>
            <CyDText className='text-[14px] font-medium text-n90 tracking-[-0.6px]'>Recipient gets</CyDText>
            <CyDView className='flex-row items-center justify-between'>
              <CyDView className='flex-row items-center gap-[4px] bg-n30 rounded-[24px] px-[10px] py-[5px]'>
                <CyDText className='text-[14px]'>{fiat.flag}</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400'>
                  {fiatCode}
                </CyDText>
              </CyDView>
              <CyDTouchView onPress={() => { setLastInputMode('fiat'); setInputMode('fiat'); }}>
                {quoteLoading ? (
                  <ActivityIndicator size='small' />
                ) : (
                  <CyDTokenValue prefix={fiat.symbol} className='text-[28px]'>
                    {quote ? quote.receiverAmount / 100 : Number(fiatAmount || 0)}
                  </CyDTokenValue>
                )}
              </CyDTouchView>
            </CyDView>
          </CyDView>
        </CyDView>

        {/* Details */}
        {quote ? (() => {
          const settlement = RAIL_SETTLEMENT[selectedAccount?.type] ?? '~2 business days';
          const isInstant = settlement === 'Instant';
          const totalFee = (quote.flatFee ?? 0) + (quote.partnerFeeAmount ?? 0) + (quote.billingFeeAmount ?? 0);
          const isFree = totalFee === 0;
          const senderPaysFee = lastInputMode === 'fiat'; // cover_fees: true = sender pays
          const feeDisplay = senderPaysFee
            ? `${formatCents(totalFee)} ${selectedToken?.symbol ?? 'USDC'}`
            : `${fiat.symbol}${formatCents(totalFee)}`;
          return (
            <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[14px]'>
              {/* Exchange rate */}
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[14px] font-medium text-n90'>Exchange rate</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400'>
                  1 {selectedToken?.symbol ?? 'USDC'} = {((quote.blindpayQuotation ?? quote.exchangeRate ?? 0) / 100).toFixed(2)} {fiatCode}
                </CyDText>
              </CyDView>
              <CyDView className='h-px bg-n30' />
              {/* Arrives */}
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[14px] font-medium text-n90'>Arrives</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400'>
                  {isInstant ? '\u26A1 Instant' : settlement}
                </CyDText>
              </CyDView>
              <CyDView className='h-px bg-n30' />
              {/* Fees */}
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[14px] font-medium text-n90'>Fees</CyDText>
                {isFree ? (
                  <CyDText className='text-[14px] font-semibold text-base400'>Free</CyDText>
                ) : (
                  <CyDText className='text-[14px] font-semibold text-base400'>
                    {feeDisplay}
                  </CyDText>
                )}
              </CyDView>
            </CyDView>
          );
        })() : null}
      </CyDKeyboardAwareScrollView>

      {/* Bottom */}
      <CyDView className='px-[16px] pt-[12px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        {quote ? (
          <>
            <CyDText className='text-[14px] font-medium text-base200 text-center tracking-[-0.6px] mb-[8px]'>
              Your quote will get refreshed in{' '}
              <CyDText style={{ fontVariant: ['tabular-nums'], width: 40 }} className='text-[14px] font-medium text-base200 tracking-[-0.6px]'>
                {formatTimer(quoteTimeLeft)}
              </CyDText>
            </CyDText>
            <CyDTouchView
              onPress={openReviewSheet}
              className='rounded-full h-[48px] items-center justify-center bg-[#F7C645] shadow-sm'>
              <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
                Review
              </CyDText>
            </CyDTouchView>
          </>
        ) : (
          <CyDTouchView
            onPress={() => { void handleGetQuote(); }}
            disabled={quoteLoading || !hasRecipient || !selectedToken || (!cryptoAmount && !fiatAmount)}
            className={`rounded-full h-[48px] items-center justify-center ${
              hasRecipient && selectedToken && (cryptoAmount || fiatAmount) && !quoteLoading ? 'bg-[#F7C645]' : 'bg-n40'
            }`}>
            <CyDView className='relative items-center justify-center'>
              <CyDText className={`text-[16px] font-bold text-black tracking-[-0.16px] ${quoteLoading ? 'opacity-0' : ''}`}>
                Get Quote
              </CyDText>
              {quoteLoading ? <CyDView className='absolute inset-0 items-center justify-center'>
                <ActivityIndicator color='#0D0D0D' />
              </CyDView> : null}
            </CyDView>
          </CyDTouchView>
        )}
      </CyDView>

      {/* Token picker */}
      {tokenPickerOpen ? renderTokenPicker() : null}

      {/* Recipient picker */}
      <Modal visible={recipientPickerOpen} animationType='slide' presentationStyle='pageSheet'
        onRequestClose={() => setRecipientPickerOpen(false)}>
        <CyDView className='flex-1 bg-n20' style={{ paddingTop: 16 }}>
          <CyDView className='items-center pb-[12px]'>
            <CyDView className='w-[32px] h-[4px] bg-n50 rounded-[5px]' />
          </CyDView>
          <CyDView className='px-[16px] pb-[12px]'>
            <CyDView className='flex-row items-center bg-n0 rounded-[10px] px-[10px] h-[40px] gap-[6px]'>
              <CyDMaterialDesignIcons name='magnify' size={20} className='text-n200' />
              <CyDTextInput
                className='flex-1 text-[16px] font-normal text-base400 tracking-[-0.8px] py-0 bg-transparent'
                placeholder='Search Recipient' placeholderTextColor='#C2C7D0'
                value={searchQuery} onChangeText={setSearchQuery}
                autoCapitalize='none' autoCorrect={false} />
            </CyDView>
          </CyDView>
          <CyDView className='px-[16px] pb-[12px]'>
            <CyDTouchView onPress={() => { setRecipientPickerOpen(false); navigation.navigate(screenTitle.BLINDPAY_ADD_RECIPIENT); }}
              className='bg-n0 rounded-[16px] px-[16px] py-[14px] flex-row items-center gap-[6px]'>
              <CyDMaterialDesignIcons name='plus' size={24} className='text-base400' />
              <CyDText className='text-[16px] font-medium text-base400'>Create new</CyDText>
            </CyDTouchView>
          </CyDView>
          <FlatList
            data={accounts.filter(a => !searchQuery.trim() ||
              (a.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()))}
            keyExtractor={i => i.id}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <CyDTouchView
                onPress={() => { setSelectedAccount(item); setRecipientPickerOpen(false); setQuote(null); }}
                className='bg-n0 px-[16px] py-[12px] flex-row items-center gap-[10px] border-b border-n40'>
                <CyDView className='w-[36px] h-[36px] rounded-full bg-n20 items-center justify-center'>
                  <CyDText className='text-[18px]'>{RAIL_FLAGS[item.type] ?? '\uD83C\uDF10'}</CyDText>
                </CyDView>
                <CyDView className='flex-1'>
                  <CyDText className='text-[16px] font-medium text-base400'>{item.name ?? 'Account'}</CyDText>
                  <CyDText className='text-[12px] text-n200'>
                    {RAIL_LABELS[item.type] ?? item.type}{item.lastFour ? ` · ****${item.lastFour}` : ''}
                  </CyDText>
                </CyDView>
                {selectedAccount?.id === item.id ? (
                  <CyDMaterialDesignIcons name='check-circle' size={20} className='text-[#FBC02D]' />
                ) : null}
              </CyDTouchView>
            )}
          />
        </CyDView>
      </Modal>

    </CyDSafeAreaView>
  );
}
