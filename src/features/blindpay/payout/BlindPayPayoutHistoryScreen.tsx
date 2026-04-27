import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SectionList } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { screenTitle } from '../../../constants';
import useBlindPayApi from '../api';

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

/** Derive the recipient display name from rail-specific fields */
function getRecipientName(p: any): string {
  // SWIFT
  if (p.swiftAccountHolderName) return p.swiftAccountHolderName;
  // ACH / Wire / RTP
  if (p.beneficiaryName) return p.beneficiaryName;
  // ACH COP
  if (p.achCopBeneficiaryFirstName) {
    return `${p.achCopBeneficiaryFirstName} ${p.achCopBeneficiaryLastName ?? ''}`.trim();
  }
  // PIX (key as identifier)
  if (p.pixKey) return p.pixKey;
  // SPEI (clabe as identifier)
  if (p.speiClabe) return `CLABE ****${p.speiClabe.slice(-4)}`;
  // Transfers (account)
  if (p.transfersAccount) return `Account ****${p.transfersAccount.slice(-4)}`;
  // Account number fallback
  if (p.accountNumber) return `****${p.accountNumber.slice(-4)}`;
  // Bank account name field
  if (p.name) return p.name;
  return RAIL_LABELS[p.type] ?? 'Transfer';
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${day}${suffix} ${month} ${year}, ${time}`;
}

function groupByMonth(payouts: any[]): Array<{ title: string; data: any[] }> {
  const groups: Record<string, any[]> = {};
  for (const p of payouts) {
    const d = new Date(p.createdAt);
    const key = `${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function BlindPayPayoutHistoryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { listPayouts } = useBlindPayApi();
  const listRef = useRef(listPayouts);
  listRef.current = listPayouts;

  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayouts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const res = await listRef.current({ limit: '50' });
    if (!res.isError && res.data) {
      setPayouts(
        [...res.data].sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    }
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => { void fetchPayouts(); }, [fetchPayouts]),
  );

  const sections = groupByMonth(payouts);

  const renderItem = ({ item: p, index, section }: any) => {
    const isLast = index === section.data.length - 1;
    const recipientName = getRecipientName(p);
    const flag = RAIL_FLAGS[p.type] ?? '\uD83C\uDF10';
    const amount = p.senderAmount ? `$ ${formatCents(p.senderAmount)}` : `$ ${formatCents(p.receiverAmount ?? 0)}`;
    const txStatus = p.status ?? 'processing';

    return (
      <CyDTouchView
        onPress={() => navigation.navigate(screenTitle.BLINDPAY_PAYOUT_DETAIL, { payoutId: p.id, payout: p })}
        className={`bg-n10 px-[16px] py-[16px] flex-row items-center justify-between ${!isLast ? 'border-b border-n40' : ''}`}>
        <CyDView className='flex-row items-center gap-[12px] flex-1'>
          <CyDView className='w-[37px] h-[37px] rounded-[6px] bg-n40 items-center justify-center'>
            <CyDText className='text-[18px]'>{flag}</CyDText>
          </CyDView>
          <CyDView className='flex-1 gap-[2px]'>
            <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]' numberOfLines={1}>
              {recipientName}
            </CyDText>
            <CyDText className='text-[11px] font-normal text-n200'>
              {p.createdAt ? formatDate(p.createdAt) : '—'}
            </CyDText>
          </CyDView>
        </CyDView>
        <CyDView className='items-end gap-[2px]'>
          <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]'>
            {amount}
          </CyDText>
          <CyDText className={`text-[11px] font-medium capitalize ${
            txStatus === 'completed' ? 'text-green-600' : txStatus === 'on_hold' ? 'text-n200' : txStatus === 'failed' ? 'text-red-500' : 'text-n200'
          }`}>
            {txStatus.replace(/_/g, ' ')}
          </CyDText>
        </CyDView>
      </CyDTouchView>
    );
  };

  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      {/* Header */}
      <CyDView className='bg-n20 flex-row items-center gap-[4px] px-[4px] py-[8px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}
          className='w-[48px] h-[48px] items-center justify-center'>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] flex-1'>
          Bank Transaction
        </CyDText>
      </CyDView>

      {loading ? (
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#FBC02D' />
        </CyDView>
      ) : payouts.length === 0 ? (
        <CyDView className='flex-1 items-center justify-center px-[32px]'>
          <CyDMaterialDesignIcons name='history' size={48} className='text-n200' />
          <CyDText className='text-[16px] font-medium text-n200 tracking-[-0.8px] text-center mt-[12px]'>
            No transactions yet
          </CyDText>
        </CyDView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(24, insets.bottom) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { void fetchPayouts(true); }} />
          }
          renderSectionHeader={({ section: { title } }) => (
            <CyDText className='text-[12px] font-semibold text-base400 tracking-[-0.12px] mt-[16px] mb-[8px]'>
              {title}
            </CyDText>
          )}
          renderItem={({ item, index, section }) => {
            const isFirst = index === 0;
            const isLast = index === section.data.length - 1;
            return (
              <CyDView className={`${isFirst ? 'rounded-t-[12px]' : ''} ${isLast ? 'rounded-b-[12px]' : ''} overflow-hidden`}>
                {renderItem({ item, index, section })}
              </CyDView>
            );
          }}
        />
      )}
    </CyDSafeAreaView>
  );
}
