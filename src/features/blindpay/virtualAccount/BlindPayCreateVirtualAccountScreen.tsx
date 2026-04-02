import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, ScrollView } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { t } from 'i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CyDIcons,
  CyDMaterialDesignIcons,
  CyDSafeAreaView,
  CyDText,
  CyDTextInput,
  CyDTouchView,
  CyDView,
  CyDKeyboardAwareScrollView,
} from '../../../styles/tailwindComponents';
import { showToast } from '../../../containers/utilities/toastUtility';
import useBlindPayApi from '../api';
import type { BlindPayUploadFilePart } from '../api';
import ReviewCard from '../components/ReviewCard';
import { BlindpayUploadBucket } from '../types';
import { HdWalletContext } from '../../../core/util';
import BlindPayIdCaptureModal, {
  type CapturedFile,
} from '../onboarding/BlindPayIdCaptureModal';

const LABEL_CLASS =
  'text-[14px] font-normal text-n200 tracking-[-0.6px] leading-[1.45]';
const PLACEHOLDER_COLOR = '#A6AEBB';

// ── Dropdown options ─────────────────────────────────────────────

const ACCOUNT_PURPOSE_OPTIONS = [
  { value: 'personal_or_living_expenses', label: 'Personal / Living expenses' },
  { value: 'business_expenses', label: 'Business expenses' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'investment_purposes', label: 'Investment purposes' },
  { value: 'charitable_donations', label: 'Charitable donations' },
  { value: 'ecommerce_retail_payments', label: 'E-commerce / Retail payments' },
  { value: 'payments_to_friends_or_family_abroad', label: 'Payments to friends or family abroad' },
  { value: 'protect_wealth', label: 'Protect wealth' },
  { value: 'purchase_goods_and_services', label: 'Purchase goods and services' },
  { value: 'receive_payments_for_goods_and_services', label: 'Receive payments for goods/services' },
  { value: 'tax_optimization', label: 'Tax optimization' },
  { value: 'third_party_money_transmission', label: 'Third party money transmission' },
  { value: 'treasury_management', label: 'Treasury management' },
  { value: 'other', label: 'Other' },
];

const REVENUE_OPTIONS = [
  { value: '0_99999', label: 'Under $100K' },
  { value: '100000_999999', label: '$100K – $1M' },
  { value: '1000000_9999999', label: '$1M – $10M' },
  { value: '10000000_49999999', label: '$10M – $50M' },
  { value: '50000000_249999999', label: '$50M – $250M' },
  { value: '2500000000_plus', label: '$2.5B+' },
];

const SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'business_income', label: 'Business income' },
  { value: 'savings', label: 'Savings' },
  { value: 'investment_proceeds', label: 'Investment proceeds' },
  { value: 'investment_loans', label: 'Investment / Loans' },
  { value: 'pension_retirement', label: 'Pension / Retirement' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'gifts', label: 'Gifts' },
  { value: 'government_benefits', label: 'Government benefits' },
  { value: 'sale_of_assets_real_estate', label: 'Sale of assets / Real estate' },
  { value: 'esops', label: 'ESOPs' },
  { value: 'gambling_proceeds', label: 'Gambling proceeds' },
  { value: 'someone_else_funds', label: "Someone else's funds" },
];

const SOLE_PROP_DOC_OPTIONS = [
  { value: 'master_service_agreement', label: 'Master Service Agreement' },
  { value: 'salary_slip', label: 'Salary Slip' },
  { value: 'bank_statement', label: 'Bank Statement' },
];

// ── Shared components ────────────────────────────────────────────

function DropdownSheet({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string;
  options: { value: string; label: string }[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType='fade' onRequestClose={onClose}>
      <CyDView className='flex-1 justify-end bg-black/40'>
        <CyDTouchView className='flex-1' onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(300)}>
          <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
            <CyDView className='items-center pt-[12px] pb-[16px]'>
              <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
            </CyDView>
            <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[8px]'>
              {title}
            </CyDText>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <CyDTouchView
                  key={opt.value}
                  onPress={() => { onSelect(opt.value); onClose(); }}
                  className='py-[14px] border-b border-n40 flex-row items-center justify-between'>
                  <CyDText className='text-[16px] font-medium text-base400'>{opt.label}</CyDText>
                  {selected === opt.value ? (
                    <CyDMaterialDesignIcons name='check' size={20} className='text-[#FBC02D]' />
                  ) : null}
                </CyDTouchView>
              ))}
            </ScrollView>
          </CyDView>
        </Animated.View>
      </CyDView>
    </Modal>
  );
}

