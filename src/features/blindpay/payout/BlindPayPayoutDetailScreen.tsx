import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Clipboard, Linking } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import type { BlindpayPayoutResponse } from '../types';
import usePayoutDocumentUpload from './usePayoutDocumentUpload';

const RAIL_FLAGS: Record<string, string> = {
  ach: '\uD83C\uDDFA\uD83C\uDDF8', wire: '\uD83C\uDDFA\uD83C\uDDF8',
  rtp: '\uD83C\uDDFA\uD83C\uDDF8', pix: '\uD83C\uDDE7\uD83C\uDDF7',
  pix_safe: '\uD83C\uDDE7\uD83C\uDDF7', spei_bitso: '\uD83C\uDDF2\uD83C\uDDFD',
  transfers_bitso: '\uD83C\uDDE6\uD83C\uDDF7', ach_cop_bitso: '\uD83C\uDDE8\uD83C\uDDF4',
  international_swift: '\uD83C\uDF10',
};

const RAIL_LABELS: Record<string, string> = {
  ach: 'ACH Transfer', wire: 'Wire Transfer', rtp: 'RTP Transfer',
  pix: 'PIX Transfer', pix_safe: 'PIX Safe', spei_bitso: 'SPEI Transfer',
  transfers_bitso: 'Transfer', ach_cop_bitso: 'ACH COP',
  international_swift: 'SWIFT Transfer',
};

const NETWORK_NAMES: Record<string, string> = {
  ethereum: 'Ethereum', base: 'Base', base_sepolia: 'Base Sepolia',
  polygon: 'Polygon', arbitrum: 'Arbitrum', solana: 'Solana', optimism: 'Optimism',
};

const NETWORK_EXPLORERS: Record<string, string> = {
  ethereum: 'https://etherscan.io/tx/',
  base: 'https://basescan.org/tx/',
  base_sepolia: 'https://sepolia.basescan.org/tx/',
  polygon: 'https://polygonscan.com/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  solana: 'https://solscan.io/tx/',
  optimism: 'https://optimistic.etherscan.io/tx/',
};

const ETA_LABELS: Record<string, string> = {
  '5_min': '~5 minutes', '30_min': '~30 minutes', '2_hours': '~2 hours',
  '1_business_day': '~1 business day', '2_business_days': '~2 business days',
  '5_business_days': '~5 business days',
};

function formatNetwork(network: string): string {
  return NETWORK_NAMES[network] ?? network.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function getRecipientName(p: any): string {
  if (p.swiftAccountHolderName) return p.swiftAccountHolderName;
  if (p.beneficiaryName) return p.beneficiaryName;
  if (p.achCopBeneficiaryFirstName) return `${p.achCopBeneficiaryFirstName} ${p.achCopBeneficiaryLastName ?? ''}`.trim();
  if (p.pixKey) return p.pixKey;
  if (p.speiClabe) return `CLABE ****${p.speiClabe.slice(-4)}`;
  if (p.transfersAccount) return `Account ****${p.transfersAccount.slice(-4)}`;
  if (p.accountNumber) return `****${p.accountNumber.slice(-4)}`;
  if (p.name) return p.name;
  return 'Recipient';
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase().replace(/_/g, '');
  const isCompleted = s === 'completed';
  const isProcessing = s === 'processing' || s === 'pending';
  const isOnHold = s === 'onhold';
  const bgColor = isCompleted ? 'bg-n30' : isProcessing ? 'bg-n30' : isOnHold ? 'bg-n30' : 'bg-n30';
  const textColor = isCompleted ? 'text-successTextGreen' : isProcessing ? 'text-n200' : isOnHold ? 'text-p100' : 'text-errorText';
  const iconName = isCompleted ? 'check-circle' : isProcessing ? 'clock-outline' : isOnHold ? 'alert-circle-outline' : 'close-circle';
  return (
    <CyDView className={`flex-row items-center gap-[4px] px-[8px] py-[4px] rounded-[20px] ${bgColor}`}>
      <CyDMaterialDesignIcons name={iconName} size={16} className={textColor} />
      <CyDText className={`text-[12px] font-normal ${textColor} tracking-[-0.24px] capitalize`}>
        {(status ?? '').replace(/_/g, ' ')}
      </CyDText>
    </CyDView>
  );
}

/** Status badge next to step title */
function StepStatusBadge({ status }: { status: string }) {
  const isFailed = status === 'failed';
  return (
    <CyDView className={`flex-row items-center gap-[2px] px-[6px] py-[2px] rounded-[4px] bg-n30`}>
      {isFailed ? <CyDMaterialDesignIcons name='alert' size={12} className='text-errorText' /> : null}
      <CyDText className={`text-[10px] font-semibold capitalize ${isFailed ? 'text-errorText' : 'text-n200'}`}>
        {status.replace(/_/g, ' ')}
      </CyDText>
    </CyDView>
  );
}

/** Detail pill */
function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <CyDView className='bg-n20 rounded-[6px] px-[8px] py-[4px] flex-row items-center gap-[4px]'>
      <CyDText className='text-[11px] font-medium text-n200'>{label}:</CyDText>
      <CyDText className='text-[11px] font-medium text-base400 flex-1' numberOfLines={1}>{value}</CyDText>
    </CyDView>
  );
}

