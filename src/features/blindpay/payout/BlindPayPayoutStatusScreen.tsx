import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Clipboard } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDLottieView,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import AppImages from '../../../../assets/images/appImages';
import { HdWalletContext, getViemPublicClient, getWeb3Endpoint } from '../../../core/util';
import { GlobalContext } from '../../../core/globalContext';
import { ALL_CHAINS, CHAIN_BASE_SEPOLIA } from '../../../constants/server';
import useTransactionManager from '../../../hooks/useTransactionManager';
import { encodeErc20ApproveData, normalizeEvmAddress } from '../../bridgeV2/evmTxViem';
import SwipeToConfirmBar from '../../../components/v2/SwipeToConfirmBar';
import CyDTokenValue from '../../../components/v2/tokenValue';

const RAIL_FLAGS: Record<string, string> = {
  ach: '\uD83C\uDDFA\uD83C\uDDF8', wire: '\uD83C\uDDFA\uD83C\uDDF8',
  rtp: '\uD83C\uDDFA\uD83C\uDDF8', pix: '\uD83C\uDDE7\uD83C\uDDF7',
  pix_safe: '\uD83C\uDDE7\uD83C\uDDF7', spei_bitso: '\uD83C\uDDF2\uD83C\uDDFD',
  transfers_bitso: '\uD83C\uDDE6\uD83C\uDDF7', ach_cop_bitso: '\uD83C\uDDE8\uD83C\uDDF4',
  international_swift: '\uD83C\uDF10',
};

type ScreenPhase = 'sign' | 'processing' | 'success' | 'failed';

export default function BlindPayPayoutStatusScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, {
    payoutId?: string;
    payout?: any;
    quote?: any;
    evmAddress?: string;
    selectedAccount?: any;
    selectedToken?: any;
    fiatCode?: string;
    fiatSymbol?: string;
  }>, string>>();
  const insets = useSafeAreaInsets();
  const { createEvmPayout, getPayout } = useBlindPayApi();
  const globalContext = useContext<any>(GlobalContext);
  const { executeTransferContract } = useTransactionManager();

  const createEvmPayoutRef = useRef(createEvmPayout);
  createEvmPayoutRef.current = createEvmPayout;
  const getPayoutRef = useRef(getPayout);
  getPayoutRef.current = getPayout;

  const quote = route.params?.quote;
  const evmAddress = route.params?.evmAddress ?? '';
  const account = route.params?.selectedAccount;
  const token = route.params?.selectedToken;
  const fiatCode = route.params?.fiatCode ?? 'USD';

  const [phase, setPhase] = useState<ScreenPhase>(
    route.params?.payoutId ? 'processing' : 'sign',
  );
  const [payoutData, setPayoutData] = useState<any>(route.params?.payout ?? null);
  const [txHash, setTxHash] = useState('');

  const payoutId = payoutData?.id ?? route.params?.payoutId;
  const receiverAmount = payoutData?.receiverAmount ?? quote?.receiverAmount ?? 0;
  const senderAmount = payoutData?.senderAmount ?? quote?.senderAmount ?? 0;
  const recipientName = account?.name ?? 'Recipient';
  const recipientFlag = RAIL_FLAGS[account?.type] ?? '\uD83C\uDF10';

  // Poll while processing
  useEffect(() => {
    if (phase !== 'processing' || !payoutId) return;

    function resolvePhase(data: any) {
      if (data.trackingTransaction?.transactionHash) setTxHash(data.trackingTransaction.transactionHash);
      // Use payout.status as primary — it reflects the real state
      const s = data.status;
      if (s === 'completed') return 'success' as const;
      if (s === 'failed' || s === 'refunded') return 'failed' as const;
      if (s === 'on_hold') return 'success' as const; // on_hold = payout created, show detail
      return null;
    }

    // Initial fetch
    void getPayoutRef.current(payoutId).then(res => {
      if (!res.isError && res.data) {
        setPayoutData(res.data);
        const next = resolvePhase(res.data);
        if (next) setPhase(next);
      }
    });

    const interval = setInterval(async () => {
      const res = await getPayoutRef.current(payoutId);
      if (!res.isError && res.data) {
        setPayoutData(res.data);
        const next = resolvePhase(res.data);
        if (next) { setPhase(next); clearInterval(interval); }
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [phase, payoutId]);

  // Approve + Create payout
  const handleSwipeComplete = useCallback(async () => {
    if (!quote?.contract || !evmAddress) return;
    const { contract } = quote;
    const chainId = contract.network?.chainId;
    // Check ALL_CHAINS first, then fallback to CHAIN_BASE_SEPOLIA for testnet
    let currentChain = ALL_CHAINS.find(c => c.chainIdNumber === chainId);
    if (!currentChain && CHAIN_BASE_SEPOLIA.chainIdNumber === chainId) {
      currentChain = CHAIN_BASE_SEPOLIA;
    }
    if (!currentChain) {
      showToast('Unsupported chain', 'error');
      throw new Error('Unsupported chain');
    }

    // Transition to processing immediately
    setPhase('processing');

    try {
      // 1. ERC-20 approve
      const rpc = getWeb3Endpoint(currentChain, globalContext);
      const publicClient = getViemPublicClient(rpc);
      const contractData = encodeErc20ApproveData(
        contract.blindpayContractAddress,
        contract.amount,
      );

      const approveResult = await executeTransferContract(
        {
          publicClient,
          chain: currentChain,
          amountToSend: '0',
          toAddress: normalizeEvmAddress(contract.address),
          contractAddress: normalizeEvmAddress(contract.address),
          contractDecimals: 0,
          contractData,
          isErc20: true,
        },
        undefined,
      );

      if (approveResult.isError) {
        const errMsg = approveResult.error instanceof Error
          ? approveResult.error.message
          : typeof approveResult.error === 'string'
            ? approveResult.error
            : 'Approval failed';
        showToast(errMsg, 'error');
        setPhase('failed');
        return;
      }

      if (approveResult.hash) setTxHash(approveResult.hash);

      // 2. Create payout via API
      const res = await createEvmPayoutRef.current({
        quoteId: quote.id,
        senderWalletAddress: evmAddress,
      });

      if (res.isError) {
        showToast(res.errorMessage ?? 'Failed to create payout', 'error');
        setPhase('failed');
        return;
      }
      setPayoutData(res.data);
    } catch (e: any) {
      showToast(e?.message ?? 'Transaction failed', 'error');
      setPhase('failed');
    }
  }, [quote, evmAddress, globalContext, executeTransferContract]);

  const copyHash = useCallback(() => {
    if (txHash) {
      Clipboard.setString(txHash);
      showToast('Transaction hash copied');
    }
  }, [txHash]);

  const createdAt = payoutData?.createdAt ? new Date(payoutData.createdAt) : new Date();

  // ── Sign screen (initial) ──
  if (phase === 'sign') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        {/* Header */}
        <CyDView className='flex-row items-center px-[4px] h-[56px]'>
          <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
            className='w-[48px] h-[48px] items-center justify-center'>
            <CyDMaterialDesignIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>

        <CyDScrollView className='flex-1' contentContainerClassName='px-[16px] gap-[12px]'
          contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 8) }}>
          {/* Lottie + text */}
          <CyDView className='items-center py-[24px]'>
            <CyDLottieView
              source={AppImages.MONEY_TRANSFER}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
            <CyDText className='text-[20px] font-normal text-base400 text-center tracking-[-0.4px]'>
              Transaction In Progress
            </CyDText>
          </CyDView>

          {/* Est. Received card */}
          <CyDView className='bg-n0 rounded-[10px] p-[12px] gap-[12px]'>
            <CyDText className='text-[12px] font-medium text-n200'>Est. Received</CyDText>
            <CyDTokenValue prefix='' suffix={fiatCode} className='text-[24px]'>{receiverAmount / 100}</CyDTokenValue>
            <CyDView className='flex-row items-center gap-[4px]'>
              <CyDText className='text-[12px] font-medium text-n50'>Recipient:</CyDText>
              <CyDView className='flex-row items-center gap-[6px]'>
                <CyDView className='w-[24px] h-[24px] rounded-full bg-n20 items-center justify-center'>
                  <CyDText className='text-[14px]'>{recipientFlag}</CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                  {recipientName}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          {/* Sending status card */}
          <CyDView className='bg-n0 rounded-[10px] p-[12px] flex-row items-center justify-between'>
            <CyDView className='flex-row items-center gap-[10px]'>
              <CyDMaterialDesignIcons name='swap-horizontal' size={20} className='text-base400' />
              <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                Sending
              </CyDText>
            </CyDView>
            <CyDText className='text-[14px] font-medium text-base200 tracking-[-0.6px]'>
              Awaiting approval
            </CyDText>
          </CyDView>

          {/* Approval details */}
          <CyDView className='bg-n0 rounded-[10px] p-[12px] gap-[8px]'>
            <CyDText className='text-[14px] font-semibold text-base400 mb-[2px]'>Approval Details</CyDText>
            {[
              { label: 'Network', value: quote?.contract?.network?.name ?? 'Unknown' },
              { label: 'You send', value: `${(senderAmount / 100).toFixed(2)} ${token?.symbol ?? 'USDC'}` },
              { label: 'Message', value: 'ERC-20 approval' },
              { label: 'Spender', value: quote?.contract?.blindpayContractAddress
                ? `${quote.contract.blindpayContractAddress.slice(0, 6)}...${quote.contract.blindpayContractAddress.slice(-4)}`
                : '' },
              { label: 'Token contract', value: quote?.contract?.address
                ? `${quote.contract.address.slice(0, 6)}...${quote.contract.address.slice(-4)}`
                : '' },
            ].filter(r => r.value).map(r => (
              <CyDView key={r.label} className='flex-row items-center justify-between'>
                <CyDText className='text-[13px] text-n200'>{r.label}</CyDText>
                <CyDText className='text-[13px] font-medium text-base400'>{r.value}</CyDText>
              </CyDView>
            ))}
          </CyDView>

          {/* Swipe to sign */}
          <SwipeToConfirmBar
            visible
            onSwipeComplete={handleSwipeComplete}
            label='Swipe to approve & send'
          />
        </CyDScrollView>
      </CyDSafeAreaView>
    );
  }

  // ── Processing screen ──
  if (phase === 'processing') {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        <CyDView className='flex-1 items-center justify-center'>
          <CyDLottieView
            source={AppImages.MONEY_TRANSFER}
            autoPlay
            loop
            style={{ width: 170, height: 170 }}
          />
          <CyDText className='text-[20px] font-normal text-base400 text-center tracking-[-0.4px]'>
            Transaction In Progress
          </CyDText>
        </CyDView>

        <CyDView className='px-[16px] gap-[12px]' style={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <CyDView className='bg-n0 rounded-[10px] p-[12px] gap-[12px]'>
            <CyDText className='text-[12px] font-medium text-n200'>Est. Received</CyDText>
            <CyDTokenValue prefix='' suffix={fiatCode} className='text-[24px]'>{receiverAmount / 100}</CyDTokenValue>
            <CyDView className='flex-row items-center gap-[4px]'>
              <CyDText className='text-[12px] font-medium text-n50'>Recipient:</CyDText>
              <CyDView className='flex-row items-center gap-[6px]'>
                <CyDView className='w-[24px] h-[24px] rounded-full bg-n20 items-center justify-center'>
                  <CyDText className='text-[14px]'>{recipientFlag}</CyDText>
                </CyDView>
                <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                  {recipientName}
                </CyDText>
              </CyDView>
            </CyDView>
          </CyDView>

          <CyDView className='bg-n0 rounded-[10px] p-[12px] flex-row items-center justify-between'>
            <CyDView className='flex-row items-center gap-[10px]'>
              <ActivityIndicator size='small' color='#FBC02D' />
              <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                Sending
              </CyDText>
            </CyDView>
            <CyDText className='text-[14px] font-medium text-base200 tracking-[-0.6px]'>
              Transaction initiated
            </CyDText>
          </CyDView>

          {/* Done button so user is never stuck */}
          <CyDTouchView
            onPress={() => navigation.goBack()}
            className='rounded-full h-[48px] bg-n0 border border-n30 items-center justify-center'>
            <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.4px]'>
              Done
            </CyDText>
          </CyDTouchView>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  // ── Success / Failed screen ──
  const isSuccess = phase === 'success';
  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      <CyDView className='flex-1 items-center justify-center gap-[12px]'>
        {isSuccess ? (
          <CyDView className='w-[60px] h-[60px] rounded-full bg-[#1B7A4A] items-center justify-center'>
            <CyDMaterialDesignIcons name='check' size={32} className='text-white' />
          </CyDView>
        ) : (
          <CyDView className='w-[60px] h-[60px] rounded-full bg-red-500 items-center justify-center'>
            <CyDMaterialDesignIcons name='close' size={32} className='text-white' />
          </CyDView>
        )}
        <CyDView className='items-center gap-[3px]'>
          <CyDText className='text-[20px] font-semibold text-base400 tracking-[-1px]'>
            {isSuccess ? 'Transaction Placed' : 'Transaction Failed'}
          </CyDText>
          <CyDText className='text-[12px] font-medium text-n200'>
            at {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
            {createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </CyDText>
        </CyDView>
      </CyDView>

      <CyDView className='px-[16px] gap-[24px]' style={{ paddingBottom: Math.max(16, insets.bottom) }}>
        {txHash ? (
          <CyDTouchView onPress={copyHash} className='bg-n0 rounded-[8px] p-[12px] gap-[10px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[12px] font-medium text-n200'>Transaction Hash</CyDText>
              <CyDMaterialDesignIcons name='chevron-right' size={20} className='text-base400' />
            </CyDView>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText
                className='text-[14px] font-medium text-n100 tracking-[-0.8px] flex-1 mr-[12px]'
                numberOfLines={2}
                style={{ fontFamily: 'monospace' }}>
                {txHash}
              </CyDText>
              <CyDMaterialDesignIcons name='content-copy' size={20} className='text-n200' />
            </CyDView>
          </CyDTouchView>
        ) : null}

        <CyDTouchView
          onPress={() => navigation.goBack()}
          className='rounded-full h-[58px] bg-[#FFDE59] items-center justify-center'>
          <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
            Done
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
