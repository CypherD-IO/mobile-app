import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
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
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';

const PARTNER_LABELS: Record<string, string> = {
  jpmorgan: 'JPMorgan',
  citi: 'Citi',
  hsbc: 'HSBC',
};

const PARTNER_ICONS: Record<string, string> = {
  jpmorgan: '\uD83C\uDFE6',
  citi: '\uD83C\uDFE6',
  hsbc: '\uD83C\uDFE6',
};

export default function BlindPayVirtualAccountsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { listVirtualAccounts, getProfile } = useBlindPayApi();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUS, setIsUS] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      Promise.all([listVirtualAccounts(), getProfile()])
        .then(([vaRes, profileRes]) => {
          if (cancelled) return;
          if (!vaRes.isError && vaRes.data) {
            setAccounts(vaRes.data);
          }
          const country =
            profileRes.data?.blindpay?.country ?? '';
          setIsUS(country.toUpperCase() === 'US');
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      {/* Header */}
      <CyDView className='flex-row items-center px-[16px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          {String(t('VIRTUAL_ACCOUNTS', 'Virtual Accounts'))}
        </CyDText>
        <CyDText className='text-[14px] font-medium text-n200 leading-[1.45] tracking-[-0.6px] mt-[4px]'>
          {String(
            t(
              'VA_DESC',
              'Manage your virtual bank accounts for receiving funds',
            ),
          )}
        </CyDText>
      </CyDView>

      {loading ? (
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </CyDView>
      ) : isUS === false ? (
        /* Coming Soon for non-US users */
        <CyDView className='flex-1 items-center justify-center px-[32px]'>
          <CyDView className='w-[72px] h-[72px] rounded-full bg-n20 items-center justify-center mb-[16px]'>
            <CyDMaterialDesignIcons
              name='bank-outline'
              size={36}
              className='text-n200'
            />
          </CyDView>
          <CyDText className='text-[22px] font-semibold text-base400 tracking-[-1px] text-center'>
            {String(t('VA_COMING_SOON', 'Coming Soon'))}
          </CyDText>
          <CyDText className='text-[14px] font-medium text-n200 tracking-[-0.6px] text-center mt-[8px] leading-[1.5]'>
            {String(
              t(
                'VA_COMING_SOON_DESC',
                'Virtual accounts are currently available for US residents only. We\'re working on expanding to more countries soon.',
              ),
            )}
          </CyDText>
        </CyDView>
      ) : accounts.length === 0 ? (
        <CyDView className='flex-1 items-center justify-center px-[32px]'>
          <CyDMaterialDesignIcons
            name='bank-outline'
            size={48}
            className='text-n200'
          />
          <CyDText className='text-[16px] font-medium text-n200 tracking-[-0.8px] text-center mt-[12px]'>
            {String(
              t(
                'NO_VA',
                'No virtual accounts yet. Create one to start receiving funds.',
              ),
            )}
          </CyDText>
        </CyDView>
      ) : (
        <CyDScrollView
          className='flex-1'
          contentContainerClassName='px-[16px] pb-[24px] gap-[10px]'>
          {accounts.map(account => (
            <CyDTouchView
              key={account.id}
              onPress={() =>
                navigation.navigate(
                  screenTitle.BLINDPAY_VIRTUAL_ACCOUNT_DETAIL,
                  { accountId: account.id },
                )
              }
              className='bg-n0 border border-n30 rounded-[12px] p-[16px] flex-row items-center gap-[12px]'>
              <CyDView className='w-[44px] h-[44px] rounded-[12px] bg-n20 items-center justify-center'>
                <CyDText className='text-[20px]'>
                  {PARTNER_ICONS[account.bankingPartner] ?? '\uD83C\uDFE6'}
                </CyDText>
              </CyDView>
              <CyDView className='flex-1'>
                <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px]'>
                  {PARTNER_LABELS[account.bankingPartner] ??
                    account.bankingPartner}
                </CyDText>
                <CyDText className='text-[13px] font-medium text-n200 tracking-[-0.4px] mt-[2px]'>
                  {account.token} · {account.status ?? 'Active'}
                </CyDText>
              </CyDView>
              <CyDMaterialDesignIcons
                name='chevron-right'
                size={22}
                className='text-n200'
              />
            </CyDTouchView>
          ))}
        </CyDScrollView>
      )}

      {/* Bottom CTA — only for US users */}
      {isUS === true && (
        <CyDView
          className='px-[16px] pt-[12px] border-t border-n40'
          style={{ paddingBottom: Math.max(8, insets.bottom) }}>
          <CyDTouchView
            onPress={() =>
              navigation.navigate(
                screenTitle.BLINDPAY_CREATE_VIRTUAL_ACCOUNT,
              )
            }
            className='rounded-full h-[48px] bg-p100 items-center justify-center'>
            <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
              {String(t('CREATE_VA', 'Create Virtual Account'))}
            </CyDText>
          </CyDTouchView>
        </CyDView>
      )}
    </CyDSafeAreaView>
  );
}
