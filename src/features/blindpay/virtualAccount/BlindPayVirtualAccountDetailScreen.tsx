import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { t } from 'i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDSafeAreaView,
  CyDScrollView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';

const PARTNER_LABELS: Record<string, string> = {
  jpmorgan: 'JPMorgan',
  citi: 'Citi',
  hsbc: 'HSBC',
};

const LABEL_CLASS =
  'text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]';
const PLACEHOLDER_COLOR = '#A6AEBB';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <CyDView className='py-[10px] border-b border-n40 gap-[2px]'>
      <CyDText className='text-[12px] font-medium text-n200'>{label}</CyDText>
      <CyDText className='text-[15px] font-medium text-base400'>
        {value || '—'}
      </CyDText>
    </CyDView>
  );
}

export default function BlindPayVirtualAccountDetailScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, { accountId: string }>, string>>();
  const insets = useSafeAreaInsets();
  const { getVirtualAccount, updateVirtualAccount } = useBlindPayApi();
  const accountId = route.params?.accountId;

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editToken, setEditToken] = useState('');
  const [editWalletId, setEditWalletId] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const res = await getVirtualAccount(accountId);
    if (!res.isError && res.data) {
      setAccount(res.data);
      setEditToken(res.data.token ?? '');
      setEditWalletId(res.data.blockchainWalletId ?? '');
    }
    setLoading(false);
  }, [accountId, getVirtualAccount]);

  useEffect(() => {
    void fetchAccount();
  }, []);

  const handleSave = useCallback(async () => {
    Keyboard.dismiss();
    if (!editToken.trim() || !editWalletId.trim()) {
      showToast(t('FIELD_REQUIRED', 'All fields are required'), 'error');
      return;
    }
    setSaving(true);
    const res = await updateVirtualAccount(accountId, {
      token: editToken.trim(),
      blockchainWalletId: editWalletId.trim(),
    });
    setSaving(false);
    if (res.isError) {
      showToast(
        res.errorMessage ?? t('UNEXPECTED_ERROR', 'Something went wrong'),
        'error',
      );
      return;
    }
    showToast(t('VA_UPDATED', 'Virtual account updated'));
    setEditing(false);
    void fetchAccount();
  }, [accountId, editToken, editWalletId, updateVirtualAccount, fetchAccount]);

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

  if (!account) {
    return (
      <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
        <CyDView className='flex-row items-center px-[16px] h-[64px]'>
          <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
            <CyDIcons name='arrow-left' size={24} className='text-base400' />
          </CyDTouchView>
        </CyDView>
        <CyDView className='flex-1 items-center justify-center px-[32px]'>
          <CyDText className='text-[16px] text-n200 text-center'>
            {String(t('VA_NOT_FOUND', 'Virtual account not found'))}
          </CyDText>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center px-[16px] h-[64px]'>
        <CyDTouchView
          onPress={() => {
            if (editing) {
              setEditing(false);
            } else {
              navigation.goBack();
            }
          }}
          hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          {editing
            ? String(t('EDIT_VA', 'Edit Account'))
            : String(t('VA_DETAIL', 'Account Details'))}
        </CyDText>
      </CyDView>

      <CyDScrollView
        className='flex-1'
        contentContainerClassName='px-[16px] pb-[24px]'>
        {editing ? (
          <CyDView className='gap-[6px]'>
            <CyDText className={LABEL_CLASS}>
              {String(t('EDIT_DETAILS', 'Edit Details'))}
            </CyDText>
            <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
              {/* Banking partner (read-only) */}
              <CyDView className='px-[16px] min-h-[52px] justify-center bg-n20'>
                <CyDView className='py-[8px]'>
                  <CyDText className='text-[10px] text-n100 leading-[1.6]'>
                    Banking Partner
                  </CyDText>
                  <CyDText className='text-[16px] font-medium text-n200 tracking-[-0.8px]'>
                    {PARTNER_LABELS[account.bankingPartner] ??
                      account.bankingPartner}
                  </CyDText>
                </CyDView>
              </CyDView>
              <CyDView className='h-[0.5px] bg-n50' />

              {/* Token (editable) */}
              <CyDView
                className={`px-[16px] min-h-[52px] justify-center ${
                  focusedField === 'token' ? 'bg-n0' : ''
                }`}>
                <CyDView className='py-[8px]'>
                  {editToken ? (
                    <CyDText className='text-[10px] text-n100 leading-[1.6]'>
                      Token
                    </CyDText>
                  ) : null}
                  <CyDTextInput
                    className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 bg-transparent'
                    value={editToken}
                    onChangeText={setEditToken}
                    placeholder={editToken ? '' : 'Token'}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    autoCapitalize='characters'
                    onFocus={() => setFocusedField('token')}
                    onBlur={() => setFocusedField(null)}
                  />
                </CyDView>
              </CyDView>
              <CyDView className='h-[0.5px] bg-n50' />

              {/* Wallet ID (editable) */}
              <CyDView
                className={`px-[16px] min-h-[52px] justify-center ${
                  focusedField === 'walletId' ? 'bg-n0' : ''
                }`}>
                <CyDView className='py-[8px]'>
                  {editWalletId ? (
                    <CyDText className='text-[10px] text-n100 leading-[1.6]'>
                      Blockchain Wallet ID
                    </CyDText>
                  ) : null}
                  <CyDTextInput
                    className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 bg-transparent'
                    value={editWalletId}
                    onChangeText={setEditWalletId}
                    placeholder={editWalletId ? '' : 'Blockchain Wallet ID'}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    autoCapitalize='none'
                    autoCorrect={false}
                    onFocus={() => setFocusedField('walletId')}
                    onBlur={() => setFocusedField(null)}
                  />
                </CyDView>
              </CyDView>
            </CyDView>
          </CyDView>
        ) : (
          <CyDView>
            <DetailRow
              label={String(t('ACCOUNT_ID', 'Account ID'))}
              value={account.id}
            />
            <DetailRow
              label={String(t('BANKING_PARTNER', 'Banking Partner'))}
              value={
                PARTNER_LABELS[account.bankingPartner] ??
                account.bankingPartner
              }
            />
            <DetailRow
              label={String(t('TOKEN', 'Token'))}
              value={account.token}
            />
            <DetailRow
              label={String(t('WALLET_ID', 'Blockchain Wallet ID'))}
              value={account.blockchainWalletId}
            />
            <DetailRow
              label={String(t('STATUS', 'Status'))}
              value={account.status ?? 'Active'}
            />
            <DetailRow
              label={String(t('CREATED', 'Created'))}
              value={
                account.createdAt
                  ? new Date(account.createdAt).toLocaleDateString()
                  : '—'
              }
            />

            {/* Account details (bank-specific) */}
            {account.accountDetails &&
            typeof account.accountDetails === 'object' ? (
              <CyDView className='mt-[16px]'>
                <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px] mb-[8px]'>
                  {String(t('BANK_DETAILS', 'Bank Details'))}
                </CyDText>
                {Object.entries(account.accountDetails).map(
                  ([key, val]) => (
                    <DetailRow
                      key={key}
                      label={key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase())}
                      value={String(val ?? '—')}
                    />
                  ),
                )}
              </CyDView>
            ) : null}
          </CyDView>
        )}
      </CyDScrollView>

      {/* Bottom */}
      <CyDView
        className='px-[16px] pt-[12px] flex-row items-center justify-end border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        {editing ? (
          <CyDTouchView
            onPress={() => {
              void handleSave();
            }}
            disabled={saving}
            className='rounded-full min-h-[48px] min-w-[120px] bg-[#FBC02D] px-[24px] flex-row items-center justify-center'>
            <CyDView className='relative items-center justify-center'>
              <CyDText
                className={`text-[16px] font-semibold text-black tracking-[-0.8px] ${
                  saving ? 'opacity-0' : ''
                }`}>
                {String(t('SAVE', 'Save'))}
              </CyDText>
              {saving ? (
                <CyDView className='absolute inset-0 items-center justify-center'>
                  <ActivityIndicator color='#0D0D0D' />
                </CyDView>
              ) : null}
            </CyDView>
          </CyDTouchView>
        ) : (
          <CyDTouchView
            onPress={() => setEditing(true)}
            className='rounded-full min-h-[48px] min-w-[120px] bg-[#FBC02D] px-[24px] flex-row items-center justify-center'>
            <CyDText className='text-[16px] font-semibold text-black tracking-[-0.8px]'>
              {String(t('EDIT', 'Edit'))}
            </CyDText>
          </CyDTouchView>
        )}
      </CyDView>
    </CyDSafeAreaView>
  );
}
