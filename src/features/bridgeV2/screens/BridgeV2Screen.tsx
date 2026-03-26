import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  InteractionManager,
  Linking,
  ListRenderItem,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fuse from 'fuse.js';
import {
  CyDFastImage,
  CyDIcons,
  CyDLottieView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { formatUnits, parseUnits } from 'viem';
import { CHAIN_SOLANA } from '../../../constants/server';
import { GlobalContext } from '../../../core/globalContext';
import {
  getExplorerUrlFromChainId,
  getWeb3Endpoint,
} from '../../../core/util';
import BridgeV2InlineSignPanel from '../components/BridgeV2InlineSignPanel';
import useBridgeV2, { BridgeV2Executors } from '../hooks/useBridgeV2';
import { BRIDGE_V2_SHEET_ID } from '../hooks/useBridgeV2Sheet';
import {
  BridgeV2Chain,
  BridgeV2QuoteRequestDto,
  BridgeV2QuoteResponse,
  BridgeV2SignReviewPayload,
  BridgeV2Token,
  ExecutionStep,
  EVM_NATIVE_QUOTE_TOKEN_DENOM,
  getTxExplorerUrl,
  HYPERLIQUID_CHAIN_ID,
  isEvmChainId,
  SOLANA_CHAIN_ID,
  SOLANA_NATIVE_QUOTE_TOKEN_DENOM,
} from '../types';
import { DecimalHelper } from '../../../utils/decimalHelper';
import AppImages from '../../../../assets/images/appImages';
import { useGlobalBottomSheet } from '../../../components/v2/GlobalBottomSheetProvider';
import { Holding } from '../../../core/portfolio';
import CyDTokenValue from '../../../components/v2/tokenValue';
import CyDTokenAmount from '../../../components/v2/tokenAmount';
import { Theme, useTheme } from '../../../reducers/themeReducer';
import { useColorScheme } from 'nativewind';

const BRIDGE_QUOTE_DEBOUNCE_MS = 1500;

type TokenSide = 'source' | 'dest';

function resolveBridgeTxExplorerUrl(chainId: string, txHash: string): string | null {
  const h = (txHash || '').trim();
  if (!h) return null;
  const fromBridge = getTxExplorerUrl(chainId, h);
  if (fromBridge) return fromBridge;
  const fromCore = getExplorerUrlFromChainId(chainId, h);
  return fromCore || null;
}

function explorerChainForExecutionStep(step: ExecutionStep, quote: BridgeV2QuoteResponse): string {
  if (step.chainId) return step.chainId;
  if (step.id === 'lifi-status') return quote.destChainId;
  if (step.id === 'lifi-approval' || step.id === 'lifi-swap') return quote.sourceChainId;
  return quote.sourceChainId;
}

interface BridgeV2ContentProps {
  executors: BridgeV2Executors;
  portfolioHoldings?: Holding[];
  /** When opening from Token Overview, pre-fill From chain + token. */
  initialFromHolding?: Holding;
  /** Fires once when execution finishes successfully (LiFi/Skip polling complete). */
  onBridgeSuccess?: () => undefined | Promise<void>;
}

const SEARCH_DEBOUNCE_MS = 250;
const TOKEN_ITEM_HEIGHT = 68;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOKEN_SELECTOR_HEADER_HEIGHT = 160;
const TOKEN_LIST_MAX_HEIGHT = SCREEN_HEIGHT * 0.95 - TOKEN_SELECTOR_HEADER_HEIGHT;

type BridgeTokenWithBalance = BridgeV2Token & {
  balance?: string;
  rawBalance?: string;
  /** Exact on-chain balance in smallest units — use for Max / arithmetic (see portfolio Holding). */
  balanceInteger?: string;
  balanceUsd?: number;
};

function getBridgeChainId(chain: { chain_id: string; chainIdNumber: number }): string {
  if (chain.chain_id === 'solana') return 'solana';
  if (chain.chainIdNumber === 0) return chain.chain_id;
  return String(chain.chainIdNumber);
}

function isSolanaBridgeChainId(chainId: string): boolean {
  return String(chainId) === SOLANA_CHAIN_ID;
}

/**
 * Map / cache keys: Solana mints & denoms are base58 / case-sensitive — never lowercase.
 * EVM hex & typical ibc denoms are compared lowercase.
 */
function normalizeBridgeTokenKey(chainId: string, value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  return isSolanaBridgeChainId(chainId) ? v : v.toLowerCase();
}

/** Same identity rules as From-token prefill — used when portfolio map misses (e.g. Token Overview without portfolioHoldings). */
function holdingMatchesBridgeToken(h: Holding, token: BridgeV2Token): boolean {
  if (h.chainDetails.chain_id === HYPERLIQUID_CHAIN_ID) return false;
  const bridgeChainId = getBridgeChainId(h.chainDetails);
  if (bridgeChainId !== token.chainId) return false;

  if (isSolanaBridgeChainId(bridgeChainId)) {
    const hAddr = (h.contractAddress || '').trim();
    const hDenom = (h.denom || h.contractAddress || '').trim();
    const solanaNativeSentinel = hAddr.length > 0 && hAddr.toLowerCase() === 'solana-native';

    if (
      (solanaNativeSentinel || h.isNativeToken) &&
      token.chainId === SOLANA_CHAIN_ID &&
      token.isNative
    ) {
      return true;
    }

    return !!(
      (token.tokenContract && hAddr && token.tokenContract === hAddr) ||
      (token.denom && hDenom && token.denom === hDenom) ||
      (token.tokenContract && hDenom && token.tokenContract === hDenom) ||
      (token.denom && hAddr && token.denom === hAddr)
    );
  }

  const holdingAddr = (h.contractAddress || '').toLowerCase();
  const holdingDenom = (h.denom || h.contractAddress || '').toLowerCase();

  return !!(
    (token.tokenContract && holdingAddr && token.tokenContract.toLowerCase() === holdingAddr) ||
    (token.denom && holdingDenom && token.denom.toLowerCase() === holdingDenom) ||
    (token.tokenContract && holdingDenom && token.tokenContract.toLowerCase() === holdingDenom) ||
    (token.denom && holdingAddr && token.denom.toLowerCase() === holdingAddr)
  );
}

const SOLANA_MINT_BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** True if value is zero address or common “native” placeholder (0xeeee…) from token lists. */
function isEvmNativeQuoteAlias(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  return (
    a === EVM_NATIVE_QUOTE_TOKEN_DENOM ||
    a === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  );
}

/**
 * Token id string for POST /bridge/quote — native EVM must be 0x0…0; native SOL must be 1111…
 * (not 0xeeee… or arbitrary backend labels).
 */
function bridgeQuoteTokenDenom(token: BridgeV2Token): string {
  if (token.chainId === SOLANA_CHAIN_ID) {
    const d = (token.denom || '').trim();
    const c = (token.tokenContract || '').trim();

    for (const candidate of [d, c]) {
      if (candidate && SOLANA_MINT_BASE58_RE.test(candidate)) {
        return candidate;
      }
    }

    const dTrim = d.trim();
    const cTrim = c.trim();
    /** Do not lowercase base58 mints — only treat plain “solana-native” labels (non-mint strings). */
    const looksLikeNativeLabel =
      token.isNative ||
      /^solana[-\s]?native$/i.test(dTrim) ||
      /^solana[-\s]?native$/i.test(cTrim) ||
      (dTrim.length > 0 &&
        !SOLANA_MINT_BASE58_RE.test(dTrim) &&
        (dTrim.toLowerCase() === 'solana-native' || dTrim.toLowerCase() === 'solana native')) ||
      (cTrim.length > 0 &&
        !SOLANA_MINT_BASE58_RE.test(cTrim) &&
        (cTrim.toLowerCase() === 'solana-native' || cTrim.toLowerCase() === 'solana native'));

    if (looksLikeNativeLabel) {
      return SOLANA_NATIVE_QUOTE_TOKEN_DENOM;
    }

    return d || c;
  }

  if (token.isEvm || isEvmChainId(token.chainId)) {
    const d = (token.denom || '').trim();
    const c = (token.tokenContract || '').trim();
    if (token.isNative || isEvmNativeQuoteAlias(d) || isEvmNativeQuoteAlias(c)) {
      return EVM_NATIVE_QUOTE_TOKEN_DENOM;
    }
    return d || c;
  }

  return token.denom || token.tokenContract || '';
}

function formatTokenAmount(amount: string, _decimals?: number): string {
  try {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num >= 1_000) return num.toFixed(2);
    if (num >= 1) return num.toFixed(4);
    const s = num.toPrecision(4);
    return parseFloat(s).toString();
  } catch {
    return amount;
  }
}

