import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
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
  CyDTouchView,
  CyDView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
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

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  const color =
    s === 'approved'
      ? 'bg-green-100 text-green-700'
      : s === 'verifying'
        ? 'bg-[#FDF3D8] text-[#846000]'
        : 'bg-red-100 text-red-700';
  return (
    <CyDView className={`px-[10px] py-[3px] rounded-full ${color.split(' ')[0]}`}>
      <CyDText className={`text-[12px] font-semibold ${color.split(' ')[1]} capitalize`}>
        {status ?? 'Unknown'}
      </CyDText>
    </CyDView>
  );
}

interface FieldSection {
  title: string;
  rows: { label: string; value?: string | null }[];
}

function getGroupedFields(type: string, account: any): FieldSection[] {
  const accountInfo: FieldSection = {
    title: 'Account Info',
    rows: [
      { label: 'Account Name', value: account.name },
      { label: 'Type', value: RAIL_LABELS[type] ?? type },
      { label: 'Created', value: account.createdAt ? new Date(account.createdAt).toLocaleDateString() : null },
    ],
  };

  switch (type) {
    case 'ach':
    case 'wire':
    case 'rtp':
      return [
        accountInfo,
        {
          title: 'Bank Details',
          rows: [
            { label: 'Beneficiary Name', value: account.beneficiaryName },
            { label: 'Routing Number', value: account.routingNumber },
            { label: 'Account Number', value: account.accountNumber },
            { label: 'Account Type', value: account.accountType },
            { label: 'Account Class', value: account.accountClass },
            { label: 'Relationship', value: account.recipientRelationship?.replace(/_/g, ' ') },
          ],
        },
        {
          title: 'Address',
          rows: [
            { label: 'Street', value: [account.addressLine1, account.addressLine2].filter(Boolean).join(', ') || null },
            { label: 'City', value: account.city },
            { label: 'State', value: account.stateProvinceRegion },
            { label: 'Country', value: account.country },
            { label: 'Postal Code', value: account.postalCode },
            { label: 'Phone', value: account.phoneNumber },
            { label: 'Industry (NAICS)', value: account.businessIndustry },
          ],
        },
      ];
    case 'pix':
      return [
        accountInfo,
        { title: 'PIX Details', rows: [
          { label: 'Beneficiary Name', value: account.beneficiaryName },
          { label: 'PIX Key', value: account.pixKey },
        ]},
      ];
    case 'pix_safe':
      return [
        accountInfo,
        { title: 'PIX Safe Details', rows: [
          { label: 'Beneficiary Name', value: account.beneficiaryName },
          { label: 'CPF / CNPJ', value: account.pixSafeCpfCnpj },
          { label: 'Bank Code', value: account.pixSafeBankCode },
          { label: 'Branch Code', value: account.pixSafeBranchCode },
        ]},
      ];
    case 'spei_bitso':
      return [
        accountInfo,
        { title: 'SPEI Details', rows: [
          { label: 'Beneficiary Name', value: account.beneficiaryName },
          { label: 'Protocol', value: account.speiProtocol },
          { label: 'CLABE', value: account.speiClabe },
          { label: 'Institution Code', value: account.speiInstitutionCode },
        ]},
      ];
    case 'transfers_bitso':
      return [
        accountInfo,
        { title: 'Transfer Details', rows: [
          { label: 'Beneficiary Name', value: account.beneficiaryName },
          { label: 'Transfer Type', value: account.transfersType },
          { label: 'Account', value: account.transfersAccount },
        ]},
      ];
    case 'ach_cop_bitso':
      return [
        accountInfo,
        { title: 'Beneficiary', rows: [
          { label: 'First Name', value: account.achCopBeneficiaryFirstName },
          { label: 'Last Name', value: account.achCopBeneficiaryLastName },
          { label: 'Document Type', value: account.achCopDocumentType },
          { label: 'Document ID', value: account.achCopDocumentId },
          { label: 'Email', value: account.achCopEmail },
        ]},
        { title: 'Bank Account', rows: [
          { label: 'Bank Code', value: account.achCopBankCode },
          { label: 'Bank Account', value: account.achCopBankAccount },
          { label: 'Account Type', value: account.accountType },
        ]},
      ];
    case 'international_swift':
      return [
        accountInfo,
        { title: 'SWIFT Account', rows: [
          { label: 'SWIFT / BIC', value: account.swiftCodeBic },
          { label: 'Account Holder', value: account.swiftAccountHolderName },
          { label: 'Account / IBAN', value: account.swiftAccountNumberIban },
        ]},
        { title: 'Bank & Beneficiary', rows: [
          { label: 'Bank Name', value: account.swiftBankName },
          { label: 'Bank Country', value: account.swiftBankCountry },
          { label: 'Beneficiary Address', value: account.swiftBeneficiaryAddressLine1 },
          { label: 'Beneficiary City', value: account.swiftBeneficiaryCity },
          { label: 'Beneficiary Country', value: account.swiftBeneficiaryCountry },
          { label: 'Intermediary SWIFT', value: account.swiftIntermediaryBankSwiftCodeBic },
          { label: 'Intermediary Bank', value: account.swiftIntermediaryBankName },
        ]},
      ];
    default:
      return [accountInfo];
  }
}