function GroupedRow({
  label, value, isDropdown, hasError, onPress, isLast,
}: {
  label: string; value?: string;
  isDropdown?: boolean; hasError?: boolean; onPress?: () => void; isLast?: boolean;
}) {
  return (
    <>
      <CyDTouchView
        onPress={onPress}
        disabled={!isDropdown}
        className={`px-[16px] min-h-[52px] flex-row items-center justify-between ${
          hasError ? 'bg-red20' : ''
        }`}>
        <CyDView className='flex-1 py-[8px]'>
          {value ? (
            <>
              <CyDText className='text-[11px] text-n100 leading-[1.5]'>{label}</CyDText>
              <CyDText className='text-[16px] font-medium text-base400 tracking-[-0.8px]'>
                {value}
              </CyDText>
            </>
          ) : (
            <CyDText className='text-[16px] font-normal text-n70 tracking-[-0.8px]'>
              {label}
            </CyDText>
          )}
        </CyDView>
        {isDropdown ? (
          <CyDMaterialDesignIcons name='chevron-down' size={20} className='text-n70' />
        ) : null}
      </CyDTouchView>
      {!isLast ? <CyDView className='h-[0.5px] bg-n50' /> : null}
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <CyDView className='py-[10px] border-b border-n40 gap-[2px]'>
      <CyDText className='text-[12px] font-medium text-n200'>{label}</CyDText>
      <CyDText className='text-[15px] font-medium text-base400'>{value || '—'}</CyDText>
    </CyDView>
  );
}

// ── Main screen ──────────────────────────────────────────────────

export default function BlindPayCreateVirtualAccountScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();
  const { getProfile, updateReceiver, createVirtualAccount, uploadDocument } = useBlindPayApi();
  const hdWallet = useContext(HdWalletContext) as any;

  const walletAddress =
    hdWallet?.state?.wallet?.ethereum?.address ??
    hdWallet?.state?.wallet?.solana?.address ?? '';

  // 5 steps: 0=intro, 1=purpose+revenue, 2=occupation+source, 3=doc upload, 4=review
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  // Profile data (fetched to get email + country)
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Step 0
  const [accountPurpose, setAccountPurpose] = useState('');
  const [accountPurposeOther, setAccountPurposeOther] = useState('');
  const [estimatedRevenue, setEstimatedRevenue] = useState('');

  // Step 1
  const [occupation, setOccupation] = useState('');
  const [sourceOfFunds, setSourceOfFunds] = useState('');

  // Step 2
  const [solePropDocType, setSolePropDocType] = useState('');
  const [solePropDocUrl, setSolePropDocUrl] = useState('');
  const [sourceOfFundsDocUrl, setSourceOfFundsDocUrl] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [captureTarget, setCaptureTarget] = useState<'soleProp' | 'sourceFunds' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Fetch profile on mount for email + country
  useEffect(() => {
    void getProfile().then(res => {
      if (!res.isError && res.data?.blindpay) {
        const p = res.data.blindpay;
        setProfileEmail(p.email ?? '');
        setProfileCountry(p.country ?? '');
        // Pre-fill if already set
        if (p.accountPurpose) setAccountPurpose(p.accountPurpose);
        if (p.estimatedAnnualRevenue) setEstimatedRevenue(p.estimatedAnnualRevenue);
        if (p.occupation) setOccupation(p.occupation);
        if (p.sourceOfFundsDocType) setSourceOfFunds(p.sourceOfFundsDocType);
      }
      setProfileLoaded(true);
    });
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};
    const req = String(t('FIELD_REQUIRED', 'This field is required'));
    if (step === 0) {
      // Intro — no validation needed
    } else if (step === 1) {
      if (!accountPurpose) e.accountPurpose = req;
      if (accountPurpose === 'other' && !accountPurposeOther.trim()) e.accountPurposeOther = req;
      if (!estimatedRevenue) e.estimatedRevenue = req;
    } else if (step === 2) {
      if (!occupation.trim()) e.occupation = req;
      if (!sourceOfFunds) e.sourceOfFunds = req;
    } else if (step === 3) {
      if (!solePropDocType) e.solePropDocType = req;
      if (!solePropDocUrl) e.solePropDoc = 'Upload a document';
      if (!sourceOfFundsDocUrl) e.sourceFundsDoc = 'Upload a document';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [step, accountPurpose, estimatedRevenue, occupation, sourceOfFunds, solePropDocType, solePropDocUrl, sourceOfFundsDocUrl]);

  const handleCapture = useCallback(
    async (file: CapturedFile) => {
      const target = captureTarget;
      setCaptureTarget(null);
      if (!target) return;

      setUploading(true);
      setUploadErrors(prev => ({ ...prev, [target]: '' }));
      const filePart: BlindPayUploadFilePart = { uri: file.uri, name: file.name, type: file.type };
      const res = await uploadDocument(filePart, BlindpayUploadBucket.ONBOARDING);
      setUploading(false);

      if (res.isError || !res.data?.fileUrl) {
        const msg = res.errorMessage ?? 'Upload failed';
        setUploadErrors(prev => ({ ...prev, [target]: msg }));
        showToast(msg, 'error');
        return;
      }

      if (target === 'soleProp') {
        setSolePropDocUrl(res.data.fileUrl);
        clearError('solePropDoc');
      } else {
        setSourceOfFundsDocUrl(res.data.fileUrl);
        clearError('sourceFundsDoc');
      }
      setUploadErrors(prev => ({ ...prev, [target]: '' }));
    },
    [captureTarget, uploadDocument, clearError],
  );

  const handleNext = useCallback(async () => {
    Keyboard.dismiss();
    if (!validateStep()) return;

    if (step < totalSteps - 1) {
      setStep(s => s + 1);
      return;
    }

    // Final step — 2 API calls
    setSubmitting(true);

    // 1. Update receiver profile
    const updateBody: Record<string, any> = {
      email: profileEmail,
      country: profileCountry,
      accountPurpose,
      estimatedAnnualRevenue: estimatedRevenue,
      occupation: occupation.trim(),
      sourceOfFundsDocType: sourceOfFunds,
      sourceOfFundsDocFile: sourceOfFundsDocUrl,
    };
    if (accountPurpose === 'other' && accountPurposeOther.trim()) {
      updateBody.accountPurposeOther = accountPurposeOther.trim();
    }

    const updateRes = await updateReceiver(updateBody);
    if (updateRes.isError) {
      setSubmitting(false);
      showToast(updateRes.errorMessage ?? 'Failed to update profile', 'error');
      return;
    }

    // 2. Create virtual account
    const vaBody: Record<string, any> = {
      bankingPartner: 'citi',
      token: 'USDC',
      blockchainWalletId: walletAddress,
    };
    if (solePropDocType) vaBody.soleProprietorDocType = solePropDocType;
    if (solePropDocUrl) vaBody.soleProprietorDocFile = solePropDocUrl;

    const vaRes = await createVirtualAccount(vaBody as { bankingPartner: string; token: string; blockchainWalletId: string });
    setSubmitting(false);

    if (vaRes.isError) {
      showToast(vaRes.errorMessage ?? 'Failed to create virtual account', 'error');
      return;
    }

    showToast('Virtual account created successfully');
    navigation.goBack();
  }, [
    validateStep, step, profileEmail, profileCountry,
    accountPurpose, estimatedRevenue, occupation, sourceOfFunds,
    sourceOfFundsDocUrl, solePropDocType, solePropDocUrl,
    walletAddress, updateReceiver, createVirtualAccount, navigation,
  ]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
    else navigation.goBack();
  }, [step, navigation]);

  const stepTitle = useMemo(() => {
    switch (step) {
      case 0: return 'Virtual Account';
      case 1: return 'Account Details';
      case 2: return 'Occupation & Source';
      case 3: return 'Upload Documents';
      case 4: return 'Review & Submit';
      default: return '';
    }
  }, [step]);

  const isLastStep = step === totalSteps - 1;

  const helpText = useMemo(() => {
    switch (step) {
      case 0:
        return 'A virtual account is a dedicated US bank account with its own routing and account number.\n\nEligible applicants:\n• Freelance developers billing clients\n• Independent consultants\n• E-commerce sellers\n• Content creators\n• Independent tradespeople\n\nSalaried employees receiving personal transfers are not eligible.';
      case 1:
        return 'Account Purpose: Select how you plan to use this account (e.g. "Business expenses" or "Personal / Living expenses").\n\nEstimated Annual Revenue: Select the range that best matches your annual income or business revenue.';
      case 2:
        return 'Occupation: Enter your job title or profession (e.g. "Software Engineer", "Business Owner", "Freelancer").\n\nSource of Funds: Select where your money primarily comes from (e.g. "Salary" for employment income, "Business income" for self-employed).';
      case 3:
        return 'Upload the required documents:\n\n• Sole Proprietor Document: A business document like a Master Service Agreement, salary slip, or bank statement.\n\n• Source of Funds Document: Any document that verifies your income source (e.g. pay stub, tax return, bank statement).';
      default:
        return 'Review all details before submitting. After submission, your virtual account will be created and linked to your wallet.';
    }
  }, [step]);
  const purposeLabel = ACCOUNT_PURPOSE_OPTIONS.find(o => o.value === accountPurpose)?.label;
  const revenueLabel = REVENUE_OPTIONS.find(o => o.value === estimatedRevenue)?.label;
  const sofLabel = SOURCE_OF_FUNDS_OPTIONS.find(o => o.value === sourceOfFunds)?.label;
  const spDocLabel = SOLE_PROP_DOC_OPTIONS.find(o => o.value === solePropDocType)?.label;

  if (!profileLoaded) {
    return (
      <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
        <CyDView className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' />
        </CyDView>
      </CyDSafeAreaView>
    );
  }

  return (
    <CyDSafeAreaView className='flex-1 bg-n0' edges={['top']}>
      <CyDView className='flex-row items-center justify-between px-[16px] h-[64px]'>
        <CyDTouchView onPress={handleBack} hitSlop={12}>
          <CyDIcons name='arrow-left' size={24} className='text-base400' />
        </CyDTouchView>
        <CyDTouchView
          onPress={() => setShowHelp(true)}
          className='flex-row items-center gap-[6px] rounded-full bg-n20 px-[12px] py-[6px]'>
          <CyDIcons name='help-circle-outline' size={20} className='text-base400' />
          <CyDText className='text-[14px] font-normal text-base400 tracking-[-0.6px]'>
            Questions
          </CyDText>
        </CyDTouchView>
      </CyDView>

      <CyDView className='px-[16px] pb-[12px]'>
        <CyDText className='text-[28px] font-normal text-base400 tracking-[-1px] leading-[1.4]'>
          {stepTitle}
        </CyDText>
      </CyDView>

      <CyDKeyboardAwareScrollView
        className='flex-1'
        enableOnAndroid
        enableAutomaticScroll
        keyboardShouldPersistTaps='handled'
        extraScrollHeight={32}
        contentContainerClassName='px-[16px] pb-[24px] gap-[16px]'>

        {step === 0 ? (
          /* Intro screen */
          <CyDView className='gap-[20px]'>
            <CyDText className='text-[14px] font-medium text-n200 leading-[1.45] tracking-[-0.6px]'>
              US bank accounts in the name of your customers for sending and receiving payments.
            </CyDText>

            {/* What is it */}
            <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[8px]'>
              <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px]'>
                What is a virtual account?
              </CyDText>
              <CyDText className='text-[14px] font-normal text-n200 leading-[1.5] tracking-[-0.4px]'>
                A dedicated US bank account with its own unique routing number and account number, enabling you to send and receive payments throughout the United States banking system.
              </CyDText>
            </CyDView>

            {/* Eligibility */}
            <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[8px]'>
              <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px]'>
                Who is eligible?
              </CyDText>
              <CyDText className='text-[14px] font-medium text-n200 leading-[1.5] tracking-[-0.4px]'>
                Only US individuals and sole proprietors
              </CyDText>
              <CyDText className='text-[13px] font-normal text-n200 leading-[1.5] tracking-[-0.4px]'>
                Examples of eligible sole proprietors:
              </CyDText>
              {[
                'Freelance software developers billing clients',
                'Independent consultants (marketing, legal, etc.)',
                'E-commerce sellers with their own online store',
                'Content creators earning from platforms & ads',
                'Tradespeople working independently',
              ].map((item, i) => (
                <CyDView key={i} className='flex-row gap-[8px] items-start'>
                  <CyDText className='text-[13px] text-n200 leading-[1.5]'>{'\u2022'}</CyDText>
                  <CyDText className='text-[13px] font-normal text-n200 leading-[1.5] tracking-[-0.4px] flex-1'>
                    {item}
                  </CyDText>
                </CyDView>
              ))}
              <CyDView className='bg-[#FDF3D8] rounded-[8px] p-[10px] mt-[4px]'>
                <CyDText className='text-[12px] font-medium text-n200 leading-[1.5]'>
                  Salaried employees receiving personal transfers are not eligible for a virtual account.
                </CyDText>
              </CyDView>
            </CyDView>

            {/* Payment rails */}
            <CyDView className='bg-n0 border border-n30 rounded-[12px] p-[16px] gap-[8px]'>
              <CyDText className='text-[16px] font-semibold text-base400 tracking-[-0.8px]'>
                Supported payment rails
              </CyDText>
              {[
                { type: 'ACH', flag: '\uD83C\uDDFA\uD83C\uDDF8', time: '~2 business days' },
                { type: 'Domestic Wire', flag: '\uD83C\uDDFA\uD83C\uDDF8', time: '~1 business day' },
                { type: 'International Wire', flag: '\uD83C\uDDFA\uD83C\uDDF8', time: '~5 business days' },
                { type: 'RTP', flag: '\uD83C\uDDFA\uD83C\uDDF8', time: '~5 minutes', soon: true },
              ].map(rail => (
                <CyDView
                  key={rail.type}
                  className='flex-row items-center justify-between py-[6px] border-b border-n40'>
                  <CyDView className='flex-row items-center gap-[8px]'>
                    <CyDText className='text-[14px]'>{rail.flag}</CyDText>
                    <CyDText className='text-[14px] font-medium text-base400 tracking-[-0.6px]'>
                      {rail.type}
                    </CyDText>
                    {rail.soon ? (
                      <CyDView className='bg-n20 px-[6px] py-[1px] rounded-[4px]'>
                        <CyDText className='text-[10px] font-semibold text-n200'>
                          Soon
                        </CyDText>
                      </CyDView>
                    ) : null}
                  </CyDView>
                  <CyDText className='text-[12px] font-medium text-n200'>
                    {rail.time}
                  </CyDText>
                </CyDView>
              ))}
            </CyDView>
          </CyDView>
        ) : step === 1 ? (
          <CyDView className='gap-[6px]'>
            <CyDText className={LABEL_CLASS}>Account Information</CyDText>
            <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
              <GroupedRow
                label='Account Purpose'

                value={purposeLabel}
                isDropdown
                hasError={!!errors.accountPurpose}
                onPress={() => setOpenPicker('accountPurpose')}
              />
              {accountPurpose === 'other' ? (
                <>
                  <CyDView
                    className={`px-[16px] min-h-[52px] justify-center ${
                      errors.accountPurposeOther ? 'bg-red20' : ''
                    }`}>
                    <CyDView className='py-[8px]'>
                      {accountPurposeOther ? (
                        <CyDText className='text-[11px] text-n100 leading-[1.5]'>
                          Please specify
                        </CyDText>
                      ) : null}
                      <CyDTextInput
                        className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 bg-transparent'
                        value={accountPurposeOther}
                        onChangeText={v => { setAccountPurposeOther(v); clearError('accountPurposeOther'); }}
                        placeholder={accountPurposeOther ? '' : 'Please specify purpose'}
                        placeholderTextColor={PLACEHOLDER_COLOR}
                        autoCapitalize='sentences'
                        maxLength={512}
                      />
                    </CyDView>
                  </CyDView>
                  <CyDView className='h-[0.5px] bg-n50' />
                </>
              ) : null}
              <GroupedRow
                label='Estimated Annual Revenue'

                value={revenueLabel}
                isDropdown
                hasError={!!errors.estimatedRevenue}
                onPress={() => setOpenPicker('estimatedRevenue')}
                isLast
              />
            </CyDView>
            {errors.accountPurpose ? (
              <CyDText className='text-[12px] text-errorText'>{errors.accountPurpose}</CyDText>
            ) : null}
            {errors.accountPurposeOther ? (
              <CyDText className='text-[12px] text-errorText'>{errors.accountPurposeOther}</CyDText>
            ) : null}
            {errors.estimatedRevenue ? (
              <CyDText className='text-[12px] text-errorText'>{errors.estimatedRevenue}</CyDText>
            ) : null}
          </CyDView>
        ) : step === 2 ? (
          <CyDView className='gap-[6px]'>
            <CyDText className={LABEL_CLASS}>Occupation & Source of Funds</CyDText>
            <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
              {/* Occupation text input */}
              <CyDView
                className={`px-[16px] min-h-[52px] justify-center ${
                  errors.occupation ? 'bg-red20' : ''
                }`}>
                <CyDView className='py-[8px]'>
                  {occupation ? (
                    <CyDText className='text-[11px] text-n100 leading-[1.5]'>Occupation</CyDText>
                  ) : null}
                  <CyDTextInput
                    className='text-[16px] font-medium text-base400 tracking-[-0.8px] leading-[1.4] py-0 bg-transparent'
                    value={occupation}
                    onChangeText={v => { setOccupation(v); clearError('occupation'); }}
                    placeholder={occupation ? '' : 'Occupation'}
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    autoCapitalize='words'
                    returnKeyType='next'
                    onFocus={() => setFocusedField('occupation')}
                    onBlur={() => setFocusedField(null)}
                  />
                </CyDView>
              </CyDView>
              <CyDView className='h-[0.5px] bg-n50' />
              <GroupedRow
                label='Source of Funds'

                value={sofLabel}
                isDropdown
                hasError={!!errors.sourceOfFunds}
                onPress={() => setOpenPicker('sourceOfFunds')}
                isLast
              />
            </CyDView>
            {errors.occupation ? (
              <CyDText className='text-[12px] text-errorText'>{errors.occupation}</CyDText>
            ) : null}
            {errors.sourceOfFunds ? (
              <CyDText className='text-[12px] text-errorText'>{errors.sourceOfFunds}</CyDText>
            ) : null}
          </CyDView>
        ) : step === 3 ? (
          <>
            {/* Sole Proprietor Doc */}
            <CyDView className='gap-[6px]'>
              <CyDText className={LABEL_CLASS}>Sole Proprietor Document</CyDText>
              <CyDView className='border border-n50 rounded-[8px] bg-n10 overflow-hidden'>
                <GroupedRow
                  label='Document Type'

                  value={spDocLabel}
                  isDropdown
                  hasError={!!errors.solePropDocType}
                  onPress={() => setOpenPicker('solePropDocType')}
                  isLast
                />
              </CyDView>
              {errors.solePropDocType ? (
                <CyDText className='text-[12px] text-errorText'>{errors.solePropDocType}</CyDText>
              ) : null}
            </CyDView>

            {/* Upload cards */}
            {[
              { key: 'soleProp' as const, label: 'Sole Proprietor Document', url: solePropDocUrl, error: errors.solePropDoc },
              { key: 'sourceFunds' as const, label: 'Source of Funds Document', url: sourceOfFundsDocUrl, error: errors.sourceFundsDoc },
            ].map(doc => (
              <CyDView key={doc.key} className='gap-[4px]'>
                <CyDText className={LABEL_CLASS}>{doc.label}</CyDText>
                <CyDTouchView
                  onPress={() => setCaptureTarget(doc.key)}
                  disabled={uploading}
                  className={`rounded-[16px] overflow-hidden border ${
                    doc.error || uploadErrors[doc.key] ? 'border-errorText' : 'border-transparent'
                  }`}>
                  <CyDView className='bg-n10 items-center py-[20px] gap-[6px]'>
                    {uploadErrors[doc.key] ? (
                      <CyDView className='w-[48px] h-[48px] bg-red200 rounded-[12px] items-center justify-center'>
                        <CyDMaterialDesignIcons name='alert-circle-outline' size={24} className='text-white' />
                      </CyDView>
                    ) : doc.url ? (
                      <CyDView className='w-[48px] h-[48px] bg-green-500 rounded-[12px] items-center justify-center'>
                        <CyDMaterialDesignIcons name='check' size={24} className='text-white' />
                      </CyDView>
                    ) : (
                      <CyDView className='w-[48px] h-[48px] bg-[#FBC02D] rounded-[12px] items-center justify-center'>
                        <CyDMaterialDesignIcons name='file-document-outline' size={24} className='text-white' />
                      </CyDView>
                    )}
                    <CyDText className='text-[14px] font-semibold text-n200 tracking-[-0.6px]'>
                      {doc.label}
                    </CyDText>
                  </CyDView>
                  <CyDView className={`px-[12px] py-[8px] flex-row items-center gap-[6px] ${
                    uploadErrors[doc.key] ? 'bg-red-100' : 'bg-[#FFE082]'
                  }`}>
                    <CyDMaterialDesignIcons
                      name={uploadErrors[doc.key] ? 'alert-circle-outline' : 'information-outline'}
                      size={14}
                      className={uploadErrors[doc.key] ? 'text-red-600' : 'text-n200'}
                    />
                    <CyDText
                      className={`text-[12px] font-medium tracking-[-0.4px] flex-1 ${
                        uploadErrors[doc.key] ? 'text-red-600' : 'text-n200'
                      }`}
                      numberOfLines={1}>
                      {uploadErrors[doc.key] || (doc.url ? 'Uploaded' : 'Tap to upload')}
                    </CyDText>
                  </CyDView>
                </CyDTouchView>
                {doc.error ? (
                  <CyDText className='text-[12px] text-errorText'>{doc.error}</CyDText>
                ) : null}
              </CyDView>
            ))}
          </>
        ) : (
          /* Step 4: Review */
          <CyDView className='gap-[12px]'>
            <ReviewCard
              title='Profile Update'
              rows={[
                { label: 'Purpose', value: purposeLabel ?? '—' },
                ...(accountPurpose === 'other' && accountPurposeOther.trim()
                  ? [{ label: 'Details', value: accountPurposeOther.trim() }]
                  : []),
                { label: 'Revenue', value: revenueLabel ?? '—' },
                { label: 'Occupation', value: occupation },
                { label: 'Source', value: sofLabel ?? '—' },
                { label: 'Source Doc', value: sourceOfFundsDocUrl ? 'Uploaded' : '—' },
              ]}
            />
            <ReviewCard
              title='Virtual Account'
              rows={[
                {
                  label: 'Wallet',
                  value: walletAddress
                    ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`
                    : '—',
                },
                { label: 'Document Type', value: spDocLabel ?? '—' },
                { label: 'Document', value: solePropDocUrl ? 'Uploaded' : '—' },
              ]}
            />
          </CyDView>
        )}
      </CyDKeyboardAwareScrollView>

      {/* Bottom: progress + button */}
      <CyDView
        className='px-[16px] pt-[12px] border-t border-n40 flex-row items-center gap-[16px]'
        style={{ paddingBottom: Math.max(8, insets.bottom) }}>
        <CyDView className='flex-1 h-[6px] rounded-full bg-n40 overflow-hidden'>
          <CyDView
            className='h-full rounded-full bg-base400'
            style={{ width: `${(((step + 1) / totalSteps) * 100).toFixed(1)}%` as any }}
          />
        </CyDView>
        <CyDTouchView
          onPress={() => { void handleNext(); }}
          disabled={submitting || uploading}
          className='rounded-full min-h-[48px] min-w-[120px] bg-[#FBC02D] px-[24px] flex-row items-center justify-center'>
          <CyDView className='relative items-center justify-center'>
            <CyDText
              className={`text-[16px] font-semibold text-black tracking-[-0.8px] ${
                submitting ? 'opacity-0' : ''
              }`}>
              {isLastStep ? 'Submit' : 'Next'}
            </CyDText>
            {submitting ? (
              <CyDView className='absolute inset-0 items-center justify-center'>
                <ActivityIndicator color='#0D0D0D' />
              </CyDView>
            ) : null}
          </CyDView>
        </CyDTouchView>
      </CyDView>

      {/* Pickers */}
      <DropdownSheet
        visible={openPicker === 'accountPurpose'}
        title='Account Purpose'
        options={ACCOUNT_PURPOSE_OPTIONS}
        selected={accountPurpose}
        onSelect={v => { setAccountPurpose(v); clearError('accountPurpose'); }}
        onClose={() => setOpenPicker(null)}
      />
      <DropdownSheet
        visible={openPicker === 'estimatedRevenue'}
        title='Estimated Annual Revenue'
        options={REVENUE_OPTIONS}
        selected={estimatedRevenue}
        onSelect={v => { setEstimatedRevenue(v); clearError('estimatedRevenue'); }}
        onClose={() => setOpenPicker(null)}
      />
      <DropdownSheet
        visible={openPicker === 'sourceOfFunds'}
        title='Source of Funds'
        options={SOURCE_OF_FUNDS_OPTIONS}
        selected={sourceOfFunds}
        onSelect={v => { setSourceOfFunds(v); clearError('sourceOfFunds'); }}
        onClose={() => setOpenPicker(null)}
      />
      <DropdownSheet
        visible={openPicker === 'solePropDocType'}
        title='Document Type'
        options={SOLE_PROP_DOC_OPTIONS}
        selected={solePropDocType}
        onSelect={v => { setSolePropDocType(v); clearError('solePropDocType'); }}
        onClose={() => setOpenPicker(null)}
      />

      <BlindPayIdCaptureModal
        visible={captureTarget !== null}
        docTypeName={
          captureTarget === 'soleProp'
            ? (spDocLabel ?? 'Document')
            : 'Source of Funds'
        }
        side='front'
        onContinue={handleCapture}
        onClose={() => setCaptureTarget(null)}
      />

      {/* Help sheet */}
      {showHelp ? (
        <Modal visible transparent animationType='fade' onRequestClose={() => setShowHelp(false)}>
          <CyDView className='flex-1 justify-end bg-black/40'>
            <CyDTouchView className='flex-1' onPress={() => setShowHelp(false)} />
            <Animated.View entering={SlideInDown.duration(300)}>
              <CyDView className='bg-n0 rounded-t-[24px] px-[16px] pb-[32px]'>
                <CyDView className='items-center pt-[12px] pb-[16px]'>
                  <CyDView className='w-[32px] h-[4px] bg-[#C2C7D0] rounded-[5px]' />
                </CyDView>
                <CyDText className='text-[20px] font-medium text-base400 tracking-[-0.8px] leading-[1.3] mb-[12px]'>
                  Help
                </CyDText>
                <CyDText className='text-[14px] font-medium text-n200 leading-[1.5] tracking-[-0.4px]'>
                  {helpText}
                </CyDText>
                <CyDTouchView
                  onPress={() => setShowHelp(false)}
                  className='rounded-full h-[48px] bg-[#FBC02D] items-center justify-center mt-[20px]'>
                  <CyDText className='text-[16px] font-bold text-black tracking-[-0.16px]'>
                    Got it
                  </CyDText>
                </CyDTouchView>
              </CyDView>
            </Animated.View>
          </CyDView>
        </Modal>
      ) : null}
    </CyDSafeAreaView>
  );
}
