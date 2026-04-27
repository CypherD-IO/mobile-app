import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Clipboard, Linking } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { screenTitle } from '../../../constants';
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
import CyDTokenValue from '../../../components/v2/tokenValue';
import usePayoutDocumentUpload from './usePayoutDocumentUpload';
import useSolanaSigner from '../../../hooks/useSolana';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

const RAIL_FLAGS: Record<string, string> = {
  ach: '\uD83C\uDDFA\uD83C\uDDF8', wire: '\uD83C\uDDFA\uD83C\uDDF8',
  rtp: '\uD83C\uDDFA\uD83C\uDDF8', pix: '\uD83C\uDDE7\uD83C\uDDF7',
  pix_safe: '\uD83C\uDDE7\uD83C\uDDF7', spei_bitso: '\uD83C\uDDF2\uD83C\uDDFD',
  transfers_bitso: '\uD83C\uDDE6\uD83C\uDDF7', ach_cop_bitso: '\uD83C\uDDE8\uD83C\uDDF4',
  international_swift: '\uD83C\uDF10',
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
  const { createEvmPayout, createSolanaPayout, prepareSolanaDelegate, getPayout } = useBlindPayApi();
  const globalContext = useContext<any>(GlobalContext);
  const { executeTransferContract } = useTransactionManager();
  const hdWallet = useContext(HdWalletContext) as any;
  const solanaAddress = hdWallet?.state?.wallet?.solana?.address ?? '';
  const { getSolanWallet } = useSolanaSigner();

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
  const isSwift = account?.type === 'international_swift';
  const { openDocumentUpload } = usePayoutDocumentUpload();
  const [docsUploaded, setDocsUploaded] = useState(false);
  const receiverAmount = payoutData?.receiverAmount ?? quote?.receiverAmount ?? 0;
  const senderAmount = payoutData?.senderAmount ?? quote?.senderAmount ?? 0;
  const recipientName = account?.name ?? 'Recipient';
  const recipientFlag = RAIL_FLAGS[account?.type] ?? '\uD83C\uDF10';

  // Poll while processing
  useEffect(() => {
    if (phase !== 'processing' || !payoutId) return;

    function resolvePhase(data: any): ScreenPhase | 'on_hold' | null {
      if (data.trackingTransaction?.transactionHash) setTxHash(data.trackingTransaction.transactionHash);
      // Use payout.status as primary — it reflects the real state
      const s = data.status;
      if (s === 'completed') return 'success';
      if (s === 'failed' || s === 'refunded') return 'failed';
      // on_hold needs compliance/document upload — route to detail screen
      if (s === 'on_hold') return 'on_hold';
      return null;
    }

    function applyResolved(next: ScreenPhase | 'on_hold' | null): boolean {
      if (!next) return false;
      if (next === 'on_hold') {
        navigation.dispatch(
          StackActions.replace(screenTitle.BLINDPAY_PAYOUT_DETAIL, { payoutId }),
        );
      } else {
        setPhase(next);
      }
      return true;
    }

    // Initial fetch
    void getPayoutRef.current(payoutId).then(res => {
      if (!res.isError && res.data) {
        setPayoutData(res.data);
        applyResolved(resolvePhase(res.data));
      }
    });

    const interval = setInterval(async () => {
      const res = await getPayoutRef.current(payoutId);
      if (!res.isError && res.data) {
        setPayoutData(res.data);
        if (applyResolved(resolvePhase(res.data))) clearInterval(interval);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, [phase, payoutId]);

  // Approve + Create payout
  const handleComplete = useCallback(async () => {
    if (!quote?.contract) return;

    // Detect Solana from either selected token network or from the quote's
    // contract.network.name (BlindPay returns `chainId: 0` for Solana, so
    // chainId-based detection won't work).
    const tokenNetwork = String(token?.network ?? '').toLowerCase();
    const networkName = String(quote.contract?.network?.name ?? '').toLowerCase();
    const isSolana =
      tokenNetwork === 'solana' ||
      tokenNetwork === 'solana_devnet' ||
      networkName.includes('solana');

    if (isSolana) {
      if (!solanaAddress) {
        showToast('No Solana address available', 'error');
        return;
      }
      setPhase('processing');
      try {
        const prepRes = await prepareSolanaDelegate({
          ownerAddress: solanaAddress,
          quoteId: quote.id,
        });
        if (prepRes.isError || !prepRes.data?.transaction) {
          showToast(prepRes.errorMessage ?? 'Failed to prepare transaction', 'error');
          setPhase('failed');
          return;
        }

        // Reuse the shared Solana wallet helper — handles both mnemonic and
        // private-key connection types (bs58.decode on a stored mnemonic would fail).
        const keypair = await getSolanWallet();
        if (!keypair) {
          showToast('Unable to load Solana wallet', 'error');
          setPhase('failed');
          return;
        }

        const txBytes = Buffer.from(prepRes.data.transaction, 'base64');
        let signedBase64: string;
        try {
          const vtx = VersionedTransaction.deserialize(txBytes);
          vtx.sign([keypair]);
          signedBase64 = Buffer.from(vtx.serialize()).toString('base64');
        } catch {
          const legacyTx = Transaction.from(txBytes);
          legacyTx.partialSign(keypair);
          signedBase64 = legacyTx.serialize({ requireAllSignatures: false }).toString('base64');
        }

        const res = await createSolanaPayout({
          quoteId: quote.id,
          senderWalletAddress: solanaAddress,
          signedTransaction: signedBase64,
        });
        if (res.isError) {
          showToast(res.errorMessage ?? 'Failed to create payout', 'error');
          setPhase('failed');
          return;
        }
        setPayoutData(res.data);
        if ((res.data as any)?.trackingTransaction?.transactionHash) {
          setTxHash((res.data as any).trackingTransaction.transactionHash);
        }
      } catch (e: any) {
        showToast(e?.message ?? 'Transaction failed', 'error');
        setPhase('failed');
      }
      return;
    }

    // EVM path
    if (!evmAddress) return;
    const { contract } = quote;
    const chainId = contract.network?.chainId;
    let currentChain = ALL_CHAINS.find(c => c.chainIdNumber === chainId);
    if (!currentChain && CHAIN_BASE_SEPOLIA.chainIdNumber === chainId) {
      currentChain = CHAIN_BASE_SEPOLIA;
    }
    if (!currentChain) {
      showToast('Unsupported chain', 'error');
      throw new Error('Unsupported chain');
    }

    setPhase('processing');

    try {
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
  }, [quote, evmAddress, solanaAddress, token, getSolanWallet, globalContext, executeTransferContract, prepareSolanaDelegate, createSolanaPayout]);

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
        {/* 1. Header (back button) */}
        <CyDView className='flex-row items-center px-[4px] h-[56px]'>
          <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
            className='w-[48px] h-[48px] items-center justify-center'>
            <CyDMaterialDesignIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>

        {/* 2. Scrollable content */}
        <CyDScrollView
          className='flex-1'
          contentContainerClassName='px-[16px] gap-[12px]'
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}>
          <CyDView className='items-center py-[24px]'>
            <CyDLottieView
              source={AppImages.MONEY_TRANSFER}
              autoPlay
              loop
              className='w-[150px] h-[150px]'
            />
            <CyDText className='text-[20px] font-normal text-base400 text-center tracking-[-0.4px]'>
              Transaction In Progress
            </CyDText>
          </CyDView>

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
              <CyDMaterialDesignIcons name='swap-horizontal' size={20} className='text-base400' />
              <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                Sending
              </CyDText>
            </CyDView>
            <CyDText className='text-[14px] font-medium text-base200 tracking-[-0.6px]'>
              Awaiting approval
            </CyDText>
          </CyDView>

          <CyDView className='bg-n0 rounded-[10px] p-[12px] gap-[8px]'>
            <CyDText className='text-[14px] font-semibold text-base400 mb-[2px]'>Approval Details</CyDText>
            {(() => {
              const netName = String(quote?.contract?.network?.name ?? '').toLowerCase();
              const solana = netName.includes('solana');
              const truncate = (s: string) =>
                s.length > 10 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s;
              const rows = [
                { label: 'Network', value: quote?.contract?.network?.name ?? 'Unknown' },
                { label: 'You send', value: `${(senderAmount / 100).toFixed(2)} ${token?.symbol ?? 'USDC'}` },
                { label: 'Message', value: solana ? 'SPL token delegate' : 'ERC-20 approval' },
                solana
                  ? {
                      label: 'Mint',
                      value: quote?.contract?.address ? truncate(quote.contract.address) : '',
                    }
                  : {
                      label: 'Spender',
                      value: quote?.contract?.blindpayContractAddress
                        ? truncate(quote.contract.blindpayContractAddress)
                        : '',
                    },
                !solana && {
                  label: 'Token contract',
                  value: quote?.contract?.address ? truncate(quote.contract.address) : '',
                },
              ].filter((r): r is { label: string; value: string } => !!r && !!r.value);
              return rows.map(r => (
                <CyDView key={r.label} className='flex-row items-center justify-between'>
                  <CyDText className='text-[13px] text-n200'>{r.label}</CyDText>
                  <CyDText className='text-[13px] font-medium text-base400'>{r.value}</CyDText>
                </CyDView>
              ));
            })()}
          </CyDView>
        </CyDScrollView>

        {/* 3. Bottom pinned CTA */}
        <CyDView className='px-[16px] pt-[12px] border-t border-n30 bg-n20'
          style={{ paddingBottom: Math.max(16, insets.bottom) }}>
          <CyDTouchView
            onPress={handleComplete}
            className='rounded-full h-[48px] bg-[#F7C645] items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              Approve & Send
            </CyDText>
          </CyDTouchView>
        </CyDView>
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
            className='w-[170px] h-[170px]'
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
          <CyDView className='bg-n0 rounded-[8px] p-[12px] gap-[10px]'>
            <CyDView className='flex-row items-center justify-between'>
              <CyDText className='text-[12px] font-medium text-n200'>Transaction Hash</CyDText>
              {(() => {
                const network = (quote?.contract?.network?.name ?? payoutData?.network ?? '').toLowerCase();
                const explorerUrl = NETWORK_EXPLORERS[network];
                return explorerUrl ? (
                  <CyDTouchView onPress={() => void Linking.openURL(explorerUrl + txHash)} hitSlop={12}>
                    <CyDMaterialDesignIcons name='open-in-new' size={18} className='text-base400' />
                  </CyDTouchView>
                ) : null;
              })()}
            </CyDView>
            <CyDTouchView onPress={copyHash} className='flex-row items-center justify-between'>
              <CyDText
                className='text-[14px] font-medium text-n100 tracking-[-0.8px] flex-1 mr-[12px]'
                numberOfLines={2}>
                {txHash}
              </CyDText>
              <CyDMaterialDesignIcons name='content-copy' size={20} className='text-n200' />
            </CyDTouchView>
          </CyDView>
        ) : null}

        {isSuccess && isSwift && payoutId && !docsUploaded ? (
          <>
            <CyDView className='flex-row items-start gap-[8px] bg-n0 rounded-[8px] p-[12px]'>
              <CyDMaterialDesignIcons name='file-document-outline' size={18} className='text-p100 mt-[1px]' />
              <CyDText className='text-[12px] font-medium text-n200 flex-1 leading-[1.45]'>
                SWIFT transfers require supporting documents (invoice, contract, etc). Upload them now — your payout is on hold until received.
              </CyDText>
            </CyDView>
            <CyDView className='flex-row gap-[12px]'>
              <CyDTouchView
                onPress={() => navigation.goBack()}
                className='flex-1 rounded-full h-[48px] border border-n40 bg-n0 items-center justify-center'>
                <CyDText className='text-[16px] font-bold text-base400 tracking-[-0.16px]'>
                  Do it later
                </CyDText>
              </CyDTouchView>
              <CyDTouchView
                onPress={() => openDocumentUpload({
                  payoutId,
                  onSuccess: () => {
                    setDocsUploaded(true);
                    showToast('Documents submitted');
                  },
                })}
                className='flex-1 rounded-full h-[48px] bg-[#F7C645] items-center justify-center'>
                <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
                  Upload Documents
                </CyDText>
              </CyDTouchView>
            </CyDView>
          </>
        ) : (
          <CyDTouchView
            onPress={() => navigation.goBack()}
            className='rounded-full h-[48px] bg-[#F7C645] items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              Done
            </CyDText>
          </CyDTouchView>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