function GroupedDetailCard({ section }: { section: FieldSection }) {
  const visibleRows = section.rows.filter(r => r.value);
  if (visibleRows.length === 0) return null;
  return (
    <CyDView className='gap-[6px]'>
      <CyDText className='text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]'>
        {section.title}
      </CyDText>
      <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
        {visibleRows.map((row, idx) => (
          <CyDView key={row.label}>
            <CyDView className='px-[16px] min-h-[48px] justify-center'>
              <CyDView className='py-[8px]'>
                <CyDText className='text-[11px] text-n100 leading-[1.5]'>
                  {row.label}
                </CyDText>
                <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
                  {row.value}
                </CyDText>
              </CyDView>
            </CyDView>
            {idx < visibleRows.length - 1 ? (
              <CyDView className='h-px bg-n50' />
            ) : null}
          </CyDView>
        ))}
      </CyDView>
    </CyDView>
  );
}

export default function BlindPayBankAccountDetailScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, { accountId: string }>, string>>();
  const insets = useSafeAreaInsets();
  const { getBankAccount, deleteBankAccount } = useBlindPayApi();
  const accountId = route.params?.accountId;

  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    void getBankAccount(accountId).then(res => {
      if (!res.isError && res.data) setAccount(res.data);
      setLoading(false);
    });
  }, [accountId]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Remove Account',
      `Are you sure you want to remove "${account?.name ?? 'this account'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const res = await deleteBankAccount(accountId);
            setDeleting(false);
            if (res.isError) {
              showToast(res.errorMessage ?? 'Failed to remove account', 'error');
              return;
            }
            showToast('Account removed');
            navigation.goBack();
          },
        },
      ],
    );
  }, [account, accountId, deleteBankAccount, navigation]);

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
          <CyDText className='text-[16px] text-n200 text-center'>Account not found</CyDText>
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  const sections = getGroupedFields(account.type, account);

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center px-[16px] h-[64px]'>
        <CyDTouchView onPress={() => navigation.goBack()} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px] flex-row items-center justify-between'>
        <CyDText className='text-[24px] font-normal text-base400 tracking-[-1px] leading-[1.4] flex-1 mr-[12px]'>
          {account.name ?? 'Account Details'}
        </CyDText>
        <StatusBadge status={account.status} />
      </CyDView>

      <CyDScrollView className='flex-1' contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'>
        {sections.map(section => (
          <GroupedDetailCard key={section.title} section={section} />
        ))}
      </CyDScrollView>

      <CyDView
        className='px-[16px] pt-[12px] border-t border-n40'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDTouchView
          onPress={handleDelete}
          disabled={deleting}
          className='rounded-full h-[48px] border border-red-300 bg-red20 items-center justify-center'>
          {deleting ? (
            <ActivityIndicator color='#DC2626' />
          ) : (
            <CyDText className='text-[16px] font-bold text-red-600 tracking-[-0.16px]'>
              Remove Account
            </CyDText>
          )}
        </CyDTouchView>
      </CyDView>
    </CyDSafeAreaView>
  );
}