/** Step icon based on step value */
function StepIcon({ step, stepStatus, allCompleted }: { step: string; stepStatus?: string | null; allCompleted?: boolean }) {
  // completed + failed → red X
  if (step === 'completed' && stepStatus === 'failed') {
    return (
      <CyDView className='w-[20px] h-[20px] rounded-full bg-red-500 items-center justify-center'>
        <CyDMaterialDesignIcons name='close' size={14} className='text-white' />
      </CyDView>
    );
  }
  // completed + all steps done → green check
  if (step === 'completed' && allCompleted) {
    return (
      <CyDView className='w-[20px] h-[20px] rounded-full bg-[#20804C] items-center justify-center'>
        <CyDMaterialDesignIcons name='check' size={14} className='text-white' />
      </CyDView>
    );
  }
  // completed → black dot in black circle
  if (step === 'completed') {
    return (
      <CyDView className='w-[20px] h-[20px] rounded-full bg-base400 items-center justify-center'>
        <CyDView className='w-[8px] h-[8px] rounded-full bg-n0' />
      </CyDView>
    );
  }
  // processing → spinner inside circle border
  if (step === 'processing') {
    return (
      <CyDView className='w-[20px] h-[20px] rounded-full border border-n50 items-center justify-center'>
        <ActivityIndicator size='small' color='#A6AEBB' style={{ transform: [{ scale: 0.5 }] }} />
      </CyDView>
    );
  }
  // pending_review → yellow !
  if (step === 'pending_review') {
    return (
      <CyDView className='w-[20px] h-[20px] rounded-full bg-[#FBC02D] items-center justify-center'>
        <CyDText className='text-[12px] font-bold text-black'>!</CyDText>
      </CyDView>
    );
  }
  // on_hold / pending → gray dot
  return (
    <CyDView className='w-[20px] h-[20px] rounded-full border-2 border-n50 bg-n0 items-center justify-center'>
      <CyDView className='w-[8px] h-[8px] rounded-full bg-n50' />
    </CyDView>
  );
}

