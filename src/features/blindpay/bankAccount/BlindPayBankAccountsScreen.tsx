import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
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

const RAIL_LABELS: Record<string, string> = {
  ach: 'ACH (US)',
  wire: 'Wire (US)',
  rtp: 'RTP (US, instant)',
  pix: 'PIX (Brazil)',
  pix_safe: 'PIX Safe (Brazil)',
  spei_bitso: 'SPEI (Mexico)',
  transfers_bitso: 'Transfers (Argentina)',
  ach_cop_bitso: 'ACH COP (Colombia)',
  international_swift: 'SWIFT (International)',
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: '\uD83C\uDDFA\uD83C\uDDF8',
  BR: '\uD83C\uDDE7\uD83C\uDDF7',
  MX: '\uD83C\uDDF2\uD83C\uDDFD',
  AR: '\uD83C\uDDE6\uD83C\uDDF7',
  CO: '\uD83C\uDDE8\uD83C\uDDF4',
};

export default function BlindPayBankAccountsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { getStatus, listBankAccounts } = useBlindPayApi();
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;
  const listBankAccountsRef = useRef(listBankAccounts);
  listBankAccountsRef.current = listBankAccounts;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh from full API
  const fetchFull = useCallback(async () => {
    setRefreshing(true);
    const res = await listBankAccountsRef.current();
    if (!res.isError && res.data) {
      setAccounts(res.data);
    }
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getStatusRef
        .current()
        .then(res => {
          if (cancelled) return;
          if (!res.isError && res.data?.blindpay?.bankAccounts) {
            setAccounts(res.data.blindpay.bankAccounts);
          }
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }, []),
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-n20' edges={['top']}>
      <CyDView className='flex-row items-center px-[16px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          Bank Accounts
        </CyDText>
        <CyDText className='text-[14px] font-medium text-n200 leading-[1.45] tracking-[-0.6px] mt-[4px]'>
          Manage your linked bank accounts for payouts
        </CyDText>
      </CyDView>

      {loading ? (
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </CyDView>
      ) : accounts.length === 0 ? (
        <CyDView className='flex-1 items-center justify-center px-[32px]'>
          <CyDMaterialDesignIcons name='bank-outline' size={48} className='text-n200' />
          <CyDText className='text-[16px] font-medium text-n200 tracking-[-0.8px] text-center mt-[12px]'>
            No bank accounts linked yet. Add one to start receiving payouts.
          </CyDText>
        </CyDView>
      ) : (
        <CyDScrollView
          className='flex-1'
          contentContainerClassName='px-[16px] pb-[24px]'
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { void fetchFull(); }} />
          }>
          {(() => {
            // Group accounts by rail type
            const grouped: Record<string, typeof accounts> = {};
            for (const account of accounts) {
              const rail = account.type ?? 'other';
              if (!grouped[rail]) grouped[rail] = [];
              grouped[rail].push(account);
            }
            return Object.entries(grouped).map(([rail, items]) => (
              <CyDView key={rail} className='mb-[16px]'>
                <CyDText className='text-[12px] font-semibold text-base400 tracking-[-0.12px] mb-[8px]'>
                  {RAIL_LABELS[rail] ?? rail}
                </CyDText>
                <CyDView className='bg-n10 rounded-[12px] border border-n40 overflow-hidden'>
                  {items.map((account, idx) => {
                    const flag = COUNTRY_FLAGS[account.country] ?? '\uD83C\uDF10';
                    const lastFour = account.lastFour ?? account.accountNumber?.slice(-4);
                    const isLast = idx === items.length - 1;
                    return (
                      <CyDTouchView
                        key={account.id}
                        onPress={() =>
                          navigation.navigate(screenTitle.BLINDPAY_BANK_ACCOUNT_DETAIL, {
                            accountId: account.id,
                          })
                        }
                        className={`px-[16px] py-[16px] flex-row items-center gap-[12px] ${!isLast ? 'border-b border-n40' : ''}`}>
                        <CyDView className='w-[37px] h-[37px] rounded-[6px] bg-n40 items-center justify-center'>
                          <CyDText className='text-[18px]'>{flag}</CyDText>
                        </CyDView>
                        <CyDView className='flex-1'>
                          <CyDText className='text-[14px] font-semibold text-base400 tracking-[-0.6px]' numberOfLines={1}>
                            {account.name ?? 'Bank Account'}
                          </CyDText>
                          {account.beneficiaryName ? (
                            <CyDText className='text-[12px] font-medium text-n200 mt-[2px]' numberOfLines={1}>
                              {account.beneficiaryName}
                            </CyDText>
                          ) : null}
                          {lastFour ? (
                            <CyDText className='text-[11px] font-normal text-n100 mt-[1px]'>
                              **** {lastFour}
                            </CyDText>
                          ) : null}
                        </CyDView>
                        <CyDMaterialDesignIcons name='chevron-right' size={22} className='text-n200' />
                      </CyDTouchView>
                    );
                  })}
                </CyDView>
              </CyDView>
            ));
          })()}
        </CyDScrollView>
      )}

      <CyDView
        className='px-[16px] pt-[12px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDTouchView
          onPress={() => navigation.navigate(screenTitle.BLINDPAY_ADD_BANK_ACCOUNT)}
          className='rounded-full h-[48px] bg-[#FBC02D] items-center justify-center'>
          <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
            Add Bank Account
          </CyDText>
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