export default function BridgeV2Content({
  executors,
  portfolioHoldings,
  initialFromHolding,
  onBridgeSuccess,
}: BridgeV2ContentProps) {
  const insets = useSafeAreaInsets();
  const { snapBottomSheetToIndex } = useGlobalBottomSheet();
  const { theme } = useTheme();
  const { colorScheme } = useColorScheme();
  const isDark = theme === Theme.SYSTEM ? colorScheme === 'dark' : theme === Theme.DARK;
  const colors = {
    placeholder: isDark ? '#666666' : '#999999',
    activityIndicator: isDark ? '#FFC72F' : '#FFBF15',
    inputText: isDark ? '#FFFFFF' : '#000000',
    caret: isDark ? '#FFC72F' : '#FFBF15',
  };

  const globalContext = useContext<any>(GlobalContext);

  const {
    chains,
    tokensByChain,
    quote,
    statusInfo,
    step,
    error,
    loading,
    executionSteps,
    loadChains,
    loadTokens,
    fetchQuote,
    executeRoute,
    reset,
    getAddressForChainId,
  } = useBridgeV2();

  const [sourceChain, setSourceChain] = useState<BridgeV2Chain | null>(null);
  const [destChain, setDestChain] = useState<BridgeV2Chain | null>(null);
  const [sourceToken, setSourceToken] = useState<BridgeV2Token | null>(null);
  const [destToken, setDestToken] = useState<BridgeV2Token | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [slippage, setSlippage] = useState(0.005);
  const [showSlippagePanel, setShowSlippagePanel] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [tokenSelectorSide, setTokenSelectorSide] = useState<TokenSide>('source');
  const [showChainFilter, setShowChainFilter] = useState(false);
  const [tokenSearch, setTokenSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedFilterChain, setSelectedFilterChain] = useState<string | null>(null);
  /** After a quote succeeds, user stays on the main form until tapping Review. */
  const [transactionReviewOpen, setTransactionReviewOpen] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signReviewResolverRef = useRef<((approved: boolean) => void) | null>(null);
  const [signReviewPayload, setSignReviewPayload] = useState<BridgeV2SignReviewPayload | null>(null);
  const bridgeProcessingScrollRef = useRef<ScrollView>(null);

  const scrollBridgeProcessingToEnd = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        bridgeProcessingScrollRef.current?.scrollToEnd({ animated: true });
      });
    });
  }, []);

  /** Processing screen: measure shell + scroll content so the Lottie can shrink when content below grows (max 35% window). */
  const [bridgeProcShellH, setBridgeProcShellH] = useState(0);
  const [bridgeProcBelowH, setBridgeProcBelowH] = useState(0);
  const isExecutionActiveForLayout = step === 'executing' || step === 'polling';

  const bridgeLoaderLayout = useMemo(() => {
    const { height: windowH, width: windowW } = Dimensions.get('window');
    const maxLoader = Math.round(windowH * 0.35);
    const minLoader = 88;
    /** Matches processing shell `paddingTop`; scroll uses `paddingBottom: insets.bottom + 16`. */
    const shellTopPad = 8;
    const scrollBottomPad = insets.bottom + 16;
    if (!isExecutionActiveForLayout || bridgeProcShellH <= 0) {
      return {
        loaderSlotHeight: maxLoader,
        lottieSize: Math.min(Math.round(maxLoader * 0.95), windowW - 32),
      };
    }
    const innerShellH = Math.max(0, bridgeProcShellH - shellTopPad);
    const maxReserve = Math.max(0, innerShellH - minLoader - scrollBottomPad);
    const reservedBelow = Math.min(bridgeProcBelowH, maxReserve);
    const rawSlot = innerShellH - scrollBottomPad - reservedBelow;
    const slot = Math.min(maxLoader, Math.max(minLoader, rawSlot));
    return {
      loaderSlotHeight: slot,
      lottieSize: Math.min(Math.round(slot * 0.95), windowW - 32),
    };
  }, [
    isExecutionActiveForLayout,
    bridgeProcShellH,
    bridgeProcBelowH,
    insets.bottom,
  ]);

  useEffect(() => {
    if (!isExecutionActiveForLayout) {
      setBridgeProcShellH(0);
      setBridgeProcBelowH(0);
    }
  }, [isExecutionActiveForLayout]);

  /** Auto-scroll so inline sign / review panel stays visible when it mounts or steps update. */
  useEffect(() => {
    if (step !== 'executing' && step !== 'polling') return;
    if (!signReviewPayload) return;
    scrollBridgeProcessingToEnd();
  }, [step, signReviewPayload, executionSteps.length, scrollBridgeProcessingToEnd]);

  useEffect(() => {
    loadChains();
  }, []);

  /** Token Overview → Bridge: set From once chains/tokens for that holding are available. */
  const initialFromPrefillDoneRef = useRef(false);
  const initialFromHoldingKey = initialFromHolding
    ? `${initialFromHolding.id}|${initialFromHolding.chainDetails.chain_id}|${initialFromHolding.contractAddress}|${initialFromHolding.denom}`
    : '';
  useEffect(() => {
    initialFromPrefillDoneRef.current = false;
  }, [initialFromHoldingKey]);

  /** Avoid re-running prefill when unrelated chains’ token lists update. */
  const initialFromBridgeChainId = useMemo((): string | null => {
    if (!initialFromHolding || initialFromHolding.chainDetails.chain_id === HYPERLIQUID_CHAIN_ID) {
      return null;
    }
    return getBridgeChainId(initialFromHolding.chainDetails);
  }, [initialFromHolding]);

  const initialFromChainTokens =
    initialFromBridgeChainId != null ? tokensByChain[initialFromBridgeChainId] : undefined;

  useEffect(() => {
    if (!initialFromHolding || initialFromPrefillDoneRef.current) return;
    if (chains.length === 0) return;
    if (!initialFromBridgeChainId) {
      initialFromPrefillDoneRef.current = true;
      return;
    }

    const chain = chains.find(c => c.chainId === initialFromBridgeChainId);
    if (!chain) {
      initialFromPrefillDoneRef.current = true;
      return;
    }

    const chainTokens = initialFromChainTokens;
    if (!chainTokens || chainTokens.length === 0) {
      void loadTokens([initialFromBridgeChainId]);
      return;
    }

    const match = chainTokens.find(t => holdingMatchesBridgeToken(initialFromHolding, t));

    setSourceChain(chain);
    if (match) {
      setSourceToken(match);
    }
    initialFromPrefillDoneRef.current = true;
  }, [
    initialFromHolding,
    chains,
    initialFromBridgeChainId,
    initialFromChainTokens,
    loadTokens,
  ]);

  const onBridgeSuccessRef = useRef(onBridgeSuccess);
  useEffect(() => {
    onBridgeSuccessRef.current = onBridgeSuccess;
  }, [onBridgeSuccess]);

  const bridgeSuccessNotifiedRef = useRef(false);
  useEffect(() => {
    if (step === 'completed') {
      if (!bridgeSuccessNotifiedRef.current) {
        bridgeSuccessNotifiedRef.current = true;
        void Promise.resolve(onBridgeSuccessRef.current?.()).catch(() => {
          /* caller handles errors */
        });
      }
    } else if (step === 'idle') {
      bridgeSuccessNotifiedRef.current = false;
    }
  }, [step]);

  /** Ensures tokens for selected From/To chains; {@link loadTokens} skips chains already in cache. */
  useEffect(() => {
    const ids: string[] = [];
    if (sourceChain) ids.push(sourceChain.chainId);
    if (destChain) ids.push(destChain.chainId);
    if (ids.length === 0) return;
    void loadTokens(ids);
  }, [sourceChain?.chainId, destChain?.chainId, loadTokens]);

  const handleSearchChange = useCallback((text: string) => {
    setTokenSearch(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Build a balance lookup from portfolio holdings keyed by "bridgeChainId:identifier"
  const portfolioBalanceMap = useMemo(() => {
    const map = new Map<
      string,
      { balance: string; rawBalance: string; balanceInteger: string; balanceUsd: number }
    >();
    if (!portfolioHoldings) return map;

    for (const h of portfolioHoldings) {
      if (h.chainDetails.chain_id === HYPERLIQUID_CHAIN_ID) continue;
      const bridgeChainId = getBridgeChainId(h.chainDetails);
      const rawBal = h.balanceDecimal;
      const bal = formatTokenAmount(rawBal, h.contractDecimals);
      const value = {
        balance: bal,
        rawBalance: rawBal,
        balanceInteger: h.balanceInteger,
        balanceUsd: h.totalValue,
      };
      const ca = normalizeBridgeTokenKey(bridgeChainId, h.contractAddress || '');
      const dm = normalizeBridgeTokenKey(bridgeChainId, h.denom || '');
      if (ca) map.set(`${bridgeChainId}:${ca}`, value);
      if (dm && dm !== ca) map.set(`${bridgeChainId}:${dm}`, value);
    }
    return map;
  }, [portfolioHoldings]);

  // Find the balance for a source token from portfolio map (API token may key by contract or denom)
  const getTokenBalance = useCallback(
    (
      token: BridgeV2Token,
    ):
      | { balance: string; rawBalance: string; balanceInteger: string; balanceUsd: number }
      | undefined => {
      const tc = normalizeBridgeTokenKey(token.chainId, token.tokenContract || '');
      const dm = normalizeBridgeTokenKey(token.chainId, token.denom || '');
      if (tc) {
        const hit = portfolioBalanceMap.get(`${token.chainId}:${tc}`);
        if (hit) return hit;
      }
      if (dm) {
        const hit = portfolioBalanceMap.get(`${token.chainId}:${dm}`);
        if (hit) return hit;
      }
      return undefined;
    },
    [portfolioBalanceMap],
  );

  const balanceFromHolding = useCallback((h: Holding) => {
    const rawBal = h.balanceDecimal;
    return {
      balance: formatTokenAmount(rawBal, h.contractDecimals),
      rawBalance: rawBal,
      balanceInteger: h.balanceInteger,
      balanceUsd: h.totalValue,
    };
  }, []);

  // Current source token balance: portfolio map, else matched holding (Token Overview passes initialFromHolding only)
  const sourceTokenBalance = useMemo(() => {
    if (!sourceToken) return undefined;
    const fromMap = getTokenBalance(sourceToken);
    if (fromMap) return fromMap;

    if (initialFromHolding && holdingMatchesBridgeToken(initialFromHolding, sourceToken)) {
      return balanceFromHolding(initialFromHolding);
    }
    if (portfolioHoldings?.length) {
      for (const h of portfolioHoldings) {
        if (holdingMatchesBridgeToken(h, sourceToken)) {
          return balanceFromHolding(h);
        }
      }
    }
    return undefined;
  }, [
    sourceToken,
    getTokenBalance,
    initialFromHolding,
    portfolioHoldings,
    balanceFromHolding,
  ]);

  const amountInSmallestUnit = useMemo(() => {
    if (!amountInput || !sourceToken) return '';
    try {
      return parseUnits(amountInput, sourceToken.decimals).toString();
    } catch {
      return '';
    }
  }, [amountInput, sourceToken]);

  const estimatedOutput = useMemo(() => {
    if (!quote || !destToken) return '';
    try {
      return formatTokenAmount(
        formatUnits(BigInt(quote.estimatedAmountOut), destToken.decimals),
        destToken.decimals,
      );
    } catch {
      return quote.estimatedAmountOut;
    }
  }, [quote, destToken]);

  const hasFromAmountNumber = useMemo(() => {
    const t = amountInput.trim();
    if (!t) return false;
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0;
  }, [amountInput]);

  /** From field has a valid positive amount in token units (for the quote API). */
  const canRequestQuote = useMemo(
    () =>
      !!sourceChain &&
      !!destChain &&
      !!sourceToken &&
      !!destToken &&
      hasFromAmountNumber &&
      !!amountInSmallestUnit,
    [sourceChain, destChain, sourceToken, destToken, hasFromAmountNumber, amountInSmallestUnit],
  );

  const handleQuote = useCallback(async () => {
    if (!sourceChain || !destChain || !sourceToken || !destToken) return;

    const fromAddress = getAddressForChainId(sourceChain.chainId)?.trim() ?? '';
    const toAddress = getAddressForChainId(destChain.chainId)?.trim() ?? '';

    const input: BridgeV2QuoteRequestDto = {
      sourceChainId: sourceChain.chainId,
      sourceTokenDenom: bridgeQuoteTokenDenom(sourceToken),
      destChainId: destChain.chainId,
      destTokenDenom: bridgeQuoteTokenDenom(destToken),
      amountIn: amountInSmallestUnit,
      fromAddress: fromAddress || undefined,
      toAddress: toAddress || undefined,
      slippage,
    };

    await fetchQuote(input);
  }, [sourceChain, destChain, sourceToken, destToken, amountInSmallestUnit, slippage, getAddressForChainId, fetchQuote]);

  useEffect(() => {
    if (step !== 'quoted') {
      setTransactionReviewOpen(false);
    }
  }, [step]);

  const handleQuoteRef = useRef(handleQuote);
  handleQuoteRef.current = handleQuote;

  /** When the user has entered a from amount, fetch a quote after debounce (and when route/slippage changes). */
  useEffect(() => {
    if (!canRequestQuote) return;
    const id = setTimeout(() => {
      void handleQuoteRef.current();
    }, BRIDGE_QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [
    canRequestQuote,
    amountInput,
    amountInSmallestUnit,
    slippage,
    sourceChain?.chainId,
    destChain?.chainId,
    sourceToken?.chainId,
    sourceToken?.tokenContract,
    destToken?.chainId,
    destToken?.tokenContract,
  ]);

  const handleSignReviewReject = useCallback(() => {
    const resolve = signReviewResolverRef.current;
    signReviewResolverRef.current = null;
    setSignReviewPayload(null);
    resolve?.(false);
  }, []);

  const handleSignReviewSwipe = useCallback(() => {
    const resolve = signReviewResolverRef.current;
    signReviewResolverRef.current = null;
    setSignReviewPayload(null);
    resolve?.(true);
  }, []);

  const confirmBeforeSign = useCallback(async (payload: BridgeV2SignReviewPayload) => {
    return await new Promise<boolean>(resolve => {
      signReviewResolverRef.current = resolve;
      setSignReviewPayload(payload);
    });
  }, []);

  const handleExecute = useCallback(async () => {
    if (!quote || !sourceToken || !sourceChain || !destChain || !destToken) return;

    const fromAddress = getAddressForChainId(sourceChain.chainId)?.trim() ?? '';
    const toAddress = getAddressForChainId(destChain.chainId)?.trim() ?? '';

    const input: BridgeV2QuoteRequestDto = {
      sourceChainId: sourceChain.chainId,
      sourceTokenDenom: bridgeQuoteTokenDenom(sourceToken),
      destChainId: destChain.chainId,
      destTokenDenom: bridgeQuoteTokenDenom(destToken),
      amountIn: amountInSmallestUnit,
      fromAddress: fromAddress || undefined,
      toAddress: toAddress || undefined,
      slippage,
    };

    await executeRoute(quote, sourceToken, destToken, input, executors, {
      confirmBeforeSign,
    });
  }, [
    quote,
    sourceToken,
    destToken,
    sourceChain,
    destChain,
    amountInSmallestUnit,
    slippage,
    getAddressForChainId,
    executeRoute,
    executors,
    confirmBeforeSign,
  ]);

  const handleSwapDirection = useCallback(() => {
    const tempChain = sourceChain;
    const tempToken = sourceToken;
    setSourceChain(destChain);
    setSourceToken(destToken);
    setDestChain(tempChain);
    setDestToken(tempToken);
    setAmountInput('');
    reset();
  }, [sourceChain, destChain, sourceToken, destToken, reset]);

  const openTokenSelector = useCallback(
    (side: TokenSide) => {
      setTokenSelectorSide(side);
      setTokenSearch('');
      setDebouncedSearch('');
      /**
       * Pre-select chain filter: From uses its token’s chain; To uses dest if set, otherwise
       * **From’s chain** so the chip matches the list (not “All Chain”) until user picks another chain.
       */
      const focusChainId =
        chains.length === 1
          ? chains[0].chainId
          : side === 'source'
            ? sourceChain?.chainId ?? sourceToken?.chainId ?? null
            : destChain?.chainId ??
              destToken?.chainId ??
              sourceChain?.chainId ??
              sourceToken?.chainId ??
              null;
      setSelectedFilterChain(focusChainId);
      setShowTokenSelector(true);
      snapBottomSheetToIndex(BRIDGE_V2_SHEET_ID, 1);

      /** Only load the focused chain here; “To” loads other chains when user opens chain filter / picks “All chains”. */
      const needTokens: string[] = [];
      if (focusChainId && !tokensByChain[focusChainId]?.length) {
        needTokens.push(focusChainId);
      }
      if (needTokens.length > 0) {
        void loadTokens(needTokens);
      }
    },
    [
      snapBottomSheetToIndex,
      chains,
      tokensByChain,
      loadTokens,
      sourceChain,
      sourceToken,
      destChain,
      destToken,
    ],
  );

  const selectToken = useCallback(
    (token: BridgeV2Token) => {
      if (tokenSelectorSide === 'source') {
        setSourceToken(token);
        const chain = chains.find(c => c.chainId === token.chainId);
        if (chain) setSourceChain(chain);
      } else {
        setDestToken(token);
        const chain = chains.find(c => c.chainId === token.chainId);
        if (chain) setDestChain(chain);
      }
      setShowTokenSelector(false);
      reset();
      snapBottomSheetToIndex(BRIDGE_V2_SHEET_ID, 0);
    },
    [tokenSelectorSide, chains, reset, snapBottomSheetToIndex],
  );

  const chainMap = useMemo(() => {
    const map: Record<string, BridgeV2Chain> = {};
    chains.forEach(c => { map[c.chainId] = c; });
    return map;
  }, [chains]);

  /** Wallet / connection filtered (e.g. Solana social → Solana only). */
  const allowedBridgeChainIds = useMemo(
    () => new Set(chains.map(c => String(c.chainId))),
    [chains],
  );

  /** Sync pickers when allowed chains change; depend only on `chains` to avoid extra effect runs from derived Set. */
  useEffect(() => {
    if (chains.length === 0) return;
    const allowed = new Set(chains.map(c => String(c.chainId)));
    setSelectedFilterChain(prev => {
      if (chains.length === 1) return String(chains[0].chainId);
      if (prev != null && !allowed.has(String(prev))) return null;
      return prev;
    });
    setSourceChain(prev =>
      prev && !allowed.has(String(prev.chainId)) ? null : prev,
    );
    setDestChain(prev =>
      prev && !allowed.has(String(prev.chainId)) ? null : prev,
    );
    setSourceToken(prev =>
      prev && !allowed.has(String(prev.chainId)) ? null : prev,
    );
    setDestToken(prev =>
      prev && !allowed.has(String(prev.chainId)) ? null : prev,
    );
  }, [chains]);

  // For "source" selector: build tokens from portfolio holdings matched to bridge tokens
  const sourceTokensFromPortfolio = useMemo((): BridgeTokenWithBalance[] => {
    if (!portfolioHoldings?.length) return [];
    if (chains.length === 0) return [];

    const result: BridgeTokenWithBalance[] = [];

    for (const h of portfolioHoldings) {
      if (h.chainDetails.chain_id === HYPERLIQUID_CHAIN_ID) continue;

      const bridgeChainId = getBridgeChainId(h.chainDetails);
      const rawBal = h.balanceDecimal;
      if (parseFloat(rawBal) <= 0) continue;
      const bal = formatTokenAmount(rawBal, h.contractDecimals);

      const chainTokens = tokensByChain[bridgeChainId];
      if (chainTokens) {
        const match = chainTokens.find(t => holdingMatchesBridgeToken(h, t));
        if (match) {
          result.push({
            ...match,
            balance: bal,
            rawBalance: rawBal,
            balanceInteger: h.balanceInteger,
            balanceUsd: h.totalValue,
          });
          continue;
        }
      }

      result.push({
        denom: h.denom || h.contractAddress || '',
        chainId: bridgeChainId,
        isNative: h.isNativeToken,
        isEvm: h.chainDetails.chainIdNumber > 0 && h.chainDetails.chain_id !== 'solana',
        isSvm: h.chainDetails.chain_id === 'solana',
        symbol: h.symbol,
        name: h.name,
        logoUrl: h.logoUrl,
        tokenContract: h.contractAddress || '',
        decimals: h.contractDecimals,
        coingeckoId: h.coinGeckoId,
        recommendedSymbol: h.symbol,
        isLifi: false,
        isSkip: false,
        price: parseFloat(h.price) || 0,
        balance: bal,
        rawBalance: rawBal,
        balanceInteger: h.balanceInteger,
        balanceUsd: h.totalValue,
      });
    }

    result.sort((a, b) => (b.balanceUsd ?? 0) - (a.balanceUsd ?? 0));
    return result.filter(t => allowedBridgeChainIds.has(String(t.chainId)));
  }, [portfolioHoldings, tokensByChain, chains, allowedBridgeChainIds]);

  // Build the token list for the current selector side
  const fuseInstance = useMemo(() => {
    let allTokens: BridgeTokenWithBalance[] = [];

    if (tokenSelectorSide === 'source' && sourceTokensFromPortfolio.length > 0) {
      allTokens = selectedFilterChain
        ? sourceTokensFromPortfolio.filter(
            t => String(t.chainId) === String(selectedFilterChain),
          )
        : sourceTokensFromPortfolio;
    } else {
      if (selectedFilterChain) {
        allTokens =
          selectedFilterChain != null &&
          allowedBridgeChainIds.has(String(selectedFilterChain))
            ? tokensByChain[String(selectedFilterChain)] ?? []
            : [];
      } else {
        for (const c of chains) {
          const cid = String(c.chainId);
          const list = tokensByChain[cid];
          if (list?.length) {
            allTokens = allTokens.concat(list);
          }
        }
      }
    }

    return {
      tokens: allTokens,
      fuse: new Fuse(allTokens, {
        keys: ['symbol', 'name', 'recommendedSymbol'],
        threshold: 0.3,
      }),
    };
  }, [
    tokensByChain,
    selectedFilterChain,
    tokenSelectorSide,
    sourceTokensFromPortfolio,
    chains,
    allowedBridgeChainIds,
  ]);

  const filteredTokens = useMemo(() => {
    if (!debouncedSearch.trim()) return fuseInstance.tokens;
    return fuseInstance.fuse.search(debouncedSearch).map(r => r.item);
  }, [fuseInstance, debouncedSearch]);

  const keyExtractor = useCallback(
    (item: BridgeV2Token, index: number) => `${item.chainId}-${item.denom}-${index}`,
    [],
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: TOKEN_ITEM_HEIGHT,
      offset: TOKEN_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const isSourceSelector = tokenSelectorSide === 'source';

  const renderTokenItem: ListRenderItem<BridgeTokenWithBalance> = useCallback(
    ({ item }) => (
      <MemoizedTokenRow
        token={item}
        chain={chainMap[item.chainId]}
        onPress={() => selectToken(item)}
        balance={item.balance}
        balanceUsd={item.balanceUsd}
        showBalance={isSourceSelector}
      />
    ),
    [chainMap, selectToken, isSourceSelector],
  );

  const tokenListEmptyComponent = useMemo(() => {
    if (loading.tokens) {
      return (
        <CyDView className='items-center py-[40px]'>
          <ActivityIndicator size='small' color={colors.activityIndicator} />
        </CyDView>
      );
    }
    return (
      <CyDView className='items-center py-[40px]'>
        <CyDText className='text-[14px] text-base150'>No tokens found</CyDText>
      </CyDView>
    );
  }, [loading.tokens]);

  const formatDuration = (seconds?: number) => {
    if (seconds == null) return '';
    if (seconds === 0) return 'Instant';
    if (seconds < 60) return `~${seconds}s`;
    return `~${Math.round(seconds / 60)}m`;
  };

  const showReview = step === 'quoted' && transactionReviewOpen;

  const isExecutionScreen = step === 'executing' || step === 'polling' || step === 'completed' || step === 'failed';

  useEffect(() => {
    if (isExecutionScreen) {
      snapBottomSheetToIndex(BRIDGE_V2_SHEET_ID, 1);
    } else if (!showReview) {
      snapBottomSheetToIndex(BRIDGE_V2_SHEET_ID, 0);
    }
  }, [showReview, isExecutionScreen, snapBottomSheetToIndex]);

  const handleMaxPress = useCallback(() => {
    if (!sourceTokenBalance || !sourceToken) return;
    const bi = sourceTokenBalance.balanceInteger;
    if (bi) {
      try {
        setAmountInput(formatUnits(BigInt(bi), sourceToken.decimals));
      } catch {
        setAmountInput(sourceTokenBalance.rawBalance);
      }
    } else {
      setAmountInput(sourceTokenBalance.rawBalance);
    }
    reset();
  }, [sourceTokenBalance, sourceToken, reset]);

  const handlePercentagePress = useCallback(
    (pct: number) => {
      if (!sourceTokenBalance || !sourceToken) return;
      const bi = sourceTokenBalance.balanceInteger;
      if (!bi) {
        const val = DecimalHelper.multiply(sourceTokenBalance.rawBalance, pct).toString();
        setAmountInput(val);
        reset();
        return;
      }
      let balanceBigInt: bigint;
      try {
        balanceBigInt = BigInt(bi);
      } catch {
        const val = DecimalHelper.multiply(sourceTokenBalance.rawBalance, pct).toString();
        setAmountInput(val);
        reset();
        return;
      }

      const scaled =
        pct >= 1
          ? balanceBigInt
          : (balanceBigInt * BigInt(Math.round(pct * 1_000_000))) / 1_000_000n;
      setAmountInput(formatUnits(scaled, sourceToken.decimals));
      reset();
    },
    [sourceTokenBalance, sourceToken, reset],
  );

  // ─── Token Selection View ──────────────────────────────────────
  if (showTokenSelector) {
    return (
      <>
      <CyDView className='flex-1'>
        {/* Header */}
        <CyDView className='flex-row items-center px-[16px] pb-[12px]'>
          <CyDTouchView
            onPress={() => {
              setShowTokenSelector(false);
              snapBottomSheetToIndex(BRIDGE_V2_SHEET_ID, 0);
            }}
            className='mr-[12px] p-[4px]'>
            <CyDIcons name='arrow-left' className='text-[24px] text-base400' />
          </CyDTouchView>
          <CyDText className='text-[18px] font-semibold'>Select Token</CyDText>
        </CyDView>

        {/* Search + Chain filter */}
        <CyDView className='flex-row items-center px-[16px] gap-[8px] mb-[12px]'>
          <CyDView className='flex-1 flex-row items-center bg-n0 rounded-[12px] px-[12px] h-[44px]'>
            <CyDIcons name='search' className='text-[18px] text-base150 mr-[8px]' />
            <BottomSheetTextInput
              placeholder='Search tokens'
              placeholderTextColor={colors.placeholder}
              value={tokenSearch}
              onChangeText={handleSearchChange}
              style={[styles.searchInput, { color: colors.inputText }]}
            />
          </CyDView>

          {chains.length > 1 && (
            <CyDTouchView
              onPress={() => setShowChainFilter(!showChainFilter)}
              className='flex-row items-center bg-n20 rounded-[12px] px-[12px] h-[44px]'>
              <CyDView className='w-[20px] h-[20px] rounded-full bg-base200 mr-[6px] items-center justify-center overflow-hidden'>
                {selectedFilterChain ? (
                  <CyDFastImage
                    source={{ uri: chainMap[selectedFilterChain]?.logoUrl ?? '' }}
                    className='w-[20px] h-[20px] rounded-full'
                  />
                ) : (
                  <CyDText className='text-[8px] text-base400'>All</CyDText>
                )}
              </CyDView>
              <CyDText className='text-[14px] font-medium text-base400 mr-[4px]'>
                {selectedFilterChain
                  ? chainMap[selectedFilterChain]?.prettyName ?? 'Chain'
                  : 'All Chain'}
              </CyDText>
              <CyDIcons name='chevron-down' className='text-[14px] text-base150' />
            </CyDTouchView>
          )}
        </CyDView>

        {/* Chain filter dropdown overlay */}
        {chains.length > 1 && showChainFilter && (
          <CyDView className='absolute top-[110px] right-[16px] z-50 bg-n30 rounded-[16px] py-[8px] w-[200px]' style={styles.chainDropdownShadow}>
            <ScrollView style={{ maxHeight: 350 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <CyDTouchView
                onPress={() => {
                  setSelectedFilterChain(null);
                  setShowChainFilter(false);
                  if (tokenSelectorSide === 'dest') {
                    const missing = chains
                      .filter(c => c.chainId !== HYPERLIQUID_CHAIN_ID && !tokensByChain[c.chainId]?.length)
                      .map(c => c.chainId);
                    if (missing.length > 0) void loadTokens(missing);
                  }
                }}
                className='flex-row items-center px-[16px] py-[10px]'>
                <CyDView className='w-[24px] h-[24px] rounded-full bg-base200 mr-[10px] items-center justify-center'>
                  <CyDText className='text-[8px] text-base400'>All</CyDText>
                </CyDView>
                <CyDText className='flex-1 text-[14px] text-base400'>All Chains</CyDText>
                {!selectedFilterChain && <CyDIcons name='tick' className='text-[16px] text-p300' />}
              </CyDTouchView>
              {chains.map(chain => (
                <CyDTouchView
                  key={chain.chainId}
                  onPress={() => {
                    setSelectedFilterChain(chain.chainId);
                    setShowChainFilter(false);
                    if (!tokensByChain[chain.chainId]?.length) void loadTokens([chain.chainId]);
                  }}
                  className='flex-row items-center px-[16px] py-[10px]'>
                  <CyDFastImage source={{ uri: chain.logoUrl }} className='w-[24px] h-[24px] rounded-full mr-[10px]' />
                  <CyDText className='flex-1 text-[14px] text-base400'>{chain.prettyName}</CyDText>
                  {selectedFilterChain === chain.chainId && <CyDIcons name='tick' className='text-[16px] text-p300' />}
                </CyDTouchView>
              ))}
            </ScrollView>
          </CyDView>
        )}

        {/* Section label */}
        <CyDView className='px-[16px] mb-[8px]'>
          <CyDText className='text-[12px] font-medium text-base150'>
            {isSourceSelector && sourceTokensFromPortfolio.length > 0 ? 'Your tokens' : 'Available tokens'}
          </CyDText>
        </CyDView>

        {/* Regular FlatList with explicit height – bypasses flex chain issues inside BottomSheet */}
        <FlatList
          data={filteredTokens}
          keyExtractor={keyExtractor}
          renderItem={renderTokenItem}
          getItemLayout={getItemLayout}
          ListEmptyComponent={tokenListEmptyComponent}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          style={{ height: TOKEN_LIST_MAX_HEIGHT }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          keyboardDismissMode='on-drag'
          keyboardShouldPersistTaps='handled'
          nestedScrollEnabled
        />
      </CyDView>
      </>
    );
  }

  // ─── Execution Progress / Result Screen ──────────────────────────
  const isExecutionActive = step === 'executing' || step === 'polling';
  const isExecutionDone = step === 'completed' || step === 'failed';

  if ((isExecutionActive || isExecutionDone) && quote && destToken) {
    const estimatedOutput = quote.estimatedAmountOut
      ? formatUnits(BigInt(quote.estimatedAmountOut), destToken.decimals)
      : '0';

    const sourceTxHash = (() => {
      const swapStep = executionSteps.find(s => s.id === 'lifi-swap' && s.txHash);
      return swapStep?.txHash ?? statusInfo?.sendingTxHash;
    })();
    const bridgeExplorerUrl = statusInfo?.bridgeExplorerUrl;
    const sourceChainName = sourceChain?.prettyName ?? quote.sourceChainId;
    const destChainName = destChain?.prettyName ?? quote.destChainId;

    const stepStatusText = (status: string) => {
      switch (status) {
        case 'completed': return 'Done';
        case 'in_progress': return 'In progress';
        case 'failed': return 'Failed';
        default: return 'Pending';
      }
    };
    const stepStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'text-green350';
        case 'in_progress': return 'text-cyan400';
        case 'failed': return 'text-red300';
        default: return 'text-base200';
      }
    };

    // ── Processing screen ────────────────────────────────────────
    if (isExecutionActive) {
      const { loaderSlotHeight, lottieSize } = bridgeLoaderLayout;

      return (
        <CyDView
          className='flex-1'
          style={{ paddingTop: 8 }}
          onLayout={e => {
            setBridgeProcShellH(e.nativeEvent.layout.height);
          }}>
          <CyDView
            className='items-center w-full'
            style={{
              height: loaderSlotHeight,
              minHeight: 88,
              maxHeight: Math.round(Dimensions.get('window').height * 0.35),
              justifyContent: 'flex-start',
              paddingTop: 4,
            }}>
            <CyDLottieView
              source={AppImages.BRIDGE_LOADER}
              autoPlay
              loop
              style={{ width: lottieSize, height: lottieSize }}
            />
          </CyDView>
          <ScrollView
            ref={bridgeProcessingScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              /** Pin Est. Received, steps, and sign panel to the bottom when there is free space. */
              justifyContent: 'flex-end',
              paddingBottom: insets.bottom + 16,
            }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps='handled'>
            <CyDView
              onLayout={e => {
                setBridgeProcBelowH(e.nativeEvent.layout.height);
              }}>
              <CyDView className='items-center pt-[8px] pb-[10px]'>
                <CyDText className='text-[17px] font-medium text-base400' style={{ letterSpacing: -1 }}>
                  Transaction In Progress
                </CyDText>
              </CyDView>

              <CyDView className='mx-[16px] bg-n40 rounded-[10px] p-[12px] mb-[8px]'>
                <CyDText className='text-[12px] font-medium text-base150 mb-[6px]'>Est. Received</CyDText>
                <CyDView className='flex-row items-center gap-[8px] mb-[4px]'>
                  <CyDView className='relative'>
                    <CyDFastImage source={{ uri: destToken.logoUrl }} className='w-[32px] h-[32px] rounded-full' />
                    {destChain && (
                      <CyDFastImage
                        source={{ uri: destChain.logoUrl }}
                        className='w-[16px] h-[16px] rounded-full absolute -bottom-[1px] -right-[1px] border border-n0'
                      />
                    )}
                  </CyDView>
                  <CyDView className='flex-row items-center gap-[1px] flex-1 min-w-0'>
                    <CyDView className='flex-1 min-w-0 overflow-hidden'>
                      <SplitAmountDisplay amount={estimatedOutput} fontSize={24} />
                    </CyDView>
                    <CyDText className='!font-gambetta font-normal text-base200 ml-[1px] shrink-0' style={{ fontSize: 20, letterSpacing: -1 }}>
                      {destToken.symbol}
                    </CyDText>
                  </CyDView>
                </CyDView>
                <CyDTokenValue className='text-[12px]' mainColorClass='text-base150' decimalColorClass='!text-base150'>
                  {quote.amountOutUsd ? parseFloat(quote.amountOutUsd) : 0}
                </CyDTokenValue>
              </CyDView>

              {executionSteps.map(s => (
                <CyDView key={s.id} className='mx-[16px] bg-n40 rounded-[10px] px-[12px] py-[12px] mb-[6px]'>
                  <CyDView className='flex-row items-center justify-between'>
                    <CyDView className='flex-row items-center gap-[10px] flex-1 mr-[12px]'>
                      {s.status === 'in_progress' && (
                        <ActivityIndicator size={20} color={colors.activityIndicator} />
                      )}
                      {s.status === 'completed' && (
                        <CyDIcons name='tick' className='text-[20px] text-green350' />
                      )}
                      {s.status === 'failed' && (
                        <CyDIcons name='close' className='text-[20px] text-red300' />
                      )}
                      {s.status === 'pending' && (
                        <CyDView className='w-[20px] h-[20px] rounded-full border border-base200' />
                      )}
                      <CyDText className='text-[14px] font-medium text-base400 flex-shrink' style={{ letterSpacing: -0.6 }} numberOfLines={1}>
                        {s.label}
                      </CyDText>
                    </CyDView>
                    <CyDText className={`text-[14px] font-medium ${stepStatusColor(s.status)}`} style={{ letterSpacing: -0.6 }}>
                      {stepStatusText(s.status)}
                    </CyDText>
                  </CyDView>
                </CyDView>
              ))}

              {signReviewPayload ? (
                <CyDView
                  onLayout={() => {
                    scrollBridgeProcessingToEnd();
                  }}>
                  <BridgeV2InlineSignPanel
                    payload={signReviewPayload}
                    onSwipeSign={handleSignReviewSwipe}
                    onReject={handleSignReviewReject}
                  />
                </CyDView>
              ) : null}
            </CyDView>
          </ScrollView>
        </CyDView>
      );
    }

    // ── Success screen ───────────────────────────────────────────
    if (step === 'completed') {
      const sourceTxExplorerUrl = sourceTxHash
        ? resolveBridgeTxExplorerUrl(quote.sourceChainId, sourceTxHash)
        : null;

      return (
        <>
        <CyDView className='flex-1'>
          <ScrollView className='flex-1' bounces={false} showsVerticalScrollIndicator={false}>
            <CyDView className='items-center justify-center pt-[40px] pb-[24px]'>
              <CyDView className='w-[100px] h-[100px] rounded-full bg-green350 items-center justify-center mb-[16px]'>
                <CyDIcons name='tick' className='text-[48px] text-white' />
              </CyDView>
              <CyDText className='text-[20px] font-semibold text-base400' style={{ letterSpacing: -1 }}>
                Transaction Successful
              </CyDText>
              <CyDText className='text-[12px] font-medium text-base150 text-center mx-[48px] mt-[6px]'>
                Check out your wallet—you should see your bridged assets there now!
              </CyDText>
            </CyDView>

            {/* Transaction summary */}
            <CyDView className='mx-[16px] bg-n40 rounded-[10px] overflow-hidden'>
              {/* Route */}
              <CyDView className='flex-row items-center justify-between px-[16px] py-[14px] border-b border-n20'>
                <CyDText className='text-[14px] font-medium text-base150' style={{ letterSpacing: -0.6 }}>Route</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400' style={{ letterSpacing: -0.6 }}>
                  {sourceChainName} → {destChainName}
                </CyDText>
              </CyDView>

              {/* Provider */}
              <CyDView className='flex-row items-center justify-between px-[16px] py-[14px] border-b border-n20'>
                <CyDText className='text-[14px] font-medium text-base150' style={{ letterSpacing: -0.6 }}>Provider</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400' style={{ letterSpacing: -0.6 }}>
                  {(quote.provider === 'lifi' ? 'Lifi' : 'Skip')}{quote.routeTool ? ` (${quote.routeTool})` : ''}
                </CyDText>
              </CyDView>

              {/* Source Tx */}
              {sourceTxHash && (
                <CyDView className='flex-row items-center justify-between px-[16px] py-[14px] border-b border-n20'>
                  <CyDText className='text-[14px] font-medium text-base150' style={{ letterSpacing: -0.6 }}>
                    Source Tx ({sourceChainName})
                  </CyDText>
                  <CyDTouchView
                    className='flex-row items-center gap-[4px]'
                    disabled={!sourceTxExplorerUrl}
                    onPress={() => {
                      if (sourceTxExplorerUrl) void Linking.openURL(sourceTxExplorerUrl);
                    }}>
                    <CyDText
                      className='text-[14px] font-medium text-base400'
                      style={{
                        textDecorationLine: sourceTxExplorerUrl ? 'underline' : undefined,
                        letterSpacing: -0.6,
                      }}>
                      {`${sourceTxHash.slice(0, 8)}....${sourceTxHash.slice(-5)}`}
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              )}

              {/* Step tx hashes */}
              {executionSteps.filter(s => s.txHash && s.id !== 'lifi-swap').map(s => {
                const stepExplorerUrl = resolveBridgeTxExplorerUrl(
                  explorerChainForExecutionStep(s, quote),
                  s.txHash!,
                );
                return (
                  <CyDView key={s.id} className='flex-row items-center justify-between px-[16px] py-[14px] border-b border-n20'>
                    <CyDText className='text-[14px] font-medium text-base150 flex-1 mr-[12px]' style={{ letterSpacing: -0.6 }} numberOfLines={1}>
                      {s.label}
                    </CyDText>
                    <CyDTouchView
                      className='flex-shrink'
                      disabled={!stepExplorerUrl}
                      onPress={() => {
                        if (stepExplorerUrl) void Linking.openURL(stepExplorerUrl);
                      }}>
                      <CyDText
                        className='text-[14px] font-medium text-base400'
                        style={{
                          textDecorationLine: stepExplorerUrl ? 'underline' : undefined,
                          letterSpacing: -0.6,
                        }}>
                        {`${s.txHash!.slice(0, 8)}....${s.txHash!.slice(-5)}`}
                      </CyDText>
                    </CyDTouchView>
                  </CyDView>
                );
              })}

              {/* Bridge Explorer */}
              {bridgeExplorerUrl && (
                <CyDView className='flex-row items-center justify-between px-[16px] py-[14px]'>
                  <CyDText className='text-[14px] font-medium text-base150' style={{ letterSpacing: -0.6 }}>Bridge Explorer</CyDText>
                  <CyDTouchView
                    className='flex-row items-center gap-[4px]'
                    onPress={() => Linking.openURL(bridgeExplorerUrl)}>
                    <CyDText className='text-[14px] font-medium text-base400' style={{ textDecorationLine: 'underline', letterSpacing: -0.6 }}>
                      View
                    </CyDText>
                  </CyDTouchView>
                </CyDView>
              )}
            </CyDView>
          </ScrollView>

          {/* Done button pinned to bottom */}
          <CyDView className='mx-[16px]' style={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}>
            <CyDTouchView
              onPress={() => { reset(); setAmountInput(''); setSourceToken(null); setDestToken(null); }}
              className='bg-p100 rounded-[39px] h-[44px] items-center justify-center'>
              <CyDText className='text-[16px] font-semibold text-black' style={{ letterSpacing: -0.8 }}>Done</CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
        </>
      );
    }

    // ── Failed screen ────────────────────────────────────────────
    if (step === 'failed') {
      return (
        <>
        <CyDView className='flex-1'>
          <CyDView className='flex-1 items-center justify-center'>
            <CyDView className='w-[100px] h-[100px] rounded-full bg-red300 items-center justify-center mb-[16px]'>
              <CyDIcons name='close' className='text-[48px] text-white' />
            </CyDView>
            <CyDText className='text-[20px] font-semibold text-base400' style={{ letterSpacing: -1 }}>
              Transaction Failed
            </CyDText>
            {error && (
              <CyDText className='text-[12px] font-medium text-base150 text-center mx-[48px] mt-[6px]' numberOfLines={4}>
                {error}
              </CyDText>
            )}
          </CyDView>

          <CyDView className='mx-[16px]' style={{ paddingBottom: insets.bottom + 16 }}>
            {/* Step summary */}
            {executionSteps.length > 0 && (
              <CyDView className='bg-n40 rounded-[10px] overflow-hidden mb-[16px]'>
                {executionSteps.filter(s => s.status === 'completed' || s.status === 'failed').map(s => (
                  <CyDView key={s.id} className='flex-row items-center justify-between px-[16px] py-[12px] border-b border-n20'>
                    <CyDView className='flex-row items-center gap-[10px] flex-1 mr-[12px]'>
                      {s.status === 'completed' && <CyDIcons name='tick' className='text-[18px] text-green350' />}
                      {s.status === 'failed' && <CyDIcons name='close' className='text-[18px] text-red300' />}
                      <CyDText className='text-[14px] font-medium text-base400 flex-shrink' style={{ letterSpacing: -0.6 }} numberOfLines={1}>
                        {s.label}
                      </CyDText>
                    </CyDView>
                    <CyDText className={`text-[14px] font-medium ${stepStatusColor(s.status)}`} style={{ letterSpacing: -0.6 }}>
                      {stepStatusText(s.status)}
                    </CyDText>
                  </CyDView>
                ))}
              </CyDView>
            )}

            {/* Try Again button */}
            <CyDTouchView
              onPress={() => { reset(); }}
              className='bg-p100 rounded-[39px] h-[44px] items-center justify-center'>
              <CyDText className='text-[16px] font-semibold text-black' style={{ letterSpacing: -0.8 }}>Try Again</CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
        </>
      );
    }
  }

  // ─── Review Transaction ──────────────────────────────────────────
  if (showReview && quote && sourceToken && destToken) {
    const totalGasFee = quote.fees
      .filter(f => f.feeType === 'gas')
      .map(f => (f.amountUsd ? `$${parseFloat(f.amountUsd).toFixed(4)}` : `${f.amount} ${f.tokenSymbol ?? ''}`))
      .join(' + ') || '—';

    const handleBackToForm = () => {
      setTransactionReviewOpen(false);
    };

    return (
      <>
      <CyDView className='flex-1'>
        {/* Header – stays fixed */}
        <CyDView className='flex-row items-center gap-[10px] px-[16px] mb-[10px]'>
          <CyDTouchView onPress={handleBackToForm}>
            <CyDIcons name='arrow-left' className='text-[20px] text-base400' />
          </CyDTouchView>
          <CyDText className='text-[18px] font-medium text-base400' style={{ letterSpacing: -0.8 }}>
            Review Transaction
          </CyDText>
        </CyDView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          nestedScrollEnabled
          bounces={false}>
          {/* Your Transaction label */}
          <CyDView className='flex-row items-center gap-[5px] px-[16px] mb-[6px]'>
            <CyDIcons name='wallet' className='text-[14px] text-n50' />
            <CyDText className='text-[11px] font-medium text-n50'>Your Transaction</CyDText>
          </CyDView>

          {/* From / To Card */}
          <CyDView className='mx-[16px] bg-n10 rounded-[10px] overflow-hidden'>
            {/* From */}
            <CyDView className='px-[12px] py-[10px]'>
              <CyDText className='text-[11px] font-medium text-base150 mb-[6px]'>From</CyDText>
              <CyDView className='flex-row items-center gap-[8px] mb-[4px]'>
                <CyDView className='relative'>
                  <CyDFastImage source={{ uri: sourceToken.logoUrl }} className='w-[28px] h-[28px] rounded-full' />
                  {sourceChain && (
                    <CyDFastImage
                      source={{ uri: sourceChain.logoUrl }}
                      className='w-[14px] h-[14px] rounded-full absolute -bottom-[1px] -right-[1px] border border-n0'
                    />
                  )}
                </CyDView>
                <CyDView className='flex-row items-center gap-[1px] flex-1 min-w-0'>
                  <CyDView className='flex-1 min-w-0 overflow-hidden'>
                    <SplitAmountDisplay amount={amountInput || '0'} fontSize={22} />
                  </CyDView>
                  <CyDText className='!font-gambetta font-normal text-base200 ml-[1px] shrink-0' style={{ fontSize: 18, letterSpacing: -1 }}>
                    {sourceToken.symbol}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDTokenValue className='text-[11px]' mainColorClass='text-base150' decimalColorClass='!text-base150'>
                {quote.amountInUsd ? parseFloat(quote.amountInUsd) : 0}
              </CyDTokenValue>
            </CyDView>

            {/* Divider */}
            <CyDView className='h-[0.3px] bg-base200' />

            {/* Est. Received */}
            <CyDView className='px-[12px] py-[10px]'>
              <CyDText className='text-[11px] font-medium text-base150 mb-[6px]'>Est. Received</CyDText>
              <CyDView className='flex-row items-center gap-[8px] mb-[4px]'>
                <CyDView className='relative'>
                  <CyDFastImage source={{ uri: destToken.logoUrl }} className='w-[28px] h-[28px] rounded-full' />
                  {destChain && (
                    <CyDFastImage
                      source={{ uri: destChain.logoUrl }}
                      className='w-[14px] h-[14px] rounded-full absolute -bottom-[1px] -right-[1px] border border-n0'
                    />
                  )}
                </CyDView>
                <CyDView className='flex-row items-center gap-[1px] flex-1 min-w-0'>
                  <CyDView className='flex-1 min-w-0 overflow-hidden'>
                    <SplitAmountDisplay amount={estimatedOutput || '0'} fontSize={22} />
                  </CyDView>
                  <CyDText className='!font-gambetta font-normal text-base200 ml-[1px] shrink-0' style={{ fontSize: 18, letterSpacing: -1 }}>
                    {destToken.symbol}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='flex-row items-center gap-[4px]'>
                <CyDTokenValue className='text-[11px]' mainColorClass='text-base150' decimalColorClass='!text-base150'>
                  {quote.amountOutUsd ? parseFloat(quote.amountOutUsd) : 0}
                </CyDTokenValue>
                {quote.amountInUsd && quote.amountOutUsd && (() => {
                  const diff = ((parseFloat(quote.amountOutUsd) - parseFloat(quote.amountInUsd)) / parseFloat(quote.amountInUsd)) * 100;
                  return (
                    <CyDText className={`text-[11px] font-medium ${diff >= 0 ? 'text-green350' : 'text-base150'}`}>
                      ({diff >= 0 ? '+' : ''}{diff.toFixed(2)}%)
                    </CyDText>
                  );
                })()}
              </CyDView>
            </CyDView>
          </CyDView>

          {/* Transaction Details Card */}
          <CyDView className='mx-[16px] mt-[8px] bg-n10 rounded-[10px] px-[12px] py-[8px]'>
            <CyDView className='flex-row items-center justify-between py-[4px]'>
              <CyDText className='text-[11px] font-medium text-base150'>Slippage Tolerance</CyDText>
              <CyDView className='flex-row items-center gap-[2px]'>
                <CyDIcons name='shield-tick' className='text-[14px] text-p150' />
                <CyDText className='text-[11px] font-medium text-base400'>{(slippage * 100).toFixed(1)}%</CyDText>
                <CyDIcons name='chevron-right' className='text-[14px] text-base150' />
              </CyDView>
            </CyDView>
            <CyDView className='flex-row items-center justify-between py-[4px]'>
              <CyDText className='text-[11px] font-medium text-base150'>Gas Fee / Transaction Fee</CyDText>
              <CyDText className='text-[11px] font-medium text-base400'>{totalGasFee}</CyDText>
            </CyDView>
            <CyDView className='flex-row items-center justify-between py-[4px]'>
              <CyDText className='text-[11px] font-medium text-base150'>Route Preference</CyDText>
              <CyDView className='flex-row items-center gap-[2px]'>
                <CyDText className='text-[11px] font-medium text-base400'>{quote.routeTool ?? 'Cheapest'}</CyDText>
                <CyDIcons name='chevron-right' className='text-[14px] text-base150' />
              </CyDView>
            </CyDView>
            {quote.estimatedDurationSeconds != null && (
              <CyDView className='flex-row items-center justify-between py-[4px]'>
                <CyDText className='text-[11px] font-medium text-base150'>Est. Time</CyDText>
                <CyDText className='text-[11px] font-medium text-base400'>{formatDuration(quote.estimatedDurationSeconds)}</CyDText>
              </CyDView>
            )}
          </CyDView>

          {/* Bottom CTA */}
          <CyDView className='px-[16px] pt-[8px]'>
            <CyDTouchView onPress={handleExecute} className='bg-p100 rounded-[39px] h-[50px] items-center justify-center'>
              <CyDText className='text-[16px] font-semibold text-black' style={{ letterSpacing: -0.8 }}>Start Transaction</CyDText>
            </CyDTouchView>
          </CyDView>
        </ScrollView>
      </CyDView>
      </>
    );
  }

  // ─── Main Bridge Form ──────────────────────────────────────────
  return (
    <>
    <CyDView className='flex-1' style={{ paddingBottom: insets.bottom }}>
      {/* Header */}
      <CyDView className='flex-row items-center justify-between px-[16px] mb-[16px]'>
        <CyDText className='text-[20px] font-bold text-base400'>Bridge</CyDText>
        <CyDTouchView
          onPress={() => {
            const next = !showSlippagePanel;
            setShowSlippagePanel(next);
          }}
          className='w-[36px] h-[36px] rounded-full bg-n30 items-center justify-center'>
          <CyDIcons name='settings' className='text-[18px] text-base200' />
        </CyDTouchView>
      </CyDView>

      {/* From Card */}
      <CyDView className='mx-[16px] bg-n10 rounded-[10px] p-[12px] h-[140px] justify-between'>
        {/* Row 1: From chain + percentage shortcuts */}
        <CyDView className='flex-row items-center justify-between'>
          <CyDTouchView className='flex-row items-center gap-[6px]' onPress={() => openTokenSelector('source')}>
            <CyDText className='text-[14px] text-base150' style={{ letterSpacing: -0.6 }}>From</CyDText>
            {sourceChain && (
              <CyDView className='flex-row items-center gap-[3px]'>
                <CyDFastImage source={{ uri: sourceChain.logoUrl }} className='w-[16px] h-[16px] rounded-full' />
                <CyDText className='text-[14px] font-medium text-base400' style={{ letterSpacing: -0.6 }}>{sourceChain.prettyName}</CyDText>
              </CyDView>
            )}
          </CyDTouchView>
          <CyDView className='flex-row items-center gap-[12px]'>
            <CyDTouchView onPress={() => handlePercentagePress(0.25)}>
              <CyDText className='text-[14px] font-medium text-base150' style={{ letterSpacing: -0.6 }}>25%</CyDText>
            </CyDTouchView>
            <CyDTouchView onPress={() => handlePercentagePress(0.5)}>
              <CyDText className='text-[14px] font-medium text-base150' style={{ letterSpacing: -0.6 }}>50%</CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {/* Row 2: Amount input + token selector */}
        <CyDView className='flex-row items-center justify-between h-[44px]'>
          <CyDView className='flex-1 min-w-0 mr-[8px] h-[44px] justify-center overflow-hidden'>
            <CyDTextInput
              value={amountInput}
              onChangeText={(text: string) => {
                const sanitized = text.replace(/[^0-9.]/g, '');
                if (sanitized.split('.').length > 2) return;
                setAmountInput(sanitized);
                reset();
              }}
              placeholder='0.0'
              placeholderTextColor={colors.placeholder}
              keyboardType='decimal-pad'
              selectionColor={colors.caret}
              className='!font-gambetta font-bold bg-transparent'
              style={{
                fontSize: 32,
                letterSpacing: -1,
                color: amountInput ? 'transparent' : colors.inputText,
                minWidth: 0,
                width: '100%',
              }}
            />
            {amountInput ? (
              <CyDView
                className='absolute left-0 right-0 top-0 bottom-0 justify-center overflow-hidden'
                pointerEvents='none'>
                <SplitAmountDisplay amount={amountInput} fontSize={32} />
              </CyDView>
            ) : null}
          </CyDView>
          <CyDTouchView
            onPress={() => openTokenSelector('source')}
            className='flex-row items-center gap-[4px] shrink-0'>
            {sourceToken ? (
              <>
                <CyDFastImage source={{ uri: sourceToken.logoUrl }} className='w-[28px] h-[28px] rounded-full' />
                <CyDText className='text-[22px] font-medium text-base400' style={{ letterSpacing: -1 }}>{sourceToken.symbol}</CyDText>
              </>
            ) : (
              <CyDText className='text-[22px] font-medium text-base150' style={{ letterSpacing: -1 }}>Select</CyDText>
            )}
            <CyDIcons name='chevron-down' className='text-[20px] text-base150' />
          </CyDTouchView>
        </CyDView>

        {/* Row 3: USD value + wallet balance + Max */}
        <CyDView className='flex-row items-center justify-between'>
          <CyDTokenValue className='text-[14px]' mainColorClass='text-base150' decimalColorClass='!text-base150'>
            {amountInput && sourceToken?.price
              ? DecimalHelper.multiply(amountInput, sourceToken.price).toNumber()
              : 0}
          </CyDTokenValue>
          <CyDView className='flex-row items-center gap-[4px]'>
            <CyDIcons name='wallet' className='text-[16px] text-base150' />
            <CyDTokenAmount className='text-[14px] text-base150'>
              {sourceTokenBalance ? sourceTokenBalance.rawBalance : '0'}
            </CyDTokenAmount>
            <CyDTouchView onPress={handleMaxPress}>
              <CyDText className='text-[14px] font-medium text-p300' style={{ letterSpacing: -0.6 }}>Max</CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>
      </CyDView>

      {/* Swap Direction Button */}
      <CyDView className='items-center z-10 -my-[8px]'>
        <CyDTouchView
          onPress={handleSwapDirection}
          className='w-[32px] h-[32px] rounded-full bg-n30 items-center justify-center'>
          <CyDIcons name='swap-vertical' className='text-[18px] text-base400' />
        </CyDTouchView>
      </CyDView>

      {/* To Card */}
      <CyDView className='mx-[16px] bg-n10 rounded-[10px] p-[12px] h-[140px] justify-between'>
        {/* Row 1: To chain */}
        <CyDView className='flex-row items-center justify-between'>
          <CyDTouchView className='flex-row items-center gap-[6px]' onPress={() => openTokenSelector('dest')}>
            <CyDText className='text-[14px] text-base150' style={{ letterSpacing: -0.6 }}>To</CyDText>
            {destChain && (
              <CyDView className='flex-row items-center gap-[3px]'>
                <CyDFastImage source={{ uri: destChain.logoUrl }} className='w-[16px] h-[16px] rounded-full' />
                <CyDText className='text-[14px] font-medium text-base400' style={{ letterSpacing: -0.6 }}>{destChain.prettyName}</CyDText>
              </CyDView>
            )}
          </CyDTouchView>
        </CyDView>

        {/* Row 2: Estimated output + token selector */}
        <CyDView className='flex-row items-center justify-between h-[44px]'>
          <CyDView className='flex-1 min-w-0 mr-[8px] overflow-hidden'>
            {step === 'quoting' ? (
              <CyDText className='!font-gambetta font-bold text-base150' style={{ fontSize: 32, letterSpacing: -1 }}>...</CyDText>
            ) : (
              <SplitAmountDisplay amount={estimatedOutput || '0.0'} fontSize={32} dimWhole={!estimatedOutput} />
            )}
          </CyDView>
          <CyDTouchView
            onPress={() => openTokenSelector('dest')}
            className='flex-row items-center gap-[4px] shrink-0'>
            {destToken ? (
              <>
                <CyDFastImage source={{ uri: destToken.logoUrl }} className='w-[28px] h-[28px] rounded-full' />
                <CyDText className='text-[22px] font-medium text-base400' style={{ letterSpacing: -1 }}>{destToken.symbol}</CyDText>
              </>
            ) : (
              <CyDText className='text-[22px] font-medium text-base150' style={{ letterSpacing: -1 }}>Select</CyDText>
            )}
            <CyDIcons name='chevron-down' className='text-[20px] text-base150' />
          </CyDTouchView>
        </CyDView>

        {/* Row 3: USD value */}
        <CyDView className='flex-row items-center justify-between'>
          <CyDTokenValue className='text-[14px]' mainColorClass='text-base150' decimalColorClass='!text-base150'>
            {quote?.amountOutUsd ? parseFloat(quote.amountOutUsd) : 0}
          </CyDTokenValue>
        </CyDView>
      </CyDView>

      {/* Quote / validation errors (execution errors use the dedicated failed screen) */}
      {error && !isExecutionScreen && (
        <CyDView className='mx-[16px] mt-[8px] mb-[4px] bg-red300/15 border border-red300/40 rounded-[10px] px-[12px] py-[10px]'>
          <CyDText className='text-[13px] font-medium text-red300' style={{ letterSpacing: -0.3 }}>
            {error}
          </CyDText>
        </CyDView>
      )}

      {/* Bottom CTA */}
      <CyDView className='px-[16px] pb-[8px] pt-[16px]'>
        {/* Slippage Tolerance */}
        {showSlippagePanel && (
          <CyDView className='bg-n20 rounded-[12px] p-[12px] mb-[12px]'>
            <CyDText className='text-[13px] font-medium text-base150 mb-[8px]'>Slippage Tolerance</CyDText>
            <CyDView className='flex-row items-center gap-[8px]'>
              {[0.001, 0.005, 0.01, 0.03].map(val => (
                <CyDTouchView
                  key={val}
                  onPress={() => {
                    setSlippage(val);
                    reset();
                    setShowSlippagePanel(false);
                    snapBottomSheetToIndex(BRIDGE_V2_SHEET_ID, 0);
                  }}
                  className={`flex-1 h-[36px] rounded-[8px] items-center justify-center ${slippage === val ? 'bg-p100' : 'bg-n30'}`}>
                  <CyDText className={`text-[13px] font-semibold ${slippage === val ? 'text-black' : 'text-base400'}`}>
                    {(val * 100).toFixed(1)}%
                  </CyDText>
                </CyDTouchView>
              ))}
            </CyDView>
          </CyDView>
        )}
        {!canRequestQuote && (
          <CyDView className='bg-n30 rounded-[39px] h-[54px] items-center justify-center'>
            <CyDText className='text-[16px] font-semibold text-base150'>Enter the amount</CyDText>
          </CyDView>
        )}
        {canRequestQuote && step === 'quoted' && !transactionReviewOpen && (
          <CyDTouchView
            onPress={() => setTransactionReviewOpen(true)}
            className='bg-p100 rounded-[39px] h-[54px] items-center justify-center'>
            <CyDText className='text-[16px] font-semibold text-black' style={{ letterSpacing: -0.8 }}>Review</CyDText>
          </CyDTouchView>
        )}
        {canRequestQuote && step === 'quoting' && (
          <CyDView className='bg-n30 rounded-[39px] h-[54px] flex-row items-center justify-center'>
            <ActivityIndicator size='small' color={colors.activityIndicator} />
            <CyDText className='text-[16px] font-semibold text-base150 ml-[8px]'>Fetching quote...</CyDText>
          </CyDView>
        )}
        {canRequestQuote && step === 'idle' && (
          <CyDView className='bg-n30 rounded-[39px] h-[54px] items-center justify-center opacity-50'>
            <CyDText className='text-[16px] font-semibold text-base150' style={{ letterSpacing: -0.8 }}>Review</CyDText>
          </CyDView>
        )}
      </CyDView>

    </CyDView>
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SplitAmountDisplay({
  amount,
  fontSize = 32,
  dimWhole = false,
}: {
  amount: string;
  fontSize?: number;
  dimWhole?: boolean;
}) {
  const wholeColor = dimWhole ? 'text-base150' : 'text-base400';
  const dotIndex = amount.indexOf('.');
  if (dotIndex === -1) {
    return (
      <CyDText
        numberOfLines={1}
        ellipsizeMode='tail'
        className={`!font-gambetta font-bold ${wholeColor}`}
        style={{ fontSize, letterSpacing: -1 }}>
        {amount}
      </CyDText>
    );
  }
  const intPart = amount.substring(0, dotIndex);
  const decPart = amount.substring(dotIndex);
  return (
    <CyDText
      numberOfLines={1}
      ellipsizeMode='tail'
      className={`!font-gambetta font-bold ${wholeColor}`}
      style={{ fontSize, letterSpacing: -1 }}>
      {intPart}
      <CyDText
        className='!font-gambetta font-normal text-base150'
        style={{ fontSize, letterSpacing: -1 }}>
        {decPart}
      </CyDText>
    </CyDText>
  );
}

// ─── Memoized sub-components ────────────────────────────────────

const MemoizedTokenRow = React.memo(function TokenRow({
  token,
  chain,
  onPress,
  balance,
  balanceUsd,
  showBalance,
}: {
  token: BridgeV2Token;
  chain?: BridgeV2Chain;
  onPress: () => void;
  balance?: string;
  balanceUsd?: number;
  showBalance?: boolean;
}) {
  return (
    <CyDTouchView onPress={onPress} className='flex-row items-center px-[16px]' style={{ height: TOKEN_ITEM_HEIGHT }}>
      <CyDView className='relative mr-[12px]'>
        <CyDFastImage source={{ uri: token.logoUrl }} className='w-[40px] h-[40px] rounded-full' />
        {chain && (
          <CyDFastImage
            source={{ uri: chain.logoUrl }}
            className='w-[16px] h-[16px] rounded-full absolute -bottom-[2px] -right-[2px] border border-n0'
          />
        )}
      </CyDView>
      <CyDView className='flex-1'>
        <CyDText className='text-[16px] font-semibold text-base400'>{token.symbol}</CyDText>
        <CyDText className='text-[12px] text-base150'>{chain?.prettyName ?? token.chainId}</CyDText>
      </CyDView>
      <CyDView className='items-end'>
        {showBalance && balance ? (
          <>
            <CyDView className='flex-row items-baseline gap-[3px]'>
              <CyDTokenAmount className='text-[16px] font-semibold text-base400'>
                {balance}
              </CyDTokenAmount>
              <CyDText className='text-[14px] font-medium text-base400'>{token.symbol}</CyDText>
            </CyDView>
            {balanceUsd != null && balanceUsd > 0 && (
              <CyDTokenValue className='text-[12px]' mainColorClass='text-base150' decimalColorClass='!text-base150'>
                {balanceUsd}
              </CyDTokenValue>
            )}
          </>
        ) : (
          <>
            {token.price > 0 && (
              <CyDTokenValue className='text-[16px]' mainColorClass='text-base400' decimalColorClass='!text-base150'>
                {token.price}
              </CyDTokenValue>
            )}
          </>
        )}
      </CyDView>
    </CyDTouchView>
  );
});

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope',
    padding: 0,
  },
  chainDropdownShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  slippageDropdownShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
});