// ── Timeline step ──
function TimelineStep({ title, date, step, stepStatus, isLast, content, allCompleted }: {
  title: string; date?: string | null; step: string; stepStatus?: string | null;
  isLast: boolean; content?: React.ReactNode; allCompleted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = !!content;
  const isActive = step === 'completed' || step === 'on_hold' || step === 'processing' || step === 'pending_review';
  const isPending = step === 'pending' && !stepStatus;

  return (
    <CyDView className='flex-row gap-[10px]'>
      {/* Icon + line */}
      <CyDView className='items-center' style={{ width: 20 }}>
        <StepIcon step={step} stepStatus={stepStatus} allCompleted={allCompleted} />
        {!isLast ? <CyDView className='w-[1px] flex-1 bg-n50 my-[4px]' style={{ minHeight: 20 }} /> : null}
      </CyDView>

      {/* Content */}
      <CyDView className='flex-1 pb-[24px] gap-[4px]'>
        {/* Title + status badge */}
        <CyDView className='flex-row items-center gap-[8px] flex-wrap'>
          <CyDText className={`text-[14px] font-medium ${isPending ? 'text-n200' : 'text-base400'}`}>
            {title}
          </CyDText>
          {stepStatus && isActive ? <StepStatusBadge status={stepStatus} /> : null}
        </CyDView>

        {/* Date */}
        {date && isActive ? (
          <CyDText className='text-[10px] font-normal text-[#667085]'>{formatDateTime(date)}</CyDText>
        ) : null}

        {/* Expand toggle */}
        {hasContent && isActive ? (
          <CyDTouchView onPress={() => setExpanded(!expanded)} className='flex-row items-center'>
            <CyDText className='text-[12px] font-bold text-p200 underline'>
              {expanded ? 'Hide details' : 'View details'}
            </CyDText>
            <CyDMaterialDesignIcons name={expanded ? 'chevron-up' : 'chevron-right'} size={16} className='text-p200' />
          </CyDTouchView>
        ) : null}

        {/* Expanded content */}
        {expanded && content ? content : null}
      </CyDView>
    </CyDView>
  );
}

export default function BlindPayPayoutDetailScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, { payoutId?: string; payout?: any }>, string>>();
  const insets = useSafeAreaInsets();
  const { getPayout } = useBlindPayApi();
  const getPayoutRef = useRef(getPayout);
  getPayoutRef.current = getPayout;
  const { openDocumentUpload } = usePayoutDocumentUpload();

  const [payout, setPayout] = useState<BlindpayPayoutResponse | null>(route.params?.payout ?? null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'updates'>('details');

  const payoutId = route.params?.payoutId ?? route.params?.payout?.id;

  useEffect(() => {
    if (!payoutId) { setLoading(false); return; }
    void getPayoutRef.current(payoutId).then(res => {
      if (!res.isError && res.data) setPayout(res.data);
      setLoading(false);
    });
  }, [payoutId]);

  if (loading || !payout) {
    return (
      <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
        <CyDView className='flex-row items-center gap-[4px] px-[4px] py-[8px] h-[64px]'>
          <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
            className='w-[48px] h-[48px] items-center justify-center'>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FBC02D' />
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  const overallStatus = payout.status ?? 'processing';
  const railType = payout.type ?? 'international_swift';
  const railLabel = RAIL_LABELS[railType] ?? 'Transfer';
  const railFlag = RAIL_FLAGS[railType] ?? '\uD83C\uDF10';
  const recipientName = getRecipientName(payout);
  const senderAmount = payout.senderAmount ?? 0;
  const receiverAmount = payout.receiverAmount ?? 0;
  const network = payout.network ?? '';
  const createdAt = payout.createdAt ? new Date(payout.createdAt) : new Date();
  const dateStr = createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ', ' + createdAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const txHash = payout.trackingTransaction?.transactionHash ?? '';
  const explorerBase = NETWORK_EXPLORERS[network] ?? '';

  const trackingTx = payout.trackingTransaction;
  const trackingPayment = payout.trackingPayment;
  const trackingDocs = payout.trackingDocuments;
  const trackingComplete = payout.trackingComplete;

  const currency = payout.currency ?? 'USD';

  // Helpers for hash display
  const truncHash = (h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`;

  // Step 1 content: Blockchain token transfer
  const step1Content = txHash ? (
    <CyDView className='bg-n20 rounded-[8px] p-[10px] gap-[6px]'>
      {(trackingTx?.status as string) === 'failed' ? (
        <CyDText className='text-[12px] font-medium text-n200'>
          We couldn't process the stablecoins.
        </CyDText>
      ) : null}
      <CyDTouchView
        onPress={() => { Clipboard.setString(txHash); showToast('Tx hash copied'); }}
        className='flex-row items-center justify-between'>
        <CyDText className='text-[11px] font-medium text-n200'>Tx Hash: <CyDText className='text-[11px] font-medium text-base400'>{truncHash(txHash)}</CyDText></CyDText>
        <CyDMaterialDesignIcons name='content-copy' size={14} className='text-n200' />
      </CyDTouchView>
      {explorerBase ? (
        <CyDTouchView onPress={() => void Linking.openURL(explorerBase + txHash)} className='flex-row items-center gap-[2px]'>
          <CyDText className='text-[11px] font-bold text-p200 underline'>View on explorer</CyDText>
          <CyDMaterialDesignIcons name='open-in-new' size={12} className='text-p200' />
        </CyDTouchView>
      ) : null}
    </CyDView>
  ) : undefined;

  // Step 2 content: Initiate fiat transfer
  const hasPaymentDetails = !!(trackingPayment?.providerName || trackingPayment?.providerTransactionId || trackingPayment?.estimatedTimeOfArrival);
  const step2Content = hasPaymentDetails ? (
    <CyDView className='bg-n20 rounded-[8px] p-[10px] gap-[6px]'>
      {trackingPayment?.providerName ? (
        <CyDText className='text-[11px] font-medium text-n200'>Provider: <CyDText className='text-[11px] font-medium text-base400'>{trackingPayment.providerName}</CyDText></CyDText>
      ) : null}
      {trackingPayment?.providerTransactionId ? (
        <CyDText className='text-[11px] font-medium text-n200'>ID: <CyDText className='text-[11px] font-medium text-base400'>{trackingPayment.providerTransactionId}</CyDText></CyDText>
      ) : null}
      {trackingPayment?.estimatedTimeOfArrival ? (
        <CyDText className='text-[11px] font-medium text-n200'>ETA: <CyDText className='text-[11px] font-medium text-base400'>{ETA_LABELS[trackingPayment.estimatedTimeOfArrival] ?? trackingPayment.estimatedTimeOfArrival.replace(/_/g, ' ')}</CyDText></CyDText>
      ) : null}
    </CyDView>
  ) : undefined;

  // Step 3 content: Complete payout
  const step3Content = trackingComplete?.transactionHash ? (
    <CyDView className='bg-n20 rounded-[8px] p-[10px] gap-[6px]'>
      <CyDTouchView
        onPress={() => { Clipboard.setString(trackingComplete.transactionHash!); showToast('Hash copied'); }}
        className='flex-row items-center justify-between'>
        <CyDText className='text-[11px] font-medium text-n200'>Tx Hash: <CyDText className='text-[11px] font-medium text-base400'>{truncHash(trackingComplete.transactionHash)}</CyDText></CyDText>
        <CyDMaterialDesignIcons name='content-copy' size={14} className='text-n200' />
      </CyDTouchView>
    </CyDView>
  ) : undefined;

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      {/* Header */}
      <CyDView className='bg-n20 flex-row items-center gap-[4px] px-[4px] py-[8px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
          className='w-[48px] h-[48px] items-center justify-center'>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] flex-1'>
          Transaction detail
        </CyDText>
      </CyDView>

      <CyDScrollView className='flex-1'
        contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom) }}>

        {/* Hero */}
        <CyDView className='bg-n20 items-center pt-[16px] pb-[24px] gap-[12px]'>
          <CyDView className='items-center gap-[3px]'>
            <CyDView className='w-[44px] h-[44px] rounded-full bg-n40 items-center justify-center'>
              <CyDMaterialDesignIcons name='arrow-top-right' size={24} className='text-base400' />
            </CyDView>
            <CyDText className='text-[10px] font-medium text-base400 tracking-[-0.2px]'>Money Sent</CyDText>
          </CyDView>
          <CyDView className='items-center gap-[4px]'>
            <CyDText className='!font-gambetta font-bold text-base400 text-[32px] tracking-[-0.32px]'>
              ${formatCents(senderAmount)}
            </CyDText>
            <CyDText className='text-[12px] font-normal text-base400 tracking-[-0.24px]'>{dateStr}</CyDText>
          </CyDView>
          <CyDView className='bg-n0 rounded-full px-[12px] py-[6px] flex-row items-center gap-[4px]'>
            <CyDText className='text-[16px]'>{railFlag}</CyDText>
            <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>{railLabel}</CyDText>
          </CyDView>
        </CyDView>

        {/* On-hold / compliance banner */}
        {(overallStatus === 'on_hold' || payout.status === 'on_hold') ? (() => {
          const docStatus = trackingDocs?.status as string | undefined;
          const isRejected = docStatus === 'waiting_documents' && trackingDocs?.step === 'on_hold';
          const isReviewing = docStatus === 'compliance_reviewing';
          const isSwift = railType === 'international_swift';
          return (
            <CyDView className='mx-[16px] mt-[12px] bg-n10 border border-n30 rounded-[12px] p-[16px] gap-[12px]'>
              <CyDView className='flex-row items-start gap-[8px]'>
                <CyDMaterialDesignIcons name={isReviewing ? 'file-search-outline' : 'information-outline'} size={24} className='text-base400' />
                <CyDView className='flex-1 gap-[4px]'>
                  <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.28px]'>
                    {isReviewing
                      ? 'Your documents are under compliance review.'
                      : isRejected
                        ? 'Your documents need to be resubmitted.'
                        : 'We need compliance documents to process your payout.'}
                  </CyDText>
                  {isSwift ? (
                    <CyDText className='text-[12px] font-normal text-n200 tracking-[-0.24px]'>
                      {isReviewing
                        ? 'Review typically takes up to 8 business days.'
                        : 'Documents must show the relationship between sender and receiver. Submit within 30 days.'}
                    </CyDText>
                  ) : null}
                </CyDView>
              </CyDView>
              {!isReviewing ? (
                <CyDTouchView
                  onPress={() => openDocumentUpload({
                    payoutId: payout.id,
                    onSuccess: () => {
                      void getPayoutRef.current(payout.id).then(res => {
                        if (!res.isError && res.data) setPayout(res.data);
                      });
                    },
                  })}
                  className='bg-p50 rounded-full h-[36px] items-center justify-center'>
                  <CyDText className='text-[14px] font-semibold text-black tracking-[-0.28px]'>
                    {isRejected ? 'Resubmit Documents' : 'Review & Upload files'}
                  </CyDText>
                </CyDTouchView>
              ) : null}
            </CyDView>
          );
        })() : null}

        {/* Tabs */}
        <CyDView className='px-[16px] pt-[24px]'>
          <CyDView className='bg-n30 rounded-full h-[50px] flex-row p-[2px]'>
            <CyDTouchView
              onPress={() => setActiveTab('details')}
              className={`flex-1 rounded-full items-center justify-center ${activeTab === 'details' ? 'bg-n0' : ''}`}>
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>Transaction Details</CyDText>
            </CyDTouchView>
            <CyDTouchView
              onPress={() => setActiveTab('updates')}
              className={`flex-1 rounded-full items-center justify-center ${activeTab === 'updates' ? 'bg-n0' : ''}`}>
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>Updates</CyDText>
            </CyDTouchView>
          </CyDView>
        </CyDView>

        {activeTab === 'details' ? (
          <CyDView className='px-[24px] py-[24px] gap-[24px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Status</CyDText>
              <StatusBadge status={overallStatus} />
            </CyDView>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Recipient</CyDText>
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>{recipientName}</CyDText>
            </CyDView>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Transaction ID</CyDText>
              <CyDTouchView onPress={() => { Clipboard.setString(payout.id); showToast('ID copied'); }} className='flex-row items-center gap-[4px]'>
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>{payout.id}</CyDText>
                <CyDMaterialDesignIcons name='content-copy' size={14} className='text-n200' />
              </CyDTouchView>
            </CyDView>
            <CyDView className='flex-row items-start justify-between'>
              <CyDView className='gap-[6px]'>
                <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Billed Amount</CyDText>
                {receiverAmount > 0 ? (
                  <CyDText className='text-[12px] font-medium text-n200'>
                    {payout.token ?? 'USDC'} to {payout.currency ?? 'USD'} · {payout.blindpayQuotation ? (payout.blindpayQuotation / 100).toFixed(2) : '—'}
                  </CyDText>
                ) : null}
              </CyDView>
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>${formatCents(senderAmount)}</CyDText>
            </CyDView>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Network</CyDText>
              <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>{formatNetwork(network)}</CyDText>
            </CyDView>
            {receiverAmount > 0 ? (
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Recipient Gets</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>
                  {formatCents(receiverAmount)} {payout.currency ?? 'USD'}
                </CyDText>
              </CyDView>
            ) : null}
            {payout.transactionFeeAmount ? (
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>Fees</CyDText>
                <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.28px]'>
                  ${formatCents(payout.transactionFeeAmount)}
                </CyDText>
              </CyDView>
            ) : null}
          </CyDView>
        ) : (
          <CyDView className='px-[18px] py-[24px]'>
            <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.4px] mb-[16px]'>
              Payout Tracking
            </CyDText>

            {/* Step 1: Blockchain token transfer */}
            <TimelineStep
              title='Blockchain token transfer'
              step={trackingTx?.step ?? 'pending'}
              stepStatus={trackingTx?.status as string | undefined}
              date={trackingTx?.completedAt ?? payout.createdAt}
              isLast={false}
              content={step1Content}
              allCompleted={overallStatus === 'completed'}
            />

            {/* Documents step (if applicable) */}
            {trackingDocs ? (() => {
              const docStatus = (trackingDocs.status ?? '') as string;
              const docStep = trackingDocs.step ?? 'pending';
              const isRejected = docStatus === 'waiting_documents' && docStep === 'on_hold';
              let docTitle = 'Documents Submitted';
              if (isRejected) docTitle = 'Documents Rejected — Resubmit';
              else if (docStatus === 'waiting_documents') docTitle = 'Awaiting Compliance Documents';
              else if (docStatus === 'compliance_reviewing') docTitle = 'Documents Under Compliance Review';
              else if (docStep === 'completed') docTitle = 'Documents Approved';
              else if (docStep === 'processing') docTitle = 'Documents Under Review';
              else if (docStep === 'on_hold') docTitle = 'Additional Documents Requested';

              return (
                <TimelineStep
                  title={docTitle}
                  step={isRejected ? 'pending_review' : docStep}
                  stepStatus={docStatus || undefined}
                  date={trackingDocs.completedAt}
                  isLast={false}
                  allCompleted={overallStatus === 'completed'}
                />
              );
            })() : null}

            {/* Step 2: Initiate fiat transfer */}
            <TimelineStep
              title={`Initiate ${currency} transfer`}
              step={trackingPayment?.step ?? 'pending'}
              stepStatus={trackingPayment?.providerStatus as string | undefined}
              date={trackingPayment?.completedAt}
              isLast={false}
              content={step2Content}
              allCompleted={overallStatus === 'completed'}
            />

            {/* Step 3: Complete payout */}
            <TimelineStep
              title='Complete payout'
              step={trackingComplete?.step ?? 'pending'}
              stepStatus={trackingComplete?.status as string | undefined}
              date={trackingComplete?.completedAt}
              isLast
              content={step3Content}
              allCompleted={overallStatus === 'completed'}
            />
          </CyDView>
        )}
      </CyDScrollView>
    </CyDSafeAreaView>
  );
}
