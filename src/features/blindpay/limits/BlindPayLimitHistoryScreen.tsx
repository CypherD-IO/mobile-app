import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl } from 'react-native';
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
  CyDScrollView,
  CyDText,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import useBlindPayApi from '../api';

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function humanizeStatus(status: string): string {
  return (status ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function humanizeDocType(type: string): string {
  return (type ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase().replace(/_/g, '');
  const isApproved = s === 'approved';
  const isPending = s === 'pending' || s === 'inreview' || s === 'inprogress';
  const color = isApproved
    ? 'bg-green-100 text-green-700'
    : isPending
      ? 'bg-[#FDF3D8] text-[#846000]'
      : 'bg-red-100 text-red-700';
  return (
    <CyDView className={`px-[8px] py-[2px] rounded-full ${color.split(' ')[0]}`}>
      <CyDText className={`text-[12px] font-semibold ${color.split(' ')[1]}`}>
        {humanizeStatus(status)}
      </CyDText>
    </CyDView>
  );
}

export default function BlindPayLimitHistoryScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { getLimitIncreaseHistory } = useBlindPayApi();
  const getHistoryRef = useRef(getLimitIncreaseHistory);
  getHistoryRef.current = getLimitIncreaseHistory;

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const res = await getHistoryRef.current();
    if (!res.isError && res.data) {
      setHistory(
        [...res.data].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        ),
      );
    }
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchHistory();
    }, [fetchHistory]),
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center px-[16px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          Request History
        </CyDText>
      </CyDView>

      {loading ? (
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </CyDView>
      ) : history.length === 0 ? (
        <CyDView className='flex-1 items-center justify-center px-[32px]'>
          <CyDMaterialDesignIcons name='history' size={48} className='text-n200' />
          <CyDText className='text-[16px] font-medium text-n200 tracking-[-0.8px] text-center mt-[12px]'>
            No limit increase requests yet
          </CyDText>
        </CyDView>
      ) : (
        <CyDScrollView
          className='flex-1'
          contentContainerClassName='px-[16px] pb-[24px] gap-[12px]'
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { void fetchHistory(true); }}
            />
          }>
          {history.map((item: any) => (
            <CyDView
              key={item.id}
              className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[10px]'>
              {/* Header: date + status */}
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[14px] font-semibold text-base400'>
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </CyDText>
                <StatusBadge status={item.status} />
              </CyDView>

              {/* Requested limits */}
              {[
                { label: 'Per Transaction', val: item.perTransaction },
                { label: 'Daily', val: item.daily },
                { label: 'Monthly', val: item.monthly },
              ]
                .filter(r => r.val != null)
                .map(r => (
                  <CyDView
                    key={r.label}
                    className='flex-row items-center justify-between'>
                    <CyDText className='text-[13px] font-medium text-n200'>
                      {r.label}
                    </CyDText>
                    <CyDText className='text-[14px] font-semibold text-base400'>
                      {formatCents(r.val)}
                    </CyDText>
                  </CyDView>
                ))}

              {/* Doc type */}
              <CyDView className='flex-row items-center justify-between'>
                <CyDText className='text-[13px] font-medium text-n200'>
                  Document
                </CyDText>
                <CyDText className='text-[13px] font-medium text-base400'>
                  {humanizeDocType(item.supportingDocumentType)}
                </CyDText>
              </CyDView>

              {/* Doc link */}
              {item.supportingDocumentFile ? (
                <CyDTouchView
                  onPress={() => {
                    void Linking.openURL(item.supportingDocumentFile);
                  }}
                  className='flex-row items-center gap-[4px]'>
                  <CyDMaterialDesignIcons
                    name='open-in-new'
                    size={14}
                    className='text-n200'
                  />
                  <CyDText className='text-[12px] font-medium text-n200 tracking-[-0.4px]'>
                    View Document
                  </CyDText>
                </CyDTouchView>
              ) : null}

              {/* Resolved date */}
              {item.status !== 'pending' &&
              item.status !== 'in_review' &&
              item.updatedAt ? (
                <CyDText className='text-[11px] text-n200'>
                  Resolved:{' '}
                  {new Date(item.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </CyDText>
              ) : null}
            </CyDView>
          ))}
        </CyDScrollView>
      )}
    </CyDSafeAreaView>
  );
}
