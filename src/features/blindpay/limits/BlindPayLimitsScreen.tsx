import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
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
import { screenTitle } from '../../../constants';
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

function humanizeDocType(type: string): string {
  return (type ?? '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function BlindPayLimitsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { getStatus, getLimitIncreaseHistory } = useBlindPayApi();
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;
  const getHistoryRef = useRef(getLimitIncreaseHistory);
  getHistoryRef.current = getLimitIncreaseHistory;

  const [limits, setLimits] = useState<any>(null);
  const [limitIncrease, setLimitIncrease] = useState<any>(null);
  const [receiverType, setReceiverType] = useState('individual');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const statusRes = await getStatusRef.current();
    if (!statusRes.isError && statusRes.data?.blindpay) {
      const bp = statusRes.data.blindpay;
      setLimits(bp.limits);
      setLimitIncrease(bp.limitIncrease);
      setReceiverType(bp.receiverType ?? 'individual');
    }
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData]),
  );

  const hasPending =
    limitIncrease?.status === 'pending' ||
    limitIncrease?.status === 'in_review';

  if (loading) {
    return (
      <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
        <CyDView className='flex-row items-center px-[16px] h-[64px]'>
          <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      {/* Header with history button */}
      <CyDView className='flex-row items-center justify-between px-[16px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDTouchView
          onPress={() =>
            navigation.navigate(screenTitle.BLINDPAY_LIMIT_HISTORY)
          }
          className='flex-row items-center gap-[6px] rounded-full bg-n20 px-[12px] py-[6px]'>
          <CyDMaterialDesignIcons name='history' size={18} className='text-base400' />
          <CyDText className='text-[14px] font-normal text-base400 tracking-[-0.6px]'>
            History
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          Transaction Limits
        </CyDText>
      </CyDView>

      <CyDScrollView
        className='flex-1'
        contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { void fetchData(true); }}
          />
        }>
        {/* Current limits card */}
        <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[12px]'>
          <CyDText className='text-[14px] font-semibold text-base400'>
            Current Limits
          </CyDText>
          {[
            { label: 'Per Transaction', value: limits?.perTransaction },
            { label: 'Daily', value: limits?.daily },
            { label: 'Monthly', value: limits?.monthly },
          ].map(row => (
            <CyDView
              key={row.label}
              className='flex-row items-center justify-between py-[8px] border-b border-n40'>
              <CyDText className='text-[14px] font-medium text-n200'>
                {row.label}
              </CyDText>
              <CyDText className='text-[16px] font-semibold text-base400'>
                {row.value != null ? formatCents(row.value) : '—'}
              </CyDText>
            </CyDView>
          ))}
          {limits?.updatedAt ? (
            <CyDText className='text-[11px] text-n200 mt-[4px]'>
              Last updated: {new Date(limits.updatedAt).toLocaleDateString()}
            </CyDText>
          ) : null}
        </CyDView>

        {/* Status banners */}
        {hasPending ? (
          <CyDView className='bg-[#FDF3D8] border border-[#F7C645] rounded-[12px] p-[16px] gap-[8px]'>
            <CyDView className='flex-row items-center gap-[8px]'>
              <CyDMaterialDesignIcons name='clock-outline' size={20} className='text-n200' />
              <CyDText className='text-[14px] font-semibold text-n200'>
                Limit increase pending
              </CyDText>
            </CyDView>
            <CyDText className='text-[13px] font-medium text-n200 leading-[1.45]'>
              Requested on{' '}
              {limitIncrease.requestedAt
                ? new Date(limitIncrease.requestedAt).toLocaleDateString()
                : '—'}
              . You'll be notified when it's reviewed.
            </CyDText>
          </CyDView>
        ) : limitIncrease?.status === 'approved' ? (
          <CyDView className='bg-green-50 border border-green-200 rounded-[12px] p-[16px] gap-[4px]'>
            <CyDView className='flex-row items-center gap-[8px]'>
              <CyDMaterialDesignIcons name='check-circle' size={20} className='text-green-700' />
              <CyDText className='text-[14px] font-semibold text-green-700'>
                Limit increase approved
              </CyDText>
            </CyDView>
          </CyDView>
        ) : limitIncrease?.status === 'rejected' ? (
          <CyDView className='bg-red20 border border-red-200 rounded-[12px] p-[16px] gap-[4px]'>
            <CyDView className='flex-row items-center gap-[8px]'>
              <CyDMaterialDesignIcons name='close-circle' size={20} className='text-red-700' />
              <CyDText className='text-[14px] font-semibold text-red-700'>
                Limit increase rejected
              </CyDText>
            </CyDView>
            <CyDText className='text-[13px] text-red-700'>
              You can submit a new request with different documentation.
            </CyDText>
          </CyDView>
        ) : null}
      </CyDScrollView>

      {/* Bottom CTA */}
      <CyDView
        className='px-[16px] pt-[12px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDTouchView
          onPress={() =>
            navigation.navigate(screenTitle.BLINDPAY_REQUEST_LIMIT_INCREASE, {
              limits,
              receiverType,
            })
          }
          disabled={hasPending}
          className={`rounded-full h-[48px] items-center justify-center ${
            hasPending ? 'bg-n40' : 'bg-[#FBC02D]'
          }`}>
          <CyDText
            className={`text-[16px] font-bold tracking-[-0.16px] ${
              hasPending ? 'text-n200' : 'text-black'
            }`}>
            {hasPending ? 'Request Pending' : 'Request Increase'}
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
